import type {
  Metadata,
} from "next";

import {
  Car,
  ImageIcon,
  Link2,
  Star,
} from "lucide-react";

import VehiclesTable from "@/components/admin/vehicles/vehicles-table";

import {
  getVehiclesPageData,
} from "@/lib/admin/vehicles";

export const metadata:
  Metadata = {
  title:
    "Vehicles",
};

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

type Props = {
  searchParams: Promise<{
    q?:
      | string
      | string[];

    fuel?:
      | string
      | string[];

    primary?:
      | string
      | string[];

    sort?:
      | string
      | string[];

    page?:
      | string
      | string[];
  }>;
};

function firstValue(
  value:
    | string
    | string[]
    | undefined,
): string {
  if (
    Array.isArray(
      value,
    )
  ) {
    return (
      value[0] ??
      ""
    );
  }

  return (
    value ??
    ""
  );
}

function formatNumber(
  value:
    number | null,
): string {
  if (
    value === null
  ) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-US",
  ).format(
    value,
  );
}

export default async function VehiclesPage({
  searchParams,
}: Props) {
  const params =
    await searchParams;

  const query =
    firstValue(
      params.q,
    );

  const requestedFuel =
    firstValue(
      params.fuel,
    );

  const requestedPrimary =
    firstValue(
      params.primary,
    );

  const requestedSort =
    firstValue(
      params.sort,
    );

  const fuel =
    requestedFuel ||
    "all";

  const primary =
    [
      "all",
      "primary",
      "secondary",
    ].includes(
      requestedPrimary,
    )
      ? requestedPrimary
      : "all";

  const sort =
    [
      "newest",
      "oldest",
      "name",
    ].includes(
      requestedSort,
    )
      ? requestedSort
      : "newest";

  const pageValue =
    firstValue(
      params.page,
    );

  const parsedPage =
    /^\d+$/.test(
      pageValue,
    )
      ? Number(
          pageValue,
        )
      : 1;

  const page =
    Number.isSafeInteger(
      parsedPage,
    ) &&
    parsedPage >
      0
      ? parsedPage
      : 1;

  const data =
    await getVehiclesPageData(
      {
        page,

        search:
          query,

        fuel,

        primary,

        sort,
      },
    );

  /*
   * Only permit fuel types that
   * actually came from the DB.
   */
  const normalizedFuel =
    fuel === "all" ||
    data.fuelTypes.includes(
      fuel,
    )
      ? fuel
      : "all";

  const stats = [
    {
      label:
        "Registered Vehicles",

      value:
        data.stats.total,

      description:
        "All vehicles registered by users",

      icon:
        Car,

      style:
        "bg-[#A92F56]/[0.08] text-[#A92F56]",
    },

    {
      label:
        "Primary Vehicles",

      value:
        data.stats.primary,

      description:
        "Marked as the owner's primary vehicle",

      icon:
        Star,

      style:
        "bg-amber-50 text-amber-600",
    },

    {
      label:
        "Preset Linked",

      value:
        data.stats.presetLinked,

      description:
        "Vehicles associated with a preset",

      icon:
        Link2,

      style:
        "bg-blue-50 text-blue-600",
    },

    {
      label:
        "With Photos",

      value:
        data.stats.withImages,

      description:
        "Vehicles with an uploaded image",

      icon:
        ImageIcon,

      style:
        "bg-emerald-50 text-emerald-600",
    },
  ];

  return (
    <div
      className="
        space-y-5
      "
    >
      {data.hasErrors && (
        <div
          className="
            border
            border-amber-200
            bg-amber-50
            px-4
            py-3
            text-xs
            text-amber-800
          "
        >
          Some vehicle,
          owner, or preset
          information could
          not be loaded.
          Check the server
          console for details.
        </div>
      )}

      {/* Statistics */}
      <section
        className="
          grid
          gap-3
          sm:grid-cols-2
          xl:grid-cols-4
        "
      >
        {stats.map(
          (
            stat,
          ) => {
            const Icon =
              stat.icon;

            return (
              <article
                key={
                  stat.label
                }
                className="
                  border
                  border-slate-200
                  bg-white
                  p-5
                "
              >
                <div
                  className="
                    flex
                    items-start
                    justify-between
                    gap-4
                  "
                >
                  <div
                    className="
                      min-w-0
                    "
                  >
                    <p
                      className="
                        text-xs
                        font-medium
                        text-slate-500
                      "
                    >
                      {
                        stat.label
                      }
                    </p>

                    <p
                      className="
                        mt-2
                        text-[28px]
                        font-semibold
                        leading-none
                        tracking-[-0.04em]
                        text-slate-950
                      "
                    >
                      {formatNumber(
                        stat.value,
                      )}
                    </p>

                    <p
                      className="
                        mt-2
                        text-[11px]
                        leading-5
                        text-slate-400
                      "
                    >
                      {
                        stat.description
                      }
                    </p>
                  </div>

                  <div
                    className={`
                      flex
                      h-9
                      w-9
                      shrink-0
                      items-center
                      justify-center
                      ${stat.style}
                    `}
                  >
                    <Icon
                      size={17}
                      strokeWidth={
                        1.9
                      }
                    />
                  </div>
                </div>
              </article>
            );
          },
        )}
      </section>

      <VehiclesTable
        key={`${query}-${normalizedFuel}-${primary}-${sort}-${page}`}
        vehicles={
          data.vehicles
        }
        fuelTypes={
          data.fuelTypes
        }
        pagination={
          data.pagination
        }
        initialQuery={
          query
        }
        initialFuel={
          normalizedFuel
        }
        initialPrimary={
          primary
        }
        initialSort={
          sort
        }
      />
    </div>
  );
}