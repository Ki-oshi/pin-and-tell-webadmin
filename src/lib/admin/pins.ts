import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type AdminPinRow = {
  id: number;

  title: string;
  description: string | null;

  latitude: number;
  longitude: number;

  category: string | null;
  subcategory: string | null;

  creator_email: string | null;
  creator_id: string | null;

  photo_url: string | null;

  created_at: string | null;

  creator: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    status: string | null;
  } | null;

  likes_count: number;
  comments_count: number;
  vouches_count: number;
  open_reports_count: number;
};

export type PinsPageData = {
  pins: AdminPinRow[];

  categories: string[];

  stats: {
    total: number | null;
    recent: number | null;
    withPhotos: number | null;
    openReports: number | null;
  };

  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };

  hasErrors: boolean;
};

type PinsQuery = {
  page?: number;
  search?: string;
  category?: string;
  sort?: string;
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
    .slice(0, 100);
}

function incrementCount(
  map: Map<number, number>,
  pinId: number | null,
) {
  if (
    pinId === null ||
    pinId === undefined
  ) {
    return;
  }

  map.set(
    pinId,
    (map.get(pinId) ?? 0) + 1,
  );
}

export async function getPinsPageData({
  page = 1,
  search = "",
  category = "all",
  sort = "newest",
}: PinsQuery): Promise<PinsPageData> {
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

  const normalizedCategory =
    category.trim().slice(
      0,
      100,
    );

  const normalizedSort =
    [
      "newest",
      "oldest",
      "title",
    ].includes(sort)
      ? sort
      : "newest";

  const from =
    (normalizedPage - 1) *
    PAGE_SIZE;

  const to =
    from +
    PAGE_SIZE -
    1;

  const sevenDaysAgo =
    new Date(
      Date.now() -
        7 *
          24 *
          60 *
          60 *
          1000,
    ).toISOString();

  let pinsQuery =
    supabase
      .from("pins")
      .select(
        `
          id,
          title,
          description,
          latitude,
          longitude,
          category,
          subcategory,
          creator_email,
          creator_id,
          photo_url,
          created_at
        `,
        {
          count: "exact",
        },
      );

  if (
    normalizedSearch
  ) {
    pinsQuery =
      pinsQuery.or(
        [
          `title.ilike.%${normalizedSearch}%`,
          `description.ilike.%${normalizedSearch}%`,
          `creator_email.ilike.%${normalizedSearch}%`,
          `subcategory.ilike.%${normalizedSearch}%`,
        ].join(","),
      );
  }

  if (
    normalizedCategory &&
    normalizedCategory !==
      "all"
  ) {
    pinsQuery =
      pinsQuery.eq(
        "category",
        normalizedCategory,
      );
  }

  if (
    normalizedSort ===
    "oldest"
  ) {
    pinsQuery =
      pinsQuery.order(
        "created_at",
        {
          ascending: true,
        },
      );
  } else if (
    normalizedSort ===
    "title"
  ) {
    pinsQuery =
      pinsQuery.order(
        "title",
        {
          ascending: true,
        },
      );
  } else {
    pinsQuery =
      pinsQuery.order(
        "created_at",
        {
          ascending: false,
        },
      );
  }

  pinsQuery =
    pinsQuery.range(
      from,
      to,
    );

  const [
    pinsResult,
    totalResult,
    recentResult,
    photoResult,
    openReportsResult,
    categoriesResult,
  ] = await Promise.all([
    pinsQuery,

    supabase
      .from("pins")
      .select("id", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("pins")
      .select("id", {
        count: "exact",
        head: true,
      })
      .gte(
        "created_at",
        sevenDaysAgo,
      ),

    supabase
      .from("pins")
      .select("id", {
        count: "exact",
        head: true,
      })
      .not(
        "photo_url",
        "is",
        null,
      )
      .neq(
        "photo_url",
        "",
      ),

    supabase
      .from("reports")
      .select("id", {
        count: "exact",
        head: true,
      })
      .not(
        "pin_id",
        "is",
        null,
      )
      .in(
        "status",
        [
          "pending",
          "reviewing",
        ],
      ),

    supabase
      .from("pins")
      .select("category")
      .not(
        "category",
        "is",
        null,
      )
      .order(
        "category",
        {
          ascending: true,
        },
      )
      .limit(5000),
  ]);

  if (
    pinsResult.error
  ) {
    console.error(
      "[ADMIN PINS] Failed to load pins:",
      pinsResult.error,
    );
  }

  const rawPins =
    pinsResult.error
      ? []
      : pinsResult.data ?? [];

  const pinIds =
    rawPins.map(
      (pin) =>
        Number(pin.id),
    );

  const creatorIds =
    [
      ...new Set(
        rawPins
          .map(
            (pin) =>
              pin.creator_id,
          )
          .filter(
            (
              id,
            ): id is string =>
              Boolean(id),
          ),
      ),
    ];

  const likesCount =
    new Map<
      number,
      number
    >();

  const commentsCount =
    new Map<
      number,
      number
    >();

  const vouchesCount =
    new Map<
      number,
      number
    >();

  const reportsCount =
    new Map<
      number,
      number
    >();

  const creators =
    new Map<
      string,
      {
        username:
          string | null;

        full_name:
          string | null;

        avatar_url:
          string | null;

        status:
          string | null;
      }
    >();

  const relationErrors:
    unknown[] = [];

  if (
    pinIds.length > 0
  ) {
    const [
      likesResult,
      commentsResult,
      vouchesResult,
      reportsResult,
    ] =
      await Promise.all([
        supabase
          .from("likes")
          .select(
            "pin_id",
          )
          .in(
            "pin_id",
            pinIds,
          ),

        supabase
          .from("comments")
          .select(
            "pin_id",
          )
          .in(
            "pin_id",
            pinIds,
          ),

        supabase
          .from("vouches")
          .select(
            "pin_id",
          )
          .in(
            "pin_id",
            pinIds,
          ),

        supabase
          .from("reports")
          .select(
            "pin_id,status",
          )
          .in(
            "pin_id",
            pinIds,
          )
          .in(
            "status",
            [
              "pending",
              "reviewing",
            ],
          ),
      ]);

    if (
      likesResult.error
    ) {
      relationErrors.push(
        likesResult.error,
      );
    } else {
      for (
        const row of
        likesResult.data ??
        []
      ) {
        incrementCount(
          likesCount,
          row.pin_id,
        );
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
        const row of
        commentsResult.data ??
        []
      ) {
        incrementCount(
          commentsCount,
          row.pin_id,
        );
      }
    }

    if (
      vouchesResult.error
    ) {
      relationErrors.push(
        vouchesResult.error,
      );
    } else {
      for (
        const row of
        vouchesResult.data ??
        []
      ) {
        incrementCount(
          vouchesCount,
          row.pin_id,
        );
      }
    }

    if (
      reportsResult.error
    ) {
      relationErrors.push(
        reportsResult.error,
      );
    } else {
      for (
        const row of
        reportsResult.data ??
        []
      ) {
        incrementCount(
          reportsCount,
          row.pin_id,
        );
      }
    }
  }

  if (
    creatorIds.length >
    0
  ) {
    const profilesResult =
      await supabase
        .from("profiles")
        .select(`
          id,
          username,
          full_name,
          avatar_url,
          status
        `)
        .in(
          "id",
          creatorIds,
        );

    if (
      profilesResult.error
    ) {
      relationErrors.push(
        profilesResult.error,
      );
    } else {
      for (
        const profile of
        profilesResult.data ??
        []
      ) {
        creators.set(
          profile.id,
          {
            username:
              profile.username,

            full_name:
              profile.full_name,

            avatar_url:
              profile.avatar_url,

            status:
              profile.status,
          },
        );
      }
    }
  }

  if (
    relationErrors.length >
    0
  ) {
    console.error(
      "[ADMIN PINS] Related data queries failed:",
      relationErrors,
    );
  }

  const pins:
    AdminPinRow[] =
    rawPins.map(
      (pin) => {
        const id =
          Number(
            pin.id,
          );

        return {
          id,

          title:
            pin.title,

          description:
            pin.description,

          latitude:
            Number(
              pin.latitude,
            ),

          longitude:
            Number(
              pin.longitude,
            ),

          category:
            pin.category,

          subcategory:
            pin.subcategory,

          creator_email:
            pin.creator_email,

          creator_id:
            pin.creator_id,

          photo_url:
            pin.photo_url,

          created_at:
            pin.created_at,

          creator:
            pin.creator_id
              ? creators.get(
                  pin.creator_id,
                ) ??
                null
              : null,

          likes_count:
            likesCount.get(
              id,
            ) ?? 0,

          comments_count:
            commentsCount.get(
              id,
            ) ?? 0,

          vouches_count:
            vouchesCount.get(
              id,
            ) ?? 0,

          open_reports_count:
            reportsCount.get(
              id,
            ) ?? 0,
        };
      },
    );

  const categories =
    [
      ...new Set(
        (
          categoriesResult
            .data ?? []
        )
          .map(
            (row) =>
              row.category
                ?.trim(),
          )
          .filter(
            (
              value,
            ): value is string =>
              Boolean(value),
          ),
      ),
    ];

  const filteredTotal =
    pinsResult.count ??
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
    pinsResult.error,
    totalResult.error,
    recentResult.error,
    photoResult.error,
    openReportsResult.error,
    categoriesResult.error,
    ...relationErrors,
  ].filter(Boolean);

  return {
    pins,

    categories,

    stats: {
      total:
        countValue(
          totalResult,
        ),

      recent:
        countValue(
          recentResult,
        ),

      withPhotos:
        countValue(
          photoResult,
        ),

      openReports:
        countValue(
          openReportsResult,
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