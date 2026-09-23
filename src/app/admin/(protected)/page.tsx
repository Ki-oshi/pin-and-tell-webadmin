import Link from "next/link";

import {
  Activity,
  ArrowRight,
  Ban,
  CarFront,
  ChevronRight,
  CircleAlert,
  Clock3,
  Gauge,
  MapPin,
  ShieldAlert,
  Users,
} from "lucide-react";

import {
  getDashboardData,
  type DashboardLog,
  type DashboardReport,
} from "@/lib/admin/dashboard";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export const dynamic =
  "force-dynamic";

export const revalidate = 0;

function formatNumber(
  value: number | null,
): string {
  if (value === null) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-US",
  ).format(value);
}

function formatRelativeTime(
  value: string | null,
): string {
  if (!value) {
    return "Unknown";
  }

  const timestamp =
    new Date(value).getTime();

  if (
    !Number.isFinite(timestamp)
  ) {
    return "Unknown";
  }

  const difference =
    Date.now() - timestamp;

  const minute =
    60 * 1000;

  const hour =
    60 * minute;

  const day =
    24 * hour;

  if (difference < minute) {
    return "Just now";
  }

  if (difference < hour) {
    return `${Math.floor(
      difference / minute,
    )}m ago`;
  }

  if (difference < day) {
    return `${Math.floor(
      difference / hour,
    )}h ago`;
  }

  if (
    difference <
    7 * day
  ) {
    return `${Math.floor(
      difference / day,
    )}d ago`;
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone:
        "Asia/Manila",
    },
  ).format(
    new Date(value),
  );
}

function capitalize(
  value: string,
): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function reportTarget(
  report: DashboardReport,
): string {
  if (
    report.reported_user_id
  ) {
    return "User";
  }

  if (report.pin_id) {
    return `Pin #${report.pin_id}`;
  }

  if (report.comment_id) {
    return `Comment #${report.comment_id}`;
  }

  return "Content";
}

function ReportStatus({
  status,
}: {
  status: string;
}) {
  const normalized =
    status.toLowerCase();

  const styles:
    Record<
      string,
      string
    > = {
    pending:
      "border-amber-200 bg-amber-50 text-amber-700",

    reviewing:
      "border-blue-200 bg-blue-50 text-blue-700",

    resolved:
      "border-emerald-200 bg-emerald-50 text-emerald-700",

    dismissed:
      "border-slate-200 bg-slate-50 text-slate-600",

    suspended:
      "border-red-200 bg-red-50 text-red-700",

    outdated:
      "border-slate-200 bg-slate-50 text-slate-500",
  };

  return (
    <span
      className={`
        inline-flex
        items-center
        rounded-md
        border
        px-2
        py-1
        text-[10px]
        font-semibold
        uppercase
        tracking-wide
        ${
          styles[
            normalized
          ] ??
          styles.dismissed
        }
      `}
    >
      {capitalize(
        status,
      )}
    </span>
  );
}

function ActivityIcon({
  action,
}: {
  action: string;
}) {
  const normalized =
    action.toLowerCase();

  if (
    normalized.includes(
      "login",
    )
  ) {
    return (
      <Activity
        size={15}
      />
    );
  }

  if (
    normalized.includes(
      "ban",
    )
  ) {
    return (
      <Ban
        size={15}
      />
    );
  }

  if (
    normalized.includes(
      "report",
    )
  ) {
    return (
      <ShieldAlert
        size={15}
      />
    );
  }

  return (
    <Clock3 size={15} />
  );
}

function RecentActivityItem({
  log,
}: {
  log: DashboardLog;
}) {
  return (
    <div
      className="
        flex
        gap-3
        py-3.5
      "
    >
      <div
        className="
          mt-0.5
          flex
          h-8
          w-8
          shrink-0
          items-center
          justify-center
          rounded-lg
          border
          border-slate-200
          bg-slate-50
          text-slate-500
        "
      >
        <ActivityIcon
          action={
            log.action_type
          }
        />
      </div>

      <div
        className="
          min-w-0
          flex-1
        "
      >
        <div
          className="
            flex
            items-start
            justify-between
            gap-3
          "
        >
          <p
            className="
              truncate
              text-xs
              font-semibold
              text-slate-800
            "
          >
            {capitalize(
              log.action_type,
            )}
          </p>

          <span
            className="
              shrink-0
              text-[10px]
              text-slate-400
            "
          >
            {formatRelativeTime(
              log.created_at,
            )}
          </span>
        </div>

        <p
          className="
            mt-1
            line-clamp-2
            text-xs
            leading-5
            text-slate-500
          "
        >
          {log.description}
        </p>
      </div>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const data =
    await getDashboardData();

  const {
    metrics,
    recentReports,
    recentLogs,
  } = data;

  const primaryStats = [
    {
      label:
        "Total Users",

      value:
        metrics.totalUsers,

      detail:
        `${formatNumber(
          metrics.activeUsers7d,
        )} active in 7 days`,

      icon: Users,

      href:
        "/admin/users",
    },

    {
      label:
        "Total Pins",

      value:
        metrics.totalPins,

      detail:
        "Published locations",

      icon: MapPin,

      href:
        "/admin/pins",
    },

    {
      label:
        "Pending Reports",

      value:
        metrics.pendingReports,

      detail:
        `${formatNumber(
          metrics.reviewingReports,
        )} under review`,

      icon:
        CircleAlert,

      href:
        "/admin/reports",
    },

    {
      label:
        "Active Bans",

      value:
        metrics.activeBans,

      detail:
        `${formatNumber(
          metrics.suspendedUsers,
        )} suspended users`,

      icon: Ban,

      href:
        "/admin/bans",
    },
  ];

  const mobilityStats = [
    {
      label:
        "Recorded Trips",

      value:
        metrics.totalTrips,

      icon: Gauge,
    },

    {
      label:
        "Registered Vehicles",

      value:
        metrics.totalVehicles,

      icon:
        CarFront,
    },
  ];

  return (
    <div
      className="
        space-y-6
      "
    >
      {data.hasErrors && (
        <div
          className="
            flex
            items-start
            gap-3
            border
            border-amber-200
            bg-amber-50
            px-4
            py-3
            text-xs
            text-amber-800
          "
        >
          <CircleAlert
            size={16}
            className="
              mt-0.5
              shrink-0
            "
          />

          <p>
            Some dashboard
            information could
            not be loaded.
            Unavailable values
            are displayed as
            an em dash.
          </p>
        </div>
      )}

      {/* PRIMARY METRICS */}
      <section
        className="
          grid
          gap-3
          sm:grid-cols-2
          xl:grid-cols-4
        "
      >
        {primaryStats.map(
          (stat) => {
            const Icon =
              stat.icon;

            return (
              <Link
                key={
                  stat.label
                }
                href={
                  stat.href
                }
                className="
                  group
                  border
                  border-slate-200
                  bg-white
                  p-5
                  transition
                  hover:border-slate-300
                  hover:shadow-sm
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
                        truncate
                        text-[11px]
                        text-slate-400
                      "
                    >
                      {
                        stat.detail
                      }
                    </p>
                  </div>

                  <div
                    className="
                      flex
                      h-9
                      w-9
                      shrink-0
                      items-center
                      justify-center
                      rounded-lg
                      bg-[#A92F56]/[0.08]
                      text-[#A92F56]
                    "
                  >
                    <Icon
                      size={17}
                      strokeWidth={
                        1.9
                      }
                    />
                  </div>
                </div>

                <div
                  className="
                    mt-5
                    flex
                    items-center
                    gap-1
                    border-t
                    border-slate-100
                    pt-3
                    text-[11px]
                    font-medium
                    text-slate-400
                    transition-colors
                    group-hover:text-[#A92F56]
                  "
                >
                  View details

                  <ChevronRight
                    size={13}
                    className="
                      transition-transform
                      group-hover:translate-x-0.5
                    "
                  />
                </div>
              </Link>
            );
          },
        )}
      </section>

      {/* MAIN GRID */}
      <section
        className="
          grid
          gap-4
          xl:grid-cols-[minmax(0,1.55fr)_minmax(310px,0.65fr)]
        "
      >
        {/* REPORTS */}
        <article
          className="
            min-w-0
            border
            border-slate-200
            bg-white
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
              gap-4
              border-b
              border-slate-200
              px-5
              py-4
            "
          >
            <div
              className="
                min-w-0
              "
            >
              <h2
                className="
                  text-sm
                  font-semibold
                  text-slate-900
                "
              >
                Recent Reports
              </h2>

              <p
                className="
                  mt-1
                  text-xs
                  text-slate-500
                "
              >
                Latest
                moderation
                cases submitted
                by users.
              </p>
            </div>

            <Link
              href="/admin/reports"
              className="
                flex
                shrink-0
                items-center
                gap-1.5
                text-xs
                font-semibold
                text-[#A92F56]
                transition
                hover:text-[#72213A]
              "
            >
              View all

              <ArrowRight
                size={14}
              />
            </Link>
          </div>

          {recentReports.length >
          0 ? (
            <div
              className="
                overflow-x-auto
              "
            >
              <table
                className="
                  w-full
                  min-w-[700px]
                  border-collapse
                  text-left
                "
              >
                <thead>
                  <tr
                    className="
                      border-b
                      border-slate-100
                      bg-slate-50/60
                    "
                  >
                    <th
                      className="
                        px-5
                        py-3
                        text-[10px]
                        font-semibold
                        uppercase
                        tracking-[0.08em]
                        text-slate-400
                      "
                    >
                      Report
                    </th>

                    <th
                      className="
                        px-4
                        py-3
                        text-[10px]
                        font-semibold
                        uppercase
                        tracking-[0.08em]
                        text-slate-400
                      "
                    >
                      Type
                    </th>

                    <th
                      className="
                        px-4
                        py-3
                        text-[10px]
                        font-semibold
                        uppercase
                        tracking-[0.08em]
                        text-slate-400
                      "
                    >
                      Target
                    </th>

                    <th
                      className="
                        px-4
                        py-3
                        text-[10px]
                        font-semibold
                        uppercase
                        tracking-[0.08em]
                        text-slate-400
                      "
                    >
                      Status
                    </th>

                    <th
                      className="
                        px-5
                        py-3
                        text-right
                        text-[10px]
                        font-semibold
                        uppercase
                        tracking-[0.08em]
                        text-slate-400
                      "
                    >
                      Submitted
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {recentReports.map(
                    (
                      report,
                    ) => (
                      <tr
                        key={
                          report.id
                        }
                        className="
                          border-b
                          border-slate-100
                          last:border-b-0
                          hover:bg-slate-50/60
                        "
                      >
                        <td
                          className="
                            px-5
                            py-3.5
                          "
                        >
                          <div>
                            <p
                              className="
                                text-xs
                                font-semibold
                                text-slate-800
                              "
                            >
                              #
                              {
                                report.id
                              }
                            </p>

                            <p
                              className="
                                mt-1
                                max-w-[240px]
                                truncate
                                text-[11px]
                                text-slate-500
                              "
                            >
                              {
                                report.reason
                              }
                            </p>
                          </div>
                        </td>

                        <td
                          className="
                            px-4
                            py-3.5
                            text-xs
                            text-slate-600
                          "
                        >
                          {capitalize(
                            report.type,
                          )}
                        </td>

                        <td
                          className="
                            px-4
                            py-3.5
                            text-xs
                            text-slate-600
                          "
                        >
                          {reportTarget(
                            report,
                          )}
                        </td>

                        <td
                          className="
                            px-4
                            py-3.5
                          "
                        >
                          <ReportStatus
                            status={
                              report.status
                            }
                          />
                        </td>

                        <td
                          className="
                            px-5
                            py-3.5
                            text-right
                            text-[11px]
                            text-slate-400
                          "
                        >
                          {formatRelativeTime(
                            report.created_at,
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              className="
                flex
                min-h-[260px]
                flex-col
                items-center
                justify-center
                px-6
                text-center
              "
            >
              <div
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-lg
                  bg-slate-100
                  text-slate-400
                "
              >
                <ShieldAlert
                  size={18}
                />
              </div>

              <p
                className="
                  mt-3
                  text-sm
                  font-medium
                  text-slate-700
                "
              >
                No reports
              </p>

              <p
                className="
                  mt-1
                  text-xs
                  text-slate-400
                "
              >
                New moderation
                reports will
                appear here.
              </p>
            </div>
          )}
        </article>

        {/* MODERATION SNAPSHOT */}
        <article
          className="
            border
            border-slate-200
            bg-white
          "
        >
          <div
            className="
              border-b
              border-slate-200
              px-5
              py-4
            "
          >
            <h2
              className="
                text-sm
                font-semibold
                text-slate-900
              "
            >
              Moderation
            </h2>

            <p
              className="
                mt-1
                text-xs
                text-slate-500
              "
            >
              Current platform
              enforcement
              status.
            </p>
          </div>

          <div
            className="
              divide-y
              divide-slate-100
              px-5
            "
          >
            {[
              {
                label:
                  "Pending reports",

                value:
                  metrics.pendingReports,

                href:
                  "/admin/reports",
              },

              {
                label:
                  "Under review",

                value:
                  metrics.reviewingReports,

                href:
                  "/admin/reports",
              },

              {
                label:
                  "Active bans",

                value:
                  metrics.activeBans,

                href:
                  "/admin/bans",
              },

              {
                label:
                  "Suspended users",

                value:
                  metrics.suspendedUsers,

                href:
                  "/admin/users",
              },
            ].map(
              (item) => (
                <Link
                  key={
                    item.label
                  }
                  href={
                    item.href
                  }
                  className="
                    group
                    flex
                    items-center
                    justify-between
                    gap-4
                    py-4
                  "
                >
                  <span
                    className="
                      text-xs
                      text-slate-600
                      transition-colors
                      group-hover:text-slate-900
                    "
                  >
                    {
                      item.label
                    }
                  </span>

                  <div
                    className="
                      flex
                      items-center
                      gap-2
                    "
                  >
                    <span
                      className="
                        text-sm
                        font-semibold
                        text-slate-950
                      "
                    >
                      {formatNumber(
                        item.value,
                      )}
                    </span>

                    <ChevronRight
                      size={14}
                      className="
                        text-slate-300
                        transition
                        group-hover:translate-x-0.5
                        group-hover:text-[#A92F56]
                      "
                    />
                  </div>
                </Link>
              ),
            )}
          </div>

          <div
            className="
              border-t
              border-slate-100
              bg-slate-50/50
              px-5
              py-4
            "
          >
            <div
              className="
                flex
                items-start
                gap-3
              "
            >
              <ShieldAlert
                size={16}
                className="
                  mt-0.5
                  shrink-0
                  text-[#A92F56]
                "
              />

              <p
                className="
                  text-[11px]
                  leading-5
                  text-slate-500
                "
              >
                Review pending
                reports before
                applying account
                restrictions or
                content actions.
              </p>
            </div>
          </div>
        </article>
      </section>

      {/* LOWER GRID */}
      <section
        className="
          grid
          gap-4
          xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]
        "
      >
        {/* ACTIVITY */}
        <article
          className="
            border
            border-slate-200
            bg-white
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
              border-b
              border-slate-200
              px-5
              py-4
            "
          >
            <div>
              <h2
                className="
                  text-sm
                  font-semibold
                  text-slate-900
                "
              >
                Recent Activity
              </h2>

              <p
                className="
                  mt-1
                  text-xs
                  text-slate-500
                "
              >
                Latest security
                and
                administrative
                events.
              </p>
            </div>

            <Link
              href="/admin/logs"
              className="
                flex
                items-center
                gap-1.5
                text-xs
                font-semibold
                text-[#A92F56]
                hover:text-[#72213A]
              "
            >
              View logs

              <ArrowRight
                size={14}
              />
            </Link>
          </div>

          <div
            className="
              divide-y
              divide-slate-100
              px-5
            "
          >
            {recentLogs.length >
            0 ? (
              recentLogs.map(
                (log) => (
                  <RecentActivityItem
                    key={
                      log.id
                    }
                    log={log}
                  />
                ),
              )
            ) : (
              <div
                className="
                  flex
                  min-h-48
                  items-center
                  justify-center
                  text-xs
                  text-slate-400
                "
              >
                No recent
                activity.
              </div>
            )}
          </div>
        </article>

        {/* PLATFORM */}
        <article
          className="
            border
            border-slate-200
            bg-white
          "
        >
          <div
            className="
              border-b
              border-slate-200
              px-5
              py-4
            "
          >
            <h2
              className="
                text-sm
                font-semibold
                text-slate-900
              "
            >
              Platform Overview
            </h2>

            <p
              className="
                mt-1
                text-xs
                text-slate-500
              "
            >
              Core account and
              mobility usage.
            </p>
          </div>

          <div
            className="
              grid
              grid-cols-2
              border-b
              border-slate-100
            "
          >
            {mobilityStats.map(
              (stat) => {
                const Icon =
                  stat.icon;

                return (
                  <div
                    key={
                      stat.label
                    }
                    className="
                      border-r
                      border-slate-100
                      p-5
                      last:border-r-0
                    "
                  >
                    <Icon
                      size={17}
                      className="
                        text-[#A92F56]
                      "
                    />

                    <p
                      className="
                        mt-5
                        text-2xl
                        font-semibold
                        tracking-[-0.03em]
                        text-slate-950
                      "
                    >
                      {formatNumber(
                        stat.value,
                      )}
                    </p>

                    <p
                      className="
                        mt-1
                        text-[11px]
                        text-slate-500
                      "
                    >
                      {
                        stat.label
                      }
                    </p>
                  </div>
                );
              },
            )}
          </div>

          <div
            className="
              px-5
              py-5
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
                border-b
                border-slate-100
                pb-4
              "
            >
              <div>
                <p
                  className="
                    text-xs
                    font-medium
                    text-slate-700
                  "
                >
                  Active users
                </p>

                <p
                  className="
                    mt-1
                    text-[11px]
                    text-slate-400
                  "
                >
                  Seen within
                  the last 7
                  days
                </p>
              </div>

              <span
                className="
                  text-lg
                  font-semibold
                  text-slate-950
                "
              >
                {formatNumber(
                  metrics.activeUsers7d,
                )}
              </span>
            </div>

            <div
              className="
                flex
                items-center
                justify-between
                pt-4
              "
            >
              <div>
                <p
                  className="
                    text-xs
                    font-medium
                    text-slate-700
                  "
                >
                  Total accounts
                </p>

                <p
                  className="
                    mt-1
                    text-[11px]
                    text-slate-400
                  "
                >
                  Registered
                  PIN&TELL users
                </p>
              </div>

              <span
                className="
                  text-lg
                  font-semibold
                  text-slate-950
                "
              >
                {formatNumber(
                  metrics.totalUsers,
                )}
              </span>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}