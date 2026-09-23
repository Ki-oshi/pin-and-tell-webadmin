import type {
  Metadata,
} from "next";

import {
  CheckCircle2,
  Clock3,
  Route,
  TimerReset,
} from "lucide-react";

import TripsTable from "@/components/admin/trips/trips-table";

import {
  getTripsPageData,
} from "@/lib/admin/trips";

export const metadata:
  Metadata = {
  title: "Trips",
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

    status?:
      | string
      | string[];

    period?:
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

  return value ?? "";
}

function formatNumber(
  value:
    number | null,
) {
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

export default async function TripsPage({
  searchParams,
}: Props) {
  const params =
    await searchParams;

  const query =
    firstValue(
      params.q,
    );

  const requestedStatus =
    firstValue(
      params.status,
    );

  const requestedPeriod =
    firstValue(
      params.period,
    );

  const requestedSort =
    firstValue(
      params.sort,
    );

  const status =
    [
      "all",
      "completed",
      "open",
    ].includes(
      requestedStatus,
    )
      ? requestedStatus
      : "all";

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

  const sort =
    [
      "newest",
      "oldest",
      "distance",
      "eco",
    ].includes(
      requestedSort,
    )
      ? requestedSort
      : "newest";

  const parsedPage =
    Number.parseInt(
      firstValue(
        params.page,
      ) || "1",
      10,
    );

  const page =
    Number.isFinite(
      parsedPage,
    ) &&
    parsedPage >
      0
      ? parsedPage
      : 1;

  const data =
    await getTripsPageData(
      {
        page,

        search:
          query,

        status,

        period,

        sort,
      },
    );

  const stats = [
    {
      label:
        "Total Trips",

      value:
        data.stats
          .total,

      description:
        "All recorded trips",

      icon:
        Route,

      style:
        "bg-[#A92F56]/[0.08] text-[#A92F56]",
    },

    {
      label:
        "Completed",

      value:
        data.stats
          .completed,

      description:
        "Trips with an end time",

      icon:
        CheckCircle2,

      style:
        "bg-emerald-50 text-emerald-600",
    },

    {
      label:
        "Open Trips",

      value:
        data.stats
          .open,

      description:
        "Trips without an end time",

      icon:
        TimerReset,

      style:
        "bg-blue-50 text-blue-600",
    },

    {
      label:
        "Last 7 Days",

      value:
        data.stats
          .thisWeek,

      description:
        "Trips started recently",

      icon:
        Clock3,

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
          Some trip or related
          rider/vehicle information
          could not be loaded.
          Check the server console
          for details.
        </div>
      )}

      {/* Stats */}
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
                  <div>
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

      <TripsTable
        trips={
          data.trips
        }
        pagination={
          data.pagination
        }
        initialQuery={
          query
        }
        initialStatus={
          status
        }
        initialPeriod={
          period
        }
        initialSort={
          sort
        }
      />
    </div>
  );
}