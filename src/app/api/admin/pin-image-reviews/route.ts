import "server-only";

import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentAdmin } from "@/lib/auth/session";

/**
 * PIN & TELL — image review API, authenticated by the SAME custom admin
 * session cookie as the protected dashboard (admins/admin_sessions).
 *
 * This endpoint must live at src/app/api/admin/pin-image-reviews/route.ts.
 * Set PIN_MODERATION_REVIEWER_ADMIN_IDS to comma-separated admins.id UUIDs.
 * A missing allowlist fails closed: ordinary users and unlisted admins cannot
 * access review data or make decisions.
 *
 * Requires Phase 2A finalization SQL PLUS the accompanying reviewer-FK fix.
 * Never expose SUPABASE_SERVICE_ROLE_KEY to the browser or Android app.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUEUE_TABLE = "pin_moderation_queue";
const STAGING_BUCKET = "pin-photo-staging";
const PUBLIC_BUCKET = "pin-photos";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_PHOTOS = 3;
const SIGNED_PREVIEW_TTL_SECONDS = 120;

const decisionSchema = z.object({
  reviewId: z.uuid(),
  decision: z.enum(["approve", "reject"]),
  notes: z.string().trim().max(1000).optional(),
}).strict();

const statusSchema = z.enum(["pending", "approved", "rejected"]);

type QueueRow = {
  id: string;
  user_id: string;
  operation: "create" | "edit";
  pin_id: number | null;
  submission_payload: Record<string, unknown>;
  staged_photo_paths: string[];
  image_scan_results: unknown;
  status: "pending" | "approved" | "rejected";
  reviewer_id: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
};

type FinalizeResult = {
  success?: boolean;
  status?: string;
  pinId?: number | null;
  code?: string;
};

type StagedPhoto = {
  path: string;
  bytes: Uint8Array;
  contentType: "image/jpeg" | "image/png" | "image/webp";
};

function failure(message: string, httpStatus: number, code: string) {
  return NextResponse.json(
    { success: false, code, error: message },
    { status: httpStatus, headers: { "Cache-Control": "no-store" } },
  );
}

function success(body: Record<string, unknown>, httpStatus = 200) {
  return NextResponse.json(
    { success: true, ...body },
    { status: httpStatus, headers: { "Cache-Control": "no-store" } },
  );
}

/** Authenticate every GET and POST against the existing admin session.
 * Only specifically allowlisted, active admins are granted review privileges.
 */
async function requireReviewer(): Promise<
  | { id: string; email: string | null; error: null }
  | { id: null; email: null; error: NextResponse }
> {
  const rawIds = process.env.PIN_MODERATION_REVIEWER_ADMIN_IDS ?? "";
  const reviewerIds = new Set(
    rawIds.split(",").map((id) => id.trim().toLowerCase())
      .filter((id) => z.uuid().safeParse(id).success),
  );
  if (reviewerIds.size === 0) {
    return {
      id: null, email: null,
      error: failure("Photo-review access has not been configured.", 503, "REVIEW_AUTH_NOT_CONFIGURED"),
    };
  }

  // The cookie is HttpOnly; the browser never needs to read or pass a token.
  // getCurrentAdmin() validates the session hash, expiration, user-agent,
  // and current admin account status on each request.
  const admin = await getCurrentAdmin();
  if (!admin) {
    return {
      id: null, email: null,
      error: failure("Your admin session has expired. Please sign in again.", 401, "UNAUTHORIZED"),
    };
  }
  if (!reviewerIds.has(admin.id.toLowerCase())) {
    return {
      id: null, email: null,
      error: failure("Your admin account is not permitted to review pin photos.", 403, "FORBIDDEN"),
    };
  }
  return { id: admin.id, email: admin.email ?? null, error: null };
}

/** Reject browser cross-origin POSTs even if a custom deployment changes
 * the site's SameSite cookie behavior in the future.
 */
function isSameOriginPost(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

function isOwnedPath(path: string, userId: string): boolean {
  const pieces = path.split("/");
  return pieces.length === 2 && pieces[0] === userId &&
    /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,180}\.(jpg|jpeg|png|webp)$/i.test(pieces[1]) &&
    !pieces[1].includes("..");
}

function imageType(bytes: Uint8Array): StagedPhoto["contentType"] | null {
  if (bytes.length >= 3 && bytes[0] === 0xff &&
      bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 &&
      Buffer.from(bytes.subarray(0, 8)).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      )) return "image/png";
  if (bytes.length >= 12 &&
      Buffer.from(bytes).toString("ascii", 0, 4) === "RIFF" &&
      Buffer.from(bytes).toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

function scannedHash(scanResults: unknown, index: number): string | null {
  if (!Array.isArray(scanResults)) return null;
  const record: unknown = scanResults[index];
  if (!record || typeof record !== "object" || !("sha256" in record)) return null;
  const hash = (record as { sha256: unknown }).sha256;
  return typeof hash === "string" && /^[a-f0-9]{64}$/i.test(hash) ? hash : null;
}

async function getQueueRow(reviewId: string): Promise<QueueRow | null> {
  const { data, error } = await getSupabaseAdmin()
    .from(QUEUE_TABLE)
    .select("id,user_id,operation,pin_id,submission_payload,staged_photo_paths,image_scan_results,status,reviewer_id,reviewed_at,review_notes,created_at")
    .eq("id", reviewId)
    .maybeSingle();

  if (error) throw new Error(`Review lookup failed: ${error.message}`);
  return data as QueueRow | null;
}

async function getVerifiedStagedPhotos(row: QueueRow): Promise<StagedPhoto[]> {
  const paths = row.staged_photo_paths;
  if (!Array.isArray(paths) || paths.length < 1 || paths.length > MAX_PHOTOS ||
      new Set(paths).size !== paths.length ||
      paths.some((path) => !isOwnedPath(path, row.user_id))) {
    throw new Error("Invalid staged photo paths in the review record.");
  }

  const photos: StagedPhoto[] = [];
  for (const [index, path] of paths.entries()) {
    const { data, error } = await getSupabaseAdmin().storage.from(STAGING_BUCKET).download(path);
    if (error || !data) throw new Error("A staged photo could not be downloaded.");

    const bytes = new Uint8Array(await data.arrayBuffer());
    const contentType = imageType(bytes);
    const expectedHash = scannedHash(row.image_scan_results, index);
    const actualHash = createHash("sha256").update(bytes).digest("hex");

    if (!contentType || bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES ||
        !expectedHash || actualHash !== expectedHash) {
      throw new Error("Photo integrity check failed. The image may have changed after screening.");
    }

    photos.push({ path, bytes, contentType });
  }
  return photos;
}

async function removeStorageObjects(bucket: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await getSupabaseAdmin().storage.from(bucket).remove(paths);
  if (error) console.error(`[PIN REVIEW] Unable to clean ${bucket} objects:`, error);
}

async function recordDecision(
  reviewerId: string,
  row: QueueRow,
  decision: "approved" | "rejected",
  pinId: number | null,
): Promise<void> {
  const { error } = await getSupabaseAdmin().from("logs").insert({
    // Admin IDs are from public.admins, not auth.users; the logs.user_id
    // column may be constrained to public profile UUIDs.
    user_id: null,
    actor_type: "admin",
    action_type: decision === "approved" ? "pin_photo_approved" : "pin_photo_rejected",
    description: `Admin reviewer ${reviewerId} ${decision} queued pin photo submission. review_id=${row.id}`,
    target_table: "pins",
    target_id: pinId === null ? row.id : String(pinId),
    ip_address: null,
    user_agent: null,
    created_at: new Date().toISOString(),
  });
  if (error) console.error("[PIN REVIEW] Audit record failed:", error);
}

async function finalize(
  row: QueueRow,
  reviewerId: string,
  decision: "approve" | "reject",
  notes: string | undefined,
  publishedPhotoUrls: string | null,
): Promise<{ result: FinalizeResult | null; errorMessage: string | null }> {
  const { data, error } = await getSupabaseAdmin().rpc("pt_finalize_pin_image_review", {
    p_review_id: row.id,
    p_reviewer_id: reviewerId,
    p_decision: decision,
    p_published_photo_urls: publishedPhotoUrls,
    p_review_notes: notes ?? null,
  });
  return {
    result: error ? null : (data as FinalizeResult | null),
    errorMessage: error?.message ?? null,
  };
}

/** A reviewer-only listing, with short-lived signed URLs for private previews. */
export async function GET(request: NextRequest) {
  try {
    const reviewer = await requireReviewer();
    if (reviewer.error) return reviewer.error;

    const parsedStatus = statusSchema.safeParse(request.nextUrl.searchParams.get("status") ?? "pending");
    if (!parsedStatus.success) return failure("Invalid review status.", 400, "INVALID_STATUS");

    const { data, error } = await getSupabaseAdmin()
      .from(QUEUE_TABLE)
      .select("id,user_id,operation,pin_id,submission_payload,staged_photo_paths,image_scan_results,status,reviewer_id,reviewed_at,review_notes,created_at")
      .eq("status", parsedStatus.data)
      .order("created_at", { ascending: true })
      .limit(25);

    if (error) {
      console.error("[PIN REVIEW] Queue listing failed:", error);
      return failure("Unable to load moderation queue.", 503, "QUEUE_UNAVAILABLE");
    }

    const reviews = await Promise.all(((data ?? []) as QueueRow[]).map(async (row) => {
      const previews: Array<{ path: string; signedUrl: string | null }> = [];
      if (row.status === "pending") {
        for (const path of row.staged_photo_paths ?? []) {
          if (!isOwnedPath(path, row.user_id)) continue;
          const { data: signed, error: signError } = await getSupabaseAdmin()
            .storage.from(STAGING_BUCKET).createSignedUrl(path, SIGNED_PREVIEW_TTL_SECONDS);
          if (signError) console.error("[PIN REVIEW] Preview signing failed:", signError);
          previews.push({ path, signedUrl: signed?.signedUrl ?? null });
        }
      }
      return {
        id: row.id,
        userId: row.user_id,
        operation: row.operation,
        pinId: row.pin_id,
        submission: row.submission_payload,
        imageScans: row.image_scan_results,
        status: row.status,
        createdAt: row.created_at,
        reviewerId: row.reviewer_id,
        reviewedAt: row.reviewed_at,
        reviewNotes: row.review_notes,
        previews,
      };
    }));

    return success({ reviews, previewExpiresInSeconds: SIGNED_PREVIEW_TTL_SECONDS });
  } catch (error) {
    console.error("[PIN REVIEW] GET failed:", error);
    return failure("Unable to load moderation queue.", 500, "INTERNAL_ERROR");
  }
}

/** Approve or reject one queued photo pin. Atomic DB finalization is in SQL. */
export async function POST(request: NextRequest) {
  try {
    if (!isSameOriginPost(request)) {
      return failure("Request origin is not allowed.", 403, "INVALID_ORIGIN");
    }
    const reviewer = await requireReviewer();
    if (reviewer.error) return reviewer.error;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return failure("A valid JSON request body is required.", 400, "INVALID_JSON");
    }
    const parsed = decisionSchema.safeParse(body);
    if (!parsed.success) return failure("Invalid review request.", 400, "VALIDATION_ERROR");
    const { reviewId, decision, notes } = parsed.data;
    if (decision === "reject" && !notes?.trim()) {
      return failure("A rejection reason is required.", 400, "REJECTION_REASON_REQUIRED");
    }

    const row = await getQueueRow(reviewId);
    if (!row) return failure("Review not found.", 404, "REVIEW_NOT_FOUND");
    if (row.status !== "pending") {
      return failure("This submission has already been reviewed.", 409, "ALREADY_RESOLVED");
    }
    if (row.operation !== "create") {
      return failure("Reviewing pin edits is not yet supported.", 422, "EDIT_REVIEW_NOT_SUPPORTED");
    }

    if (decision === "reject") {
      const { result, errorMessage } = await finalize(row, reviewer.id, "reject", notes, null);
      if (errorMessage) {
        console.error("[PIN REVIEW] Rejection failed:", errorMessage);
        return failure("Unable to reject the submission.", 503, "REVIEW_FINALIZATION_FAILED");
      }
      if (!result?.success) {
        return failure("This submission has already been reviewed.", 409, result?.code ?? "ALREADY_RESOLVED");
      }
      await removeStorageObjects(STAGING_BUCKET, row.staged_photo_paths);
      await recordDecision(reviewer.id, row, "rejected", null);
      return success({ status: "rejected", reviewId });
    }

    // Approval: verify the bytes are IDENTICAL to those screened initially.
    // A reviewer may approve a flagged image, but may not approve a swapped image.
    let photos: StagedPhoto[];
    try {
      photos = await getVerifiedStagedPhotos(row);
    } catch (error) {
      console.error("[PIN REVIEW] Staged photo verification failed:", error);
      return failure("Cannot approve: a staged photo is missing or has changed since screening.", 409, "PHOTO_INTEGRITY_FAILED");
    }

    // Upload fresh approved copies to the existing public bucket. Each attempt
    // uses unique paths; if a concurrent reviewer wins, we remove ONLY our copies.
    const publicPaths: string[] = [];
    const publicUrls: string[] = [];
    const publicStorage = getSupabaseAdmin().storage.from(PUBLIC_BUCKET);
    for (const photo of photos) {
      const ext = photo.contentType === "image/jpeg" ? "jpg" :
        photo.contentType === "image/png" ? "png" : "webp";
      const path = `${row.user_id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await publicStorage.upload(path, photo.bytes, {
        contentType: photo.contentType,
        upsert: false,
      });
      if (error) {
        console.error("[PIN REVIEW] Approved photo upload failed:", error);
        await removeStorageObjects(PUBLIC_BUCKET, publicPaths);
        return failure("Cannot publish the approved photos. Please retry.", 503, "PHOTO_PUBLICATION_FAILED");
      }
      publicPaths.push(path);
      publicUrls.push(publicStorage.getPublicUrl(path).data.publicUrl);
    }

    const { result, errorMessage } = await finalize(
      row, reviewer.id, "approve", notes, publicUrls.join(","),
    );

    if (errorMessage) {
      // Database requests can time out AFTER committing. Reconcile before
      // attempting to remove uploads that may now belong to a public pin.
      console.error("[PIN REVIEW] Finalization response failed:", errorMessage);
      try {
        const current = await getQueueRow(row.id);
        if (current?.status === "approved" && current.pin_id !== null) {
          const { data: publishedPin, error: pinError } = await getSupabaseAdmin()
            .from("pins").select("id,photo_url").eq("id", current.pin_id).maybeSingle();
          if (!pinError && publishedPin?.photo_url === publicUrls.join(",")) {
            await removeStorageObjects(STAGING_BUCKET, row.staged_photo_paths);
            return success({ reviewId, status: "approved", pinId: current.pin_id });
          }
          if (!pinError) await removeStorageObjects(PUBLIC_BUCKET, publicPaths);
        } else if (current?.status === "pending" || current?.status === "rejected") {
          await removeStorageObjects(PUBLIC_BUCKET, publicPaths);
        }
        // On an unreadable/inconsistent outcome, keep the copies rather than
        // accidentally deleting photos belonging to a committed public pin.
      } catch (reconcileError) {
        console.error("[PIN REVIEW] Reconciliation failed:", reconcileError);
      }
      return failure("Approval status could not be confirmed. Refresh the queue before retrying.", 503, "APPROVAL_STATUS_UNCERTAIN");
    }

    if (!result?.success) {
      await removeStorageObjects(PUBLIC_BUCKET, publicPaths);
      return failure("This submission has already been reviewed.", 409, result?.code ?? "ALREADY_RESOLVED");
    }

    await removeStorageObjects(STAGING_BUCKET, row.staged_photo_paths);
    await recordDecision(reviewer.id, row, "approved", result.pinId ?? null);
    return success({ status: "approved", reviewId, pinId: result.pinId ?? null });
  } catch (error) {
    console.error("[PIN REVIEW] POST failed:", error);
    return failure("Unable to process this review right now.", 500, "INTERNAL_ERROR");
  }
}
