import type {
  Metadata,
} from "next";

import {
  Ban,
  Clock3,
  ShieldAlert,
  ShieldX,
} from "lucide-react";

import BansTable from "@/components/admin/bans/bans-table";

import {
  getBansPageData,
} from "@/lib/admin/bans";

export const metadata:
  Metadata = {
  title:
    "Ban Management",
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

    type?:
      | string
      | string[];

    page?:
      | string
      | string[];
  }>;
};

function first(
  value:
    | string
    | string[]
    | undefined,
) {
  return Array.isArray(
    value,
  )
    ? value[0] ?? ""
    : value ?? "";
}

function number(
  value:
    | number
    | null,
) {
  if (value === null) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-US",
  ).format(value);
}

export default async function BansPage({
  searchParams,
}: Props) {
  const params =
    await searchParams;

  const query =
    first(params.q);

  const status =
    first(
      params.status,
    ) || "all";

  const type =
    first(
      params.type,
    ) || "all";

  const parsedPage =
    Number.parseInt(
      first(
        params.page,
      ) || "1",
      10,
    );

  const data =
    await getBansPageData({
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
    });

  const closed =
    data.stats.expired ===
      null ||
    data.stats.revoked ===
      null
      ? null
      : data.stats.expired +
        data.stats.revoked;

  const stats = [
    {
      label:
        "Active Bans",

      value:
        data.stats.active,

      description:
        `${number(
          data.stats.total,
        )} total records`,

      icon:
        ShieldAlert,

      style:
        "bg-red-50 text-red-600",
    },

    {
      label:
        "Temporary",

      value:
        data.stats.temporary,

      description:
        "Active temporary restrictions",

      icon:
        Clock3,

      style:
        "bg-amber-50 text-amber-600",
    },

    {
      label:
        "Permanent",

      value:
        data.stats.permanent,

      description:
        "Active permanent restrictions",

      icon:
        Ban,

      style:
        "bg-[#A92F56]/[0.08] text-[#A92F56]",
    },

    {
      label:
        "Closed",

      value:
        closed,

      description:
        `${number(
          data.stats.expired,
        )} expired · ${number(
          data.stats.revoked,
        )} revoked`,

      icon:
        ShieldX,

      style:
        "bg-slate-100 text-slate-600",
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
          Some ban information
          could not be loaded.
          Check the server console
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
                      {number(
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

      <BansTable
        bans={
          data.bans
        }
        pagination={
          data.pagination
        }
        initialQuery={
          query
        }
        initialStatus={
          [
            "active",
            "expired",
            "revoked",
          ].includes(
            status,
          )
            ? status
            : "all"
        }
        initialType={
          [
            "temporary_ban",
            "permanent_ban",
            "temporary_ip_ban",
          ].includes(
            type,
          )
            ? type
            : "all"
        }
      />
    </div>
  );
}