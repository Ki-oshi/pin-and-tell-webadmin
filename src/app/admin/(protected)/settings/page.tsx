import type {
  Metadata,
} from "next";

import {
  Clock3,
  Database,
  Layers3,
  Settings2,
} from "lucide-react";

import PlatformSettingsForm from "@/components/admin/settings/platform-settings-form";

import {
  getPlatformSettingsPageData,
} from "@/lib/admin/platform-settings";

export const metadata:
  Metadata = {
  title:
    "Platform Settings",
};

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

function formatNumber(
  value:
    number,
): string {
  return new Intl.NumberFormat(
    "en-US",
  ).format(
    value,
  );
}

function formatDateTime(
  value:
    string | null,
): string {
  if (
    !value
  ) {
    return "Never";
  }

  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      month:
        "short",

      day:
        "numeric",

      year:
        "numeric",

      hour:
        "numeric",

      minute:
        "2-digit",

      timeZone:
        "Asia/Manila",
    },
  ).format(
    date,
  );
}

export default async function PlatformSettingsPage() {
  const data =
    await getPlatformSettingsPageData();

  const stats = [
    {
      label:
        "Settings",

      value:
        formatNumber(
          data.stats.total,
        ),

      description:
        "Configuration records currently available",

      icon:
        Settings2,

      style:
        "bg-[#A92F56]/[0.08] text-[#A92F56]",
    },

    {
      label:
        "Groups",

      value:
        formatNumber(
          data.stats.groups,
        ),

      description:
        "Configuration categories from the database",

      icon:
        Layers3,

      style:
        "bg-blue-50 text-blue-600",
    },

    {
      label:
        "Configured",

      value:
        formatNumber(
          data.stats.configured,
        ),

      description:
        "Settings with a stored value",

      icon:
        Database,

      style:
        "bg-emerald-50 text-emerald-600",
    },

    {
      label:
        "Last Updated",

      value:
        data.stats.lastUpdated
          ? formatDateTime(
              data.stats.lastUpdated,
            )
          : "Never",

      description:
        "Most recent configuration change",

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
        pb-16
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
            leading-5
            text-amber-800
          "
        >
          Some platform setting
          information could not be
          loaded. The available
          configuration is still
          displayed below.
        </div>
      )}

      {/* =========================
          PAGE INTRODUCTION
      ========================== */}
      <section
        className="
          flex
          flex-col
          gap-4
          border
          border-slate-200
          bg-white
          p-5
          lg:flex-row
          lg:items-center
          lg:justify-between
        "
      >
        <div
          className="
            flex
            items-start
            gap-3
          "
        >
          <div
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              bg-[#A92F56]/[0.08]
              text-[#A92F56]
            "
          >
            <Settings2
              size={18}
            />
          </div>

          <div>
            <h2
              className="
                text-sm
                font-semibold
                text-slate-950
              "
            >
              Platform Configuration
            </h2>

            <p
              className="
                mt-1
                max-w-3xl
                text-[11px]
                leading-5
                text-slate-500
              "
            >
              Manage the existing
              configuration values
              stored in the PIN&amp;TELL
              platform settings table.
              Setting keys, groups,
              descriptions, and data
              types remain controlled
              by the database.
            </p>
          </div>
        </div>

        <div
          className="
            border
            border-slate-200
            bg-slate-50
            px-3
            py-2
            text-[10px]
            text-slate-500
          "
        >
          <span
            className="
              font-semibold
              text-slate-700
            "
          >
            Note:
          </span>{" "}
          Only setting values are
          editable from this page.
        </div>
      </section>

      {/* =========================
          STATISTICS
      ========================== */}
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
                        break-words
                        text-[24px]
                        font-semibold
                        leading-tight
                        tracking-[-0.03em]
                        text-slate-950
                      "
                    >
                      {
                        stat.value
                      }
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

      {/* =========================
          SETTINGS FORM
      ========================== */}
      <PlatformSettingsForm
        groups={
          data.groups
        }
      />
    </div>
  );
}