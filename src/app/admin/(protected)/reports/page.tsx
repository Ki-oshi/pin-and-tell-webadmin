import type {
  Metadata,
} from "next";

import {
  CheckCircle2,
  CircleDot,
  Flag,
  ShieldAlert,
} from "lucide-react";

import {
  getReportsPageData,
} from "@/lib/admin/reports";

import ReportsTable from "@/components/admin/reports/reports-table";

export const metadata:
  Metadata = {
  title: "Reports",
};

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

type ReportsPageProps = {
  searchParams: Promise<{
    q?:
      | string
      | string[];

    status?:
      | string
      | string[];

    type?:
      | string
      | string[];

    pin?:
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
    | number
    | null,
) {
  if (
    value === null
  ) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-US",
  ).format(value);
}

export default async function ReportsPage({
  searchParams,
}: ReportsPageProps) {
  const params =
    await searchParams;

  const query =
    firstValue(
      params.q,
    );

  const status =
    firstValue(
      params.status,
    ) ||
    "all";

  const type =
    firstValue(
      params.type,
    ) ||
    "all";

  const pin =
    firstValue(
      params.pin,
    );

  const parsedPin =
    Number.parseInt(
      pin,
      10,
    );

  const parsedPage =
    Number.parseInt(
      firstValue(
        params.page,
      ) || "1",
      10,
    );

  const data =
    await getReportsPageData(
      {
        page:
          Number.isFinite(
            parsedPage,
          )
            ? parsedPage
            : 1,

        search:
          query,

        status,

        type,

        pinId:
          Number.isFinite(
            parsedPin,
          )
            ? parsedPin
            : null,
      },
    );

  const stats = [
    {
      label:
        "Pending Reports",

      value:
        data.stats
          .pending,

      description:
        "Awaiting review",

      icon:
        ShieldAlert,

      style:
        "bg-amber-50 text-amber-600",
    },

    {
      label:
        "Under Review",

      value:
        data.stats
          .reviewing,

      description:
        "Currently being reviewed",

      icon:
        CircleDot,

      style:
        "bg-blue-50 text-blue-600",
    },

    {
      label:
        "Resolved Today",

      value:
        data.stats
          .resolvedToday,

      description:
        "Completed today",

      icon:
        CheckCircle2,

      style:
        "bg-emerald-50 text-emerald-600",
    },

    {
      label:
        "Total Reports",

      value:
        data.stats
          .total,

      description:
        "All submitted reports",

      icon:
        Flag,

      style:
        "bg-[#A92F56]/[0.08] text-[#A92F56]",
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
          Some report
          information could
          not be loaded. Check
          the server console
          for details.
        </div>
      )}

      <section
        className="
          grid
          gap-3
          sm:grid-cols-2
          xl:grid-cols-4
        "
      >
        {stats.map(
          (stat) => {
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

      <ReportsTable
        reports={
          data.reports
        }
        pagination={
          data.pagination
        }
        initialQuery={
          query
        }
        initialStatus={
          [
            "pending",
            "reviewing",
            "resolved",
            "dismissed",
            "suspended",
            "outdated",
          ].includes(
            status,
          )
            ? status
            : "all"
        }
        initialType={
          [
            "spam",
            "harassment",
            "inappropriate",
            "copyright",
            "misinformation",
            "other",
          ].includes(
            type,
          )
            ? type
            : "all"
        }
        initialPin={
          Number.isFinite(
            parsedPin,
          )
            ? String(
                parsedPin,
              )
            : ""
        }
      />
    </div>
  );
}