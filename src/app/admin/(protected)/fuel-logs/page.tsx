import type {
  Metadata,
} from "next";

import {
  CalendarDays,
  Fuel,
  Gauge,
  Route,
} from "lucide-react";

import FuelLogsTable from "@/components/admin/fuel-logs/fuel-logs-table";

import {
  getFuelLogsPageData,
} from "@/lib/admin/fuel-logs";

export const metadata:
  Metadata = {
  title:
    "Fuel Logs",
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

    period?:
      | string
      | string[];

    data?:
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

export default async function FuelLogsPage({
  searchParams,
}: Props) {
  const params =
    await searchParams;

  const query =
    firstValue(
      params.q,
    );

  const requestedPeriod =
    firstValue(
      params.period,
    );

  const requestedData =
    firstValue(
      params.data,
    );

  const requestedSort =
    firstValue(
      params.sort,
    );

  const period =
    [
      "all",
      "7d",
      "30d",
      "90d",
    ].includes(
      requestedPeriod,
    )
      ? requestedPeriod
      : "all";

  const dataFilter =
    [
      "all",
      "with_efficiency",
      "without_efficiency",
      "with_odometer",
    ].includes(
      requestedData,
    )
      ? requestedData
      : "all";

  const sort =
    [
      "newest",
      "oldest",
      "liters",
      "cost",
      "efficiency",
    ].includes(
      requestedSort,
    )
      ? requestedSort
      : "newest";

  const rawPage =
    firstValue(
      params.page,
    );

  const parsedPage =
    /^\d+$/.test(
      rawPage,
    )
      ? Number(
          rawPage,
        )
      : 1;

  const page =
    Number.isSafeInteger(
      parsedPage,
    ) &&
    parsedPage > 0
      ? parsedPage
      : 1;

  const data =
    await getFuelLogsPageData({
      page,

      search:
        query,

      period,

      data:
        dataFilter,

      sort,
    });

  const stats = [
    {
      label:
        "Fuel Logs",

      value:
        data.stats.total,

      description:
        "All recorded fuel entries",

      icon:
        Fuel,

      style:
        "bg-[#A92F56]/[0.08] text-[#A92F56]",
    },

    {
      label:
        "Last 30 Days",

      value:
        data.stats.last30Days,

      description:
        "Fuel records from the last 30 days",

      icon:
        CalendarDays,

      style:
        "bg-blue-50 text-blue-600",
    },

    {
      label:
        "Efficiency Data",

      value:
        data.stats.withEfficiency,

      description:
        "Logs with calculated fuel efficiency",

      icon:
        Gauge,

      style:
        "bg-emerald-50 text-emerald-600",
    },

    {
      label:
        "Odometer Data",

      value:
        data.stats.withOdometer,

      description:
        "Logs containing an odometer reading",

      icon:
        Route,

      style:
        "bg-amber-50 text-amber-600",
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
          Some fuel log,
          user, or vehicle
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

      <FuelLogsTable
        key={`${query}-${period}-${dataFilter}-${sort}-${page}`}
        logs={
          data.logs
        }
        pagination={
          data.pagination
        }
        initialQuery={
          query
        }
        initialPeriod={
          period
        }
        initialData={
          dataFilter
        }
        initialSort={
          sort
        }
      />
    </div>
  );
}