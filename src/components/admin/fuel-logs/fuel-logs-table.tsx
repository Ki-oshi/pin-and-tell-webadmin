"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Car,
  Download,
  Eye,
  Fuel,
  Gauge,
  Hash,
  ImageIcon,
  Search,
  Star,
  User,
  X,
} from "lucide-react";

import {
  useSearchParams,
} from "next/navigation";

import {
  useRouter,
} from "nextjs-toploader/app";

import type {
  AdminFuelLogRow,
} from "@/lib/admin/fuel-logs";

type Props = {
  logs:
    AdminFuelLogRow[];

  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };

  initialQuery:
    string;

  initialPeriod:
    string;

  initialData:
    string;

  initialSort:
    string;
};

function userName(
  log:
    AdminFuelLogRow,
) {
  return (
    log.user
      ?.full_name
      ?.trim() ||
    log.user
      ?.username
      ?.trim() ||
    "Unknown user"
  );
}

function vehicleName(
  log:
    AdminFuelLogRow,
) {
  return (
    log.vehicle
      ?.nickname
      ?.trim() ||
    log.vehicle
      ?.vehicle_name
      ?.trim() ||
    `Vehicle #${log.vehicle_id}`
  );
}

function initials(
  value: string,
) {
  return (
    value
      .split(
        /\s+/,
      )
      .filter(
        Boolean,
      )
      .slice(
        0,
        2,
      )
      .map(
        (
          word,
        ) =>
          word[0]
            ?.toUpperCase(),
      )
      .join("") ||
    "U"
  );
}

function formatNumber(
  value:
    number | null,
  digits = 2,
) {
  if (
    value === null ||
    !Number.isFinite(
      value,
    )
  ) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      minimumFractionDigits:
        0,

      maximumFractionDigits:
        digits,
    },
  ).format(
    value,
  );
}

function formatDate(
  value:
    string | null,
) {
  if (!value) {
    return "—";
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
    return "—";
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

      timeZone:
        "Asia/Manila",
    },
  ).format(
    date,
  );
}

function formatDateTime(
  value:
    string | null,
) {
  if (!value) {
    return "—";
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
    return "—";
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

function efficiencyStyle(
  value:
    number | null,
) {
  if (
    value === null
  ) {
    return "border-slate-200 bg-slate-50 text-slate-500";
  }

  /*
   * We deliberately do not label
   * efficiency as good/bad because
   * acceptable L/100 km depends on
   * the actual vehicle.
   */
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function escapeCsv(
  value:
    | string
    | number
    | null
    | undefined,
) {
  const text =
    String(
      value ??
      "",
    );

  return `"${text.replace(
    /"/g,
    '""',
  )}"`;
}

export default function FuelLogsTable({
  logs,
  pagination,
  initialQuery,
  initialPeriod,
  initialData,
  initialSort,
}: Props) {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const currentParams =
    searchParams.toString();

  const [
    query,
    setQuery,
  ] =
    useState(
      initialQuery,
    );

  const [
    selectedLog,
    setSelectedLog,
  ] =
    useState<
      AdminFuelLogRow | null
    >(null);

  /*
   * Debounced URL search.
   *
   * The page component supplies a key,
   * so query state is reinitialized
   * cleanly after URL-driven changes.
   */
  useEffect(() => {
    const timeout =
      window.setTimeout(
        () => {
          const params =
            new URLSearchParams(
              currentParams,
            );

          const cleaned =
            query.trim();

          if (
            cleaned
          ) {
            params.set(
              "q",
              cleaned,
            );
          } else {
            params.delete(
              "q",
            );
          }

          params.delete(
            "page",
          );

          const next =
            params.toString();

          if (
            next !==
            currentParams
          ) {
            router.replace(
              next
                ? `/admin/fuel-logs?${next}`
                : "/admin/fuel-logs",
            );
          }
        },
        350,
      );

    return () =>
      window.clearTimeout(
        timeout,
      );
  }, [
    query,
    currentParams,
    router,
  ]);

  /*
   * Detail drawer behavior.
   */
  useEffect(() => {
    if (
      !selectedLog
    ) {
      return;
    }

    const previous =
      document.body.style
        .overflow;

    document.body.style
      .overflow =
      "hidden";

    function handleKeyDown(
      event:
        KeyboardEvent,
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        setSelectedLog(
          null,
        );
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style
        .overflow =
        previous;

      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    selectedLog,
  ]);

  const showing =
    useMemo(() => {
      if (
        pagination.total ===
        0
      ) {
        return "0 fuel logs";
      }

      const start =
        (
          pagination.page -
          1
        ) *
          pagination.pageSize +
        1;

      const end =
        Math.min(
          pagination.page *
            pagination.pageSize,
          pagination.total,
        );

      return `${start}–${end} of ${pagination.total}`;
    }, [
      pagination,
    ]);

  function updateFilter(
    key: string,
    value: string,
    defaultValue:
      string,
  ) {
    const params =
      new URLSearchParams(
        currentParams,
      );

    if (
      value ===
      defaultValue
    ) {
      params.delete(
        key,
      );
    } else {
      params.set(
        key,
        value,
      );
    }

    params.delete(
      "page",
    );

    const next =
      params.toString();

    router.replace(
      next
        ? `/admin/fuel-logs?${next}`
        : "/admin/fuel-logs",
    );
  }

  function pageUrl(
    page: number,
  ) {
    const params =
      new URLSearchParams(
        currentParams,
      );

    params.set(
      "page",
      String(
        page,
      ),
    );

    return `/admin/fuel-logs?${params.toString()}`;
  }

  function exportPage() {
    if (
      logs.length ===
      0
    ) {
      return;
    }

    const rows = [
      [
        "Fuel Log ID",
        "User",
        "User ID",
        "Vehicle",
        "Vehicle ID",
        "Fuel Type",
        "Date",
        "Liters",
        "Cost",
        "Odometer KM",
        "Efficiency L/100KM",
        "Created At",
      ],

      ...logs.map(
        (
          log,
        ) => [
          log.id,

          userName(
            log,
          ),

          log.user_id,

          vehicleName(
            log,
          ),

          log.vehicle_id,

          log.vehicle
            ?.fuel_type,

          log.date,

          log.liters,

          log.cost,

          log.odometer_km,

          log.efficiency_l_100km,

          log.created_at,
        ],
      ),
    ];

    const csv =
      rows
        .map(
          (
            row,
          ) =>
            row
              .map(
                escapeCsv,
              )
              .join(","),
        )
        .join(
          "\r\n",
        );

    const blob =
      new Blob(
        [
          "\uFEFF",
          csv,
        ],
        {
          type:
            "text/csv;charset=utf-8",
        },
      );

    const url =
      URL.createObjectURL(
        blob,
      );

    const anchor =
      document.createElement(
        "a",
      );

    anchor.href =
      url;

    anchor.download =
      `pin-tell-fuel-logs-page-${pagination.page}.csv`;

    document.body.appendChild(
      anchor,
    );

    anchor.click();

    anchor.remove();

    URL.revokeObjectURL(
      url,
    );
  }

  return (
    <>
      <section
        className="
          border
          border-slate-200
          bg-white
        "
      >
        {/* Toolbar */}
        <div
          className="
            flex
            flex-col
            gap-3
            border-b
            border-slate-200
            p-4
            xl:flex-row
            xl:items-center
            xl:justify-between
          "
        >
          <div
            className="
              relative
              w-full
              xl:max-w-[380px]
            "
          >
            <Search
              size={15}
              className="
                pointer-events-none
                absolute
                left-3
                top-1/2
                -translate-y-1/2
                text-slate-400
              "
            />

            <input
              value={
                query
              }
              onChange={(
                event,
              ) =>
                setQuery(
                  event
                    .target
                    .value,
                )
              }
              placeholder="Search log ID, rider, vehicle or user ID..."
              className="
                h-10
                w-full
                border
                border-slate-200
                bg-white
                pl-9
                pr-9
                text-xs
                text-slate-800
                outline-none
                transition
                placeholder:text-slate-400
                hover:border-slate-300
                focus:border-[#CC3A67]
                focus:ring-2
                focus:ring-[#FDC1C9]/30
              "
            />

            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() =>
                  setQuery(
                    "",
                  )
                }
                className="
                  absolute
                  right-2
                  top-1/2
                  flex
                  h-7
                  w-7
                  -translate-y-1/2
                  items-center
                  justify-center
                  text-slate-400
                  hover:text-slate-700
                "
              >
                <X
                  size={14}
                />
              </button>
            )}
          </div>

          <div
            className="
              flex
              flex-wrap
              items-center
              gap-2
            "
          >
            {/* Period */}
            <select
              value={
                initialPeriod
              }
              onChange={(
                event,
              ) =>
                updateFilter(
                  "period",
                  event
                    .target
                    .value,
                  "all",
                )
              }
              className="
                h-10
                border
                border-slate-200
                bg-white
                px-3
                text-xs
                font-medium
                text-slate-600
                outline-none
                hover:border-slate-300
                focus:border-[#CC3A67]
              "
            >
              <option value="all">
                All time
              </option>

              <option value="7d">
                Last 7 days
              </option>

              <option value="30d">
                Last 30 days
              </option>

              <option value="90d">
                Last 90 days
              </option>
            </select>

            {/* Data completeness */}
            <select
              value={
                initialData
              }
              onChange={(
                event,
              ) =>
                updateFilter(
                  "data",
                  event
                    .target
                    .value,
                  "all",
                )
              }
              className="
                h-10
                border
                border-slate-200
                bg-white
                px-3
                text-xs
                font-medium
                text-slate-600
                outline-none
                hover:border-slate-300
                focus:border-[#CC3A67]
              "
            >
              <option value="all">
                All records
              </option>

              <option value="with_efficiency">
                With efficiency
              </option>

              <option value="without_efficiency">
                Without efficiency
              </option>

              <option value="with_odometer">
                With odometer
              </option>
            </select>

            {/* Sort */}
            <select
              value={
                initialSort
              }
              onChange={(
                event,
              ) =>
                updateFilter(
                  "sort",
                  event
                    .target
                    .value,
                  "newest",
                )
              }
              className="
                h-10
                border
                border-slate-200
                bg-white
                px-3
                text-xs
                font-medium
                text-slate-600
                outline-none
                hover:border-slate-300
                focus:border-[#CC3A67]
              "
            >
              <option value="newest">
                Newest first
              </option>

              <option value="oldest">
                Oldest first
              </option>

              <option value="liters">
                Highest liters
              </option>

              <option value="cost">
                Highest cost
              </option>

              <option value="efficiency">
                Lowest L/100 km
              </option>
            </select>

            <button
              type="button"
              disabled={
                logs.length ===
                0
              }
              onClick={
                exportPage
              }
              className="
                inline-flex
                h-10
                items-center
                gap-2
                border
                border-slate-200
                bg-white
                px-3
                text-xs
                font-medium
                text-slate-600
                transition
                hover:bg-slate-50
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              <Download
                size={14}
              />

              Export page
            </button>
          </div>
        </div>

        {/* Table */}
        {logs.length >
        0 ? (
          <div
            className="
              overflow-x-auto
            "
          >
            <table
              className="
                w-full
                min-w-[1220px]
                border-collapse
                text-left
              "
            >
              <thead>
                <tr
                  className="
                    border-b
                    border-slate-100
                    bg-slate-50/70
                  "
                >
                  {[
                    "Log",
                    "User",
                    "Vehicle",
                    "Date",
                    "Liters",
                    "Cost",
                    "Odometer",
                    "Efficiency",
                    "",
                  ].map(
                    (
                      heading,
                    ) => (
                      <th
                        key={
                          heading ||
                          "action"
                        }
                        className="
                          px-4
                          py-3
                          text-[10px]
                          font-semibold
                          uppercase
                          tracking-[0.08em]
                          text-slate-400
                          first:pl-5
                          last:pr-5
                        "
                      >
                        {
                          heading
                        }
                      </th>
                    ),
                  )}
                </tr>
              </thead>

              <tbody>
                {logs.map(
                  (
                    log,
                  ) => {
                    const name =
                      userName(
                        log,
                      );

                    return (
                      <tr
                        key={
                          log.id
                        }
                        className="
                          border-b
                          border-slate-100
                          last:border-b-0
                          hover:bg-slate-50/60
                        "
                      >
                        {/* Log */}
                        <td
                          className="
                            px-5
                            py-3.5
                          "
                        >
                          <div
                            className="
                              flex
                              items-center
                              gap-3
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
                                bg-[#A92F56]/[0.08]
                                text-[#A92F56]
                              "
                            >
                              <Fuel
                                size={15}
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
                                Fuel Log #
                                {
                                  log.id
                                }
                              </p>

                              <p
                                className="
                                  mt-0.5
                                  text-[9px]
                                  text-slate-400
                                "
                              >
                                Vehicle #
                                {
                                  log.vehicle_id
                                }
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* User */}
                        <td
                          className="
                            px-4
                            py-3.5
                          "
                        >
                          <div
                            className="
                              flex
                              items-center
                              gap-2
                            "
                          >
                            {log.user
                              ?.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={
                                  log.user
                                    .avatar_url
                                }
                                alt=""
                                className="
                                  h-8
                                  w-8
                                  shrink-0
                                  rounded-full
                                  object-cover
                                "
                              />
                            ) : (
                              <div
                                className="
                                  flex
                                  h-8
                                  w-8
                                  shrink-0
                                  items-center
                                  justify-center
                                  rounded-full
                                  bg-[#72213A]/10
                                  text-[9px]
                                  font-semibold
                                  text-[#72213A]
                                "
                              >
                                {initials(
                                  name,
                                )}
                              </div>
                            )}

                            <div
                              className="
                                min-w-0
                              "
                            >
                              <p
                                className="
                                  max-w-[150px]
                                  truncate
                                  text-[11px]
                                  font-semibold
                                  text-slate-700
                                "
                              >
                                {
                                  name
                                }
                              </p>

                              <p
                                className="
                                  mt-0.5
                                  max-w-[150px]
                                  truncate
                                  text-[9px]
                                  text-slate-400
                                "
                              >
                                {log.user
                                  ?.username
                                  ? `@${log.user.username}`
                                  : log.user_id}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Vehicle */}
                        <td
                          className="
                            px-4
                            py-3.5
                          "
                        >
                          <div
                            className="
                              flex
                              items-center
                              gap-2
                            "
                          >
                            {log.vehicle
                              ?.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={
                                  log.vehicle
                                    .image_url
                                }
                                alt=""
                                className="
                                  h-8
                                  w-10
                                  shrink-0
                                  border
                                  border-slate-200
                                  object-cover
                                "
                              />
                            ) : (
                              <div
                                className="
                                  flex
                                  h-8
                                  w-10
                                  shrink-0
                                  items-center
                                  justify-center
                                  bg-slate-100
                                  text-slate-400
                                "
                              >
                                <Car
                                  size={14}
                                />
                              </div>
                            )}

                            <div
                              className="
                                min-w-0
                              "
                            >
                              <p
                                className="
                                  max-w-[155px]
                                  truncate
                                  text-[11px]
                                  font-medium
                                  text-slate-700
                                "
                              >
                                {vehicleName(
                                  log,
                                )}
                              </p>

                              <p
                                className="
                                  mt-0.5
                                  text-[9px]
                                  text-slate-400
                                "
                              >
                                {log.vehicle
                                  ?.fuel_type ||
                                  "Fuel type —"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Date */}
                        <td
                          className="
                            px-4
                            py-3.5
                            text-[11px]
                            text-slate-500
                          "
                        >
                          {formatDate(
                            log.date,
                          )}
                        </td>

                        {/* Liters */}
                        <td
                          className="
                            px-4
                            py-3.5
                          "
                        >
                          <p
                            className="
                              text-xs
                              font-semibold
                              text-slate-700
                            "
                          >
                            {formatNumber(
                              log.liters,
                              2,
                            )}
                          </p>

                          <p
                            className="
                              mt-0.5
                              text-[9px]
                              text-slate-400
                            "
                          >
                            liters
                          </p>
                        </td>

                        {/* Cost */}
                        <td
                          className="
                            px-4
                            py-3.5
                          "
                        >
                          <p
                            className="
                              text-xs
                              font-semibold
                              text-slate-700
                            "
                          >
                            {formatNumber(
                              log.cost,
                              2,
                            )}
                          </p>

                          <p
                            className="
                              mt-0.5
                              text-[9px]
                              text-slate-400
                            "
                          >
                            recorded cost
                          </p>
                        </td>

                        {/* Odometer */}
                        <td
                          className="
                            px-4
                            py-3.5
                          "
                        >
                          <p
                            className="
                              text-xs
                              text-slate-600
                            "
                          >
                            {formatNumber(
                              log.odometer_km,
                              1,
                            )}
                          </p>

                          <p
                            className="
                              mt-0.5
                              text-[9px]
                              text-slate-400
                            "
                          >
                            km
                          </p>
                        </td>

                        {/* Efficiency */}
                        <td
                          className="
                            px-4
                            py-3.5
                          "
                        >
                          <span
                            className={`
                              inline-flex
                              border
                              px-2
                              py-1
                              text-[10px]
                              font-semibold
                              ${efficiencyStyle(
                                log.efficiency_l_100km,
                              )}
                            `}
                          >
                            {log.efficiency_l_100km !==
                            null
                              ? `${formatNumber(
                                  log.efficiency_l_100km,
                                  2,
                                )} L/100 km`
                              : "Not recorded"}
                          </span>
                        </td>

                        {/* View */}
                        <td
                          className="
                            px-5
                            py-3.5
                            text-right
                          "
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedLog(
                                log,
                              )
                            }
                            className="
                              inline-flex
                              h-8
                              items-center
                              gap-1.5
                              border
                              border-slate-200
                              px-2.5
                              text-[11px]
                              font-medium
                              text-slate-600
                              transition
                              hover:border-slate-300
                              hover:bg-slate-50
                              hover:text-slate-900
                            "
                          >
                            <Eye
                              size={13}
                            />

                            View
                          </button>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            className="
              flex
              min-h-[320px]
              flex-col
              items-center
              justify-center
              px-6
              text-center
            "
          >
            <Fuel
              size={25}
              className="
                text-slate-300
              "
            />

            <p
              className="
                mt-4
                text-sm
                font-semibold
                text-slate-700
              "
            >
              No fuel logs found
            </p>

            <p
              className="
                mt-1
                text-xs
                text-slate-400
              "
            >
              Try changing the
              search or filters.
            </p>
          </div>
        )}

        {/* Pagination */}
        <div
          className="
            flex
            items-center
            justify-between
            border-t
            border-slate-200
            px-5
            py-3
          "
        >
          <span
            className="
              text-[11px]
              text-slate-400
            "
          >
            {showing}
          </span>

          <div
            className="
              flex
              items-center
              gap-2
            "
          >
            {pagination.page >
            1 ? (
              <Link
                href={pageUrl(
                  pagination.page -
                    1,
                )}
                className="
                  border
                  border-slate-200
                  px-3
                  py-1.5
                  text-[11px]
                  font-medium
                  text-slate-600
                  hover:bg-slate-50
                "
              >
                Previous
              </Link>
            ) : (
              <span
                className="
                  border
                  border-slate-100
                  px-3
                  py-1.5
                  text-[11px]
                  text-slate-300
                "
              >
                Previous
              </span>
            )}

            <span
              className="
                px-2
                text-[11px]
                text-slate-500
              "
            >
              {
                pagination.page
              }
              {" / "}
              {
                pagination.pageCount
              }
            </span>

            {pagination.page <
            pagination.pageCount ? (
              <Link
                href={pageUrl(
                  pagination.page +
                    1,
                )}
                className="
                  border
                  border-slate-200
                  px-3
                  py-1.5
                  text-[11px]
                  font-medium
                  text-slate-600
                  hover:bg-slate-50
                "
              >
                Next
              </Link>
            ) : (
              <span
                className="
                  border
                  border-slate-100
                  px-3
                  py-1.5
                  text-[11px]
                  text-slate-300
                "
              >
                Next
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ======================
          FUEL LOG DRAWER
      ====================== */}
      {selectedLog && (
        <>
          <button
            type="button"
            aria-label="Close fuel log details"
            onClick={() =>
              setSelectedLog(
                null,
              )
            }
            className="
              fixed
              inset-0
              z-40
              bg-slate-950/20
              backdrop-blur-[1px]
            "
          />

          <aside
            className="
              fixed
              bottom-0
              right-0
              top-0
              z-50
              flex
              w-full
              max-w-[500px]
              flex-col
              border-l
              border-slate-200
              bg-white
              shadow-2xl
              shadow-slate-950/10
            "
          >
            {/* Header */}
            <div
              className="
                flex
                h-[68px]
                shrink-0
                items-center
                justify-between
                border-b
                border-slate-200
                px-5
              "
            >
              <div>
                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >
                  <div
                    className="
                      flex
                      h-8
                      w-8
                      items-center
                      justify-center
                      bg-[#A92F56]/10
                      text-[#A92F56]
                    "
                  >
                    <Fuel
                      size={14}
                    />
                  </div>

                  <div>
                    <p
                      className="
                        text-sm
                        font-semibold
                        text-slate-950
                      "
                    >
                      Fuel Log #
                      {
                        selectedLog.id
                      }
                    </p>

                    <p
                      className="
                        mt-0.5
                        text-[10px]
                        text-slate-400
                      "
                    >
                      Fuel consumption record
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedLog(
                    null,
                  )
                }
                className="
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  border
                  border-slate-200
                  text-slate-400
                  hover:bg-slate-50
                  hover:text-slate-700
                "
              >
                <X
                  size={15}
                />
              </button>
            </div>

            <div
              className="
                flex-1
                overflow-y-auto
              "
            >
              {/* Main values */}
              <div
                className="
                  border-b
                  border-slate-100
                  px-5
                  py-5
                "
              >
                <p
                  className="
                    mb-4
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.12em]
                    text-slate-400
                  "
                >
                  Fuel Record
                </p>

                <div
                  className="
                    grid
                    grid-cols-2
                    gap-3
                  "
                >
                  <MetricCard
                    icon={
                      Fuel
                    }
                    label="Fuel Added"
                    value={`${formatNumber(
                      selectedLog.liters,
                      2,
                    )} L`}
                  />

                  <MetricCard
                    icon={
                      Hash
                    }
                    label="Cost"
                    value={
                      formatNumber(
                        selectedLog.cost,
                        2,
                      )
                    }
                  />

                  <MetricCard
                    icon={
                      Gauge
                    }
                    label="Odometer"
                    value={
                      selectedLog.odometer_km !==
                      null
                        ? `${formatNumber(
                            selectedLog.odometer_km,
                            1,
                          )} km`
                        : "Not recorded"
                    }
                  />

                  <MetricCard
                    icon={
                      Gauge
                    }
                    label="Efficiency"
                    value={
                      selectedLog.efficiency_l_100km !==
                      null
                        ? `${formatNumber(
                            selectedLog.efficiency_l_100km,
                            2,
                          )} L/100 km`
                        : "Not recorded"
                    }
                  />
                </div>

                <div
                  className="
                    mt-4
                    border
                    border-slate-200
                    bg-slate-50/60
                    px-3
                    py-3
                  "
                >
                  <p
                    className="
                      text-[9px]
                      font-semibold
                      uppercase
                      tracking-wide
                      text-slate-400
                    "
                  >
                    Fuel Date
                  </p>

                  <p
                    className="
                      mt-1
                      text-xs
                      font-semibold
                      text-slate-700
                    "
                  >
                    {formatDateTime(
                      selectedLog.date,
                    )}
                  </p>
                </div>
              </div>

              {/* User */}
              <div
                className="
                  border-b
                  border-slate-100
                  px-5
                  py-5
                "
              >
                <p
                  className="
                    mb-4
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.12em]
                    text-slate-400
                  "
                >
                  User
                </p>

                <div
                  className="
                    flex
                    items-center
                    gap-3
                    border
                    border-slate-200
                    p-3
                  "
                >
                  {selectedLog.user
                    ?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={
                        selectedLog
                          .user
                          .avatar_url
                      }
                      alt=""
                      className="
                        h-11
                        w-11
                        shrink-0
                        rounded-full
                        object-cover
                      "
                    />
                  ) : (
                    <div
                      className="
                        flex
                        h-11
                        w-11
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        bg-[#A92F56]/10
                        text-xs
                        font-semibold
                        text-[#A92F56]
                      "
                    >
                      {initials(
                        userName(
                          selectedLog,
                        ),
                      )}
                    </div>
                  )}

                  <div
                    className="
                      min-w-0
                      flex-1
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
                      {userName(
                        selectedLog,
                      )}
                    </p>

                    <p
                      className="
                        mt-0.5
                        truncate
                        text-[10px]
                        text-slate-400
                      "
                    >
                      {selectedLog.user
                        ?.username
                        ? `@${selectedLog.user.username}`
                        : selectedLog.user_id}
                    </p>
                  </div>

                  <User
                    size={15}
                    className="
                      shrink-0
                      text-slate-300
                    "
                  />
                </div>

                <Link
                  href={`/admin/users?q=${encodeURIComponent(
                    selectedLog.user_id,
                  )}`}
                  className="
                    mt-3
                    flex
                    h-9
                    items-center
                    justify-center
                    border
                    border-slate-200
                    text-[10px]
                    font-semibold
                    text-slate-600
                    hover:bg-slate-50
                  "
                >
                  View User
                </Link>
              </div>

              {/* Vehicle */}
              <div
                className="
                  border-b
                  border-slate-100
                  px-5
                  py-5
                "
              >
                <p
                  className="
                    mb-4
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.12em]
                    text-slate-400
                  "
                >
                  Vehicle
                </p>

                {selectedLog.vehicle ? (
                  <div
                    className="
                      border
                      border-slate-200
                      bg-white
                    "
                  >
                    {selectedLog.vehicle.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={
                          selectedLog
                            .vehicle
                            .image_url
                        }
                        alt=""
                        className="
                          h-[160px]
                          w-full
                          border-b
                          border-slate-200
                          object-cover
                        "
                      />
                    ) : (
                      <div
                        className="
                          flex
                          h-[120px]
                          w-full
                          flex-col
                          items-center
                          justify-center
                          border-b
                          border-slate-200
                          bg-slate-50
                          text-slate-300
                        "
                      >
                        <ImageIcon
                          size={24}
                        />

                        <span
                          className="
                            mt-2
                            text-[9px]
                          "
                        >
                          No vehicle image
                        </span>
                      </div>
                    )}

                    <div
                      className="
                        p-4
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
                        <div
                          className="
                            min-w-0
                          "
                        >
                          <p
                            className="
                              truncate
                              text-sm
                              font-semibold
                              text-slate-900
                            "
                          >
                            {vehicleName(
                              selectedLog,
                            )}
                          </p>

                          {selectedLog
                            .vehicle
                            .nickname && (
                            <p
                              className="
                                mt-1
                                text-[10px]
                                text-slate-400
                              "
                            >
                              {
                                selectedLog
                                  .vehicle
                                  .vehicle_name
                              }
                            </p>
                          )}
                        </div>

                        {selectedLog
                          .vehicle
                          .is_primary && (
                          <span
                            className="
                              inline-flex
                              shrink-0
                              items-center
                              gap-1
                              border
                              border-[#FDC1C9]
                              bg-[#FDC1C9]/20
                              px-1.5
                              py-0.5
                              text-[9px]
                              font-semibold
                              text-[#A92F56]
                            "
                          >
                            <Star
                              size={9}
                            />

                            Primary
                          </span>
                        )}
                      </div>

                      <div
                        className="
                          mt-4
                          space-y-3
                        "
                      >
                        <DetailRow
                          label="Fuel Type"
                          value={
                            selectedLog
                              .vehicle
                              .fuel_type ||
                            "—"
                          }
                        />

                        <DetailRow
                          label="Vehicle Efficiency"
                          value={
                            selectedLog
                              .vehicle
                              .efficiency_l_100km !==
                            null
                              ? `${formatNumber(
                                  selectedLog
                                    .vehicle
                                    .efficiency_l_100km,
                                  2,
                                )} L/100 km`
                              : "—"
                          }
                        />

                        <DetailRow
                          label="Tank Size"
                          value={
                            selectedLog
                              .vehicle
                              .tank_size !==
                            null
                              ? `${formatNumber(
                                  selectedLog
                                    .vehicle
                                    .tank_size,
                                  1,
                                )} L`
                              : "—"
                          }
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="
                      border
                      border-slate-200
                      bg-slate-50
                      px-4
                      py-4
                    "
                  >
                    <div
                      className="
                        flex
                        items-center
                        gap-3
                      "
                    >
                      <Car
                        size={17}
                        className="
                          text-slate-400
                        "
                      />

                      <div>
                        <p
                          className="
                            text-xs
                            font-semibold
                            text-slate-700
                          "
                        >
                          Vehicle #
                          {
                            selectedLog.vehicle_id
                          }
                        </p>

                        <p
                          className="
                            mt-1
                            text-[10px]
                            text-slate-400
                          "
                        >
                          Vehicle details
                          could not be loaded.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <Link
                  href={`/admin/vehicles?q=${selectedLog.vehicle_id}`}
                  className="
                    mt-3
                    flex
                    h-9
                    items-center
                    justify-center
                    border
                    border-slate-200
                    text-[10px]
                    font-semibold
                    text-slate-600
                    hover:bg-slate-50
                  "
                >
                  View Vehicle
                </Link>
              </div>

              {/* Recorded data */}
              <div
                className="
                  border-b
                  border-slate-100
                  px-5
                  py-5
                "
              >
                <p
                  className="
                    mb-4
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.12em]
                    text-slate-400
                  "
                >
                  Recorded Data
                </p>

                <div
                  className="
                    space-y-3
                  "
                >
                  <DetailRow
                    label="Liters"
                    value={`${formatNumber(
                      selectedLog.liters,
                      2,
                    )} L`}
                  />

                  <DetailRow
                    label="Cost"
                    value={
                      formatNumber(
                        selectedLog.cost,
                        2,
                      )
                    }
                  />

                  <DetailRow
                    label="Odometer"
                    value={
                      selectedLog.odometer_km !==
                      null
                        ? `${formatNumber(
                            selectedLog.odometer_km,
                            1,
                          )} km`
                        : "Not recorded"
                    }
                  />

                  <DetailRow
                    label="Log Efficiency"
                    value={
                      selectedLog.efficiency_l_100km !==
                      null
                        ? `${formatNumber(
                            selectedLog.efficiency_l_100km,
                            2,
                          )} L/100 km`
                        : "Not recorded"
                    }
                  />
                </div>
              </div>

              {/* Metadata */}
              <div
                className="
                  px-5
                  py-5
                "
              >
                <p
                  className="
                    mb-4
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.12em]
                    text-slate-400
                  "
                >
                  Record Information
                </p>

                <div
                  className="
                    space-y-3
                  "
                >
                  <DetailRow
                    label="Fuel Log ID"
                    value={
                      String(
                        selectedLog.id,
                      )
                    }
                  />

                  <DetailRow
                    label="User ID"
                    value={
                      selectedLog.user_id
                    }
                    mono
                  />

                  <DetailRow
                    label="Vehicle ID"
                    value={
                      String(
                        selectedLog.vehicle_id,
                      )
                    }
                  />

                  <DetailRow
                    label="Fuel Date"
                    value={
                      formatDateTime(
                        selectedLog.date,
                      )
                    }
                  />

                  <DetailRow
                    label="Record Created"
                    value={
                      formatDateTime(
                        selectedLog.created_at,
                      )
                    }
                  />
                </div>
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  );
}

function MetricCard({
  icon:
    Icon,
  label,
  value,
}: {
  icon:
    typeof Fuel;

  label:
    string;

  value:
    string;
}) {
  return (
    <div
      className="
        border
        border-slate-200
        p-3
      "
    >
      <div
        className="
          flex
          items-center
          gap-2
          text-slate-400
        "
      >
        <Icon
          size={13}
        />

        <span
          className="
            text-[9px]
            font-semibold
            uppercase
            tracking-wide
          "
        >
          {label}
        </span>
      </div>

      <p
        className="
          mt-2
          text-sm
          font-semibold
          text-slate-900
        "
      >
        {value}
      </p>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label:
    string;

  value:
    string;

  mono?:
    boolean;
}) {
  return (
    <div
      className="
        flex
        items-start
        justify-between
        gap-5
      "
    >
      <span
        className="
          shrink-0
          text-xs
          text-slate-400
        "
      >
        {label}
      </span>

      <span
        className={`
          break-all
          text-right
          text-xs
          font-medium
          text-slate-700
          ${
            mono
              ? "font-mono text-[10px]"
              : ""
          }
        `}
      >
        {value}
      </span>
    </div>
  );
}