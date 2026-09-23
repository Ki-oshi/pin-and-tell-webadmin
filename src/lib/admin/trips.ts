import "server-only";

import {
  getSupabaseAdmin,
} from "@/lib/supabase/admin";

export type TripUserSummary = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  status: string | null;
};

export type TripVehicleSummary = {
  id: number;
  user_id: string;
  vehicle_name: string;
  nickname: string | null;
  fuel_type: string | null;
  efficiency_l_100km: number | null;
  tank_size: number | null;
  is_primary: boolean | null;
  image_url: string | null;
};

export type AdminTripRow = {
  id: string;

  user_id: string;
  vehicle_id: number | null;

  distance_km: number | null;
  fuel_consumed: number | null;

  eco_score: number;
  duration_mins: number;

  start_time: string;
  end_time: string | null;

  max_speed_kmh: number | null;
  avg_speed_kmh: number | null;

  harsh_events_count: number | null;
  harsh_events_details: unknown;

  green_points: number | null;
  co2_saved: number | null;

  start_address: string | null;
  end_address: string | null;

  created_at: string | null;

  user: TripUserSummary | null;
  vehicle: TripVehicleSummary | null;
};

export type TripsPageData = {
  trips: AdminTripRow[];

  stats: {
    total: number | null;
    completed: number | null;
    open: number | null;
    thisWeek: number | null;
  };

  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };

  hasErrors: boolean;
};

type TripsQuery = {
  page?: number;
  search?: string;

  status?: string;

  period?: string;

  sort?: string;
};

const PAGE_SIZE =
  20;

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
      100,
    );
}

function periodStart(
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

export async function getTripsPageData({
  page = 1,
  search = "",
  status = "all",
  period = "all",
  sort = "newest",
}: TripsQuery): Promise<TripsPageData> {
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

  const normalizedStatus =
    [
      "all",
      "completed",
      "open",
    ].includes(
      status,
    )
      ? status
      : "all";

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

  const normalizedSort =
    [
      "newest",
      "oldest",
      "distance",
      "eco",
    ].includes(
      sort,
    )
      ? sort
      : "newest";

  /*
   * Search profile and vehicle
   * records first so rider/vehicle
   * names can be used in Trip search.
   */
  let matchingUserIds:
    string[] = [];

  let matchingVehicleIds:
    number[] = [];

  if (
    normalizedSearch &&
    !UUID_REGEX.test(
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
          .select("id")
          .or(
            [
              `username.ilike.%${normalizedSearch}%`,
              `full_name.ilike.%${normalizedSearch}%`,
            ].join(","),
          )
          .limit(50),

        supabase
          .from(
            "user_vehicles",
          )
          .select("id")
          .or(
            [
              `vehicle_name.ilike.%${normalizedSearch}%`,
              `nickname.ilike.%${normalizedSearch}%`,
            ].join(","),
          )
          .limit(50),
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

  let tripsQuery =
    supabase
      .from("trips")
      .select(
        `
          id,
          user_id,
          vehicle_id,
          distance_km,
          fuel_consumed,
          eco_score,
          duration_mins,
          start_time,
          end_time,
          max_speed_kmh,
          avg_speed_kmh,
          harsh_events_count,
          harsh_events_details,
          green_points,
          co2_saved,
          start_address,
          end_address,
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
      UUID_REGEX.test(
        normalizedSearch,
      )
    ) {
      tripsQuery =
        tripsQuery.or(
          [
            `id.eq.${normalizedSearch}`,
            `user_id.eq.${normalizedSearch}`,
          ].join(","),
        );
    } else {
      const filters = [
        `start_address.ilike.%${normalizedSearch}%`,
        `end_address.ilike.%${normalizedSearch}%`,
      ];

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

      tripsQuery =
        tripsQuery.or(
          filters.join(
            ",",
          ),
        );
    }
  }

  /*
   * Trip completion filter.
   */
  if (
    normalizedStatus ===
    "completed"
  ) {
    tripsQuery =
      tripsQuery.not(
        "end_time",
        "is",
        null,
      );
  }

  if (
    normalizedStatus ===
    "open"
  ) {
    tripsQuery =
      tripsQuery.is(
        "end_time",
        null,
      );
  }

  /*
   * Time period.
   */
  const start =
    periodStart(
      normalizedPeriod,
    );

  if (start) {
    tripsQuery =
      tripsQuery.gte(
        "start_time",
        start,
      );
  }

  /*
   * Sorting.
   */
  if (
    normalizedSort ===
    "oldest"
  ) {
    tripsQuery =
      tripsQuery.order(
        "start_time",
        {
          ascending:
            true,
        },
      );
  } else if (
    normalizedSort ===
    "distance"
  ) {
    tripsQuery =
      tripsQuery.order(
        "distance_km",
        {
          ascending:
            false,

          nullsFirst:
            false,
        },
      );
  } else if (
    normalizedSort ===
    "eco"
  ) {
    tripsQuery =
      tripsQuery.order(
        "eco_score",
        {
          ascending:
            false,
        },
      );
  } else {
    tripsQuery =
      tripsQuery.order(
        "start_time",
        {
          ascending:
            false,
        },
      );
  }

  tripsQuery =
    tripsQuery.range(
      from,
      to,
    );

  const sevenDaysAgo =
    new Date(
      Date.now() -
        7 *
          24 *
          60 *
          60 *
          1000,
    ).toISOString();

  const [
    tripsResult,
    totalResult,
    completedResult,
    openResult,
    weekResult,
  ] =
    await Promise.all([
      tripsQuery,

      supabase
        .from(
          "trips",
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
          "trips",
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
          "end_time",
          "is",
          null,
        ),

      supabase
        .from(
          "trips",
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
        .is(
          "end_time",
          null,
        ),

      supabase
        .from(
          "trips",
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
          "start_time",
          sevenDaysAgo,
        ),
    ]);

  if (
    tripsResult.error
  ) {
    console.error(
      "[ADMIN TRIPS] Failed to load trips:",
      tripsResult.error,
    );

    errors.push(
      tripsResult.error,
    );
  }

  for (
    const result of [
      totalResult,
      completedResult,
      openResult,
      weekResult,
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

  const rawTrips =
    tripsResult.error
      ? []
      : tripsResult.data ??
        [];

  /*
   * Resolve riders and vehicles
   * for the visible page.
   */
  const userIds = [
    ...new Set(
      rawTrips.map(
        (
          trip,
        ) =>
          trip.user_id,
      ),
    ),
  ];

  const vehicleIds = [
    ...new Set(
      rawTrips
        .map(
          (
            trip,
          ) =>
            trip.vehicle_id,
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

  const [
    profilesResult,
    vehiclesResult,
  ] =
    await Promise.all([
      userIds.length > 0
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
    profilesResult.error
  ) {
    errors.push(
      profilesResult.error,
    );
  }

  if (
    vehiclesResult.error
  ) {
    errors.push(
      vehiclesResult.error,
    );
  }

  const users =
    new Map<
      string,
      TripUserSummary
    >();

  for (
    const profile of
    profilesResult.data ??
    []
  ) {
    users.set(
      profile.id,
      {
        id:
          profile.id,

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

  const vehicles =
    new Map<
      number,
      TripVehicleSummary
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

  const trips:
    AdminTripRow[] =
    rawTrips.map(
      (
        trip,
      ) => ({
        id:
          trip.id,

        user_id:
          trip.user_id,

        vehicle_id:
          trip.vehicle_id,

        distance_km:
          trip.distance_km,

        fuel_consumed:
          trip.fuel_consumed,

        eco_score:
          trip.eco_score,

        duration_mins:
          trip.duration_mins,

        start_time:
          trip.start_time,

        end_time:
          trip.end_time,

        max_speed_kmh:
          trip.max_speed_kmh,

        avg_speed_kmh:
          trip.avg_speed_kmh,

        harsh_events_count:
          trip.harsh_events_count,

        harsh_events_details:
          trip.harsh_events_details,

        green_points:
          trip.green_points,

        co2_saved:
          trip.co2_saved,

        start_address:
          trip.start_address,

        end_address:
          trip.end_address,

        created_at:
          trip.created_at,

        user:
          users.get(
            trip.user_id,
          ) ??
          null,

        vehicle:
          trip.vehicle_id
            ? vehicles.get(
                trip.vehicle_id,
              ) ??
              null
            : null,
      }),
    );

  const total =
    tripsResult.count ??
    0;

  return {
    trips,

    stats: {
      total:
        safeCount(
          totalResult,
        ),

      completed:
        safeCount(
          completedResult,
        ),

      open:
        safeCount(
          openResult,
        ),

      thisWeek:
        safeCount(
          weekResult,
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