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
  moderatePinImage,
  moderatePinImageBytes,
  type ImageModerationResult,
} from "@/lib/moderation/image-moderation";

// Until the Android app has been updated, old public-photo submissions
// can be scanned as a compatibility fallback. At the coordinated cutover,
// set PIN_MODERATION_REQUIRE_STAGING=true to reject that unsafe path.
const REQUIRE_STAGING = process.env.PIN_MODERATION_REQUIRE_STAGING === "true";
const STAGING_BUCKET = "pin-photo-staging";
const PUBLIC_BUCKET = "pin-photos";
const MAX_STAGED_PHOTOS = 3;

/* ============================================================
   ROUTE CONFIGURATION
============================================================ */

export const runtime =
  "nodejs";

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

async function writeImageDecisionAudit(
  userId: string,
  decision: "block" | "review",
  scans: ImageModerationResult[],
): Promise<void> {
  const { error } = await getSupabaseAdmin().from("logs").insert({
    user_id: null,
    actor_type: "system",
    action_type: decision === "block" ? "image_policy_rejection" : "image_policy_review",
    description: [
      `Automated pin image moderation: ${decision}.`,
      `images=${scans.length}`,
      `categories=${[...new Set(scans.flatMap(s => s.categories))].join(",") || "unknown"}`,
    ].join(" "),
    target_table: "profiles",
    target_id: userId,
    ip_address: null,
    user_agent: null,
    created_at: new Date().toISOString(),
  });
  if (error) console.error("[PIN API] Image moderation audit failed:", error);
}

function imageErrorStatus(error: ImageModerationError): number {
  if (error.code === "IMAGE_MODERATION_NOT_CONFIGURED" ||
      error.code === "IMAGE_MODERATION_UNAVAILABLE" ||
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

       New Android app: stagedPhotoPaths (private bucket).
       Old Android app: photoUrl (legacy compatibility only).
       The latter is NOT a secure staging flow; require staging
       at cutover via PIN_MODERATION_REQUIRE_STAGING=true.
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

    if (legacyUrl && REQUIRE_STAGING) {
      return jsonError("Please update PIN & TELL to upload photos securely.", 426, {
        code: "SECURE_PHOTO_UPLOAD_REQUIRED",
      });
    }

    let stagedScans: StagedScan[] = [];
    let legacyScan: ImageModerationResult | null = null;
    try {
      if (stagedPaths.length > 0) {
        // Parallel scans reduce latency for multi-photo pins while the
        // schema enforces a small fixed limit to bound memory / work.
        stagedScans = await Promise.all(stagedPaths.map(scanStagedPhoto));
      } else if (legacyUrl) {
        // Compatibility mode: scans a PUBLIC image already uploaded by the
        // old Android app. Only an Android update + RLS cutover fixes exposure.
        legacyScan = await moderatePinImage(legacyUrl);
      }
    } catch (error) {
      if (error instanceof ImageModerationError) {
        return jsonError(error.message, imageErrorStatus(error), {
          code: error.code,
        });
      }
      console.error("[PIN API] Image screening failed:", error);
      return jsonError("Unable to screen the photo. Please try again later.", 503, {
        code: "IMAGE_MODERATION_UNAVAILABLE",
      });
    }

    const imageScans = [
      ...stagedScans.map((entry) => entry.scan),
      ...(legacyScan ? [legacyScan] : []),
    ];
    const blocked = imageScans.some((scan) => scan.decision === "block");
    const requiresReview = imageScans.some((scan) => scan.decision === "review");

    if (blocked) {
      await writeImageDecisionAudit(user.id, "block", imageScans);
      // Automatic image rejection is not yet mapped to text-only strike types.
      // Avoid incorrect penalties; the existing TEXT strike flow is untouched.
      if (stagedPaths.length > 0) await safelyRemoveStagedPhotos(stagedPaths);
      return jsonError("This photo cannot be published under our image policy.", 422, {
        code: "IMAGE_POLICY_VIOLATION",
        moderation: { blocked: true, strikeRecorded: false },
      });
    }

    if (requiresReview) {
      if (stagedPaths.length === 0) {
        // Legacy photos cannot be privately held because they are already
        // in a public bucket. Fail closed until the Android client upgrades.
        await writeImageDecisionAudit(user.id, "review", imageScans);
        return jsonError("This photo requires private review. Please use the updated app.", 422, {
          code: "PRIVATE_IMAGE_REVIEW_REQUIRED",
        });
      }

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
          image_scan_results: imageScans.map((scan) => ({
            decision: scan.decision,
            categories: scan.categories,
            scores: scan.scores,
            sha256: scan.sha256,
            model: scan.model,
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
      await writeImageDecisionAudit(user.id, "review", imageScans);
      return jsonSuccess({
        status: "pending_review",
        message: "Your photo pin is awaiting moderator approval.",
        reviewId: queued.id,
        pin: null,
      }, 202);
    }

    // Only approved photos reach the existing public pin-photos bucket.
    // If the database insert fails, roll back these new public objects.
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
            "User created a map pin.",

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
          "Pin published successfully.",

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