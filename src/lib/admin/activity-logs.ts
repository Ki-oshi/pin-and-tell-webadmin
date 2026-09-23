import "server-only";

import {
  getSupabaseAdmin,
} from "@/lib/supabase/admin";

export type ActivityAdminSummary = {
  kind: "admin";

  id: string;
  full_name: string | null;
  email: string;
  role: string;
  status: string;
};

export type ActivityUserSummary = {
  kind: "user";

  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  status: string | null;
};

export type ActivitySystemSummary = {
  kind: "system";
};

export type ActivityActor =
  | ActivityAdminSummary
  | ActivityUserSummary
  | ActivitySystemSummary
  | null;

export type AdminActivityLogRow = {
  id: number;

  user_id: string | null;

  actor_type: string | null;

  action_type: string;

  description: string;

  target_table: string | null;

  target_id: string | null;

  ip_address: string | null;

  user_agent: string | null;

  created_at: string | null;

  actor: ActivityActor;
};

export type ActivityLogsPageData = {
  logs: AdminActivityLogRow[];

  stats: {
    total: number | null;
    admins: number | null;
    users: number | null;
    systems: number | null;
    last24Hours: number | null;
  };

  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };

  hasErrors: boolean;
};

type ActivityLogsQuery = {
  page?: number;
  search?: string;
  actor?: string;
  period?: string;
  sort?: string;
};

const PAGE_SIZE =
  25;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeCount(
  result: {
    count: number | null;
    error: unknown;
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
    .slice(
      0,
      120,
    );
}

function getPeriodStart(
  period: string,
): string | null {
  const hours =
    period === "24h"
      ? 24
      : null;

  if (
    hours !== null
  ) {
    return new Date(
      Date.now() -
        hours *
          60 *
          60 *
          1000,
    ).toISOString();
  }

  const days =
    period === "7d"
      ? 7
      : period === "30d"
        ? 30
        : period === "90d"
          ? 90
          : null;

  if (
    days === null
  ) {
    return null;
  }

  return new Date(
    Date.now() -
      days *
        24 *
        60 *
        60 *
        1000,
  ).toISOString();
}

export async function getActivityLogsPageData({
  page = 1,
  search = "",
  actor = "all",
  period = "all",
  sort = "newest",
}: ActivityLogsQuery): Promise<ActivityLogsPageData> {
  const supabase =
    getSupabaseAdmin();

  const errors:
    unknown[] = [];

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

  const normalizedActor =
    [
      "all",
      "admin",
      "user",
      "system",
    ].includes(
      actor,
    )
      ? actor
      : "all";

  const normalizedPeriod =
    [
      "all",
      "24h",
      "7d",
      "30d",
      "90d",
    ].includes(
      period,
    )
      ? period
      : "all";

  const normalizedSort =
    [
      "newest",
      "oldest",
    ].includes(
      sort,
    )
      ? sort
      : "newest";

  /*
   * Search actor names.
   *
   * logs.user_id is used by the
   * existing logger for either an
   * admin ID or a normal user ID,
   * depending on actor_type.
   */
  let matchingActorIds:
    string[] = [];

  if (
    normalizedSearch &&
    !UUID_REGEX.test(
      normalizedSearch,
    ) &&
    !/^\d+$/.test(
      normalizedSearch,
    )
  ) {
    const [
      usersResult,
      adminsResult,
    ] =
      await Promise.all([
        supabase
          .from(
            "profiles",
          )
          .select(
            "id",
          )
          .or(
            [
              `username.ilike.%${normalizedSearch}%`,
              `full_name.ilike.%${normalizedSearch}%`,
            ].join(","),
          )
          .limit(
            50,
          ),

        supabase
          .from(
            "admins",
          )
          .select(
            "id",
          )
          .or(
            [
              `full_name.ilike.%${normalizedSearch}%`,
              `email.ilike.%${normalizedSearch}%`,
            ].join(","),
          )
          .limit(
            50,
          ),
      ]);

    if (
      usersResult.error
    ) {
      errors.push(
        usersResult.error,
      );
    }

    if (
      adminsResult.error
    ) {
      errors.push(
        adminsResult.error,
      );
    }

    matchingActorIds = [
      ...new Set([
        ...(
          usersResult.data ??
          []
        ).map(
          (
            user,
          ) =>
            user.id,
        ),

        ...(
          adminsResult.data ??
          []
        ).map(
          (
            admin,
          ) =>
            admin.id,
        ),
      ]),
    ];
  }

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

  let logsQuery =
    supabase
      .from(
        "logs",
      )
      .select(
        `
          id,
          user_id,
          actor_type,
          action_type,
          description,
          target_table,
          target_id,
          ip_address,
          user_agent,
          created_at
        `,
        {
          count:
            "exact",
        },
      );

  /*
   * Search.
   */
  if (
    normalizedSearch
  ) {
    if (
      /^\d+$/.test(
        normalizedSearch,
      )
    ) {
      logsQuery =
        logsQuery.or(
          [
            `id.eq.${normalizedSearch}`,
            `target_id.eq.${normalizedSearch}`,
          ].join(","),
        );
    } else if (
      UUID_REGEX.test(
        normalizedSearch,
      )
    ) {
      logsQuery =
        logsQuery.or(
          [
            `user_id.eq.${normalizedSearch}`,
            `target_id.eq.${normalizedSearch}`,
          ].join(","),
        );
    } else {
      const filters = [
        `action_type.ilike.%${normalizedSearch}%`,
        `description.ilike.%${normalizedSearch}%`,
        `target_table.ilike.%${normalizedSearch}%`,
        `target_id.ilike.%${normalizedSearch}%`,
        `ip_address.ilike.%${normalizedSearch}%`,
      ];

      if (
        matchingActorIds.length >
        0
      ) {
        filters.push(
          `user_id.in.(${matchingActorIds.join(
            ",",
          )})`,
        );
      }

      logsQuery =
        logsQuery.or(
          filters.join(
            ",",
          ),
        );
    }
  }

  /*
   * Actor filter.
   */
  if (
    normalizedActor !==
    "all"
  ) {
    logsQuery =
      logsQuery.eq(
        "actor_type",
        normalizedActor,
      );
  }

  /*
   * Period filter.
   */
  const periodStart =
    getPeriodStart(
      normalizedPeriod,
    );

  if (
    periodStart
  ) {
    logsQuery =
      logsQuery.gte(
        "created_at",
        periodStart,
      );
  }

  /*
   * Sorting.
   */
  logsQuery =
    logsQuery.order(
      "created_at",
      {
        ascending:
          normalizedSort ===
          "oldest",

        nullsFirst:
          false,
      },
    );

  logsQuery =
    logsQuery.range(
      from,
      to,
    );

  const last24Hours =
    new Date(
      Date.now() -
        24 *
          60 *
          60 *
          1000,
    ).toISOString();

  const [
    logsResult,
    totalResult,
    adminsResult,
    usersResult,
    systemsResult,
    recentResult,
  ] =
    await Promise.all([
      logsQuery,

      supabase
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
        ),

      supabase
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
          "admin",
        ),

      supabase
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
          "user",
        ),

      supabase
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
        ),

      supabase
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
        .gte(
          "created_at",
          last24Hours,
        ),
    ]);

  if (
    logsResult.error
  ) {
    console.error(
      "[ADMIN ACTIVITY LOGS] Failed to load logs:",
      logsResult.error,
    );

    errors.push(
      logsResult.error,
    );
  }

  for (
    const result of [
      totalResult,
      adminsResult,
      usersResult,
      systemsResult,
      recentResult,
    ]
  ) {
    if (
      result.error
    ) {
      errors.push(
        result.error,
      );
    }
  }

  const rawLogs =
    logsResult.error
      ? []
      : logsResult.data ??
        [];

  /*
   * Determine which IDs belong to
   * admins and which belong to users
   * based strictly on actor_type.
   */
  const adminIds = [
    ...new Set(
      rawLogs
        .filter(
          (
            log,
          ) =>
            log.actor_type ===
              "admin" &&
            Boolean(
              log.user_id,
            ),
        )
        .map(
          (
            log,
          ) =>
            log.user_id as string,
        ),
    ),
  ];

  const userIds = [
    ...new Set(
      rawLogs
        .filter(
          (
            log,
          ) =>
            log.actor_type ===
              "user" &&
            Boolean(
              log.user_id,
            ),
        )
        .map(
          (
            log,
          ) =>
            log.user_id as string,
        ),
    ),
  ];

  let adminRows:
    Array<{
      id: string;
      email: string;
      full_name: string | null;
      role: string;
      status: string;
    }> = [];

  let userRows:
    Array<{
      id: string;
      username: string | null;
      full_name: string | null;
      avatar_url: string | null;
      status: string | null;
    }> = [];

  if (
    adminIds.length >
    0
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          "admins",
        )
        .select(`
          id,
          email,
          full_name,
          role,
          status
        `)
        .in(
          "id",
          adminIds,
        );

    if (
      error
    ) {
      console.error(
        "[ADMIN ACTIVITY LOGS] Failed to hydrate admins:",
        error,
      );

      errors.push(
        error,
      );
    } else {
      adminRows =
        data ??
        [];
    }
  }

  if (
    userIds.length >
    0
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          "profiles",
        )
        .select(`
          id,
          username,
          full_name,
          avatar_url,
          status
        `)
        .in(
          "id",
          userIds,
        );

    if (
      error
    ) {
      console.error(
        "[ADMIN ACTIVITY LOGS] Failed to hydrate users:",
        error,
      );

      errors.push(
        error,
      );
    } else {
      userRows =
        data ??
        [];
    }
  }

  const admins =
    new Map<
      string,
      ActivityAdminSummary
    >();

  for (
    const admin of
    adminRows
  ) {
    admins.set(
      admin.id,
      {
        kind:
          "admin",

        id:
          admin.id,

        full_name:
          admin.full_name,

        email:
          admin.email,

        role:
          admin.role,

        status:
          admin.status,
      },
    );
  }

  const users =
    new Map<
      string,
      ActivityUserSummary
    >();

  for (
    const user of
    userRows
  ) {
    users.set(
      user.id,
      {
        kind:
          "user",

        id:
          user.id,

        username:
          user.username,

        full_name:
          user.full_name,

        avatar_url:
          user.avatar_url,

        status:
          user.status,
      },
    );
  }

  const logs:
    AdminActivityLogRow[] =
    rawLogs.map(
      (
        log,
      ) => {
        let actor:
          ActivityActor =
          null;

        if (
          log.actor_type ===
          "admin" &&
          log.user_id
        ) {
          actor =
            admins.get(
              log.user_id,
            ) ??
            null;
        } else if (
          log.actor_type ===
            "user" &&
          log.user_id
        ) {
          actor =
            users.get(
              log.user_id,
            ) ??
            null;
        } else if (
          log.actor_type ===
          "system"
        ) {
          actor = {
            kind:
              "system",
          };
        }

        return {
          id:
            Number(
              log.id,
            ),

          user_id:
            log.user_id,

          actor_type:
            log.actor_type,

          action_type:
            log.action_type,

          description:
            log.description,

          target_table:
            log.target_table,

          target_id:
            log.target_id,

          ip_address:
            log.ip_address,

          user_agent:
            log.user_agent,

          created_at:
            log.created_at,

          actor,
        };
      },
    );

  const filteredTotal =
    logsResult.count ??
    0;

  return {
    logs,

    stats: {
      total:
        safeCount(
          totalResult,
        ),

      admins:
        safeCount(
          adminsResult,
        ),

      users:
        safeCount(
          usersResult,
        ),

      systems:
        safeCount(
          systemsResult,
        ),

      last24Hours:
        safeCount(
          recentResult,
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
      errors.length >
      0,
  };
}