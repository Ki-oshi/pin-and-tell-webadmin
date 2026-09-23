import "server-only";

import {
  getSupabaseAdmin,
} from "@/lib/supabase/admin";

export type VehicleOwnerSummary = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  status: string | null;
};

export type VehiclePresetSummary = {
  id: number;

  vehicle_type: string | null;
  brand: string | null;
  year: number | null;
  model: string | null;

  tank_size: number | null;

  transmission: string | null;
};

export type AdminVehicleRow = {
  id: number;

  user_id: string;

  preset_id: number | null;

  vehicle_name: string;
  nickname: string | null;

  fuel_type: string | null;

  efficiency_l_100km:
    number | null;

  tank_size:
    number | null;

  is_primary:
    boolean | null;

  created_at: string;

  image_url:
    string | null;

  owner:
    VehicleOwnerSummary | null;

  preset:
    VehiclePresetSummary | null;
};

export type VehiclesPageData = {
  vehicles:
    AdminVehicleRow[];

  stats: {
    total:
      number | null;

    primary:
      number | null;

    presetLinked:
      number | null;

    withImages:
      number | null;
  };

  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };

  fuelTypes:
    string[];

  hasErrors:
    boolean;
};

type VehiclesQuery = {
  page?: number;
  search?: string;

  fuel?: string;

  primary?: string;

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

function cleanFuel(
  value: string,
): string {
  return value
    .trim()
    .replace(
      /[%*(),"']/g,
      "",
    )
    .slice(
      0,
      60,
    );
}

export async function getVehiclesPageData({
  page = 1,
  search = "",
  fuel = "all",
  primary = "all",
  sort = "newest",
}: VehiclesQuery): Promise<VehiclesPageData> {
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

  const normalizedFuel =
    fuel === "all"
      ? "all"
      : cleanFuel(
          fuel,
        );

  const normalizedPrimary =
    [
      "all",
      "primary",
      "secondary",
    ].includes(
      primary,
    )
      ? primary
      : "all";

  const normalizedSort =
    [
      "newest",
      "oldest",
      "name",
    ].includes(
      sort,
    )
      ? sort
      : "newest";

  /*
   * Resolve searches against related
   * owner profiles and presets first.
   */
  let matchingUserIds:
    string[] = [];

  let matchingPresetIds:
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
      presetsResult,
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
            "vehicle_presets",
          )
          .select("id")
          .or(
            [
              `vehicle_type.ilike.%${normalizedSearch}%`,
              `brand.ilike.%${normalizedSearch}%`,
              `model.ilike.%${normalizedSearch}%`,
              `transmission.ilike.%${normalizedSearch}%`,
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
      presetsResult.error
    ) {
      errors.push(
        presetsResult.error,
      );
    } else {
      matchingPresetIds =
        (
          presetsResult.data ??
          []
        ).map(
          (
            preset,
          ) =>
            Number(
              preset.id,
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

  let vehiclesQuery =
    supabase
      .from(
        "user_vehicles",
      )
      .select(
        `
          id,
          user_id,
          preset_id,
          vehicle_name,
          nickname,
          fuel_type,
          efficiency_l_100km,
          tank_size,
          is_primary,
          created_at,
          image_url
        `,
        {
          count:
            "exact",
        },
      );

  /*
   * Search:
   *
   * numeric = exact vehicle ID
   * UUID    = exact owner ID
   * text    = name / nickname /
   *           fuel / owner / preset
   */
  if (
    normalizedSearch
  ) {
    if (
      /^\d+$/.test(
        normalizedSearch,
      )
    ) {
      vehiclesQuery =
        vehiclesQuery.eq(
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
      vehiclesQuery =
        vehiclesQuery.eq(
          "user_id",
          normalizedSearch,
        );
    } else {
      const filters = [
        `vehicle_name.ilike.%${normalizedSearch}%`,
        `nickname.ilike.%${normalizedSearch}%`,
        `fuel_type.ilike.%${normalizedSearch}%`,
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
        matchingPresetIds.length >
        0
      ) {
        filters.push(
          `preset_id.in.(${matchingPresetIds.join(
            ",",
          )})`,
        );
      }

      vehiclesQuery =
        vehiclesQuery.or(
          filters.join(
            ",",
          ),
        );
    }
  }

  /*
   * Fuel type.
   */
  if (
    normalizedFuel !==
    "all"
  ) {
    vehiclesQuery =
      vehiclesQuery.eq(
        "fuel_type",
        normalizedFuel,
      );
  }

  /*
   * Primary / secondary.
   */
  if (
    normalizedPrimary ===
    "primary"
  ) {
    vehiclesQuery =
      vehiclesQuery.eq(
        "is_primary",
        true,
      );
  }

  if (
    normalizedPrimary ===
    "secondary"
  ) {
    vehiclesQuery =
      vehiclesQuery.or(
        "is_primary.eq.false,is_primary.is.null",
      );
  }

  /*
   * Sorting.
   */
  if (
    normalizedSort ===
    "oldest"
  ) {
    vehiclesQuery =
      vehiclesQuery.order(
        "created_at",
        {
          ascending:
            true,
        },
      );
  } else if (
    normalizedSort ===
    "name"
  ) {
    vehiclesQuery =
      vehiclesQuery.order(
        "vehicle_name",
        {
          ascending:
            true,
        },
      );
  } else {
    vehiclesQuery =
      vehiclesQuery.order(
        "created_at",
        {
          ascending:
            false,
        },
      );
  }

  vehiclesQuery =
    vehiclesQuery.range(
      from,
      to,
    );

  /*
   * Stats + fuel type discovery.
   */
  const [
    vehiclesResult,
    totalResult,
    primaryResult,
    presetResult,
    imageResult,
    fuelTypesResult,
  ] =
    await Promise.all([
      vehiclesQuery,

      supabase
        .from(
          "user_vehicles",
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
          "user_vehicles",
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
          "is_primary",
          true,
        ),

      supabase
        .from(
          "user_vehicles",
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
          "preset_id",
          "is",
          null,
        ),

      supabase
        .from(
          "user_vehicles",
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
          "image_url",
          "is",
          null,
        ),

      supabase
        .from(
          "user_vehicles",
        )
        .select(
          "fuel_type",
        )
        .not(
          "fuel_type",
          "is",
          null,
        )
        .limit(
          5000,
        ),
    ]);

  if (
    vehiclesResult.error
  ) {
    console.error(
      "[ADMIN VEHICLES] Failed to load vehicles:",
      vehiclesResult.error,
    );

    errors.push(
      vehiclesResult.error,
    );
  }

  for (
    const result of [
      totalResult,
      primaryResult,
      presetResult,
      imageResult,
      fuelTypesResult,
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

  const rawVehicles =
    vehiclesResult.error
      ? []
      : vehiclesResult.data ??
        [];

  const ownerIds = [
    ...new Set(
      rawVehicles.map(
        (
          vehicle,
        ) =>
          vehicle.user_id,
      ),
    ),
  ];

  const presetIds = [
    ...new Set(
      rawVehicles
        .map(
          (
            vehicle,
          ) =>
            vehicle.preset_id,
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

  /*
   * Hydrate owner and preset
   * information for current page.
   */
  const [
    ownersResult,
    presetsResult,
  ] =
    await Promise.all([
      ownerIds.length >
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
              ownerIds,
            )
        : Promise.resolve({
            data: [],
            error: null,
          }),

      presetIds.length >
      0
        ? supabase
            .from(
              "vehicle_presets",
            )
            .select(`
              id,
              vehicle_type,
              brand,
              year,
              model,
              tank_size,
              transmission
            `)
            .in(
              "id",
              presetIds,
            )
        : Promise.resolve({
            data: [],
            error: null,
          }),
    ]);

  if (
    ownersResult.error
  ) {
    errors.push(
      ownersResult.error,
    );
  }

  if (
    presetsResult.error
  ) {
    errors.push(
      presetsResult.error,
    );
  }

  const owners =
    new Map<
      string,
      VehicleOwnerSummary
    >();

  for (
    const owner of
    ownersResult.data ??
    []
  ) {
    owners.set(
      owner.id,
      {
        id:
          owner.id,

        username:
          owner.username,

        full_name:
          owner.full_name,

        avatar_url:
          owner.avatar_url,

        status:
          owner.status,
      },
    );
  }

  const presets =
    new Map<
      number,
      VehiclePresetSummary
    >();

  for (
    const preset of
    presetsResult.data ??
    []
  ) {
    presets.set(
      Number(
        preset.id,
      ),
      {
        id:
          Number(
            preset.id,
          ),

        vehicle_type:
          preset.vehicle_type,

        brand:
          preset.brand,

        year:
          preset.year,

        model:
          preset.model,

        tank_size:
          preset.tank_size,

        transmission:
          preset.transmission,
      },
    );
  }

  const vehicles:
    AdminVehicleRow[] =
    rawVehicles.map(
      (
        vehicle,
      ) => ({
        id:
          Number(
            vehicle.id,
          ),

        user_id:
          vehicle.user_id,

        preset_id:
          vehicle.preset_id,

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

        created_at:
          vehicle.created_at,

        image_url:
          vehicle.image_url,

        owner:
          owners.get(
            vehicle.user_id,
          ) ??
          null,

        preset:
          vehicle.preset_id
            ? presets.get(
                vehicle.preset_id,
              ) ??
              null
            : null,
      }),
    );

  const fuelTypes = [
    ...new Set(
      (
        fuelTypesResult.data ??
        []
      )
        .map(
          (
            row,
          ) =>
            row.fuel_type
              ?.trim(),
        )
        .filter(
          (
            value,
          ): value is string =>
            Boolean(value),
        ),
    ),
  ].sort(
    (
      a,
      b,
    ) =>
      a.localeCompare(
        b,
      ),
  );

  const total =
    vehiclesResult.count ??
    0;

  return {
    vehicles,

    stats: {
      total:
        safeCount(
          totalResult,
        ),

      primary:
        safeCount(
          primaryResult,
        ),

      presetLinked:
        safeCount(
          presetResult,
        ),

      withImages:
        safeCount(
          imageResult,
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

    fuelTypes,

    hasErrors:
      errors.length >
      0,
  };
}