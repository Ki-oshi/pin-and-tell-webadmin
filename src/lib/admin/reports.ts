import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type ReportStatus =
  | "pending"
  | "reviewing"
  | "resolved"
  | "dismissed"
  | "suspended"
  | "outdated";

export type ReportType =
  | "spam"
  | "harassment"
  | "inappropriate"
  | "copyright"
  | "misinformation"
  | "other";

export type ReportReporterSource =
  | "user"
  | "admin"
  | "system"
  | "unknown";

export type ReportUserSummary = {
  id: string;
  username: string | null;
  full_name: string | null;
  status: string | null;
  email: string | null;
};

export type ReportAdminSummary = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
};

export type ReportReporterIdentity = {
  source: ReportReporterSource;
  id: string | null;
  full_name: string | null;
  username: string | null;
  email: string | null;
  role: string | null;
};

export type ReportTarget = {
  type:
    | "pin"
    | "comment"
    | "chat"
    | "user"
    | "unknown";

  id:
    | string
    | number
    | null;

  title:
    string | null;

  content:
    string | null;

  photo_url:
    string | null;

  pin_id:
    number | null;

  sender_id:
    string | null;

  receiver_id:
    string | null;
};

export type AdminReportRow = {
  id:
    number;

  reporter_id:
    string | null;

  reported_user_id:
    string | null;

  pin_id:
    number | null;

  comment_id:
    number | null;

  chat_id:
    number | null;

  type:
    ReportType;

  reason:
    string;

  details:
    string | null;

  status:
    ReportStatus;

  reviewed_by:
    string | null;

  reviewed_at:
    string | null;

  created_at:
    string | null;

  reporter:
    ReportUserSummary | null;

  reporter_admin:
    ReportAdminSummary | null;

  reporter_source:
    ReportReporterSource;

  reporter_identity:
    ReportReporterIdentity;

  reported_user:
    ReportUserSummary | null;

  assigned_admin:
    ReportAdminSummary | null;

  target:
    ReportTarget;

  previous_reports_count:
    number;
};

export type ReportsPageData = {
  reports:
    AdminReportRow[];

  stats: {
    total:
      number | null;

    pending:
      number | null;

    reviewing:
      number | null;

    resolvedToday:
      number | null;
  };

  pagination: {
    page:
      number;

    pageSize:
      number;

    total:
      number;

    pageCount:
      number;
  };

  hasErrors:
    boolean;
};

type ReportsQuery = {
  page?:
    number;

  search?:
    string;

  status?:
    string;

  type?:
    string;

  pinId?:
    number | null;
};

type PinSummary = {
  id:
    number;

  title:
    string;

  description:
    string | null;

  photo_url:
    string | null;

  creator_id:
    string | null;
};

type CommentSummary = {
  id:
    number;

  pin_id:
    number | null;

  user_id:
    string | null;

  content:
    string;
};

type ChatSummary = {
  id:
    number;

  sender_id:
    string;

  receiver_id:
    string;

  content:
    string;
};

type AdminFlagLog = {
  user_id:
    string | null;

  description:
    string | null;

  target_id:
    string | null;

  created_at:
    string | null;
};

const PAGE_SIZE =
  20;

const MAX_HISTORY_ROWS =
  10000;

const AUTOMATED_MODERATION_REASON =
  "Automated content moderation escalation";

const REPORT_STATUSES = [
  "pending",
  "reviewing",
  "resolved",
  "dismissed",
  "suspended",
  "outdated",
] as const;

const REPORT_TYPES = [
  "spam",
  "harassment",
  "inappropriate",
  "copyright",
  "misinformation",
  "other",
] as const;

function safeCount(
  result: {
    count:
      number | null;

    error:
      unknown;
  },
): number | null {
  if (
    result.error
  ) {
    return null;
  }

  return (
    result.count ??
    0
  );
}

function cleanSearch(
  value:
    string,
): string {
  return value
    .trim()
    .replace(
      /[%\*(),"']/g,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .slice(
      0,
      100,
    );
}

function manilaStartOfToday(): string {
  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Manila",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      },
    );

  const parts =
    formatter.formatToParts(
      new Date(),
    );

  const year =
    parts.find(
      (
        part,
      ) =>
        part.type ===
        "year",
    )?.value;

  const month =
    parts.find(
      (
        part,
      ) =>
        part.type ===
        "month",
    )?.value;

  const day =
    parts.find(
      (
        part,
      ) =>
        part.type ===
        "day",
    )?.value;

  return new Date(
    `${year}-${month}-${day}T00:00:00+08:00`,
  ).toISOString();
}

function stringMetadataValue(
  metadata:
    | Record<
        string,
        unknown
      >
    | undefined,

  keys:
    string[],
): string | null {
  if (
    !metadata
  ) {
    return null;
  }

  for (
    const key of
    keys
  ) {
    const value =
      metadata[
        key
      ];

    if (
      typeof value ===
        "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return null;
}

function metadataFullName(
  metadata:
    | Record<
        string,
        unknown
      >
    | undefined,
): string | null {
  const direct =
    stringMetadataValue(
      metadata,
      [
        "full_name",
        "name",
        "display_name",
      ],
    );

  if (
    direct
  ) {
    return direct;
  }

  const firstName =
    stringMetadataValue(
      metadata,
      [
        "first_name",
        "given_name",
      ],
    );

  const lastName =
    stringMetadataValue(
      metadata,
      [
        "last_name",
        "family_name",
      ],
    );

  const combined = [
    firstName,
    lastName,
  ]
    .filter(
      Boolean,
    )
    .join(
      " ",
    )
    .trim();

  return (
    combined ||
    null
  );
}

function metadataUsername(
  metadata:
    | Record<
        string,
        unknown
      >
    | undefined,
): string | null {
  return stringMetadataValue(
    metadata,
    [
      "username",
      "user_name",
      "preferred_username",
    ],
  );
}

function emailLocalPart(
  email:
    | string
    | null
    | undefined,
): string | null {
  const cleaned =
    email?.trim();

  if (
    !cleaned
  ) {
    return null;
  }

  const local =
    cleaned
      .split(
        "@",
      )[0]
      ?.trim();

  return (
    local ||
    null
  );
}

function parseAdminFlagReportId(
  description:
    string | null,
): number | null {
  if (
    !description
  ) {
    return null;
  }

  const match =
    description.match(
      /\bReport\s+#(\d+)\b/i,
    );

  if (
    !match?.[1]
  ) {
    return null;
  }

  const reportId =
    Number.parseInt(
      match[1],
      10,
    );

  return (
    Number.isInteger(
      reportId,
    ) &&
    reportId >
      0
      ? reportId
      : null
  );
}

function isAutomatedModerationReport(
  reason:
    | string
    | null
    | undefined,
): boolean {
  return (
    reason
      ?.trim()
      .toLowerCase() ===
    AUTOMATED_MODERATION_REASON
      .toLowerCase()
  );
}

function userIdentity(
  user:
    ReportUserSummary | null,
): ReportReporterIdentity {
  return {
    source:
      "user",

    id:
      user?.id ??
      null,

    full_name:
      user?.full_name ??
      null,

    username:
      user?.username ??
      null,

    email:
      user?.email ??
      null,

    role:
      null,
  };
}

function adminIdentity(
  admin:
    ReportAdminSummary | null,
): ReportReporterIdentity {
  return {
    source:
      "admin",

    id:
      admin?.id ??
      null,

    full_name:
      admin?.full_name ??
      null,

    username:
      null,

    email:
      admin?.email ??
      null,

    role:
      admin?.role ??
      null,
  };
}

function systemIdentity(): ReportReporterIdentity {
  return {
    source:
      "system",

    id:
      null,

    full_name:
      "PIN & TELL Moderation",

    username:
      null,

    email:
      null,

    role:
      "system",
  };
}

function unknownIdentity(): ReportReporterIdentity {
  return {
    source:
      "unknown",

    id:
      null,

    full_name:
      null,

    username:
      null,

    email:
      null,

    role:
      null,
  };
}

export async function getReportsPageData({
  page = 1,
  search = "",
  status = "all",
  type = "all",
  pinId = null,
}: ReportsQuery): Promise<ReportsPageData> {
  const supabase =
    getSupabaseAdmin();

  const normalizedPage =
    Number.isFinite(
      page,
    )
      ? Math.max(
          1,
          Math.floor(
            page,
          ),
        )
      : 1;

  const normalizedSearch =
    cleanSearch(
      search,
    );

  const normalizedStatus =
    REPORT_STATUSES.includes(
      status as
        ReportStatus,
    )
      ? status
      : "all";

  const normalizedType =
    REPORT_TYPES.includes(
      type as
        ReportType,
    )
      ? type
      : "all";

  const normalizedPinId =
    pinId &&
    Number.isInteger(
      pinId,
    ) &&
    pinId >
      0
      ? pinId
      : null;

  const from =
    (
      normalizedPage -
      1
    ) *
    PAGE_SIZE;

  const to =
    from +
    PAGE_SIZE -
    1;

  let reportsQuery =
    supabase
      .from(
        "reports",
      )
      .select(
        `
          id,
          reporter_id,
          reported_user_id,
          pin_id,
          comment_id,
          chat_id,
          type,
          reason,
          details,
          status,
          reviewed_by,
          reviewed_at,
          created_at
        `,
        {
          count:
            "exact",
        },
      );

  if (
    normalizedStatus !==
    "all"
  ) {
    reportsQuery =
      reportsQuery.eq(
        "status",
        normalizedStatus,
      );
  }

  if (
    normalizedType !==
    "all"
  ) {
    reportsQuery =
      reportsQuery.eq(
        "type",
        normalizedType,
      );
  }

  if (
    normalizedPinId
  ) {
    reportsQuery =
      reportsQuery.eq(
        "pin_id",
        normalizedPinId,
      );
  }

  if (
    normalizedSearch
  ) {
    if (
      /^\d+$/.test(
        normalizedSearch,
      )
    ) {
      reportsQuery =
        reportsQuery.eq(
          "id",
          Number(
            normalizedSearch,
          ),
        );
    } else {
      reportsQuery =
        reportsQuery.or(
          [
            `reason.ilike.%${normalizedSearch}%`,
            `details.ilike.%${normalizedSearch}%`,
          ].join(
            ",",
          ),
        );
    }
  }

  reportsQuery =
    reportsQuery
      .order(
        "created_at",
        {
          ascending:
            false,
        },
      )
      .range(
        from,
        to,
      );

  const todayStart =
    manilaStartOfToday();

  const [
    reportsResult,
    totalResult,
    pendingResult,
    reviewingResult,
    resolvedTodayResult,
  ] =
    await Promise.all([
      reportsQuery,

      supabase
        .from(
          "reports",
        )
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          },
        ),

      supabase
        .from(
          "reports",
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
          "status",
          "pending",
        ),

      supabase
        .from(
          "reports",
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
          "status",
          "reviewing",
        ),

      supabase
        .from(
          "reports",
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
          "status",
          "resolved",
        )
        .gte(
          "reviewed_at",
          todayStart,
        ),
    ]);

  if (
    reportsResult.error
  ) {
    console.error(
      "[ADMIN REPORTS] Failed to load reports:",
      reportsResult.error,
    );
  }

  const rawReports =
    reportsResult.error
      ? []
      : reportsResult.data ??
        [];

  const reportIds = [
    ...new Set(
      rawReports.map(
        (
          report,
        ) =>
          Number(
            report.id,
          ),
      ),
    ),
  ];

  const reportIdSet =
    new Set(
      reportIds,
    );

  const pinIds = [
    ...new Set(
      rawReports
        .map(
          (
            report,
          ) =>
            report.pin_id,
        )
        .filter(
          (
            id,
          ): id is number =>
            typeof id ===
            "number",
        ),
    ),
  ];

  const commentIds = [
    ...new Set(
      rawReports
        .map(
          (
            report,
          ) =>
            report.comment_id,
        )
        .filter(
          (
            id,
          ): id is number =>
            typeof id ===
            "number",
        ),
    ),
  ];

  const chatIds = [
    ...new Set(
      rawReports
        .map(
          (
            report,
          ) =>
            report.chat_id,
        )
        .filter(
          (
            id,
          ): id is number =>
            typeof id ===
            "number",
        ),
    ),
  ];

  const profileIds =
    new Set<string>();

  for (
    const report of
    rawReports
  ) {
    if (
      report.reporter_id
    ) {
      profileIds.add(
        report.reporter_id,
      );
    }

    if (
      report.reported_user_id
    ) {
      profileIds.add(
        report.reported_user_id,
      );
    }
  }

  const pins =
    new Map<
      number,
      PinSummary
    >();

  const comments =
    new Map<
      number,
      CommentSummary
    >();

  const chats =
    new Map<
      number,
      ChatSummary
    >();

  const relationErrors:
    unknown[] = [];

  const [
    pinsResult,
    commentsResult,
    chatsResult,
    adminFlagLogsResult,
  ] =
    await Promise.all([
      pinIds.length >
      0
        ? supabase
            .from(
              "pins",
            )
            .select(`
              id,
              title,
              description,
              photo_url,
              creator_id
            `)
            .in(
              "id",
              pinIds,
            )
        : Promise.resolve({
            data:
              [],

            error:
              null,
          }),

      commentIds.length >
      0
        ? supabase
            .from(
              "comments",
            )
            .select(`
              id,
              pin_id,
              user_id,
              content
            `)
            .in(
              "id",
              commentIds,
            )
        : Promise.resolve({
            data:
              [],

            error:
              null,
          }),

      chatIds.length >
      0
        ? supabase
            .from(
              "chats",
            )
            .select(`
              id,
              sender_id,
              receiver_id,
              content
            `)
            .in(
              "id",
              chatIds,
            )
        : Promise.resolve({
            data:
              [],

            error:
              null,
          }),

      pinIds.length >
      0
        ? supabase
            .from(
              "logs",
            )
            .select(`
              user_id,
              description,
              target_id,
              created_at
            `)
            .eq(
              "actor_type",
              "admin",
            )
            .eq(
              "action_type",
              "admin_pin_flagged",
            )
            .eq(
              "target_table",
              "pins",
            )
            .in(
              "target_id",
              pinIds.map(
                String,
              ),
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              },
            )
            .limit(
              MAX_HISTORY_ROWS,
            )
        : Promise.resolve({
            data:
              [],

            error:
              null,
          }),
    ]);

  if (
    pinsResult.error
  ) {
    relationErrors.push(
      pinsResult.error,
    );
  } else {
    for (
      const pin of
      pinsResult.data ??
      []
    ) {
      pins.set(
        Number(
          pin.id,
        ),
        {
          id:
            Number(
              pin.id,
            ),

          title:
            pin.title,

          description:
            pin.description,

          photo_url:
            pin.photo_url,

          creator_id:
            pin.creator_id,
        },
      );

      if (
        pin.creator_id
      ) {
        profileIds.add(
          pin.creator_id,
        );
      }
    }
  }

  if (
    commentsResult.error
  ) {
    relationErrors.push(
      commentsResult.error,
    );
  } else {
    for (
      const comment of
      commentsResult.data ??
      []
    ) {
      comments.set(
        Number(
          comment.id,
        ),
        {
          id:
            Number(
              comment.id,
            ),

          pin_id:
            comment.pin_id,

          user_id:
            comment.user_id,

          content:
            comment.content,
        },
      );

      if (
        comment.user_id
      ) {
        profileIds.add(
          comment.user_id,
        );
      }
    }
  }

  if (
    chatsResult.error
  ) {
    relationErrors.push(
      chatsResult.error,
    );
  } else {
    for (
      const chat of
      chatsResult.data ??
      []
    ) {
      chats.set(
        Number(
          chat.id,
        ),
        {
          id:
            Number(
              chat.id,
            ),

          sender_id:
            chat.sender_id,

          receiver_id:
            chat.receiver_id,

          content:
            chat.content,
        },
      );

      profileIds.add(
        chat.sender_id,
      );

      profileIds.add(
        chat.receiver_id,
      );
    }
  }

  /*
   * Admin-created pin flags have
   * reporter_id = null because the
   * reports.reporter_id foreign key
   * points to auth.users.
   *
   * The flag action records the
   * administrator in logs using:
   *
   * action_type = admin_pin_flagged
   * target_table = pins
   * user_id = admin UUID
   *
   * and includes Report #<id> in the
   * audit description.
   *
   * Resolve that audit record back to
   * the report here.
   */
  const adminReporterByReportId =
    new Map<
      number,
      string
    >();

  if (
    adminFlagLogsResult.error
  ) {
    relationErrors.push(
      adminFlagLogsResult.error,
    );
  } else {
    for (
      const rawLog of
      (
        adminFlagLogsResult.data ??
        []
      ) as AdminFlagLog[]
    ) {
      if (
        !rawLog.user_id
      ) {
        continue;
      }

      const reportId =
        parseAdminFlagReportId(
          rawLog.description,
        );

      if (
        !reportId ||
        !reportIdSet.has(
          reportId,
        ) ||
        adminReporterByReportId.has(
          reportId,
        )
      ) {
        continue;
      }

      adminReporterByReportId.set(
        reportId,
        rawLog.user_id,
      );
    }
  }

  const profiles =
    new Map<
      string,
      ReportUserSummary
    >();

  if (
    profileIds.size >
    0
  ) {
    const profileResult =
      await supabase
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
          [
            ...profileIds,
          ],
        );

    if (
      profileResult.error
    ) {
      relationErrors.push(
        profileResult.error,
      );
    } else {
      for (
        const profile of
        profileResult.data ??
        []
      ) {
        profiles.set(
          profile.id,
          {
            id:
              profile.id,

            username:
              profile.username,

            full_name:
              profile.full_name,

            status:
              profile.status,

            email:
              null,
          },
        );
      }
    }
  }

  /*
   * Some reports can reference a valid
   * Supabase Auth user even when:
   *
   * - their profiles row is missing, or
   * - full_name is empty, or
   * - username is empty.
   *
   * Resolve those identities through
   * Supabase Auth so the Reports page
   * does not unnecessarily show
   * "Unknown user".
   */
  const authFallbackIds = [
    ...profileIds,
  ].filter(
    (
      userId,
    ) => {
      const profile =
        profiles.get(
          userId,
        );

      return (
        !profile ||
        (
          !profile.full_name
            ?.trim() &&
          !profile.username
            ?.trim()
        )
      );
    },
  );

  if (
    authFallbackIds.length >
    0
  ) {
    const authResults =
      await Promise.all(
        authFallbackIds.map(
          async (
            userId,
          ) => {
            const result =
              await supabase
                .auth
                .admin
                .getUserById(
                  userId,
                );

            return {
              userId,
              result,
            };
          },
        ),
      );

    for (
      const {
        userId,
        result,
      } of authResults
    ) {
      if (
        result.error
      ) {
        console.error(
          `[ADMIN REPORTS] Failed to resolve auth identity for ${userId}:`,
          result.error,
        );

        continue;
      }

      const authUser =
        result.data.user;

      if (
        !authUser
      ) {
        continue;
      }

      const existing =
        profiles.get(
          userId,
        );

      const metadata =
        authUser.user_metadata as
          | Record<
              string,
              unknown
            >
          | undefined;

      const authFullName =
        metadataFullName(
          metadata,
        );

      const authUsername =
        metadataUsername(
          metadata,
        ) ??
        emailLocalPart(
          authUser.email,
        );

      profiles.set(
        userId,
        {
          id:
            userId,

          username:
            existing
              ?.username ??
            authUsername,

          full_name:
            existing
              ?.full_name ??
            authFullName,

          status:
            existing
              ?.status ??
            null,

          email:
            authUser.email ??
            existing
              ?.email ??
            null,
        },
      );
    }
  }

  /*
   * Administrators may appear in two
   * different roles:
   *
   * 1. reviewer / assigned admin
   * 2. creator of an admin pin flag
   *
   * Include both groups in the admins
   * query.
   */
  const adminIds = [
    ...new Set([
      ...rawReports
        .map(
          (
            report,
          ) =>
            report.reviewed_by,
        )
        .filter(
          (
            id,
          ): id is string =>
            Boolean(
              id,
            ),
        ),

      ...adminReporterByReportId
        .values(),
    ]),
  ];

  const admins =
    new Map<
      string,
      ReportAdminSummary
    >();

  if (
    adminIds.length >
    0
  ) {
    const adminResult =
      await supabase
        .from(
          "admins",
        )
        .select(`
          id,
          email,
          full_name,
          role
        `)
        .in(
          "id",
          adminIds,
        );

    if (
      adminResult.error
    ) {
      relationErrors.push(
        adminResult.error,
      );
    } else {
      for (
        const admin of
        adminResult.data ??
        []
      ) {
        admins.set(
          admin.id,
          {
            id:
              admin.id,

            email:
              admin.email,

            full_name:
              admin.full_name,

            role:
              admin.role,
          },
        );
      }
    }
  }

  const reportedUserIds = [
    ...new Set(
      rawReports
        .map(
          (
            report,
          ) =>
            report.reported_user_id,
        )
        .filter(
          (
            id,
          ): id is string =>
            Boolean(
              id,
            ),
        ),
    ),
  ];

  const previousReports =
    new Map<
      string,
      number
    >();

  if (
    reportedUserIds.length >
    0
  ) {
    const historyResult =
      await supabase
        .from(
          "reports",
        )
        .select(
          "reported_user_id",
        )
        .in(
          "reported_user_id",
          reportedUserIds,
        )
        .limit(
          MAX_HISTORY_ROWS,
        );

    if (
      historyResult.error
    ) {
      relationErrors.push(
        historyResult.error,
      );
    } else {
      for (
        const report of
        historyResult.data ??
        []
      ) {
        if (
          !report.reported_user_id
        ) {
          continue;
        }

        previousReports.set(
          report.reported_user_id,
          (
            previousReports.get(
              report.reported_user_id,
            ) ??
            0
          ) +
            1,
        );
      }
    }
  }

  if (
    relationErrors.length >
    0
  ) {
    console.error(
      "[ADMIN REPORTS] Related report queries failed:",
      relationErrors,
    );
  }

  const reports:
    AdminReportRow[] =
    rawReports.map(
      (
        report,
      ) => {
        let target:
          ReportTarget = {
          type:
            "unknown",

          id:
            null,

          title:
            null,

          content:
            null,

          photo_url:
            null,

          pin_id:
            null,

          sender_id:
            null,

          receiver_id:
            null,
        };

        if (
          report.pin_id
        ) {
          const pin =
            pins.get(
              report.pin_id,
            );

          target = {
            type:
              "pin",

            id:
              report.pin_id,

            title:
              pin?.title ??
              `Pin #${report.pin_id}`,

            content:
              pin?.description ??
              null,

            photo_url:
              pin?.photo_url ??
              null,

            pin_id:
              report.pin_id,

            sender_id:
              null,

            receiver_id:
              null,
          };
        } else if (
          report.comment_id
        ) {
          const comment =
            comments.get(
              report.comment_id,
            );

          target = {
            type:
              "comment",

            id:
              report.comment_id,

            title:
              `Comment #${report.comment_id}`,

            content:
              comment?.content ??
              null,

            photo_url:
              null,

            pin_id:
              comment?.pin_id ??
              null,

            sender_id:
              comment?.user_id ??
              null,

            receiver_id:
              null,
          };
        } else if (
          report.chat_id
        ) {
          const chat =
            chats.get(
              report.chat_id,
            );

          target = {
            type:
              "chat",

            id:
              report.chat_id,

            title:
              `Chat message #${report.chat_id}`,

            content:
              chat?.content ??
              null,

            photo_url:
              null,

            pin_id:
              null,

            sender_id:
              chat?.sender_id ??
              null,

            receiver_id:
              chat?.receiver_id ??
              null,
          };
        } else if (
          report.reported_user_id
        ) {
          target = {
            type:
              "user",

            id:
              report.reported_user_id,

            title:
              profiles.get(
                report.reported_user_id,
              )
                ?.full_name ??
              profiles.get(
                report.reported_user_id,
              )
                ?.username ??
              profiles.get(
                report.reported_user_id,
              )
                ?.email ??
              "Reported user",

            content:
              null,

            photo_url:
              null,

            pin_id:
              null,

            sender_id:
              null,

            receiver_id:
              null,
          };
        }

        const reportId =
          Number(
            report.id,
          );

        const reporter =
          report.reporter_id
            ? profiles.get(
                report.reporter_id,
              ) ??
              null
            : null;

        const reporterAdminId =
          adminReporterByReportId.get(
            reportId,
          ) ??
          null;

        const reporterAdmin =
          reporterAdminId
            ? admins.get(
                reporterAdminId,
              ) ??
              null
            : null;

        let reporterSource:
          ReportReporterSource =
          "unknown";

        let reporterIdentity =
          unknownIdentity();

        if (
          reporter
        ) {
          reporterSource =
            "user";

          reporterIdentity =
            userIdentity(
              reporter,
            );
        } else if (
          reporterAdminId
        ) {
          reporterSource =
            "admin";

          reporterIdentity =
            adminIdentity(
              reporterAdmin,
            );

          /*
           * Even if the admins lookup
           * unexpectedly fails, retain
           * the ID from the audit log.
           *
           * This still allows the UI to
           * correctly identify the case
           * as an administrator flag
           * instead of a user report.
           */
          if (
            !reporterIdentity.id
          ) {
            reporterIdentity.id =
              reporterAdminId;
          }
        } else if (
          isAutomatedModerationReport(
            report.reason,
          )
        ) {
          reporterSource =
            "system";

          reporterIdentity =
            systemIdentity();
        }

        return {
          id:
            reportId,

          reporter_id:
            report.reporter_id,

          reported_user_id:
            report.reported_user_id,

          pin_id:
            report.pin_id,

          comment_id:
            report.comment_id,

          chat_id:
            report.chat_id,

          type:
            report.type as
              ReportType,

          reason:
            report.reason,

          details:
            report.details,

          status:
            report.status as
              ReportStatus,

          reviewed_by:
            report.reviewed_by,

          reviewed_at:
            report.reviewed_at,

          created_at:
            report.created_at,

          reporter,

          reporter_admin:
            reporterAdmin,

          reporter_source:
            reporterSource,

          reporter_identity:
            reporterIdentity,

          reported_user:
            report.reported_user_id
              ? profiles.get(
                  report.reported_user_id,
                ) ??
                null
              : null,

          assigned_admin:
            report.reviewed_by
              ? admins.get(
                  report.reviewed_by,
                ) ??
                null
              : null,

          target,

          previous_reports_count:
            report.reported_user_id
              ? previousReports.get(
                  report.reported_user_id,
                ) ??
                0
              : 0,
        };
      },
    );

  const filteredTotal =
    reportsResult.count ??
    0;

  return {
    reports,

    stats: {
      total:
        safeCount(
          totalResult,
        ),

      pending:
        safeCount(
          pendingResult,
        ),

      reviewing:
        safeCount(
          reviewingResult,
        ),

      resolvedToday:
        safeCount(
          resolvedTodayResult,
        ),
    },

    pagination: {
      page:
        normalizedPage,

      pageSize:
        PAGE_SIZE,

      total:
        filteredTotal,

      pageCount:
        Math.max(
          1,
          Math.ceil(
            filteredTotal /
              PAGE_SIZE,
          ),
        ),
    },

    hasErrors:
      [
        reportsResult.error,
        totalResult.error,
        pendingResult.error,
        reviewingResult.error,
        resolvedTodayResult.error,
        ...relationErrors,
      ].filter(
        Boolean,
      ).length >
      0,
  };
}