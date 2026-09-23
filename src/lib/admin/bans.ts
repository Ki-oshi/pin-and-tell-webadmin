import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type BanType =
  | "temporary_ban"
  | "permanent_ban"
  | "temporary_ip_ban";

export type BanDurationType =
  | "hours"
  | "days"
  | "weeks"
  | "months"
  | "permanent";

export type BanStatus =
  | "active"
  | "expired"
  | "revoked";

export type BanUserSummary = {
  id: string;
  username: string | null;
  full_name: string | null;
  status: string | null;
};

export type BanAdminSummary = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
};

export type AdminBanRow = {
  id: number;
  user_id: string;
  report_id: number | null;
  admin_id: string | null;

  ban_type: BanType;
  duration_type: BanDurationType;
  duration_value: number | null;

  ip_address: string | null;
  reason: string;

  status: BanStatus;
  effective_status: BanStatus;

  reputation_deducted: boolean;

  starts_at: string;
  expires_at: string | null;
  revoked_at: string | null;

  created_at: string;
  updated_at: string;

  user: BanUserSummary | null;
  admin: BanAdminSummary | null;

  report: {
    id: number;
    type: string;
    reason: string;
    status: string;
  } | null;
};

export type BansPageData = {
  bans: AdminBanRow[];

  stats: {
    total: number | null;
    active: number | null;
    temporary: number | null;
    permanent: number | null;
    expired: number | null;
    revoked: number | null;
  };

  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };

  hasErrors: boolean;
};

type BansQuery = {
  page?: number;
  search?: string;
  status?: string;
  type?: string;
};

const PAGE_SIZE = 20;

function safeCount(result: {
  count: number | null;
  error: unknown;
}): number | null {
  if (result.error) {
    return null;
  }

  return result.count ?? 0;
}

function cleanSearch(value: string): string {
  return value
    .trim()
    .replace(/[%*(),"']/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 100);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function effectiveBanStatus(
  status: BanStatus,
  expiresAt: string | null,
): BanStatus {
  if (
    status === "active" &&
    expiresAt &&
    new Date(expiresAt).getTime() <= Date.now()
  ) {
    return "expired";
  }

  return status;
}

export async function getBansPageData({
  page = 1,
  search = "",
  status = "all",
  type = "all",
}: BansQuery): Promise<BansPageData> {
  const supabase = getSupabaseAdmin();

  const normalizedPage = Number.isFinite(page)
    ? Math.max(1, Math.floor(page))
    : 1;

  const normalizedSearch = cleanSearch(search);

  const normalizedStatus = [
    "active",
    "expired",
    "revoked",
  ].includes(status)
    ? status
    : "all";

  const normalizedType = [
    "temporary_ban",
    "permanent_ban",
    "temporary_ip_ban",
  ].includes(type)
    ? type
    : "all";

  const from = (normalizedPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let matchingProfileIds: string[] = [];

  if (
    normalizedSearch &&
    !isUuid(normalizedSearch) &&
    !/^\d+$/.test(normalizedSearch)
  ) {
    const profileResult = await supabase
      .from("profiles")
      .select("id")
      .or(
        [
          `username.ilike.%${normalizedSearch}%`,
          `full_name.ilike.%${normalizedSearch}%`,
          `phone_number.ilike.%${normalizedSearch}%`,
        ].join(","),
      )
      .limit(50);

    if (!profileResult.error) {
      matchingProfileIds = (profileResult.data ?? []).map(
        (profile) => profile.id,
      );
    }
  }

  let bansQuery = supabase
    .from("user_bans")
    .select(
      `
        id,
        user_id,
        report_id,
        admin_id,
        ban_type,
        duration_type,
        duration_value,
        ip_address,
        reason,
        status,
        reputation_deducted,
        starts_at,
        expires_at,
        revoked_at,
        created_at,
        updated_at
      `,
      {
        count: "exact",
      },
    );

  if (normalizedStatus !== "all") {
    bansQuery = bansQuery.eq(
      "status",
      normalizedStatus,
    );
  }

  if (normalizedType !== "all") {
    bansQuery = bansQuery.eq(
      "ban_type",
      normalizedType,
    );
  }

  if (normalizedSearch) {
    if (/^\d+$/.test(normalizedSearch)) {
      bansQuery = bansQuery.eq(
        "id",
        Number(normalizedSearch),
      );
    } else if (isUuid(normalizedSearch)) {
      bansQuery = bansQuery.eq(
        "user_id",
        normalizedSearch,
      );
    } else {
      const filters = [
        `reason.ilike.%${normalizedSearch}%`,
      ];

      if (matchingProfileIds.length > 0) {
        filters.push(
          `user_id.in.(${matchingProfileIds.join(",")})`,
        );
      }

      bansQuery = bansQuery.or(
        filters.join(","),
      );
    }
  }

  bansQuery = bansQuery
    .order("created_at", {
      ascending: false,
    })
    .range(from, to);

  const nowIso = new Date().toISOString();

  const [
    bansResult,
    totalResult,
    activeResult,
    temporaryResult,
    permanentResult,
    expiredResult,
    elapsedResult,
    revokedResult,
  ] = await Promise.all([
    bansQuery,

    supabase
      .from("user_bans")
      .select("id", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("user_bans")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "active")
      .or(
        `expires_at.is.null,expires_at.gt.${nowIso}`,
      ),

    supabase
      .from("user_bans")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "active")
      .in("ban_type", [
        "temporary_ban",
        "temporary_ip_ban",
      ])
      .or(
        `expires_at.is.null,expires_at.gt.${nowIso}`,
      ),

    supabase
      .from("user_bans")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "active")
      .eq(
        "ban_type",
        "permanent_ban",
      ),

    supabase
      .from("user_bans")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "status",
        "expired",
      ),

    supabase
      .from("user_bans")
      .select("id", {
        count: "exact",
        head: true,
      })
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
        nowIso,
      ),

    supabase
      .from("user_bans")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "status",
        "revoked",
      ),
  ]);

  if (bansResult.error) {
    console.error(
      "[ADMIN BANS] Failed to load bans:",
      bansResult.error,
    );
  }

  const rawBans = bansResult.error
    ? []
    : bansResult.data ?? [];

  const userIds = [
    ...new Set(
      rawBans.map((ban) => ban.user_id),
    ),
  ];

  const adminIds = [
    ...new Set(
      rawBans
        .map((ban) => ban.admin_id)
        .filter(
          (id): id is string =>
            Boolean(id),
        ),
    ),
  ];

  const reportIds = [
    ...new Set(
      rawBans
        .map((ban) => ban.report_id)
        .filter(
          (id): id is number =>
            typeof id === "number",
        ),
    ),
  ];

  const users = new Map<
    string,
    BanUserSummary
  >();

  const admins = new Map<
    string,
    BanAdminSummary
  >();

  const reports = new Map<
    number,
    {
      id: number;
      type: string;
      reason: string;
      status: string;
    }
  >();

  const relationErrors: unknown[] = [];

  const [
    usersResult,
    adminsResult,
    reportsResult,
  ] = await Promise.all([
    userIds.length > 0
      ? supabase
          .from("profiles")
          .select(`
            id,
            username,
            full_name,
            status
          `)
          .in(
            "id",
            userIds,
          )
      : Promise.resolve({
          data: [],
          error: null,
        }),

    adminIds.length > 0
      ? supabase
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
          )
      : Promise.resolve({
          data: [],
          error: null,
        }),

    reportIds.length > 0
      ? supabase
          .from("reports")
          .select(`
            id,
            type,
            reason,
            status
          `)
          .in(
            "id",
            reportIds,
          )
      : Promise.resolve({
          data: [],
          error: null,
        }),
  ]);

  if (usersResult.error) {
    relationErrors.push(
      usersResult.error,
    );
  } else {
    for (
      const user of
      usersResult.data ?? []
    ) {
      users.set(user.id, {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        status: user.status,
      });
    }
  }

  if (adminsResult.error) {
    relationErrors.push(
      adminsResult.error,
    );
  } else {
    for (
      const admin of
      adminsResult.data ?? []
    ) {
      admins.set(admin.id, {
        id: admin.id,
        email: admin.email,
        full_name: admin.full_name,
        role: admin.role,
      });
    }
  }

  if (reportsResult.error) {
    relationErrors.push(
      reportsResult.error,
    );
  } else {
    for (
      const report of
      reportsResult.data ?? []
    ) {
      reports.set(
        Number(report.id),
        {
          id:
            Number(
              report.id,
            ),
          type:
            report.type,
          reason:
            report.reason,
          status:
            report.status,
        },
      );
    }
  }

  const bans: AdminBanRow[] =
    rawBans.map((ban) => ({
      id: Number(ban.id),

      user_id:
        ban.user_id,

      report_id:
        ban.report_id,

      admin_id:
        ban.admin_id,

      ban_type:
        ban.ban_type as BanType,

      duration_type:
        ban.duration_type as BanDurationType,

      duration_value:
        ban.duration_value,

      ip_address:
        ban.ip_address,

      reason:
        ban.reason,

      status:
        ban.status as BanStatus,

      effective_status:
        effectiveBanStatus(
          ban.status as BanStatus,
          ban.expires_at,
        ),

      reputation_deducted:
        ban.reputation_deducted,

      starts_at:
        ban.starts_at,

      expires_at:
        ban.expires_at,

      revoked_at:
        ban.revoked_at,

      created_at:
        ban.created_at,

      updated_at:
        ban.updated_at,

      user:
        users.get(
          ban.user_id,
        ) ?? null,

      admin:
        ban.admin_id
          ? admins.get(
              ban.admin_id,
            ) ?? null
          : null,

      report:
        ban.report_id
          ? reports.get(
              ban.report_id,
            ) ?? null
          : null,
    }));

  const elapsedCount =
    safeCount(
      elapsedResult,
    ) ?? 0;

  const expiredDbCount =
    safeCount(
      expiredResult,
    ) ?? 0;

  const filteredTotal =
    bansResult.count ?? 0;

  const errors = [
    bansResult.error,
    totalResult.error,
    activeResult.error,
    temporaryResult.error,
    permanentResult.error,
    expiredResult.error,
    elapsedResult.error,
    revokedResult.error,
    ...relationErrors,
  ].filter(Boolean);

  return {
    bans,

    stats: {
      total:
        safeCount(
          totalResult,
        ),

      active:
        safeCount(
          activeResult,
        ),

      temporary:
        safeCount(
          temporaryResult,
        ),

      permanent:
        safeCount(
          permanentResult,
        ),

      expired:
        expiredDbCount +
        elapsedCount,

      revoked:
        safeCount(
          revokedResult,
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
      errors.length > 0,
  };
}