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

export type ReportUserSummary = {
  id: string;
  username: string | null;
  full_name: string | null;
  status: string | null;
};

export type ReportAdminSummary = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
};

export type ReportTarget = {
  type:
    | "pin"
    | "comment"
    | "chat"
    | "user"
    | "unknown";

  id: string | number | null;

  title: string | null;
  content: string | null;

  photo_url: string | null;

  pin_id: number | null;

  sender_id: string | null;
  receiver_id: string | null;
};

export type AdminReportRow = {
  id: number;

  reporter_id: string | null;
  reported_user_id: string | null;

  pin_id: number | null;
  comment_id: number | null;
  chat_id: number | null;

  type: ReportType;
  reason: string;
  details: string | null;

  status: ReportStatus;

  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string | null;

  reporter: ReportUserSummary | null;
  reported_user: ReportUserSummary | null;

  assigned_admin: ReportAdminSummary | null;

  target: ReportTarget;

  previous_reports_count: number;
};

export type ReportsPageData = {
  reports: AdminReportRow[];

  stats: {
    total: number | null;
    pending: number | null;
    reviewing: number | null;
    resolvedToday: number | null;
  };

  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };

  hasErrors: boolean;
};

type ReportsQuery = {
  page?: number;
  search?: string;
  status?: string;
  type?: string;
  pinId?: number | null;
};

const PAGE_SIZE = 20;

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
    count: number | null;
    error: unknown;
  },
): number | null {
  if (result.error) {
    return null;
  }

  return result.count ?? 0;
}

function cleanSearch(
  value: string,
): string {
  return value
    .trim()
    .replace(
      /[%*(),"']/g,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .slice(0, 100);
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
      (part) =>
        part.type ===
        "year",
    )?.value;

  const month =
    parts.find(
      (part) =>
        part.type ===
        "month",
    )?.value;

  const day =
    parts.find(
      (part) =>
        part.type ===
        "day",
    )?.value;

  return new Date(
    `${year}-${month}-${day}T00:00:00+08:00`,
  ).toISOString();
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
    Number.isFinite(page)
      ? Math.max(
          1,
          Math.floor(page),
        )
      : 1;

  const normalizedSearch =
    cleanSearch(search);

  const normalizedStatus =
    REPORT_STATUSES.includes(
      status as ReportStatus,
    )
      ? status
      : "all";

  const normalizedType =
    REPORT_TYPES.includes(
      type as ReportType,
    )
      ? type
      : "all";

  const normalizedPinId =
    pinId &&
    Number.isInteger(pinId) &&
    pinId > 0
      ? pinId
      : null;

  const from =
    (normalizedPage - 1) *
    PAGE_SIZE;

  const to =
    from +
    PAGE_SIZE -
    1;

  let reportsQuery =
    supabase
      .from("reports")
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
          count: "exact",
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
          ].join(","),
        );
    }
  }

  reportsQuery =
    reportsQuery
      .order(
        "created_at",
        {
          ascending: false,
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
        .from("reports")
        .select("id", {
          count: "exact",
          head: true,
        }),

      supabase
        .from("reports")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq(
          "status",
          "pending",
        ),

      supabase
        .from("reports")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq(
          "status",
          "reviewing",
        ),

      supabase
        .from("reports")
        .select("id", {
          count: "exact",
          head: true,
        })
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

  const pinIds =
    [
      ...new Set(
        rawReports
          .map(
            (report) =>
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

  const commentIds =
    [
      ...new Set(
        rawReports
          .map(
            (report) =>
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

  const chatIds =
    [
      ...new Set(
        rawReports
          .map(
            (report) =>
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

  const adminIds =
    [
      ...new Set(
        rawReports
          .map(
            (report) =>
              report.reviewed_by,
          )
          .filter(
            (
              id,
            ): id is string =>
              Boolean(id),
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
      {
        id: number;
        title: string;
        description: string | null;
        photo_url: string | null;
        creator_id: string | null;
      }
    >();

  const comments =
    new Map<
      number,
      {
        id: number;
        pin_id: number | null;
        user_id: string | null;
        content: string;
      }
    >();

  const chats =
    new Map<
      number,
      {
        id: number;
        sender_id: string;
        receiver_id: string;
        content: string;
      }
    >();

  const relationErrors:
    unknown[] = [];

  const [
    pinsResult,
    commentsResult,
    chatsResult,
  ] =
    await Promise.all([
      pinIds.length > 0
        ? supabase
            .from("pins")
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
            data: [],
            error: null,
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
            data: [],
            error: null,
          }),

      chatIds.length > 0
        ? supabase
            .from("chats")
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
            data: [],
            error: null,
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
      pinsResult.data ?? []
    ) {
      pins.set(
        Number(pin.id),
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
      chatsResult.data ?? []
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

  const profiles =
    new Map<
      string,
      ReportUserSummary
    >();

  if (
    profileIds.size > 0
  ) {
    const profileResult =
      await supabase
        .from("profiles")
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
          },
        );
      }
    }
  }

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
        .from("admins")
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

  const reportedUserIds =
    [
      ...new Set(
        rawReports
          .map(
            (report) =>
              report.reported_user_id,
          )
          .filter(
            (
              id,
            ): id is string =>
              Boolean(id),
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
        .from("reports")
        .select(
          "reported_user_id",
        )
        .in(
          "reported_user_id",
          reportedUserIds,
        )
        .limit(10000);

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
            ) ?? 0
          ) + 1,
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
      (report) => {
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

        return {
          id:
            Number(
              report.id,
            ),

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

          reporter:
            report.reporter_id
              ? profiles.get(
                  report.reporter_id,
                ) ??
                null
              : null,

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
      ].filter(Boolean)
        .length > 0,
  };
}