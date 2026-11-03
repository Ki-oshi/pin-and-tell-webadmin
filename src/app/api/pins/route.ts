import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  z,
} from "zod";

import {
  getSupabaseAdmin,
} from "@/lib/supabase/admin";

import {
  moderatePinContent,
} from "@/lib/moderation/content-moderation";

import {
  applyModerationEnforcement,
} from "@/lib/moderation/enforcement";

import {
  ImageModerationError,
  moderatePinImageBytes,
  type ImageModerationResult,
} from "@/lib/moderation/image-moderation";

// All new PHOTO pins must use private staging. Older Android clients using
// public photoUrl must upgrade; publishing their photos would expose unscanned
// bytes before either AI detector could evaluate them.
const STAGING_BUCKET = "pin-photo-staging";
const PUBLIC_BUCKET = "pin-photos";
const MAX_STAGED_PHOTOS = 3;

/* ============================================================
   ROUTE CONFIGURATION
============================================================ */

export const runtime =
  "nodejs";

// Allow the external vision model sufficient time to respond on deployments
// that support extended function durations.
export const maxDuration = 60;

export const dynamic =
  "force-dynamic";

/* ============================================================
   REQUEST VALIDATION
============================================================ */

const createPinSchema =
  z.object({
    title:
      z.string()
        .trim()
        .min(
          1,
          "Pin title is required.",
        )
        .max(
          150,
          "Pin title is too long.",
        ),

    description:
      z.string()
        .trim()
        .max(
          2000,
          "Pin description is too long.",
        )
        .nullable()
        .optional(),

    latitude:
      z.number()
        .min(
          -90,
          "Invalid latitude.",
        )
        .max(
          90,
          "Invalid latitude.",
        ),

    longitude:
      z.number()
        .min(
          -180,
          "Invalid longitude.",
        )
        .max(
          180,
          "Invalid longitude.",
        ),

    category:
      z.string()
        .trim()
        .min(
          1,
          "Pin category is required.",
        )
        .max(
          100,
          "Pin category is too long.",
        )
        .default(
          "General",
        ),

    subcategory:
      z.string()
        .trim()
        .max(
          100,
          "Pin subcategory is too long.",
        )
        .nullable()
        .optional(),

    photoUrl:
      z.string()
        .trim()
        .url(
          "Invalid photo URL.",
        )
        .max(
          2048,
          "Photo URL is too long.",
        )
        .nullable()
        .optional(),

    // New Android versions upload here BEFORE calling /api/pins.
    // These are Storage OBJECT PATHS, not signed or public URLs.
    stagedPhotoPaths: z.array(z.string().trim().min(1).max(250))
      .max(MAX_STAGED_PHOTOS)
      .optional(),
  });

/* ============================================================
   TYPES
============================================================ */

type ExistingBan = {
  id:
    number | string;

  ban_type:
    string;

  duration_type:
    string;

  duration_value:
    number | null;

  reason:
    string;

  status:
    string;

  starts_at:
    string;

  expires_at:
    string | null;
};

/* ============================================================
   JSON RESPONSE HELPERS
============================================================ */

function jsonError(
  message:
    string,

  status:
    number,

  extra?:
    Record<
      string,
      unknown
    >,
) {
  return NextResponse.json(
    {
      success:
        false,

      error:
        message,

      ...extra,
    },

    {
      status,
    },
  );
}

function jsonSuccess(
  data:
    Record<
      string,
      unknown
    >,

  status =
    200,
) {
  return NextResponse.json(
    {
      success:
        true,

      ...data,
    },

    {
      status,
    },
  );
}

/* ============================================================
   READ BEARER TOKEN
============================================================ */

function getBearerToken(
  request:
    NextRequest,
): string | null {
  const authorization =
    request.headers.get(
      "authorization",
    );

  if (
    !authorization
  ) {
    return null;
  }

  const [
    scheme,
    token,
  ] =
    authorization
      .trim()
      .split(
        /\s+/,
      );

  if (
    scheme?.toLowerCase() !==
      "bearer" ||
    !token
  ) {
    return null;
  }

  return token;
}

/* ============================================================
   AUTHENTICATE SUPABASE USER
============================================================ */

async function authenticateUser(
  request:
    NextRequest,
) {
  const token =
    getBearerToken(
      request,
    );

  if (
    !token
  ) {
    return {
      user:
        null,

      error:
        "Authentication required.",
    };
  }

  const supabase =
    getSupabaseAdmin();

  const {
    data,
    error,
  } =
    await supabase.auth
      .getUser(
        token,
      );

  if (
    error ||
    !data.user
  ) {
    console.warn(
      "[PIN API] Invalid user authentication token:",
      error?.message ??
        "unknown",
    );

    return {
      user:
        null,

      error:
        "Your session is invalid or has expired.",
    };
  }

  return {
    user:
      data.user,

    error:
      null,
  };
}

/* ============================================================
   EXPIRE OLD BAN RECORDS
============================================================ */

async function expireElapsedBans(
  userId:
    string,
): Promise<void> {
  const supabase =
    getSupabaseAdmin();

  const now =
    new Date()
      .toISOString();

  const {
    error,
  } =
    await supabase
      .from(
        "user_bans",
      )
      .update({
        status:
          "expired",

        updated_at:
          now,
      })
      .eq(
        "user_id",
        userId,
      )
      .eq(
        "status",
        "active",
      )
      .not(
        "expires_at",
        "is",
        null,
      )
      .lte(
        "expires_at",
        now,
      );

  if (
    error
  ) {
    console.error(
      "[PIN API] Failed to expire elapsed bans:",
      error,
    );
  }
}

/* ============================================================
   CHECK ACTIVE BAN
============================================================ */

async function getActiveBan(
  userId:
    string,
): Promise<
  ExistingBan | null
> {
  await expireElapsedBans(
    userId,
  );

  const supabase =
    getSupabaseAdmin();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "user_bans",
      )
      .select(`
        id,
        ban_type,
        duration_type,
        duration_value,
        reason,
        status,
        starts_at,
        expires_at
      `)
      .eq(
        "user_id",
        userId,
      )
      .eq(
        "status",
        "active",
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        },
      )
      .limit(
        1,
      )
      .maybeSingle();

  if (
    error
  ) {
    console.error(
      "[PIN API] Failed to check user ban:",
      error,
    );

    throw new Error(
      "Unable to verify account restriction status.",
    );
  }

  return (
    data as
      | ExistingBan
      | null
  );
}

/* ============================================================
   CHECK PROFILE STATUS
============================================================ */

async function getProfileStatus(
  userId:
    string,
): Promise<
  string | null
> {
  const supabase =
    getSupabaseAdmin();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "profiles",
      )
      .select(
        "status",
      )
      .eq(
        "id",
        userId,
      )
      .maybeSingle();

  if (
    error
  ) {
    console.error(
      "[PIN API] Failed to read profile status:",
      error,
    );

    throw new Error(
      "Unable to verify account status.",
    );
  }

  if (
    !data
  ) {
    return null;
  }

  return data.status ??
    "active";
}

/* ============================================================
   FORMAT BAN RESPONSE
============================================================ */

function getBanMessage(
  ban:
    ExistingBan,
): string {
  if (
    ban.ban_type ===
      "permanent_ban" ||
    ban.duration_type ===
      "permanent"
  ) {
    return (
      "Your account has been permanently restricted from publishing content on PIN & TELL."
    );
  }

  if (
    ban.expires_at
  ) {
    const expires =
      new Date(
        ban.expires_at,
      );

    if (
      !Number.isNaN(
        expires.getTime(),
      )
    ) {
      return (
        "Your account is temporarily suspended from publishing content until " +
        expires.toLocaleString(
          "en-PH",
          {
            timeZone:
              "Asia/Manila",

            dateStyle:
              "medium",

            timeStyle:
              "short",
          },
        ) +
        "."
      );
    }
  }

  return (
    "Your account is currently restricted from publishing content on PIN & TELL."
  );
}

/* ============================================================
   PRIVATE STAGING AND IMAGE MODERATION
============================================================ */

type StagedScan = {
  path: string;
  bytes: Uint8Array;
  scan: ImageModerationResult;
};

// Never trust a client-supplied Storage path. Users can ONLY submit objects
// inside their own top-level UUID directory. No URLs or traversal segments.
function validateOwnedPhotoPath(path: string, userId: string): boolean {
  const bits = path.split("/");
  if (bits.length !== 2 || bits[0] !== userId) return false;
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,180}\.(jpg|jpeg|png|webp)$/i.test(bits[1])
    && !bits[1].includes("..");
}

async function scanStagedPhoto(path: string): Promise<StagedScan> {
  const storage = getSupabaseAdmin().storage.from(STAGING_BUCKET);
  const { data, error } = await storage.download(path);
  if (error || !data) {
    throw new ImageModerationError(
      "IMAGE_FETCH_FAILED",
      "The staged photo could not be retrieved. Upload the photo again.",
    );
  }
  const bytes = new Uint8Array(await data.arrayBuffer());
  // ONE OpenRouter vision call evaluates all nine categories.
  // Fail closed: any API error or invalid classification prevents publication.
  const scan = await moderatePinImageBytes(bytes);
  return { path, bytes, scan };
}

async function safelyRemoveStagedPhotos(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await getSupabaseAdmin().storage.from(STAGING_BUCKET).remove(paths);
  if (error) console.error("[PIN API] Staging cleanup failed:", error);
}

async function safelyRemovePublishedPhotos(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await getSupabaseAdmin().storage.from(PUBLIC_BUCKET).remove(paths);
  if (error) console.error("[PIN API] Approved-photo rollback failed:", error);
}

/**
 * Three-way server policy. No photo becomes public before a valid AI scan.
 * A model score is only an estimate: reject only narrowly defined violations,
 * queue ambiguous/contradictory cases, auto-approve clean high-confidence scans.
 */
type PhotoPolicyDecision = "allow" | "review" | "block";

const MIN_CLEAN_PHOTO_CONFIDENCE = 0.95;
const MIN_CONFIRMED_VIOLATION_CONFIDENCE = 0.99;
const AUTO_REJECT_VIOLATION_CODES = new Set([
  "exposed_genitals", "sexual_activity", "sexually_explicit_content",
  "graphic_injury", "gore_or_mutilation", "self_harm_instructions",
  "middle_finger",
]);

function decidePhotoPolicy(scan: ImageModerationResult): PhotoPolicyDecision {
  if (scan.decision === "block") return "block";

  // Do not reject on a bare model score, a backstop inference, or a disputed
  // gesture. Require an explicit high-severity violation with visual evidence.
  const confirmedViolation = scan.decision === "review" &&
    !scan.uncertain &&
    scan.overallConfidence >= MIN_CLEAN_PHOTO_CONFIDENCE &&
    scan.findings.some((finding) =>
      finding.source === "model" &&
      finding.severity === "high" &&
      Number.isFinite(finding.confidence) &&
      finding.confidence >= MIN_CONFIRMED_VIOLATION_CONFIDENCE &&
      AUTO_REJECT_VIOLATION_CODES.has(finding.violation) &&
      typeof finding.evidence === "string" &&
      finding.evidence.trim().length > 0 &&
      (finding.violation !== "middle_finger" || (
        scan.gestureCheck?.status === "middle_finger" &&
        scan.gestureCheck.confidence >= MIN_CONFIRMED_VIOLATION_CONFIDENCE &&
        scan.gestureCheck.evidence.trim().length > 0
      ))
    );
  if (confirmedViolation) return "block";

  const completelyClean = scan.decision === "allow" &&
    !scan.flagged &&
    !scan.uncertain &&
    !scan.exposedBreastsVisible &&
    scan.gestureCheck?.status === "none" &&
    scan.gestureCheck.confidence >= MIN_CLEAN_PHOTO_CONFIDENCE &&
    scan.findings.length === 0 &&
    scan.categories.length === 0 &&
    Number.isFinite(scan.overallConfidence) &&
    scan.overallConfidence >= MIN_CLEAN_PHOTO_CONFIDENCE;

  return completelyClean ? "allow" : "review";
}

async function writeImageDecisionAudit(
  userId: string,
  decision: PhotoPolicyDecision,
  scans: ImageModerationResult[],
  target?: { table: string; id: string | number },
): Promise<void> {
  try {
    const actionType = decision === "block" ? "image_policy_rejection" :
      decision === "review" ? "image_policy_review" :
      "image_policy_approval";
    const { error } = await getSupabaseAdmin().from("logs").insert({
      // This is a system action. User ID is held in the target or description;
      // do not incorrectly attribute an AI decision to an administrator.
      user_id: null,
      actor_type: "system",
      action_type: actionType,
      description: [
        `Automated pin image moderation: ${decision}.`,
        `submitter_id=${userId}`,
        `images=${scans.length}`,
        `ai_decisions=${scans.map(s => s.decision).join(",")}`,
        `models=${[...new Set(scans.map(s => s.model))].join(",")}`,
        `categories=${[...new Set(scans.flatMap(s => s.categories))].join(",") || "none"}`,
        `violation_codes=${[...new Set(scans.flatMap(s => s.findings.map(f => f.violation)))].join(",") || "none"}`,
        `gestures=${scans.map(s => s.gestureCheck?.status ?? "missing").join(",")}`,
      ].join(" ").slice(0, 2000),
      target_table: target?.table ?? "profiles",
      target_id: String(target?.id ?? userId),
      ip_address: null,
      user_agent: null,
      created_at: new Date().toISOString(),
    });
    if (error) console.error("[PIN API] Image moderation audit failed:", error);
  } catch (error) {
    // An audit failure must not change an already-committed moderation outcome.
    console.error("[PIN API] Image moderation audit failed:", error);
  }
}

function imageErrorStatus(error: ImageModerationError): number {
  if (error.code === "IMAGE_MODERATION_NOT_CONFIGURED" ||
      error.code === "IMAGE_MODERATION_UNAVAILABLE" ||
      error.code === "IMAGE_MODERATION_INVALID_RESULT" ||
      error.code === "IMAGE_MODERATION_PROVIDER_NOT_APPROVED" ||
      error.code === "IMAGE_FETCH_FAILED") return 503;
  if (error.code === "IMAGE_TOO_LARGE") return 413;
  return 422;
}

/* ============================================================
   POST /api/pins
============================================================ */

export async function POST(
  request:
    NextRequest,
) {
  try {
    /* --------------------------------------------------------
       1. Authenticate
    -------------------------------------------------------- */

    const authentication =
      await authenticateUser(
        request,
      );

    if (
      !authentication.user
    ) {
      return jsonError(
        authentication.error ??
          "Authentication required.",

        401,

        {
          code:
            "AUTHENTICATION_REQUIRED",
        },
      );
    }

    const user =
      authentication.user;

    /* --------------------------------------------------------
       2. Validate account profile
    -------------------------------------------------------- */

    const profileStatus =
      await getProfileStatus(
        user.id,
      );

    if (
      !profileStatus
    ) {
      return jsonError(
        "Your PIN & TELL profile could not be found.",

        403,

        {
          code:
            "PROFILE_NOT_FOUND",
        },
      );
    }

    if (
      profileStatus ===
      "banned"
    ) {
      return jsonError(
        "Your account is permanently restricted.",

        403,

        {
          code:
            "ACCOUNT_BANNED",
        },
      );
    }

    /* --------------------------------------------------------
       3. Check existing active bans
    -------------------------------------------------------- */

    const activeBan =
      await getActiveBan(
        user.id,
      );

    if (
      activeBan
    ) {
      return jsonError(
        getBanMessage(
          activeBan,
        ),

        403,

        {
          code:
            "ACCOUNT_RESTRICTED",

          restriction: {
            type:
              activeBan.ban_type,

            expiresAt:
              activeBan.expires_at,

            reason:
              activeBan.reason,
          },
        },
      );
    }

    /*
     * If the profile itself is suspended
     * even though no automatic ban record
     * is active, respect that state.
     *
     * This is important because an admin
     * may manually suspend an account.
     */
    if (
      profileStatus ===
      "suspended"
    ) {
      return jsonError(
        "Your account is currently suspended from publishing content.",

        403,

        {
          code:
            "ACCOUNT_SUSPENDED",
        },
      );
    }

    /* --------------------------------------------------------
       4. Read body
    -------------------------------------------------------- */

    let requestBody:
      unknown;

    try {
      requestBody =
        await request.json();
    } catch {
      return jsonError(
        "Invalid request body.",

        400,

        {
          code:
            "INVALID_JSON",
        },
      );
    }

    /* --------------------------------------------------------
       5. Validate pin
    -------------------------------------------------------- */

    const parsed =
      createPinSchema.safeParse(
        requestBody,
      );

    if (
      !parsed.success
    ) {
      const firstIssue =
        parsed.error
          .issues[0];

      return jsonError(
        firstIssue
          ?.message ??
          "Invalid pin information.",

        400,

        {
          code:
            "VALIDATION_ERROR",

          field:
            firstIssue
              ?.path
              .join(
                ".",
              ) ??
            null,
        },
      );
    }

    const pin =
      parsed.data;

    /* --------------------------------------------------------
       6. Moderate title + description
    -------------------------------------------------------- */

    const moderation =
      moderatePinContent({
        title:
          pin.title,

        description:
          pin.description ??
          null,
      });

    /* --------------------------------------------------------
       7. Violation detected
    -------------------------------------------------------- */

    if (
      moderation.blocked
    ) {
      const enforcement =
        await applyModerationEnforcement({
          userId:
            user.id,

          source:
            "pin",

          title:
            pin.title,

          description:
            pin.description ??
            null,

          moderation,
        });

      /*
       * The pin is intentionally NOT
       * inserted into public.pins.
       */
      return jsonError(
        enforcement.message,

        422,

        {
          code:
            "CONTENT_POLICY_VIOLATION",

          moderation: {
            blocked:
              true,

            severity:
              moderation.maxSeverity,

            reviewRequired:
              enforcement.reviewRequired,

            strikeCount:
              enforcement.strikeCount,

            strikeRecorded:
              enforcement.recorded,

            duplicateSubmission:
              enforcement.duplicate,

            action:
              enforcement.action,

            suspensionDays:
              enforcement.suspensionDays,

            suspendedUntil:
              enforcement.suspendedUntil,

            reportId:
              enforcement.reportId,
          },
        },
      );
    }

    /* --------------------------------------------------------
       8. Screen any attached photo BEFORE publishing

       All photo-bearing pins must use stagedPhotoPaths in a PRIVATE
       bucket. Public photoUrl uploads are rejected with HTTP 426.
    -------------------------------------------------------- */

    const supabase = getSupabaseAdmin();
    const stagedPaths = pin.stagedPhotoPaths ?? [];
    const legacyUrl = pin.photoUrl ?? null;

    if (new Set(stagedPaths).size !== stagedPaths.length ||
        stagedPaths.some((path) => !validateOwnedPhotoPath(path, user.id))) {
      return jsonError("Invalid staged photo path.", 400, {
        code: "INVALID_STAGED_PHOTO_PATH",
      });
    }

    if (stagedPaths.length > 0 && legacyUrl) {
      return jsonError("Choose either staged photos or a legacy photo URL, not both.", 400, {
        code: "PHOTO_INPUT_CONFLICT",
      });
    }

    if (legacyUrl) {
      return jsonError("Please update PIN & TELL to upload photos securely.", 426, {
        code: "SECURE_PHOTO_UPLOAD_REQUIRED",
      });
    }

    // A public staging bucket would expose photos before screening; abort.
    if (stagedPaths.length > 0) {
      const { data: bucket, error: bucketError } =
        await supabase.storage.getBucket(STAGING_BUCKET);
      if (bucketError || !bucket || bucket.public !== false) {
        console.error("[PIN API] Staging bucket unavailable or PUBLIC.");
        return jsonError("Private photo screening is unavailable. Please contact support.", 503, {
          code: "STAGING_BUCKET_NOT_PRIVATE",
        });
      }
    }

    let stagedScans: StagedScan[] = [];
    try {
      // Each private photo receives one comprehensive OpenRouter scan.
      stagedScans = await Promise.all(stagedPaths.map(scanStagedPhoto));
    } catch (error) {
      if (error instanceof ImageModerationError) {
        return jsonError(error.message, imageErrorStatus(error), { code: error.code });
      }
      console.error("[PIN API] Image screening failed:", error);
      return jsonError("Unable to screen the photo. Please try again later.", 503, {
        code: "IMAGE_MODERATION_UNAVAILABLE",
      });
    }

    // Each submitted photo must have a completed scan. Any inconsistency
    // fails closed rather than reaching public Storage.
    if (stagedScans.length !== stagedPaths.length) {
      return jsonError("Photo screening did not complete.", 503, {
        code: "IMAGE_MODERATION_INCOMPLETE",
      });
    }
    const imageScans = stagedScans.map((entry) => entry.scan);
    const policyDecisions = imageScans.map(decidePhotoPolicy);
    // When multiple photos are attached, the strictest outcome wins.
    // BLOCK > REVIEW > ALLOW; nothing is published unless ALL are clean.
    const blocked = policyDecisions.includes("block");
    // When automatic photo approval is disabled, every non-blocked
    // photo submission must go to manual administrator review.
    // No-photo pins are unaffected.
    const photoAutoApprovalEnabled =
      process.env.PIN_IMAGE_AUTO_APPROVAL_ENABLED === "true";

    const requiresReview = !blocked && imageScans.length > 0 &&
      (!photoAutoApprovalEnabled || policyDecisions.includes("review"));
    const blockingScans = imageScans.filter((_, index) =>
      policyDecisions[index] === "block"
    );

    if (blocked) {
      await writeImageDecisionAudit(user.id, "block", imageScans);
      // Automatic rejection does not incorrectly reuse TEXT strike types.
      // Avoid incorrect penalties; the existing TEXT strike flow is untouched.
      if (stagedPaths.length > 0) await safelyRemoveStagedPhotos(stagedPaths);
      return jsonError("This photo was automatically rejected by the image safety policy.", 422, {
        code: "IMAGE_POLICY_VIOLATION",
        status: "rejected",
        moderation: {
          blocked: true,
          decision: "block",
          aiDecisions: imageScans.map(scan => scan.decision),
          categories: [...new Set(blockingScans.flatMap(scan => scan.categories))],
          // Includes high-confidence violation overrides even if the model said REVIEW.
          violations: blockingScans
            .flatMap(scan => scan.findings.map(finding => ({
              category: finding.category,
              violation: finding.violation,
              policyReason: finding.policyReason,
              evidence: finding.evidence,
              severity: finding.severity,
            }))),
          strikeRecorded: false,
        },
      });
    }

    if (requiresReview) {
      const { data: queued, error: queueError } = await supabase
        .from("pin_moderation_queue")
        .insert({
          user_id: user.id,
          operation: "create",
          submission_payload: {
            title: pin.title,
            description: pin.description ?? null,
            latitude: pin.latitude,
            longitude: pin.longitude,
            category: pin.category,
            subcategory: pin.subcategory ?? null,
          },
          staged_photo_paths: stagedPaths,
          image_scan_results: stagedScans.map(({ scan }) => ({
            decision: scan.decision,
            categories: scan.categories,
            scores: scan.scores,
            sha256: scan.sha256,
            model: scan.model,
            description: scan.description,
            reason: scan.reason,
            findings: scan.findings,
            exposedBreastsVisible: scan.exposedBreastsVisible,
            gestureCheck: scan.gestureCheck ?? null,
            overallConfidence: scan.overallConfidence,
            uncertain: scan.uncertain,
          })),
          status: "pending",
        })
        .select("id")
        .single();

      if (queueError || !queued) {
        console.error("[PIN API] Failed to queue photo review:", queueError);
        return jsonError("Unable to submit the photo for review. Please retry.", 503, {
          code: "IMAGE_REVIEW_QUEUE_FAILED",
        });
      }
      await writeImageDecisionAudit(user.id, "review", imageScans, {
        table: "pin_moderation_queue",
        id: queued.id,
      });
      return jsonSuccess({
        status: "pending_review",
        message: "Your photo pin requires moderator approval.",
        reviewId: queued.id,
        moderation: {
          decision: "review",
          aiDecisions: imageScans.map(scan => scan.decision),
        },
        pin: null,
      }, 202);
    }

    // Only fully clean AI-allowed photos (or photo-less pins) reach here.
    // A failed database insert rolls back any freshly published photo objects.
    const publishedPaths: string[] = [];
    const publishedUrls: string[] = [];
    if (stagedScans.length > 0) {
      for (const entry of stagedScans) {
        const extension = entry.scan.mimeType === "image/jpeg" ? "jpg" :
          entry.scan.mimeType === "image/png" ? "png" : "webp";
        const destinationPath = `${user.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from(PUBLIC_BUCKET)
          .upload(destinationPath, entry.bytes, {
            contentType: entry.scan.mimeType,
            upsert: false,
          });
        if (uploadError) {
          console.error("[PIN API] Approved photo could not be published:", uploadError);
          await safelyRemovePublishedPhotos(publishedPaths);
          return jsonError("Unable to publish the approved photo. Please retry.", 503, {
            code: "APPROVED_PHOTO_UPLOAD_FAILED",
          });
        }
        publishedPaths.push(destinationPath);
        const { data: urlData } = supabase.storage.from(PUBLIC_BUCKET)
          .getPublicUrl(destinationPath);
        publishedUrls.push(urlData.publicUrl);
      }
    }

    const photoUrlForDatabase = publishedUrls.length > 0
      ? publishedUrls.join(",")
      : legacyUrl;

    /* --------------------------------------------------------
       9. Insert approved pin
    -------------------------------------------------------- */

    const {
      data:
        createdPin,

      error:
        insertError,
    } =
      await supabase
        .from(
          "pins",
        )
        .insert({
          title:
            pin.title,

          description:
            pin.description ??
            null,

          latitude:
            pin.latitude,

          longitude:
            pin.longitude,

          category:
            pin.category,

          creator_email:
            user.email ??
            null,

          photo_url:
            photoUrlForDatabase,

          creator_id:
            user.id,

          subcategory:
            pin.subcategory ??
            null,
        })
        .select(`
          id,
          title,
          description,
          latitude,
          longitude,
          category,
          created_at,
          creator_email,
          photo_url,
          creator_id,
          subcategory
        `)
        .single();

    if (
      insertError ||
      !createdPin
    ) {
      console.error(
        "[PIN API] Failed to create pin:",
        insertError,
      );
      await safelyRemovePublishedPhotos(publishedPaths);

      return jsonError(
        "Unable to publish the pin right now. Please try again.",

        500,

        {
          code:
            "PIN_CREATION_FAILED",
        },
      );
    }

    if (stagedPaths.length > 0) {
      // Best effort only: a successful public pin must remain published
      // even if deleting the old private staged upload fails.
      await safelyRemoveStagedPhotos(stagedPaths);
    }

    // Record the AI auto-approval as a SYSTEM event distinct from the
    // normal user pin_created event, after the pin exists successfully.
    if (imageScans.length > 0) {
      await writeImageDecisionAudit(user.id, "allow", imageScans, {
        table: "pins",
        id: createdPin.id,
      });
    }

    /* --------------------------------------------------------
       10. Audit successful pin creation
    -------------------------------------------------------- */

    const {
      error:
        logError,
    } =
      await supabase
        .from(
          "logs",
        )
        .insert({
          user_id:
            user.id,

          actor_type:
            "user",

          action_type:
            "pin_created",

          description:
            imageScans.length > 0
              ? "User created a map pin; photo screening auto-approved all attached images."
              : "User created a map pin.",

          target_table:
            "pins",

          target_id:
            String(
              createdPin.id,
            ),

          ip_address:
            null,

          user_agent:
            request.headers.get(
              "user-agent",
            ),

          created_at:
            new Date()
              .toISOString(),
        });

    if (
      logError
    ) {
      /*
       * Audit failure should not undo an
       * otherwise successful pin.
       */
      console.error(
        "[PIN API] Pin created but audit logging failed:",
        logError,
      );
    }

    /* --------------------------------------------------------
       11. Success
    -------------------------------------------------------- */

    return jsonSuccess(
      {
        message:
          "Pin automatically approved and published successfully.",

        status: "published",

        moderation: imageScans.length > 0 ? {
          decision: "allow",
          aiDecisions: imageScans.map(scan => scan.decision),
        } : null,

        pin:
          createdPin,
      },

      201,
    );
  } catch (
    error
  ) {
    console.error(
      "[PIN API] Unexpected pin creation error:",
      error,
    );

    return jsonError(
      "Unable to process the pin right now. Please try again.",

      500,

      {
        code:
          "INTERNAL_ERROR",
      },
    );
  }
}

/* ============================================================
   OTHER METHODS
============================================================ */

export async function GET() {
  return jsonError(
    "Method not supported by this endpoint.",

    405,

    {
      code:
        "METHOD_NOT_ALLOWED",
    },
  );
}
