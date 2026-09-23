import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type UserStatus =
  | "active"
  | "suspended"
  | "banned";

export type AdminUserRow = {
  id: string;
  username: string | null;
  full_name: string | null;
  phone_number: string | null;
  specialization: string | null;

  reputation: number | null;
  reputation_score: number | null;
  avg_rating: number | null;

  status: UserStatus;

  last_seen: string | null;
  created_at: string | null;
  updated_at: string | null;

  pin_count: number;
  is_online: boolean;
};

export type UsersPageData = {
  users: AdminUserRow[];

  stats: {
    total: number | null;
    active: number | null;
    suspended: number | null;
    banned: number | null;
  };

  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };

  hasErrors: boolean;
};

type UsersQuery = {
  page?: number;
  search?: string;
  status?: string;
};

const PAGE_SIZE = 20;

function countValue(
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
    .slice(0, 80);
}

function isUuid(
  value: string,
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function getUsersPageData({
  page = 1,
  search = "",
  status = "all",
}: UsersQuery): Promise<UsersPageData> {
  const supabase =
    getSupabaseAdmin();

  const normalizedPage =
    Number.isFinite(page)
      ? Math.max(
          1,
          Math.floor(page),
        )
      : 1;

  const normalizedStatus =
    [
      "active",
      "suspended",
      "banned",
    ].includes(status)
      ? status
      : "all";

  const normalizedSearch =
    cleanSearch(search);

  const from =
    (normalizedPage - 1) *
    PAGE_SIZE;

  const to =
    from +
    PAGE_SIZE -
    1;

  let usersQuery =
    supabase
      .from("profiles")
      .select(
        `
          id,
          username,
          full_name,
          phone_number,
          specialization,
          reputation,
          reputation_score,
          avg_rating,
          status,
          last_seen,
          created_at,
          updated_at
        `,
        {
          count: "exact",
        },
      );

  if (
    normalizedStatus !==
    "all"
  ) {
    usersQuery =
      usersQuery.eq(
        "status",
        normalizedStatus,
      );
  }

  if (
    normalizedSearch
  ) {
    if (
      isUuid(
        normalizedSearch,
      )
    ) {
      usersQuery =
        usersQuery.eq(
          "id",
          normalizedSearch,
        );
    } else {
      usersQuery =
        usersQuery.or(
          [
            `username.ilike.%${normalizedSearch}%`,
            `full_name.ilike.%${normalizedSearch}%`,
            `phone_number.ilike.%${normalizedSearch}%`,
          ].join(","),
        );
    }
  }

  usersQuery =
    usersQuery
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

  const [
    usersResult,
    totalResult,
    activeResult,
    suspendedResult,
    bannedResult,
  ] = await Promise.all([
    usersQuery,

    supabase
      .from("profiles")
      .select("id", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("profiles")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "status",
        "active",
      ),

    supabase
      .from("profiles")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "status",
        "suspended",
      ),

    supabase
      .from("profiles")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "status",
        "banned",
      ),
  ]);

  if (
    usersResult.error
  ) {
    console.error(
      "[ADMIN USERS] Failed to load users:",
      usersResult.error,
    );
  }

  const rawUsers =
    usersResult.error
      ? []
      : usersResult.data ??
        [];

  const userIds =
    rawUsers.map(
      (user) =>
        user.id,
    );

  const pinCounts =
    new Map<
      string,
      number
    >();

  let pinError:
    unknown = null;

  if (
    userIds.length > 0
  ) {
    const pinsResult =
      await supabase
        .from("pins")
        .select(
          "creator_id",
        )
        .in(
          "creator_id",
          userIds,
        );

    pinError =
      pinsResult.error;

    if (
      pinsResult.error
    ) {
      console.error(
        "[ADMIN USERS] Failed to load pin counts:",
        pinsResult.error,
      );
    } else {
      for (
        const pin of
        pinsResult.data ??
        []
      ) {
        if (
          !pin.creator_id
        ) {
          continue;
        }

        pinCounts.set(
          pin.creator_id,
          (
            pinCounts.get(
              pin.creator_id,
            ) ?? 0
          ) + 1,
        );
      }
    }
  }

  const onlineCutoff =
    Date.now() -
    5 * 60 * 1000;

  const users =
    rawUsers.map(
      (user) => {
        const lastSeen =
          user.last_seen
            ? new Date(
                user.last_seen,
              ).getTime()
            : 0;

        return {
          ...user,

          status:
            (
              user.status ??
              "active"
            ) as UserStatus,

          pin_count:
            pinCounts.get(
              user.id,
            ) ?? 0,

          is_online:
            Number.isFinite(
              lastSeen,
            ) &&
            lastSeen >=
              onlineCutoff,
        };
      },
    );

  const filteredTotal =
    usersResult.count ??
    0;

  const pageCount =
    Math.max(
      1,
      Math.ceil(
        filteredTotal /
          PAGE_SIZE,
      ),
    );

  const errors = [
    usersResult.error,
    totalResult.error,
    activeResult.error,
    suspendedResult.error,
    bannedResult.error,
    pinError,
  ].filter(Boolean);

  return {
    users,

    stats: {
      total:
        countValue(
          totalResult,
        ),

      active:
        countValue(
          activeResult,
        ),

      suspended:
        countValue(
          suspendedResult,
        ),

      banned:
        countValue(
          bannedResult,
        ),
    },

    pagination: {
      page:
        normalizedPage,

      pageSize:
        PAGE_SIZE,

      total:
        filteredTotal,

      pageCount,
    },

    hasErrors:
      errors.length > 0,
  };
}