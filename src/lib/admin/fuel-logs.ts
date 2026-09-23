import "server-only";

import {
  getSupabaseAdmin,
} from "@/lib/supabase/admin";

export type FuelLogUserSummary = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  status: string | null;
};

export type FuelLogVehicleSummary = {
  id: number;
  user_id: string;

  vehicle_name: string;
  nickname: string | null;

  fuel_type: string | null;

  efficiency_l_100km:
    number | null;

  tank_size:
    number | null;

  is_primary:
    boolean | null;

  image_url:
    string | null;
};

export type AdminFuelLogRow = {
  id: number;

  user_id: string;
  vehicle_id: number;

  date: string;

  liters: number;
  cost: number;

  odometer_km:
    number | null;

  efficiency_l_100km:
    number | null;

  created_at:
    string | null;

  user:
    FuelLogUserSummary | null;

  vehicle:
    FuelLogVehicleSummary | null;
};

export type FuelLogsPageData = {
  logs:
    AdminFuelLogRow[];

  stats: {
    total:
      number | null;

    last30Days:
      number | null;

    withEfficiency:
      number | null;

    withOdometer:
      number | null;
  };

  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };

  hasErrors:
    boolean;
};

type FuelLogsQuery = {
  page?: number;

  search?: string;

  period?: string;

  data?: string;

  sort?: string;
};

const PAGE_SIZE =
  20;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
      100,
    );
}

function getPeriodStart(
  period: string,
): string | null {
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

export async function getFuelLogsPageData({
  page = 1,
  search = "",
  period = "all",
  data = "all",
  sort = "newest",
}: FuelLogsQuery): Promise<FuelLogsPageData> {
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

  const normalizedPeriod =
    [
      "all",
      "7d",
      "30d",
      "90d",
    ].includes(
      period,
    )
      ? period
      : "all";

  const normalizedData =
    [
      "all",
      "with_efficiency",
      "without_efficiency",
      "with_odometer",
    ].includes(
      data,
    )
      ? data
      : "all";

  const normalizedSort =
    [
      "newest",
      "oldest",
      "liters",
      "cost",
      "efficiency",
    ].includes(
      sort,
    )
      ? sort
      : "newest";

  /*
   * Search related user and vehicle
   * records first.
   *
   * fuel_logs itself has no text/name
   * columns, so text search is resolved
   * against profiles and user_vehicles.
   */
  let matchingUserIds:
    string[] = [];

  let matchingVehicleIds:
    number[] = [];

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
      profilesResult,
      vehiclesResult,
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
            "user_vehicles",
          )
          .select(
            "id",
          )
          .or(
            [
              `vehicle_name.ilike.%${normalizedSearch}%`,
              `nickname.ilike.%${normalizedSearch}%`,
              `fuel_type.ilike.%${normalizedSearch}%`,
            ].join(","),
          )
          .limit(
            50,
          ),
      ]);

    if (
      profilesResult.error
    ) {
      errors.push(
        profilesResult.error,
      );
    } else {
      matchingUserIds =
        (
          profilesResult.data ??
          []
        ).map(
          (
            profile,
          ) =>
            profile.id,
        );
    }

    if (
      vehiclesResult.error
    ) {
      errors.push(
        vehiclesResult.error,
      );
    } else {
      matchingVehicleIds =
        (
          vehiclesResult.data ??
          []
        ).map(
          (
            vehicle,
          ) =>
            Number(
              vehicle.id,
            ),
        );
    }
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
        "fuel_logs",
      )
      .select(
        `
          id,
          user_id,
          vehicle_id,
          date,
          liters,
          cost,
          odometer_km,
          efficiency_l_100km,
          created_at
        `,
        {
          count:
            "exact",
        },
      );

  /*
   * Search behavior:
   *
   * number = Fuel Log ID
   * UUID   = User ID
   * text   = User or Vehicle
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
        logsQuery.eq(
          "id",
          Number(
            normalizedSearch,
          ),
        );
    } else if (
      UUID_REGEX.test(
        normalizedSearch,
      )
    ) {
      logsQuery =
        logsQuery.eq(
          "user_id",
          normalizedSearch,
        );
    } else {
      const filters:
        string[] = [];

      if (
        matchingUserIds.length >
        0
      ) {
        filters.push(
          `user_id.in.(${matchingUserIds.join(
            ",",
          )})`,
        );
      }

      if (
        matchingVehicleIds.length >
        0
      ) {
        filters.push(
          `vehicle_id.in.(${matchingVehicleIds.join(
            ",",
          )})`,
        );
      }

      if (
        filters.length >
        0
      ) {
        logsQuery =
          logsQuery.or(
            filters.join(
              ",",
            ),
          );
      } else {
        /*
         * Text matched neither a user
         * nor a vehicle.
         *
         * Fuel log IDs are positive
         * identity values, so -1 safely
         * produces an empty result.
         */
        logsQuery =
          logsQuery.eq(
            "id",
            -1,
          );
      }
    }
  }

  /*
   * Date range.
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
        "date",
        periodStart,
      );
  }

  /*
   * Data completeness filter.
   */
  if (
    normalizedData ===
    "with_efficiency"
  ) {
    logsQuery =
      logsQuery.not(
        "efficiency_l_100km",
        "is",
        null,
      );
  }

  if (
    normalizedData ===
    "without_efficiency"
  ) {
    logsQuery =
      logsQuery.is(
        "efficiency_l_100km",
        null,
      );
  }

  if (
    normalizedData ===
    "with_odometer"
  ) {
    logsQuery =
      logsQuery.not(
        "odometer_km",
        "is",
        null,
      );
  }

  /*
   * Sorting.
   */
  if (
    normalizedSort ===
    "oldest"
  ) {
    logsQuery =
      logsQuery.order(
        "date",
        {
          ascending:
            true,
        },
      );
  } else if (
    normalizedSort ===
    "liters"
  ) {
    logsQuery =
      logsQuery.order(
        "liters",
        {
          ascending:
            false,
        },
      );
  } else if (
    normalizedSort ===
    "cost"
  ) {
    logsQuery =
      logsQuery.order(
        "cost",
        {
          ascending:
            false,
        },
      );
  } else if (
    normalizedSort ===
    "efficiency"
  ) {
    logsQuery =
      logsQuery.order(
        "efficiency_l_100km",
        {
          ascending:
            true,

          nullsFirst:
            false,
        },
      );
  } else {
    logsQuery =
      logsQuery.order(
        "date",
        {
          ascending:
            false,
        },
      );
  }

  logsQuery =
    logsQuery.range(
      from,
      to,
    );

  const thirtyDaysAgo =
    new Date(
      Date.now() -
        30 *
          24 *
          60 *
          60 *
          1000,
    ).toISOString();

  /*
   * Main result + statistics.
   */
  const [
    logsResult,
    totalResult,
    recentResult,
    efficiencyResult,
    odometerResult,
  ] =
    await Promise.all([
      logsQuery,

      supabase
        .from(
          "fuel_logs",
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
          "fuel_logs",
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
          "date",
          thirtyDaysAgo,
        ),

      supabase
        .from(
          "fuel_logs",
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
        .not(
          "efficiency_l_100km",
          "is",
          null,
        ),

      supabase
        .from(
          "fuel_logs",
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
        .not(
          "odometer_km",
          "is",
          null,
        ),
    ]);

  if (
    logsResult.error
  ) {
    console.error(
      "[ADMIN FUEL LOGS] Failed to load logs:",
      logsResult.error,
    );

    errors.push(
      logsResult.error,
    );
  }

  for (
    const result of [
      totalResult,
      recentResult,
      efficiencyResult,
      odometerResult,
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
   * Hydrate the visible page with
   * user and vehicle information.
   */
  const userIds = [
    ...new Set(
      rawLogs.map(
        (
          log,
        ) =>
          log.user_id,
      ),
    ),
  ];

  const vehicleIds = [
    ...new Set(
      rawLogs.map(
        (
          log,
        ) =>
          Number(
            log.vehicle_id,
          ),
      ),
    ),
  ];

  const [
    usersResult,
    vehiclesResult,
  ] =
    await Promise.all([
      userIds.length >
      0
        ? supabase
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
            )
        : Promise.resolve({
            data: [],
            error: null,
          }),

      vehicleIds.length >
      0
        ? supabase
            .from(
              "user_vehicles",
            )
            .select(`
              id,
              user_id,
              vehicle_name,
              nickname,
              fuel_type,
              efficiency_l_100km,
              tank_size,
              is_primary,
              image_url
            `)
            .in(
              "id",
              vehicleIds,
            )
        : Promise.resolve({
            data: [],
            error: null,
          }),
    ]);

  if (
    usersResult.error
  ) {
    console.error(
      "[ADMIN FUEL LOGS] Failed to load users:",
      usersResult.error,
    );

    errors.push(
      usersResult.error,
    );
  }

  if (
    vehiclesResult.error
  ) {
    console.error(
      "[ADMIN FUEL LOGS] Failed to load vehicles:",
      vehiclesResult.error,
    );

    errors.push(
      vehiclesResult.error,
    );
  }

  const users =
    new Map<
      string,
      FuelLogUserSummary
    >();

  for (
    const user of
    usersResult.data ??
    []
  ) {
    users.set(
      user.id,
      {
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

  const vehicles =
    new Map<
      number,
      FuelLogVehicleSummary
    >();

  for (
    const vehicle of
    vehiclesResult.data ??
    []
  ) {
    vehicles.set(
      Number(
        vehicle.id,
      ),
      {
        id:
          Number(
            vehicle.id,
          ),

        user_id:
          vehicle.user_id,

        vehicle_name:
          vehicle.vehicle_name,

        nickname:
          vehicle.nickname,

        fuel_type:
          vehicle.fuel_type,

        efficiency_l_100km:
          vehicle.efficiency_l_100km,

        tank_size:
          vehicle.tank_size,

        is_primary:
          vehicle.is_primary,

        image_url:
          vehicle.image_url,
      },
    );
  }

  const logs:
    AdminFuelLogRow[] =
    rawLogs.map(
      (
        log,
      ) => ({
        id:
          Number(
            log.id,
          ),

        user_id:
          log.user_id,

        vehicle_id:
          Number(
            log.vehicle_id,
          ),

        date:
          log.date,

        liters:
          log.liters,

        cost:
          log.cost,

        odometer_km:
          log.odometer_km,

        efficiency_l_100km:
          log.efficiency_l_100km,

        created_at:
          log.created_at,

        user:
          users.get(
            log.user_id,
          ) ??
          null,

        vehicle:
          vehicles.get(
            Number(
              log.vehicle_id,
            ),
          ) ??
          null,
      }),
    );

  const total =
    logsResult.count ??
    0;

  return {
    logs,

    stats: {
      total:
        safeCount(
          totalResult,
        ),

      last30Days:
        safeCount(
          recentResult,
        ),

      withEfficiency:
        safeCount(
          efficiencyResult,
        ),

      withOdometer:
        safeCount(
          odometerResult,
        ),
    },

    pagination: {
      page:
        normalizedPage,

      pageSize:
        PAGE_SIZE,

      total,

      pageCount:
        Math.max(
          1,
          Math.ceil(
            total /
              PAGE_SIZE,
          ),
        ),
    },

    hasErrors:
      errors.length >
      0,
  };
}