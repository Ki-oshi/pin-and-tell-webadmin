import "server-only";

import {
  getSupabaseAdmin,
} from "@/lib/supabase/admin";

import {
  normalizeModerationText,
  type ModerationResult,
} from "@/lib/moderation/content-moderation";

/* ============================================================
   CONFIGURATION
============================================================ */

const MODERATION_WINDOW_DAYS =
  90;

/*
 * Prevent users from accidentally
 * receiving multiple strikes by repeatedly
 * pressing submit on the same blocked
 * content.
 */
const DUPLICATE_WINDOW_SECONDS =
  120;

const REVIEW_REASON =
  "Automated content moderation escalation";

/* ============================================================
   TYPES
============================================================ */

export type ModerationEnforcementAction =
  | "none"
  | "warning"
  | "strong_warning"
  | "final_warning"
  | "temporary_ban"
  | "admin_review";

export type ModerationEnforcementInput = {
  userId:
    string;

  source:
    "pin";

  title:
    string;

  description?:
    string | null;

  moderation:
    ModerationResult;
};

export type ModerationEnforcementResult = {
  recorded:
    boolean;

  duplicate:
    boolean;

  strikeCount:
    number;

  action:
    ModerationEnforcementAction;

  suspensionDays:
    number | null;

  suspendedUntil:
    string | null;

  reviewRequired:
    boolean;

  reviewCreated:
    boolean;

  reportId:
    number | null;

  message:
    string;
};

type ExistingBan = {
  id:
    number | string;

  ban_type:
    string;

  expires_at:
    string | null;

  status:
    string;
};

/* ============================================================
   UUID VALIDATION
============================================================ */

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/* ============================================================
   SMALL HELPERS
============================================================ */

function uniqueValues(
  values:
    string[],
): string[] {
  return [
    ...new Set(
      values,
    ),
  ];
}

function truncate(
  value:
    string,

  maximum:
    number,
): string {
  const trimmed =
    value.trim();

  if (
    trimmed.length <=
    maximum
  ) {
    return trimmed;
  }

  return `${trimmed.slice(
    0,
    maximum,
  )}…`;
}

/* ============================================================
   CONTENT FINGERPRINT
============================================================ */

/*
 * We never put the raw rejected content
 * into the normal system log.
 *
 * Instead, a SHA-256 fingerprint is used
 * for short-term duplicate detection.
 */

async function createContentFingerprint({
  title,
  description,
}: {
  title:
    string;

  description:
    string | null;
}): Promise<string> {
  const normalized =
    [
      normalizeModerationText(
        title,
      ),

      normalizeModerationText(
        description ??
          "",
      ),
    ].join(
      "\n",
    );

  const encoded =
    new TextEncoder()
      .encode(
        normalized,
      );

  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      encoded,
    );

  return Array.from(
    new Uint8Array(
      digest,
    ),
  )
    .slice(
      0,
      12,
    )
    .map(
      (
        value,
      ) =>
        value
          .toString(
            16,
          )
          .padStart(
            2,
            "0",
          ),
    )
    .join(
      "",
    );
}

/* ============================================================
   TIME HELPERS
============================================================ */

function getWindowStart(): string {
  const date =
    new Date();

  date.setUTCDate(
    date.getUTCDate() -
      MODERATION_WINDOW_DAYS,
  );

  return date.toISOString();
}

function getDuplicateWindowStart(): string {
  return new Date(
    Date.now() -
      DUPLICATE_WINDOW_SECONDS *
        1000,
  ).toISOString();
}

function addDays(
  days:
    number,
): string {
  return new Date(
    Date.now() +
      days *
        24 *
        60 *
        60 *
        1000,
  ).toISOString();
}

/* ============================================================
   SYSTEM AUDIT LOG
============================================================ */

async function writeSystemLog({
  actionType,
  description,
  targetId,
}: {
  actionType:
    string;

  description:
    string;

  targetId:
    string;
}) {
  const supabase =
    getSupabaseAdmin();

  const {
    error,
  } =
    await supabase
      .from(
        "logs",
      )
      .insert({
        /*
         * user_id identifies an actor in
         * the existing logs design.
         *
         * Automated moderation has no
         * human actor.
         */
        user_id:
          null,

        actor_type:
          "system",

        action_type:
          actionType,

        description,

        target_table:
          "profiles",

        target_id:
          targetId,

        ip_address:
          null,

        user_agent:
          null,

        created_at:
          new Date()
            .toISOString(),
      });

  if (
    error
  ) {
    console.error(
      "[MODERATION] Failed to write audit log:",
      error,
    );
  }
}

/* ============================================================
   CHECK FOR DUPLICATE VIOLATION
============================================================ */

async function isRecentDuplicate({
  userId,
  fingerprint,
}: {
  userId:
    string;

  fingerprint:
    string;
}): Promise<boolean> {
  const supabase =
    getSupabaseAdmin();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "logs",
      )
      .select(`
        id,
        description,
        created_at
      `)
      .eq(
        "actor_type",
        "system",
      )
      .eq(
        "action_type",
        "content_policy_violation",
      )
      .eq(
        "target_table",
        "profiles",
      )
      .eq(
        "target_id",
        userId,
      )
      .gte(
        "created_at",
        getDuplicateWindowStart(),
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        },
      )
      .limit(
        10,
      );

  if (
    error
  ) {
    /*
     * If duplicate checking fails,
     * do not silently prevent the
     * moderation system from operating.
     */
    console.error(
      "[MODERATION] Duplicate check failed:",
      error,
    );

    return false;
  }

  const marker =
    `fingerprint=${fingerprint}`;

  return (
    data ??
    []
  ).some(
    (
      row,
    ) =>
      typeof row.description ===
        "string" &&
      row.description.includes(
        marker,
      ),
  );
}

/* ============================================================
   COUNT ACTIVE STRIKES
============================================================ */

async function countActiveStrikes(
  userId:
    string,
): Promise<number> {
  const supabase =
    getSupabaseAdmin();

  const {
    count,
    error,
  } =
    await supabase
      .from(
        "logs",
      )
      .select(
        "id",
        {
          count:
            "exact",

          head:
            true,
        },
      )
      .eq(
        "actor_type",
        "system",
      )
      .eq(
        "action_type",
        "content_policy_violation",
      )
      .eq(
        "target_table",
        "profiles",
      )
      .eq(
        "target_id",
        userId,
      )
      .gte(
        "created_at",
        getWindowStart(),
      );

  if (
    error
  ) {
    console.error(
      "[MODERATION] Unable to count active strikes:",
      error,
    );

    throw new Error(
      "Unable to determine moderation history.",
    );
  }

  return count ??
    0;
}

/* ============================================================
   RECORD VIOLATION
============================================================ */

async function recordViolation({
  userId,
  source,
  moderation,
  fingerprint,
}: {
  userId:
    string;

  source:
    "pin";

  moderation:
    ModerationResult;

  fingerprint:
    string;
}) {
  const categories =
    uniqueValues(
      moderation.matches.map(
        (
          match,
        ) =>
          match.category,
      ),
    );

  const fields =
    uniqueValues(
      moderation.matches.map(
        (
          match,
        ) =>
          match.field,
      ),
    );

  /*
   * IMPORTANT:
   *
   * Do not put the actual profanity or
   * submitted content in the standard
   * audit log.
   */
  const description =
    [
      `Blocked ${source} submission by automated content moderation.`,
      `severity=${moderation.maxSeverity}`,
      `categories=${categories.join(",") || "unknown"}`,
      `fields=${fields.join(",") || "unknown"}`,
      `fingerprint=${fingerprint}`,
    ].join(
      " ",
    );

  const supabase =
    getSupabaseAdmin();

  const {
    error,
  } =
    await supabase
      .from(
        "logs",
      )
      .insert({
        user_id:
          null,

        actor_type:
          "system",

        action_type:
          "content_policy_violation",

        description,

        target_table:
          "profiles",

        target_id:
          userId,

        ip_address:
          null,

        user_agent:
          null,

        created_at:
          new Date()
            .toISOString(),
      });

  if (
    error
  ) {
    console.error(
      "[MODERATION] Failed to record violation:",
      error,
    );

    throw new Error(
      "Unable to record moderation violation.",
    );
  }
}

/* ============================================================
   FIND EFFECTIVE ACTIVE BAN
============================================================ */

async function getEffectiveActiveBan(
  userId:
    string,
): Promise<ExistingBan | null> {
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
        expires_at,
        status
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
      );

  if (
    error
  ) {
    console.error(
      "[MODERATION] Failed to inspect existing bans:",
      error,
    );

    throw new Error(
      "Unable to verify account restriction status.",
    );
  }

  const now =
    Date.now();

  const bans =
    (
      data ??
      []
    ) as ExistingBan[];

  /*
   * Mark expired rows as expired where
   * possible.
   */
  const expiredIds =
    bans
      .filter(
        (
          ban,
        ) => {
          if (
            !ban.expires_at
          ) {
            return false;
          }

          const expires =
            new Date(
              ban.expires_at,
            ).getTime();

          return (
            Number.isFinite(
              expires,
            ) &&
            expires <=
              now
          );
        },
      )
      .map(
        (
          ban,
        ) =>
          ban.id,
      );

  if (
    expiredIds.length >
    0
  ) {
    const {
      error:
        expireError,
    } =
      await supabase
        .from(
          "user_bans",
        )
        .update({
          status:
            "expired",

          updated_at:
            new Date()
              .toISOString(),
        })
        .in(
          "id",
          expiredIds,
        );

    if (
      expireError
    ) {
      console.error(
        "[MODERATION] Failed to mark expired bans:",
        expireError,
      );
    }
  }

  return (
    bans.find(
      (
        ban,
      ) => {
        if (
          !ban.expires_at
        ) {
          return true;
        }

        const expires =
          new Date(
            ban.expires_at,
          ).getTime();

        return (
          Number.isFinite(
            expires,
          ) &&
          expires >
            now
        );
      },
    ) ??
    null
  );
}

/* ============================================================
   CREATE TEMPORARY BAN
============================================================ */

async function createTemporaryBan({
  userId,
  days,
  strikeCount,
  reportId,
}: {
  userId:
    string;

  days:
    number;

  strikeCount:
    number;

  reportId:
    number | null;
}): Promise<{
  created:
    boolean;

  expiresAt:
    string | null;
}> {
  const existingBan =
    await getEffectiveActiveBan(
      userId,
    );

  /*
   * Do not stack automated bans on top
   * of an already-active restriction.
   */
  if (
    existingBan
  ) {
    return {
      created:
        false,

      expiresAt:
        existingBan.expires_at,
    };
  }

  const supabase =
    getSupabaseAdmin();

  const now =
    new Date()
      .toISOString();

  const expiresAt =
    addDays(
      days,
    );

  const {
    data:
      createdBan,

    error:
      banError,
  } =
    await supabase
      .from(
        "user_bans",
      )
      .insert({
        user_id:
          userId,

        report_id:
          reportId,

        /*
         * Automated moderation has
         * no administrator actor.
         */
        admin_id:
          null,

        ban_type:
          "temporary_ban",

        duration_type:
          "days",

        duration_value:
          days,

        reason:
          `Automated content moderation: ${strikeCount} active violations within ${MODERATION_WINDOW_DAYS} days.`,

        status:
          "active",

        reputation_deducted:
          false,

        starts_at:
          now,

        expires_at:
          expiresAt,

        revoked_at:
          null,

        created_at:
          now,

        updated_at:
          now,
      })
      .select(`
        id,
        expires_at
      `)
      .single();

  if (
    banError ||
    !createdBan
  ) {
    console.error(
      "[MODERATION] Failed to create temporary ban:",
      banError,
    );

    throw new Error(
      "Unable to apply moderation suspension.",
    );
  }

  /*
   * Preserve the existing PIN & TELL
   * behavior where a temporary ban maps
   * the profile to suspended.
   */
  const {
    error:
      profileError,
  } =
    await supabase
      .from(
        "profiles",
      )
      .update({
        status:
          "suspended",

        updated_at:
          now,
      })
      .eq(
        "id",
        userId,
      );

  if (
    profileError
  ) {
    /*
     * The user_bans record is still the
     * authoritative ban record, so do not
     * remove it if profile synchronization
     * fails.
     */
    console.error(
      "[MODERATION] Ban created but profile status sync failed:",
      profileError,
    );
  }

  await writeSystemLog({
    actionType:
      "automated_moderation_ban",

    description:
      `Automatic ${days}-day suspension applied after ${strikeCount} active content-policy violations.`,

    targetId:
      userId,
  });

  return {
    created:
      true,

    expiresAt:
      createdBan.expires_at ??
      expiresAt,
  };
}

/* ============================================================
   CREATE ADMIN REVIEW REPORT
============================================================ */

async function createModerationReview({
  userId,
  source,
  title,
  description,
  strikeCount,
  moderation,
  fingerprint,
}: {
  userId:
    string;

  source:
    "pin";

  title:
    string;

  description:
    string | null;

  strikeCount:
    number;

  moderation:
    ModerationResult;

  fingerprint:
    string;
}): Promise<{
  created:
    boolean;

  reportId:
    number | null;
}> {
  const supabase =
    getSupabaseAdmin();

  const categories =
    uniqueValues(
      moderation.matches.map(
        (
          match,
        ) =>
          match.category,
      ),
    );

  const reportType:
    | "harassment"
    | "other" =
    categories.includes(
      "harassment",
    ) ||
    categories.includes(
      "threat",
    )
      ? "harassment"
      : "other";

  /*
   * Raw rejected content is NOT written
   * to ordinary logs.
   *
   * For administrator-review cases only,
   * limited excerpts are preserved in the
   * report so an administrator can make
   * an informed decision.
   */
  const details = [
    "Automated content moderation review.",
    "",
    `Source: Rejected ${source} submission`,
    `Active strikes: ${strikeCount}`,
    `Maximum severity: ${moderation.maxSeverity}`,
    `Categories: ${categories.join(", ") || "Unknown"}`,
    `Fingerprint: ${fingerprint}`,
    "",
    `Submitted title: ${truncate(
      title,
      240,
    ) || "(empty)"}`,
    "",
    `Submitted description: ${truncate(
      description ??
        "",
      800,
    ) || "(empty)"}`,
    "",
    "The content was blocked before publication.",
  ].join(
    "\n",
  );

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "reports",
      )
      .insert({
        /*
         * This report is generated by
         * the moderation system, not by
         * another user.
         */
        reporter_id:
          null,

        reported_user_id:
          userId,

        pin_id:
          null,

        comment_id:
          null,

        chat_id:
          null,

        reason:
          REVIEW_REASON,

        details,

        status:
          "pending",

        type:
          reportType,

        reviewed_at:
          null,

        reviewed_by:
          null,

        created_at:
          new Date()
            .toISOString(),
      })
      .select(
        "id",
      )
      .single();

  if (
    error ||
    !data
  ) {
    /*
     * Failure to open the administrative
     * review should not make prohibited
     * content publishable.
     */
    console.error(
      "[MODERATION] Failed to create review report:",
      error,
    );

    await writeSystemLog({
      actionType:
        "moderation_review_creation_failed",

      description:
        `Automated moderation could not create an administrator review case. fingerprint=${fingerprint}`,

      targetId:
        userId,
    });

    return {
      created:
        false,

      reportId:
        null,
    };
  }

  const reportId =
    Number(
      data.id,
    );

  await writeSystemLog({
    actionType:
      "automated_moderation_escalated",

    description:
      `Blocked content escalated for administrator review. report=${reportId} strikes=${strikeCount} severity=${moderation.maxSeverity}.`,

    targetId:
      userId,
  });

  return {
    created:
      true,

    reportId:
      Number.isFinite(
        reportId,
      )
        ? reportId
        : null,
  };
}

/* ============================================================
   ENFORCEMENT LEVEL
============================================================ */

function getEnforcementLevel(
  strikeCount:
    number,
): {
  action:
    ModerationEnforcementAction;

  suspensionDays:
    number | null;

  review:
    boolean;
} {
  /*
   * 11+:
   * do NOT permanently ban automatically.
   *
   * The account is sent for
   * administrator review.
   */
  if (
    strikeCount >=
    11
  ) {
    return {
      action:
        "admin_review",

      suspensionDays:
        null,

      review:
        true,
    };
  }

  /*
   * Strike 10:
   * 30-day suspension.
   */
  if (
    strikeCount ===
    10
  ) {
    return {
      action:
        "temporary_ban",

      suspensionDays:
        30,

      review:
        false,
    };
  }

  /*
   * Strike 9:
   * final warning before
   * 30-day suspension.
   */
  if (
    strikeCount ===
    9
  ) {
    return {
      action:
        "final_warning",

      suspensionDays:
        null,

      review:
        false,
    };
  }

  /*
   * Strike 8:
   * 7-day suspension.
   */
  if (
    strikeCount ===
    8
  ) {
    return {
      action:
        "temporary_ban",

      suspensionDays:
        7,

      review:
        false,
    };
  }

  /*
   * Strike 7:
   * escalation warning.
   */
  if (
    strikeCount ===
    7
  ) {
    return {
      action:
        "final_warning",

      suspensionDays:
        null,

      review:
        false,
    };
  }

  /*
   * Strike 6:
   * warning after previous suspension.
   */
  if (
    strikeCount ===
    6
  ) {
    return {
      action:
        "strong_warning",

      suspensionDays:
        null,

      review:
        false,
    };
  }

  /*
   * Strike 5:
   * 3-day suspension.
   */
  if (
    strikeCount ===
    5
  ) {
    return {
      action:
        "temporary_ban",

      suspensionDays:
        3,

      review:
        false,
    };
  }

  /*
   * Strike 4:
   * final warning before
   * first suspension.
   */
  if (
    strikeCount ===
    4
  ) {
    return {
      action:
        "final_warning",

      suspensionDays:
        null,

      review:
        false,
    };
  }

  /*
   * Strike 3:
   * stronger warning.
   */
  if (
    strikeCount ===
    3
  ) {
    return {
      action:
        "strong_warning",

      suspensionDays:
        null,

      review:
        false,
    };
  }

  return {
    action:
      "warning",

    suspensionDays:
      null,

    review:
      false,
  };
}

/* ============================================================
   USER-FACING MESSAGE
============================================================ */

function buildMessage({
  strikeCount,
  action,
  suspensionDays,
  suspendedUntil,
  reviewRequired,
}: {
  strikeCount:
    number;

  action:
    ModerationEnforcementAction;

  suspensionDays:
    number | null;

  suspendedUntil:
    string | null;

  reviewRequired:
    boolean;
}): string {
  if (
    action ===
      "temporary_ban" &&
    suspensionDays
  ) {
    const expiryMessage =
      suspendedUntil
        ? ` The suspension is scheduled to end on ${new Date(
            suspendedUntil,
          ).toLocaleString(
            "en-PH",
            {
              timeZone:
                "Asia/Manila",

              dateStyle:
                "medium",

              timeStyle:
                "short",
            },
          )}.`
        : "";

    return (
      `Your pin was not published. Your account has been temporarily suspended for ${suspensionDays} ` +
      `day${suspensionDays === 1 ? "" : "s"} because ${strikeCount} content-policy violations ` +
      `were recorded within the last ${MODERATION_WINDOW_DAYS} days.${expiryMessage}`
    );
  }

  if (
    reviewRequired ||
    action ===
      "admin_review"
  ) {
    return (
      "Your pin was not published because it may violate PIN & TELL's Community Conduct rules. " +
      "The incident has been escalated for administrator review."
    );
  }

  if (
    action ===
    "final_warning"
  ) {
    if (
      strikeCount ===
      4
    ) {
      return (
        `Your pin was not published. This is your final warning before a temporary suspension. ` +
        `You currently have ${strikeCount} active content-policy violations within the last ` +
        `${MODERATION_WINDOW_DAYS} days.`
      );
    }

    return (
      `Your pin was not published. You currently have ${strikeCount} active content-policy ` +
      `violations. Further violations may result in a longer account suspension.`
    );
  }

  if (
    action ===
    "strong_warning"
  ) {
    return (
      `Your pin was not published because it violates PIN & TELL's Community Conduct rules. ` +
      `You currently have ${strikeCount} active violations. Continued violations may result in ` +
      "temporary account suspension."
    );
  }

  return (
    `Your pin was not published because it contains content that may violate PIN & TELL's ` +
    `Community Conduct rules. This is active warning ${strikeCount}. Please revise your content ` +
    "before trying again."
  );
}

/* ============================================================
   DUPLICATE MESSAGE
============================================================ */

function buildDuplicateMessage(
  strikeCount:
    number,
): string {
  return (
    "This pin still contains content that violates PIN & TELL's Community Conduct rules. " +
    "Because it matches a recently blocked submission, an additional strike was not recorded. " +
    `You currently have ${strikeCount} active moderation violation${
      strikeCount ===
      1
        ? ""
        : "s"
    }. Please revise the content before trying again.`
  );
}

/* ============================================================
   MAIN ENFORCEMENT FUNCTION
============================================================ */

export async function applyModerationEnforcement(
  input:
    ModerationEnforcementInput,
): Promise<ModerationEnforcementResult> {
  const {
    userId,
    source,
    title,
    description =
      null,
    moderation,
  } =
    input;

  /* ---------------------------------------------------------
     Validate user ID
  --------------------------------------------------------- */

  if (
    !UUID_REGEX.test(
      userId,
    )
  ) {
    throw new Error(
      "Invalid moderation user ID.",
    );
  }

  /* ---------------------------------------------------------
     Clean content should never be
     penalized.
  --------------------------------------------------------- */

  if (
    !moderation.blocked ||
    moderation.matches.length ===
      0
  ) {
    return {
      recorded:
        false,

      duplicate:
        false,

      strikeCount:
        await countActiveStrikes(
          userId,
        ),

      action:
        "none",

      suspensionDays:
        null,

      suspendedUntil:
        null,

      reviewRequired:
        false,

      reviewCreated:
        false,

      reportId:
        null,

      message:
        "No moderation enforcement was required.",
    };
  }

  /* ---------------------------------------------------------
     Create privacy-safe fingerprint
  --------------------------------------------------------- */

  const fingerprint =
    await createContentFingerprint({
      title,
      description,
    });

  /* ---------------------------------------------------------
     Prevent accidental rapid duplicate
     strikes.
  --------------------------------------------------------- */

  const duplicate =
    await isRecentDuplicate({
      userId,
      fingerprint,
    });

  if (
    duplicate
  ) {
    const strikeCount =
      await countActiveStrikes(
        userId,
      );

    return {
      recorded:
        false,

      duplicate:
        true,

      strikeCount,

      action:
        "none",

      suspensionDays:
        null,

      suspendedUntil:
        null,

      reviewRequired:
        moderation.requiresAdminReview ||
        strikeCount >=
          11,

      reviewCreated:
        false,

      reportId:
        null,

      message:
        buildDuplicateMessage(
          strikeCount,
        ),
    };
  }

  /* ---------------------------------------------------------
     Record one strike
  --------------------------------------------------------- */

  await recordViolation({
    userId,
    source,
    moderation,
    fingerprint,
  });

  /* ---------------------------------------------------------
     Recount after recording
  --------------------------------------------------------- */

  const strikeCount =
    await countActiveStrikes(
      userId,
    );

  const level =
    getEnforcementLevel(
      strikeCount,
    );

  /*
   * Severe content can bypass the normal
   * progression and go directly to
   * administrator review.
   *
   * It still counts as a normal strike.
   */
  const reviewRequired =
    moderation.requiresAdminReview ||
    level.review;

  /* ---------------------------------------------------------
     Administrator review
  --------------------------------------------------------- */

  let reviewCreated =
    false;

  let reportId:
    number | null =
    null;

  if (
    reviewRequired
  ) {
    const review =
      await createModerationReview({
        userId,
        source,
        title,
        description,
        strikeCount,
        moderation,
        fingerprint,
      });

    reviewCreated =
      review.created;

    reportId =
      review.reportId;
  }

  /* ---------------------------------------------------------
     Temporary suspension
  --------------------------------------------------------- */

  let suspendedUntil:
    string | null =
    null;

  if (
    level.action ===
      "temporary_ban" &&
    level.suspensionDays
  ) {
    const ban =
      await createTemporaryBan({
        userId,

        days:
          level.suspensionDays,

        strikeCount,

        reportId,
      });

    suspendedUntil =
      ban.expiresAt;
  }

  /* ---------------------------------------------------------
     Severe content without a scheduled
     strike suspension:
     review takes precedence in the
     returned action.
  --------------------------------------------------------- */

  const returnedAction:
    ModerationEnforcementAction =
    level.action ===
      "temporary_ban"
      ? "temporary_ban"
      : reviewRequired
        ? "admin_review"
        : level.action;

  return {
    recorded:
      true,

    duplicate:
      false,

    strikeCount,

    action:
      returnedAction,

    suspensionDays:
      level.suspensionDays,

    suspendedUntil,

    reviewRequired,

    reviewCreated,

    reportId,

    message:
      buildMessage({
        strikeCount,

        action:
          returnedAction,

        suspensionDays:
          level.suspensionDays,

        suspendedUntil,

        reviewRequired,
      }),
  };
}