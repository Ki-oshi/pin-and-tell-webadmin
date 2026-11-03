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

/** Write an audit entry only after the moderation transaction has succeeded.
 *
 * The review row is the stable target for BOTH approvals and rejections.
 * We deliberately leave logs.user_id null because that column may reference
 * application users, while reviewerId belongs to public.admins. The Activity
 * Logs loader resolves the admin from pin_moderation_queue.reviewer_id.
 */
async function recordDecision(
  reviewerId: string,
  row: QueueRow,
  decision: "approved" | "rejected",
  pinId: number | null,
  notes?: string,
): Promise<void> {
  const pinDetails = pinId === null ? "" : ` for pin #${pinId}`;
  const cleanedNotes = notes?.trim();
  const notesDetails = cleanedNotes
    ? ` ${decision === "rejected" ? "Reason" : "Review notes"}: ${cleanedNotes}`
    : "";
  const description =
    `Admin ${decision} a photo submission${pinDetails}.${notesDetails} ` +
    `review_id=${row.id} reviewer_id=${reviewerId}`;

  try {
    const { error } = await getSupabaseAdmin().from("logs").insert({
      user_id: null,
      actor_type: "admin",
      action_type: decision === "approved" ? "pin_photo_approved" : "pin_photo_rejected",
      description: description.slice(0, 2000),
      target_table: QUEUE_TABLE,
      target_id: row.id,
      ip_address: null,
      user_agent: null,
      created_at: new Date().toISOString(),
    });
    if (error) console.error("[PIN REVIEW] Audit record failed:", error);
  } catch (error) {
    // Never report an already-committed review as failed because audit insert failed.
    console.error("[PIN REVIEW] Audit record failed:", error);
  }
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

/**
 * Three-way moderation activity feed.
 * Automatic outcomes are audit events, not moderation-queue rows. Do not
 * create pretend review records or expose private/rejected Storage objects.
 */
const feedViewSchema = z.enum(["all", "pending", "approved", "rejected"]);
const FEED_PAGE_SIZE = 25;
const MAX_FEED_PAGE = 20;

type FeedView = z.infer<typeof feedViewSchema>;
type SystemAuditRow = {
  id: number;
  action_type: string;
  description: string;
  target_table: string | null;
  target_id: string | null;
  created_at: string | null;
};
type PublishedPinRow = {
  id: number;
  title: string | null;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  photo_url: string | null;
  creator_id: string | null;
};
type ProfileSummary = { id: string; username: string | null; full_name: string | null };
type AdminSummary = { id: string; email: string; full_name: string | null };

type FeedItem = {
  id: string;
  source: "queue" | "automated";
  status: "pending" | "approved" | "rejected";
  decisionBy: "ai" | "admin" | "awaiting_admin";
  title: string;
  description: string | null;
  category: string | null;
  submittedBy: string | null;
  submitterName: string | null;
  reviewerId: string | null;
  reviewerName: string | null;
  pinId: number | null;
  reviewId: string | null;
  createdAt: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  photoCount: number;
  imageScans: unknown[];
  violationCodes: string[];
  aiDecisions: string[];
  previews: Array<{ path: string; signedUrl: string | null }>;
  auditOnly: boolean;
};

function parseAuditField(description: string, field: string): string | null {
  // Audit format contains space-separated key=value tokens, never execute it.
  const match = description.match(new RegExp(`(?:^|\\s)${field}=([^\\s]+)`));
  return match?.[1] ?? null;
}

function auditList(description: string, field: string): string[] {
  const value = parseAuditField(description, field);
  return value && value !== "none" ? value.split(",").filter(Boolean) : [];
}

function summaryValues(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

function stringField(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asScanArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object") : [];
}

function distinctCodes(scans: Record<string, unknown>[]): string[] {
  const codes = scans.flatMap((scan) =>
    Array.isArray(scan.findings) ? scan.findings.flatMap((finding) => {
      const record = summaryValues(finding);
      const code = stringField(record.violation) ?? stringField(record.category);
      return code ? [code] : [];
    }) : [],
  );
  return [...new Set(codes)];
}

function trustedPublicPhotos(photoUrls: string | null): Array<{ path: string; signedUrl: string }> {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!projectUrl || !photoUrls) return [];
  let origin: string;
  try { origin = new URL(projectUrl).origin; } catch { return []; }
  return photoUrls.split(",").flatMap((raw) => {
    try {
      const candidate = new URL(raw.trim());
      if (candidate.origin !== origin ||
          !candidate.pathname.startsWith("/storage/v1/object/public/pin-photos/")) return [];
      return [{ path: candidate.pathname, signedUrl: candidate.toString() }];
    } catch { return []; }
  }).slice(0, MAX_PHOTOS);
}

async function getModerationFeed(view: FeedView, page: number) {
  const supabase = getSupabaseAdmin();
  const windowSize = page * FEED_PAGE_SIZE;
  const includeAudits = view !== "pending";

  const statuses: Array<QueueRow["status"]> = view === "all"
    ? ["pending", "approved", "rejected"]
    : [view];
  const actions = view === "approved" ? ["image_policy_approval"]
    : view === "rejected" ? ["image_policy_rejection"]
    : ["image_policy_approval", "image_policy_rejection"];

  // Each queue status is ordered by its own activity time. This makes a
  // recently decided old submission visible in the activity feed.
  const queuePromise = Promise.all(statuses.map((status) =>
    supabase.from(QUEUE_TABLE)
      .select("id,user_id,operation,pin_id,submission_payload,staged_photo_paths,image_scan_results,status,reviewer_id,reviewed_at,review_notes,created_at")
      .eq("status", status)
      .order(status === "pending" ? "created_at" : "reviewed_at", {
        ascending: false, nullsFirst: false,
      })
      .limit(windowSize),
  ));

  const [queueResults, auditsResult, pendingCount, manualApprovedCount,
    manualRejectedCount, autoApprovedCount, autoRejectedCount] = await Promise.all([
    queuePromise,
    includeAudits
      ? supabase.from("logs")
          .select("id,action_type,description,target_table,target_id,created_at")
          .eq("actor_type", "system")
          .in("action_type", actions)
          .order("created_at", { ascending: false }).limit(windowSize)
      : Promise.resolve({ data: [], error: null }),
    supabase.from(QUEUE_TABLE).select("id", { head: true, count: "exact" }).eq("status", "pending"),
    supabase.from(QUEUE_TABLE).select("id", { head: true, count: "exact" }).eq("status", "approved"),
    supabase.from(QUEUE_TABLE).select("id", { head: true, count: "exact" }).eq("status", "rejected"),
    supabase.from("logs").select("id", { head: true, count: "exact" })
      .eq("actor_type", "system").eq("action_type", "image_policy_approval"),
    supabase.from("logs").select("id", { head: true, count: "exact" })
      .eq("actor_type", "system").eq("action_type", "image_policy_rejection"),
  ]);

  const queueError = queueResults.find((result) => result.error)?.error;
  if (queueError || auditsResult.error) {
    console.error("[PIN REVIEW] Activity feed query failed:", queueError ?? auditsResult.error);
    return failure("Unable to load moderation history.", 503, "MODERATION_FEED_UNAVAILABLE");
  }

  const countResults = [pendingCount, manualApprovedCount, manualRejectedCount,
    autoApprovedCount, autoRejectedCount];
  const countsAvailable = countResults.every((result) => !result.error && result.count !== null);
  if (!countsAvailable) console.warn("[PIN REVIEW] Moderation feed counts incomplete.");
  const counts = countsAvailable ? {
    pending: pendingCount.count ?? 0,
    approved: (manualApprovedCount.count ?? 0) + (autoApprovedCount.count ?? 0),
    rejected: (manualRejectedCount.count ?? 0) + (autoRejectedCount.count ?? 0),
    all: countResults.reduce((sum, result) => sum + (result.count ?? 0), 0),
  } : null;

  const queueRows = queueResults.flatMap((result) => result.data ?? []) as QueueRow[];
  const audits = (auditsResult.data ?? []) as SystemAuditRow[];
  const publishedPinIds = [...new Set([
    ...queueRows.filter((row) => row.status === "approved" && row.pin_id !== null)
      .map((row) => row.pin_id as number),
    ...audits.filter((log) => log.action_type === "image_policy_approval" &&
      log.target_table === "pins" && /^\d+$/.test(log.target_id ?? ""))
      .map((log) => Number(log.target_id)),
  ])];
  const reviewerIds = [...new Set(queueRows.map((row) => row.reviewer_id).filter((v): v is string => !!v))];
  const submitterIds = [...new Set([
    ...queueRows.map((row) => row.user_id),
    ...audits.flatMap((log) => {
      const id = parseAuditField(log.description ?? "", "submitter_id") ??
        (log.target_table === "profiles" ? log.target_id : null);
      return id && z.uuid().safeParse(id).success ? [id] : [];
    }),
  ])];

  const [pinsResult, profilesResult, adminsResult] = await Promise.all([
    publishedPinIds.length > 0
      ? supabase.from("pins")
          .select("id,title,description,category,subcategory,photo_url,creator_id")
          .in("id", publishedPinIds)
      : Promise.resolve({ data: [], error: null }),
    submitterIds.length > 0
      ? supabase.from("profiles").select("id,username,full_name").in("id", submitterIds)
      : Promise.resolve({ data: [], error: null }),
    reviewerIds.length > 0
      ? supabase.from("admins").select("id,email,full_name").in("id", reviewerIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (pinsResult.error || profilesResult.error || adminsResult.error) {
    console.error("[PIN REVIEW] Feed enrichment failed:", pinsResult.error, profilesResult.error, adminsResult.error);
    return failure("Unable to load moderation details.", 503, "MODERATION_FEED_DETAILS_UNAVAILABLE");
  }

  const pins = new Map(((pinsResult.data ?? []) as PublishedPinRow[]).map((pin) => [pin.id, pin]));
  const profiles = new Map(((profilesResult.data ?? []) as ProfileSummary[]).map((profile) => [profile.id, profile]));
  const admins = new Map(((adminsResult.data ?? []) as AdminSummary[]).map((admin) => [admin.id, admin]));
  const displayProfile = (id: string | null) => {
    if (!id) return null;
    const profile = profiles.get(id);
    return profile?.full_name?.trim() || profile?.username?.trim() || null;
  };

  const queueItems: FeedItem[] = await Promise.all(queueRows.map(async (row) => {
    const submission = summaryValues(row.submission_payload);
    const scans = asScanArray(row.image_scan_results);
    const approvedPin = row.pin_id === null ? null : pins.get(row.pin_id) ?? null;
    const previews: FeedItem["previews"] = [];
    if (row.status === "pending") {
      for (const path of (row.staged_photo_paths ?? []).slice(0, MAX_PHOTOS)) {
        if (!isOwnedPath(path, row.user_id)) continue;
        const { data: signed, error } = await supabase.storage.from(STAGING_BUCKET)
          .createSignedUrl(path, SIGNED_PREVIEW_TTL_SECONDS);
        if (error) console.error("[PIN REVIEW] Private preview unavailable:", error);
        previews.push({ path, signedUrl: signed?.signedUrl ?? null });
      }
    } else if (row.status === "approved") {
      previews.push(...trustedPublicPhotos(approvedPin?.photo_url ?? null));
    }
    return {
      id: `queue:${row.id}`,
      source: "queue",
      status: row.status,
      decisionBy: row.status === "pending" ? "awaiting_admin" : "admin",
      title: stringField(submission.title) || "Untitled submission",
      description: stringField(submission.description),
      category: stringField(submission.category),
      submittedBy: row.user_id,
      submitterName: displayProfile(row.user_id),
      reviewerId: row.reviewer_id,
      reviewerName: row.reviewer_id
        ? (admins.get(row.reviewer_id)?.full_name?.trim() || admins.get(row.reviewer_id)?.email || null)
        : null,
      pinId: row.pin_id,
      reviewId: row.id,
      createdAt: row.created_at,
      reviewedAt: row.reviewed_at,
      reviewNotes: row.review_notes,
      photoCount: row.staged_photo_paths?.length ?? scans.length,
      imageScans: scans,
      violationCodes: distinctCodes(scans),
      aiDecisions: scans.map((scan) => stringField(scan.decision) ?? "unknown"),
      previews,
      auditOnly: false,
    };
  }));

  const automaticItems: FeedItem[] = audits.map((log) => {
    const approved = log.action_type === "image_policy_approval";
    const pinId = approved && log.target_table === "pins" && /^\d+$/.test(log.target_id ?? "")
      ? Number(log.target_id) : null;
    const pin = pinId === null ? null : pins.get(pinId) ?? null;
    const submitter = parseAuditField(log.description ?? "", "submitter_id") ??
      (!approved && log.target_table === "profiles" ? log.target_id : null) ??
      pin?.creator_id ?? null;
    const count = Number(parseAuditField(log.description ?? "", "images"));
    return {
      id: `audit:${log.id}`,
      source: "automated",
      status: approved ? "approved" : "rejected",
      decisionBy: "ai",
      title: approved ? pin?.title ?? `Auto-approved pin #${pinId ?? "unknown"}`
        : "Automatically rejected photo submission",
      description: approved ? pin?.description ?? null : null,
      category: approved ? pin?.category ?? null : auditList(log.description ?? "", "categories").join(", ") || null,
      submittedBy: submitter,
      submitterName: displayProfile(submitter),
      reviewerId: null,
      reviewerName: null,
      pinId,
      reviewId: null,
      createdAt: log.created_at,
      reviewedAt: log.created_at,
      reviewNotes: null,
      photoCount: Number.isInteger(count) && count > 0 ? Math.min(count, MAX_PHOTOS) : 0,
      imageScans: [],
      violationCodes: auditList(log.description ?? "", "violation_codes"),
      aiDecisions: auditList(log.description ?? "", "ai_decisions"),
      previews: approved ? trustedPublicPhotos(pin?.photo_url ?? null) : [],
      auditOnly: true,
    };
  });

  const activityTime = (item: FeedItem) =>
    Date.parse((item.status === "pending" ? item.createdAt : item.reviewedAt) ?? item.createdAt ?? "") || 0;
  const items = [...queueItems, ...automaticItems]
    .sort((a, b) => activityTime(b) - activityTime(a))
    .slice((page - 1) * FEED_PAGE_SIZE, page * FEED_PAGE_SIZE);
  const total = counts ? counts[view] : null;
  return success({
    items,
    counts,
    pagination: {
      page, pageSize: FEED_PAGE_SIZE, total,
      hasNext: total === null ? items.length === FEED_PAGE_SIZE : page * FEED_PAGE_SIZE < total,
      hasPrevious: page > 1,
    },
    previewExpiresInSeconds: SIGNED_PREVIEW_TTL_SECONDS,
  });
}

/** A reviewer-only listing, with short-lived signed URLs for private previews. */
export async function GET(request: NextRequest) {
  try {
    const reviewer = await requireReviewer();
    if (reviewer.error) return reviewer.error;

    // New dashboard feed. Legacy ?status=... remains supported for older clients.
    if (request.nextUrl.searchParams.has("view")) {
      const parsedView = feedViewSchema.safeParse(request.nextUrl.searchParams.get("view"));
      if (!parsedView.success) return failure("Invalid feed view.", 400, "INVALID_VIEW");
      const rawPage = request.nextUrl.searchParams.get("page") ?? "1";
      if (!/^\d+$/.test(rawPage)) return failure("Invalid page.", 400, "INVALID_PAGE");
      const page = Number(rawPage);
      if (!Number.isSafeInteger(page) || page < 1 || page > MAX_FEED_PAGE) {
        return failure("Page is out of range.", 400, "INVALID_PAGE");
      }
      return await getModerationFeed(parsedView.data, page);
    }

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
        // An RPC can commit successfully before its response is lost.
        // Only recover a rejection attributed to this exact reviewer.
        console.error("[PIN REVIEW] Rejection response failed:", errorMessage);
        try {
          const current = await getQueueRow(row.id);
          if (current?.status === "rejected" && current.reviewer_id === reviewer.id) {
            await recordDecision(reviewer.id, row, "rejected", null, notes);
            await removeStorageObjects(STAGING_BUCKET, row.staged_photo_paths);
            return success({ status: "rejected", reviewId });
          }
        } catch (reconcileError) {
          console.error("[PIN REVIEW] Rejection reconciliation failed:", reconcileError);
        }
        return failure("Rejection status could not be confirmed. Refresh the queue before retrying.", 503, "REVIEW_STATUS_UNCERTAIN");
      }
      if (!result?.success) {
        return failure("This submission has already been reviewed.", 409, result?.code ?? "ALREADY_RESOLVED");
      }
      await recordDecision(reviewer.id, row, "rejected", null, notes);
      await removeStorageObjects(STAGING_BUCKET, row.staged_photo_paths);
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
          if (!pinError && publishedPin?.photo_url === publicUrls.join(",") &&
              current.reviewer_id === reviewer.id) {
            await recordDecision(reviewer.id, row, "approved", current.pin_id, notes);
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

    await recordDecision(reviewer.id, row, "approved", result.pinId ?? null, notes);
    await removeStorageObjects(STAGING_BUCKET, row.staged_photo_paths);
    return success({ status: "approved", reviewId, pinId: result.pinId ?? null });
  } catch (error) {
    console.error("[PIN REVIEW] POST failed:", error);
    return failure("Unable to process this review right now.", 500, "INTERNAL_ERROR");
  }
}
