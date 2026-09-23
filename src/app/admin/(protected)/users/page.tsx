import type {
  Metadata,
} from "next";

import {
  Ban,
  ShieldCheck,
  UserX,
  Users,
} from "lucide-react";

import {
  getUsersPageData,
} from "@/lib/admin/users";

import UsersTable from "@/components/admin/users/users-table";

export const metadata:
  Metadata = {
  title: "Users",
};

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

type UsersPageProps = {
  searchParams: Promise<{
    q?:
      | string
      | string[];

    status?:
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

export default async function UsersPage({
  searchParams,
}: UsersPageProps) {
  const params =
    await searchParams;

  const query =
    firstValue(
      params.q,
    );

  const status =
    firstValue(
      params.status,
    ) || "all";

  const parsedPage =
    Number.parseInt(
      firstValue(
        params.page,
      ) || "1",
      10,
    );

  const data =
    await getUsersPageData(
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
      },
    );

  const stats = [
    {
      label:
        "Total Users",

      value:
        data.stats
          .total,

      description:
        "Registered accounts",

      icon:
        Users,

      iconClass:
        "bg-[#A92F56]/[0.08] text-[#A92F56]",
    },

    {
      label:
        "Active",

      value:
        data.stats
          .active,

      description:
        "Accounts in good standing",

      icon:
        ShieldCheck,

      iconClass:
        "bg-emerald-50 text-emerald-600",
    },

    {
      label:
        "Suspended",

      value:
        data.stats
          .suspended,

      description:
        "Restricted accounts",

      icon:
        UserX,

      iconClass:
        "bg-amber-50 text-amber-600",
    },

    {
      label:
        "Banned",

      value:
        data.stats
          .banned,

      description:
        "Banned accounts",

      icon:
        Ban,

      iconClass:
        "bg-red-50 text-red-600",
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
          Some user
          information could
          not be loaded. Check
          the server console
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
                      ${stat.iconClass}
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

      {/* Directory */}
      <UsersTable
        users={
          data.users
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
            "suspended",
            "banned",
          ].includes(
            status,
          )
            ? status
            : "all"
        }
      />
    </div>
  );
}