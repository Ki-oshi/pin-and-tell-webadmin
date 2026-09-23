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
       8. Insert clean pin
    -------------------------------------------------------- */

    const supabase =
      getSupabaseAdmin();

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
            pin.photoUrl ??
            null,

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

      return jsonError(
        "Unable to publish the pin right now. Please try again.",

        500,

        {
          code:
            "PIN_CREATION_FAILED",
        },
      );
    }

    /* --------------------------------------------------------
       9. Audit successful pin creation
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
       10. Success
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