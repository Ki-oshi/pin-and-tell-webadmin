import type {
  Metadata,
} from "next";

import {
  AlertTriangle,
  Camera,
  Map,
  MapPin,
} from "lucide-react";

import {
  getPinsPageData,
} from "@/lib/admin/pins";

import PinsTable from "@/components/admin/pins/pins-table";

export const metadata:
  Metadata = {
  title: "Pins",
};

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

type PinsPageProps = {
  searchParams: Promise<{
    q?:
      | string
      | string[];

    category?:
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

export default async function PinsPage({
  searchParams,
}: PinsPageProps) {
  const params =
    await searchParams;

  const query =
    firstValue(
      params.q,
    );

  const category =
    firstValue(
      params.category,
    ) || "all";

  const sort =
    firstValue(
      params.sort,
    ) || "newest";

  const parsedPage =
    Number.parseInt(
      firstValue(
        params.page,
      ) || "1",
      10,
    );

  const data =
    await getPinsPageData(
      {
        page:
          Number.isFinite(
            parsedPage,
          )
            ? parsedPage
            : 1,

        search:
          query,

        category,

        sort,
      },
    );

  const stats = [
    {
      label:
        "Total Pins",

      value:
        data.stats
          .total,

      description:
        "Published map content",

      icon:
        MapPin,

      style:
        "bg-[#A92F56]/[0.08] text-[#A92F56]",
    },

    {
      label:
        "New This Week",

      value:
        data.stats
          .recent,

      description:
        "Created in the last 7 days",

      icon:
        Map,

      style:
        "bg-blue-50 text-blue-600",
    },

    {
      label:
        "With Photos",

      value:
        data.stats
          .withPhotos,

      description:
        "Pins containing media",

      icon:
        Camera,

      style:
        "bg-emerald-50 text-emerald-600",
    },

    {
      label:
        "Open Pin Reports",

      value:
        data.stats
          .openReports,

      description:
        "Pending or under review",

      icon:
        AlertTriangle,

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
          Some pin information
          could not be loaded.
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

      <PinsTable
        pins={
          data.pins
        }
        categories={
          data.categories
        }
        pagination={
          data.pagination
        }
        initialQuery={
          query
        }
        initialCategory={
          category
        }
        initialSort={
          [
            "newest",
            "oldest",
            "title",
          ].includes(
            sort,
          )
            ? sort
            : "newest"
        }
      />
    </div>
  );
}