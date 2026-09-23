import type {
  Metadata,
} from "next";

import {
  Activity,
  Bot,
  ShieldCheck,
  Users,
} from "lucide-react";

import ActivityLogsTable from "@/components/admin/activity-logs/activity-logs-table";

import {
  getActivityLogsPageData,
} from "@/lib/admin/activity-logs";

export const metadata:
  Metadata = {
  title:
    "Activity Logs",
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

    actor?:
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

export default async function ActivityLogsPage({
  searchParams,
}: Props) {
  const params =
    await searchParams;

  const query =
    firstValue(
      params.q,
    );

  const requestedActor =
    firstValue(
      params.actor,
    );

  const requestedPeriod =
    firstValue(
      params.period,
    );

  const requestedSort =
    firstValue(
      params.sort,
    );

  const actor =
    [
      "all",
      "admin",
      "user",
      "system",
    ].includes(
      requestedActor,
    )
      ? requestedActor
      : "all";

  const period =
    [
      "all",
      "24h",
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
    parsedPage >
      0
      ? parsedPage
      : 1;

  const data =
    await getActivityLogsPageData({
      page,
      search:
        query,
      actor,
      period,
      sort,
    });

  const stats = [
    {
      label:
        "Activity Logs",

      value:
        data.stats.total,

      description:
        `${formatNumber(
          data.stats.last24Hours,
        )} recorded in the last 24 hours`,

      icon:
        Activity,

      style:
        "bg-[#A92F56]/[0.08] text-[#A92F56]",
    },

    {
      label:
        "Admin Activity",

      value:
        data.stats.admins,

      description:
        "Administrative audit events",

      icon:
        ShieldCheck,

      style:
        "bg-rose-50 text-rose-600",
    },

    {
      label:
        "User Activity",

      value:
        data.stats.users,

      description:
        "Events attributed to users",

      icon:
        Users,

      style:
        "bg-blue-50 text-blue-600",
    },

    {
      label:
        "System Events",

      value:
        data.stats.systems,

      description:
        "Automated system activity",

      icon:
        Bot,

      style:
        "bg-violet-50 text-violet-600",
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
          Some activity log
          or actor information
          could not be loaded.
          The available records
          are still displayed
          below.
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

      {/* Audit notice */}
      <section
        className="
          flex
          items-start
          gap-3
          border
          border-slate-200
          bg-white
          px-4
          py-4
        "
      >
        <div
          className="
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            bg-slate-100
            text-slate-600
          "
        >
          <Activity
            size={16}
          />
        </div>

        <div>
          <p
            className="
              text-xs
              font-semibold
              text-slate-800
            "
          >
            Audit Trail
          </p>

          <p
            className="
              mt-1
              max-w-3xl
              text-[11px]
              leading-5
              text-slate-500
            "
          >
            Activity logs are
            displayed as historical
            audit records. This
            administration page does
            not provide edit or delete
            controls for existing log
            entries.
          </p>
        </div>
      </section>

      <ActivityLogsTable
        key={`${query}-${actor}-${period}-${sort}-${page}`}
        logs={
          data.logs
        }
        pagination={
          data.pagination
        }
        initialQuery={
          query
        }
        initialActor={
          actor
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