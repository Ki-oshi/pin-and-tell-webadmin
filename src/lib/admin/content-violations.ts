import "server-only";

import {
  getSupabaseAdmin,
} from "@/lib/supabase/admin";

/* =========================================================
   CONFIGURATION
========================================================= */

const ACTIVE_WINDOW_DAYS =
  90;

const MAX_VIOLATION_LOGS =
  10000;

const AUTOMATED_REVIEW_REASON =
  "Automated content moderation escalation";

/* =========================================================
   TYPES
========================================================= */

export type ContentViolationSeverity =
  | 1
  | 2
  | 3
  | 4
  | 5;

export type ContentViolationHistoryItem = {
  id: number;

  severity:
    ContentViolationSeverity;

  categories:
    string[];

  fields:
    string[];

  created_at:
    string | null;
};

export type ContentViolationProfile = {
  id: string;

  username:
    string | null;

  full_name:
    string | null;

  status:
    string | null;
};

export type ContentViolationBan = {
  id:
    number;

  ban_type:
    string;

  duration_type:
    string;

  duration_value:
    number | null;

  reason:
    string;

  starts_at:
    string | null;

  expires_at:
    string | null;
};

export type ContentViolationRow = {
  user_id:
    string;

  profile:
    ContentViolationProfile;

  active_strikes:
    number;

  max_severity:
    ContentViolationSeverity;

  categories:
    string[];

  latest_violation_at:
    string | null;

  enforcement:
    string;

  account_status:
    string;

  review_required:
    boolean;

  open_review_count:
    number;

  related_report_count:
    number;

  active_ban:
    ContentViolationBan | null;

  history:
    ContentViolationHistoryItem[];
};

export type ContentViolationsPageData = {
  rows:
    ContentViolationRow[];

  stats: {
    violators:
      number;

    activeStrikes:
      number;

    suspended:
      number;

    needsReview:
      number;
  };

  activeWindowDays:
    number;

  hasErrors:
    boolean;
};

/* =========================================================
   RAW DATABASE TYPES
========================================================= */

type RawViolationLog = {
  id:
    number | string;

  target_id:
    string | null;

  description:
    string;

  created_at:
    string | null;
};

type RawProfile = {
  id:
    string;

  username:
    string | null;

  full_name:
    string | null;

  status:
    string | null;
};

type RawBan = {
  id:
    number | string;

  user_id:
    string;

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
    string | null;

  expires_at:
    string | null;

  created_at:
    string | null;
};

type RawReport = {
  id:
    number | string;

  reported_user_id:
    string | null;

  reason:
    string;

  status:
    string;

  type:
    string;

  created_at:
    string | null;
};

/* =========================================================
   INTERNAL AGGREGATION TYPE
========================================================= */

type UserViolationBucket = {
  userId:
    string;

  logs:
    RawViolationLog[];
};

/* =========================================================
   HELPERS
========================================================= */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getWindowStart(): string {
  const date =
    new Date();

  date.setUTCDate(
    date.getUTCDate() -
      ACTIVE_WINDOW_DAYS,
  );

  return date.toISOString();
}

function uniqueStrings(
  values:
    string[],
): string[] {
  return [
    ...new Set(
      values
        .map(
          (
            value,
          ) =>
            value.trim(),
        )
        .filter(
          Boolean,
        ),
    ),
  ];
}

function parseListMarker(
  description:
    string,

  marker:
    string,
): string[] {
  const expression =
    new RegExp(
      `${marker}=([^\\s]+)`,
      "i",
    );

  const match =
    description.match(
      expression,
    );

  if (
    !match?.[1] ||
    match[1] ===
      "unknown"
  ) {
    return [];
  }

  return match[1]
    .split(",")
    .map(
      (
        value,
      ) =>
        value.trim(),
    )
    .filter(
      Boolean,
    );
}

function parseSeverity(
  description:
    string,
): ContentViolationSeverity {
  const match =
    description.match(
      /severity=(\d+)/i,
    );

  const value =
    Number.parseInt(
      match?.[1] ??
        "1",
      10,
    );

  if (
    value >= 5
  ) {
    return 5;
  }

  if (
    value === 4
  ) {
    return 4;
  }

  if (
    value === 3
  ) {
    return 3;
  }

  if (
    value === 2
  ) {
    return 2;
  }

  return 1;
}

function isOpenReportStatus(
  status:
    string,
): boolean {
  return (
    status ===
      "pending" ||
    status ===
      "reviewing"
  );
}

function isAutomatedModerationReport(
  report:
    RawReport,
): boolean {
  return (
    report.reason
      .trim()
      .toLowerCase() ===
    AUTOMATED_REVIEW_REASON
      .toLowerCase()
  );
}

function isEffectiveActiveBan(
  ban:
    RawBan,

  now:
    number,
): boolean {
  if (
    ban.status !==
    "active"
  ) {
    return false;
  }

  /*
   * Permanent bans normally have
   * no expiry timestamp.
   */
  if (
    !ban.expires_at
  ) {
    return true;
  }

  const expiry =
    new Date(
      ban.expires_at,
    ).getTime();

  if (
    !Number.isFinite(
      expiry,
    )
  ) {
    return true;
  }

  return expiry >
    now;
}

function getEnforcementLabel({
  strikeCount,
  activeBan,
  reviewRequired,
}: {
  strikeCount:
    number;

  activeBan:
    ContentViolationBan | null;

  reviewRequired:
    boolean;
}): string {
  if (
    activeBan
  ) {
    if (
      activeBan.ban_type ===
        "permanent_ban" ||
      activeBan.duration_type ===
        "permanent"
    ) {
      return "Permanent Ban";
    }

    if (
      activeBan.duration_type ===
        "days" &&
      activeBan.duration_value
    ) {
      return `${activeBan.duration_value}-Day Suspension`;
    }

    return "Temporary Suspension";
  }

  if (
    reviewRequired ||
    strikeCount >=
      11
  ) {
    return "Admin Review";
  }

  if (
    strikeCount ===
    10
  ) {
    return "30-Day Suspension";
  }

  if (
    strikeCount ===
    9
  ) {
    return "Final Warning";
  }

  if (
    strikeCount ===
    8
  ) {
    return "7-Day Suspension";
  }

  if (
    strikeCount ===
    7
  ) {
    return "Final Escalation Warning";
  }

  if (
    strikeCount ===
    6
  ) {
    return "Strong Warning";
  }

  if (
    strikeCount ===
    5
  ) {
    return "3-Day Suspension";
  }

  if (
    strikeCount ===
    4
  ) {
    return "Final Warning";
  }

  if (
    strikeCount ===
    3
  ) {
    return "Strong Warning";
  }

  return "Warning";
}

function latestTimestamp(
  logs:
    RawViolationLog[],
): string | null {
  const timestamps =
    logs
      .map(
        (
          log,
        ) =>
          log.created_at,
      )
      .filter(
        (
          value,
        ): value is string =>
          Boolean(
            value,
          ),
      )
      .sort(
        (
          a,
          b,
        ) =>
          new Date(
            b,
          ).getTime() -
          new Date(
            a,
          ).getTime(),
      );

  return (
    timestamps[0] ??
    null
  );
}

/* =========================================================
   MAIN DATA LOADER
========================================================= */

export async function getContentViolationsData(): Promise<ContentViolationsPageData> {
  const supabase =
    getSupabaseAdmin();

  const errors:
    unknown[] = [];

  /* =======================================================
     ACTIVE CONTENT-POLICY VIOLATIONS
  ======================================================= */

  const {
    data:
      violationData,

    error:
      violationError,
  } =
    await supabase
      .from(
        "logs",
      )
      .select(`
        id,
        target_id,
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
      .gte(
        "created_at",
        getWindowStart(),
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        },
      )
      .limit(
        MAX_VIOLATION_LOGS,
      );

  if (
    violationError
  ) {
    console.error(
      "[ADMIN CONTENT VIOLATIONS] Failed to load moderation logs:",
      violationError,
    );

    errors.push(
      violationError,
    );
  }

  const rawViolations =
    (
      violationError
        ? []
        : violationData ??
          []
    ) as RawViolationLog[];

  /* =======================================================
     GROUP LOGS BY USER
  ======================================================= */

  const buckets =
    new Map<
      string,
      UserViolationBucket
    >();

  for (
    const violation of
    rawViolations
  ) {
    const userId =
      violation.target_id
        ?.trim();

    /*
     * The moderation engine stores the
     * offending user's UUID in target_id.
     *
     * Ignore unrelated / malformed log
     * records rather than allowing them
     * into the moderation UI.
     */
    if (
      !userId ||
      !UUID_PATTERN.test(
        userId,
      )
    ) {
      continue;
    }

    const existing =
      buckets.get(
        userId,
      );

    if (
      existing
    ) {
      existing.logs.push(
        violation,
      );

      continue;
    }

    buckets.set(
      userId,
      {
        userId,

        logs: [
          violation,
        ],
      },
    );
  }

  const userIds = [
    ...buckets.keys(),
  ];

  /*
   * There are no active violations.
   *
   * Avoid unnecessary .in() queries with
   * an empty ID collection.
   */
  if (
    userIds.length ===
    0
  ) {
    return {
      rows: [],

      stats: {
        violators:
          0,

        activeStrikes:
          0,

        suspended:
          0,

        needsReview:
          0,
      },

      activeWindowDays:
        ACTIVE_WINDOW_DAYS,

      hasErrors:
        errors.length >
        0,
    };
  }

  /* =======================================================
     RELATED DATA
  ======================================================= */

  const [
    profilesResult,
    bansResult,
    reportsResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "profiles",
        )
        .select(`
          id,
          username,
          full_name,
          status
        `)
        .in(
          "id",
          userIds,
        ),

      supabase
        .from(
          "user_bans",
        )
        .select(`
          id,
          user_id,
          ban_type,
          duration_type,
          duration_value,
          reason,
          status,
          starts_at,
          expires_at,
          created_at
        `)
        .in(
          "user_id",
          userIds,
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        ),

      supabase
        .from(
          "reports",
        )
        .select(`
          id,
          reported_user_id,
          reason,
          status,
          type,
          created_at
        `)
        .in(
          "reported_user_id",
          userIds,
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        )
        .limit(
          MAX_VIOLATION_LOGS,
        ),
    ]);

  if (
    profilesResult.error
  ) {
    console.error(
      "[ADMIN CONTENT VIOLATIONS] Failed to load profiles:",
      profilesResult.error,
    );

    errors.push(
      profilesResult.error,
    );
  }

  if (
    bansResult.error
  ) {
    console.error(
      "[ADMIN CONTENT VIOLATIONS] Failed to load bans:",
      bansResult.error,
    );

    errors.push(
      bansResult.error,
    );
  }

  if (
    reportsResult.error
  ) {
    console.error(
      "[ADMIN CONTENT VIOLATIONS] Failed to load related reports:",
      reportsResult.error,
    );

    errors.push(
      reportsResult.error,
    );
  }

  const rawProfiles =
    (
      profilesResult.error
        ? []
        : profilesResult.data ??
          []
    ) as RawProfile[];

  const rawBans =
    (
      bansResult.error
        ? []
        : bansResult.data ??
          []
    ) as RawBan[];

  const rawReports =
    (
      reportsResult.error
        ? []
        : reportsResult.data ??
          []
    ) as RawReport[];

  /* =======================================================
     PROFILE MAP
  ======================================================= */

  const profiles =
    new Map<
      string,
      RawProfile
    >();

  for (
    const profile of
    rawProfiles
  ) {
    profiles.set(
      profile.id,
      profile,
    );
  }

  /* =======================================================
     BAN MAP
  ======================================================= */

  const bansByUser =
    new Map<
      string,
      RawBan[]
    >();

  for (
    const ban of
    rawBans
  ) {
    const existing =
      bansByUser.get(
        ban.user_id,
      );

    if (
      existing
    ) {
      existing.push(
        ban,
      );
    } else {
      bansByUser.set(
        ban.user_id,
        [
          ban,
        ],
      );
    }
  }

  /* =======================================================
     REPORT MAP
  ======================================================= */

  const reportsByUser =
    new Map<
      string,
      RawReport[]
    >();

  for (
    const report of
    rawReports
  ) {
    if (
      !report.reported_user_id
    ) {
      continue;
    }

    const existing =
      reportsByUser.get(
        report.reported_user_id,
      );

    if (
      existing
    ) {
      existing.push(
        report,
      );
    } else {
      reportsByUser.set(
        report.reported_user_id,
        [
          report,
        ],
      );
    }
  }

  /* =======================================================
     BUILD ROWS
  ======================================================= */

  const now =
    Date.now();

  const rows:
    ContentViolationRow[] =
    [];

  for (
    const bucket of
    buckets.values()
  ) {
    const {
      userId,
      logs,
    } =
      bucket;

    const profile =
      profiles.get(
        userId,
      );

    const userBans =
      bansByUser.get(
        userId,
      ) ??
      [];

    const userReports =
      reportsByUser.get(
        userId,
      ) ??
      [];

    const effectiveBan =
      userBans.find(
        (
          ban,
        ) =>
          isEffectiveActiveBan(
            ban,
            now,
          ),
      ) ??
      null;

    const activeBan:
      ContentViolationBan | null =
      effectiveBan
        ? {
            id:
              Number(
                effectiveBan.id,
              ),

            ban_type:
              effectiveBan.ban_type,

            duration_type:
              effectiveBan.duration_type,

            duration_value:
              effectiveBan.duration_value,

            reason:
              effectiveBan.reason,

            starts_at:
              effectiveBan.starts_at,

            expires_at:
              effectiveBan.expires_at,
          }
        : null;

    const parsedHistory:
      ContentViolationHistoryItem[] =
      logs
        .map(
          (
            log,
          ) => ({
            id:
              Number(
                log.id,
              ),

            severity:
              parseSeverity(
                log.description,
              ),

            categories:
              parseListMarker(
                log.description,
                "categories",
              ),

            fields:
              parseListMarker(
                log.description,
                "fields",
              ),

            created_at:
              log.created_at,
          }),
        )
        .sort(
          (
            a,
            b,
          ) =>
            new Date(
              b.created_at ??
                0,
            ).getTime() -
            new Date(
              a.created_at ??
                0,
            ).getTime(),
        );

    const maxSeverity =
      parsedHistory.reduce<
        ContentViolationSeverity
      >(
        (
          highest,
          violation,
        ) =>
          violation.severity >
          highest
            ? violation.severity
            : highest,

        1,
      );

    const categories =
      uniqueStrings(
        parsedHistory.flatMap(
          (
            violation,
          ) =>
            violation.categories,
        ),
      );

    const automatedOpenReports =
      userReports.filter(
        (
          report,
        ) =>
          isAutomatedModerationReport(
            report,
          ) &&
          isOpenReportStatus(
            report.status,
          ),
      );

    const activeStrikes =
      logs.length;

    const reviewRequired =
      activeStrikes >=
        11 ||
      maxSeverity >=
        5 ||
      automatedOpenReports.length >
        0;

    const accountStatus =
      profile?.status ??
      (
        activeBan
          ? activeBan.ban_type ===
              "permanent_ban"
            ? "banned"
            : "suspended"
          : "active"
      );

    rows.push({
      user_id:
        userId,

      profile: {
        id:
          userId,

        username:
          profile?.username ??
          null,

        full_name:
          profile?.full_name ??
          null,

        status:
          profile?.status ??
          null,
      },

      active_strikes:
        activeStrikes,

      max_severity:
        maxSeverity,

      categories,

      latest_violation_at:
        latestTimestamp(
          logs,
        ),

      enforcement:
        getEnforcementLabel({
          strikeCount:
            activeStrikes,

          activeBan,

          reviewRequired,
        }),

      account_status:
        accountStatus,

      review_required:
        reviewRequired,

      open_review_count:
        automatedOpenReports.length,

      related_report_count:
        userReports.length,

      active_ban:
        activeBan,

      /*
       * Keep the most recent 20 active
       * violations in the details drawer.
       *
       * The aggregate strike count still
       * represents every loaded violation
       * within the 90-day window.
       */
      history:
        parsedHistory.slice(
          0,
          20,
        ),
    });
  }

  /* =======================================================
     PROFESSIONAL PRIORITY ORDER
  ======================================================= */

  rows.sort(
    (
      a,
      b,
    ) => {
      /*
       * 1. Accounts requiring review.
       */
      if (
        a.review_required !==
        b.review_required
      ) {
        return a.review_required
          ? -1
          : 1;
      }

      /*
       * 2. Higher strike counts.
       */
      if (
        a.active_strikes !==
        b.active_strikes
      ) {
        return (
          b.active_strikes -
          a.active_strikes
        );
      }

      /*
       * 3. Higher severity.
       */
      if (
        a.max_severity !==
        b.max_severity
      ) {
        return (
          b.max_severity -
          a.max_severity
        );
      }

      /*
       * 4. Most recent violation.
       */
      return (
        new Date(
          b.latest_violation_at ??
            0,
        ).getTime() -
        new Date(
          a.latest_violation_at ??
            0,
        ).getTime()
      );
    },
  );

  /* =======================================================
     SUMMARY
  ======================================================= */

  const activeStrikes =
    rows.reduce(
      (
        total,
        row,
      ) =>
        total +
        row.active_strikes,

      0,
    );

  const suspended =
    rows.filter(
      (
        row,
      ) =>
        row.account_status ===
          "suspended" ||
        Boolean(
          row.active_ban &&
          row.active_ban
            .ban_type !==
            "permanent_ban",
        ),
    ).length;

  const needsReview =
    rows.filter(
      (
        row,
      ) =>
        row.review_required,
    ).length;

  return {
    rows,

    stats: {
      violators:
        rows.length,

      activeStrikes,

      suspended,

      needsReview,
    },

    activeWindowDays:
      ACTIVE_WINDOW_DAYS,

    hasErrors:
      errors.length >
      0,
  };
}