"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  Car,
  Clock3,
  Download,
  Eye,
  Fuel,
  Gauge,
  Leaf,
  MapPin,
  Route,
  Search,
  ShieldAlert,
  User,
  X,
  Zap,
} from "lucide-react";

import {
  useSearchParams,
} from "next/navigation";

import {
  useRouter,
} from "nextjs-toploader/app";

import type {
  AdminTripRow,
} from "@/lib/admin/trips";

type Props = {
  trips:
    AdminTripRow[];

  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };

  initialQuery:
    string;

  initialStatus:
    string;

  initialPeriod:
    string;

  initialSort:
    string;
};

function formatNumber(
  value:
    number | null,
  digits = 1,
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
  ).format(value);
}

function formatDateTime(
  value:
    string | null,
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

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
  ).format(date);
}

function formatDate(
  value:
    string | null,
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

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
  ).format(date);
}

function formatDuration(
  minutes: number,
) {
  if (
    !Number.isFinite(
      minutes,
    ) ||
    minutes < 0
  ) {
    return "—";
  }

  const hours =
    Math.floor(
      minutes / 60,
    );

  const remaining =
    Math.round(
      minutes % 60,
    );

  if (
    hours === 0
  ) {
    return `${remaining} min`;
  }

  if (
    remaining === 0
  ) {
    return `${hours} hr${
      hours === 1
        ? ""
        : "s"
    }`;
  }

  return `${hours}h ${remaining}m`;
}

function riderName(
  trip:
    AdminTripRow,
) {
  return (
    trip.user?.full_name
      ?.trim() ||
    trip.user?.username
      ?.trim() ||
    "Unknown rider"
  );
}

function vehicleName(
  trip:
    AdminTripRow,
) {
  return (
    trip.vehicle?.nickname
      ?.trim() ||
    trip.vehicle?.vehicle_name
      ?.trim() ||
    (
      trip.vehicle_id
        ? `Vehicle #${trip.vehicle_id}`
        : "No vehicle"
    )
  );
}

function initials(
  value: string,
) {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
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

function tripStatus(
  trip:
    AdminTripRow,
) {
  return trip.end_time
    ? "completed"
    : "open";
}

function TripStatusBadge({
  trip,
}: {
  trip:
    AdminTripRow;
}) {
  const completed =
    Boolean(
      trip.end_time,
    );

  return (
    <span
      className={`
        inline-flex
        border
        px-2
        py-1
        text-[10px]
        font-semibold
        uppercase
        tracking-[0.05em]
        ${
          completed
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-blue-200 bg-blue-50 text-blue-700"
        }
      `}
    >
      {completed
        ? "Completed"
        : "Open"}
    </span>
  );
}

function EcoScoreBadge({
  score,
}: {
  score: number;
}) {
  const style =
    score >= 85
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : score >= 70
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : score >= 50
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-red-200 bg-red-50 text-red-700";

  return (
    <span
      className={`
        inline-flex
        min-w-[42px]
        justify-center
        border
        px-2
        py-1
        text-[10px]
        font-bold
        ${style}
      `}
    >
      {score}
    </span>
  );
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
      value ?? "",
    );

  return `"${text.replace(
    /"/g,
    '""',
  )}"`;
}

function harshDetails(
  value: unknown,
): string | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (
    typeof value ===
    "string"
  ) {
    return value;
  }

  try {
    return JSON.stringify(
      value,
      null,
      2,
    );
  } catch {
    return String(
      value,
    );
  }
}

export default function TripsTable({
  trips,
  pagination,
  initialQuery,
  initialStatus,
  initialPeriod,
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
    selectedTrip,
    setSelectedTrip,
  ] =
    useState<
      AdminTripRow | null
    >(null);

  /*
   * Debounced search.
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

          if (cleaned) {
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
                ? `/admin/trips?${next}`
                : "/admin/trips",
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
   * Drawer behavior.
   */
  useEffect(() => {
    if (
      !selectedTrip
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
        setSelectedTrip(
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
    selectedTrip,
  ]);

  const showing =
    useMemo(() => {
      if (
        pagination.total ===
        0
      ) {
        return "0 trips";
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
        ? `/admin/trips?${next}`
        : "/admin/trips",
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

    return `/admin/trips?${params.toString()}`;
  }

  function exportPage() {
    if (
      trips.length ===
      0
    ) {
      return;
    }

    const rows = [
      [
        "Trip ID",
        "Rider",
        "User ID",
        "Vehicle",
        "Vehicle ID",
        "Start Address",
        "End Address",
        "Distance KM",
        "Fuel Consumed",
        "Eco Score",
        "Duration Minutes",
        "Average Speed KM/H",
        "Maximum Speed KM/H",
        "Harsh Events",
        "Green Points",
        "CO2 Saved",
        "Status",
        "Start Time",
        "End Time",
      ],

      ...trips.map(
        (
          trip,
        ) => [
          trip.id,

          riderName(
            trip,
          ),

          trip.user_id,

          vehicleName(
            trip,
          ),

          trip.vehicle_id,

          trip.start_address,

          trip.end_address,

          trip.distance_km,

          trip.fuel_consumed,

          trip.eco_score,

          trip.duration_mins,

          trip.avg_speed_kmh,

          trip.max_speed_kmh,

          trip.harsh_events_count,

          trip.green_points,

          trip.co2_saved,

          tripStatus(
            trip,
          ),

          trip.start_time,

          trip.end_time,
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
      `pin-tell-trips-page-${pagination.page}.csv`;

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
              xl:max-w-[360px]
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
              placeholder="Search trip, rider, vehicle or address..."
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
              gap-2
            "
          >
            {/* Completion */}
            <select
              value={
                initialStatus
              }
              onChange={(
                event,
              ) =>
                updateFilter(
                  "status",
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
                All trips
              </option>

              <option value="completed">
                Completed
              </option>

              <option value="open">
                Open
              </option>
            </select>

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

              <option value="distance">
                Highest distance
              </option>

              <option value="eco">
                Highest eco score
              </option>
            </select>

            <button
              type="button"
              disabled={
                trips.length ===
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

              Export to CSV
            </button>
          </div>
        </div>

        {/* Table */}
        {trips.length >
        0 ? (
          <div
            className="
              overflow-x-auto
            "
          >
            <table
              className="
                w-full
                min-w-[1250px]
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
                    "Rider",
                    "Vehicle",
                    "Route",
                    "Distance",
                    "Eco",
                    "Avg. Speed",
                    "Fuel",
                    "Status",
                    "Started",
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
                {trips.map(
                  (
                    trip,
                  ) => {
                    const name =
                      riderName(
                        trip,
                      );

                    return (
                      <tr
                        key={
                          trip.id
                        }
                        className="
                          border-b
                          border-slate-100
                          last:border-b-0
                          hover:bg-slate-50/60
                        "
                      >
                        {/* Rider */}
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
                            {trip.user
                              ?.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={
                                  trip
                                    .user
                                    .avatar_url
                                }
                                alt=""
                                className="
                                  h-9
                                  w-9
                                  shrink-0
                                  rounded-full
                                  object-cover
                                "
                              />
                            ) : (
                              <div
                                className="
                                  flex
                                  h-9
                                  w-9
                                  shrink-0
                                  items-center
                                  justify-center
                                  rounded-full
                                  bg-[#A92F56]/10
                                  text-[10px]
                                  font-semibold
                                  text-[#A92F56]
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
                                  max-w-[160px]
                                  truncate
                                  text-xs
                                  font-semibold
                                  text-slate-800
                                "
                              >
                                {
                                  name
                                }
                              </p>

                              <p
                                className="
                                  mt-0.5
                                  max-w-[160px]
                                  truncate
                                  text-[9px]
                                  text-slate-400
                                "
                              >
                                {trip.user
                                  ?.username
                                  ? `@${trip.user.username}`
                                  : trip.user_id}
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
                          <p
                            className="
                              max-w-[150px]
                              truncate
                              text-xs
                              font-medium
                              text-slate-700
                            "
                          >
                            {vehicleName(
                              trip,
                            )}
                          </p>

                          <p
                            className="
                              mt-0.5
                              text-[9px]
                              text-slate-400
                            "
                          >
                            {trip.vehicle
                              ?.fuel_type ||
                              "Fuel type —"}
                          </p>
                        </td>

                        {/* Route */}
                        <td
                          className="
                            px-4
                            py-3.5
                          "
                        >
                          <div
                            className="
                              max-w-[260px]
                            "
                          >
                            <p
                              className="
                                truncate
                                text-[11px]
                                text-slate-700
                              "
                            >
                              {trip.start_address ||
                                "Start location unavailable"}
                            </p>

                            <p
                              className="
                                mt-1
                                truncate
                                text-[10px]
                                text-slate-400
                              "
                            >
                              →{" "}
                              {trip.end_address ||
                                (
                                  trip.end_time
                                    ? "End location unavailable"
                                    : "Trip not ended"
                                )}
                            </p>
                          </div>
                        </td>

                        {/* Distance */}
                        <td
                          className="
                            px-4
                            py-3.5
                            text-xs
                            font-medium
                            text-slate-700
                          "
                        >
                          {formatNumber(
                            trip.distance_km,
                          )}{" "}
                          <span
                            className="
                              text-[9px]
                              font-normal
                              text-slate-400
                            "
                          >
                            km
                          </span>
                        </td>

                        {/* Eco */}
                        <td
                          className="
                            px-4
                            py-3.5
                          "
                        >
                          <EcoScoreBadge
                            score={
                              trip.eco_score
                            }
                          />
                        </td>

                        {/* Speed */}
                        <td
                          className="
                            px-4
                            py-3.5
                            text-xs
                            text-slate-600
                          "
                        >
                          {formatNumber(
                            trip.avg_speed_kmh,
                          )}{" "}
                          <span
                            className="
                              text-[9px]
                              text-slate-400
                            "
                          >
                            km/h
                          </span>
                        </td>

                        {/* Fuel */}
                        <td
                          className="
                            px-4
                            py-3.5
                            text-xs
                            text-slate-600
                          "
                        >
                          {formatNumber(
                            trip.fuel_consumed,
                            2,
                          )}{" "}
                          <span
                            className="
                              text-[9px]
                              text-slate-400
                            "
                          >
                            L
                          </span>
                        </td>

                        <td
                          className="
                            px-4
                            py-3.5
                          "
                        >
                          <TripStatusBadge
                            trip={
                              trip
                            }
                          />
                        </td>

                        <td
                          className="
                            px-4
                            py-3.5
                            text-[11px]
                            text-slate-500
                          "
                        >
                          {formatDate(
                            trip.start_time,
                          )}
                        </td>

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
                              setSelectedTrip(
                                trip,
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
            <Route
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
              No trips found
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

      {/* ==========================
          TRIP DETAILS DRAWER
      ========================== */}
      {selectedTrip && (
        <>
          <button
            type="button"
            aria-label="Close trip details"
            onClick={() =>
              setSelectedTrip(
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
              max-w-[520px]
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
                  <p
                    className="
                      text-sm
                      font-semibold
                      text-slate-950
                    "
                  >
                    Trip Details
                  </p>

                  <TripStatusBadge
                    trip={
                      selectedTrip
                    }
                  />
                </div>

                <p
                  className="
                    mt-1
                    max-w-[330px]
                    truncate
                    font-mono
                    text-[9px]
                    text-slate-400
                  "
                >
                  {
                    selectedTrip.id
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedTrip(
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
              {/* Rider + Vehicle */}
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
                  Rider & Vehicle
                </p>

                <div
                  className="
                    grid
                    gap-3
                    sm:grid-cols-2
                  "
                >
                  {/* Rider */}
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
                        gap-3
                      "
                    >
                      {selectedTrip.user
                        ?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={
                            selectedTrip
                              .user
                              .avatar_url
                          }
                          alt=""
                          className="
                            h-10
                            w-10
                            shrink-0
                            rounded-full
                            object-cover
                          "
                        />
                      ) : (
                        <div
                          className="
                            flex
                            h-10
                            w-10
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
                            riderName(
                              selectedTrip,
                            ),
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
                            truncate
                            text-xs
                            font-semibold
                            text-slate-800
                          "
                        >
                          {riderName(
                            selectedTrip,
                          )}
                        </p>

                        <p
                          className="
                            mt-0.5
                            truncate
                            text-[9px]
                            text-slate-400
                          "
                        >
                          {selectedTrip
                            .user
                            ?.username
                            ? `@${selectedTrip.user.username}`
                            : "Rider"}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/admin/users?q=${encodeURIComponent(
                        selectedTrip.user_id,
                      )}`}
                      className="
                        mt-3
                        inline-flex
                        text-[10px]
                        font-semibold
                        text-[#A92F56]
                        hover:text-[#72213A]
                      "
                    >
                      View user
                    </Link>
                  </div>

                  {/* Vehicle */}
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
                        gap-3
                      "
                    >
                      {selectedTrip.vehicle
                        ?.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={
                            selectedTrip
                              .vehicle
                              .image_url
                          }
                          alt=""
                          className="
                            h-10
                            w-10
                            shrink-0
                            object-cover
                          "
                        />
                      ) : (
                        <div
                          className="
                            flex
                            h-10
                            w-10
                            shrink-0
                            items-center
                            justify-center
                            bg-slate-100
                            text-slate-500
                          "
                        >
                          <Car
                            size={17}
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
                            truncate
                            text-xs
                            font-semibold
                            text-slate-800
                          "
                        >
                          {vehicleName(
                            selectedTrip,
                          )}
                        </p>

                        <p
                          className="
                            mt-0.5
                            text-[9px]
                            text-slate-400
                          "
                        >
                          {selectedTrip
                            .vehicle
                            ?.fuel_type ||
                            "Fuel type not recorded"}
                        </p>
                      </div>
                    </div>

                    {selectedTrip.vehicle
                      ?.is_primary && (
                      <span
                        className="
                          mt-3
                          inline-flex
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
                        Primary vehicle
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Route */}
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
                  Route
                </p>

                <div
                  className="
                    relative
                    pl-8
                  "
                >
                  <div
                    className="
                      absolute
                      bottom-5
                      left-[7px]
                      top-5
                      w-px
                      bg-slate-200
                    "
                  />

                  <div
                    className="
                      relative
                      mb-5
                    "
                  >
                    <div
                      className="
                        absolute
                        -left-8
                        top-0
                        flex
                        h-4
                        w-4
                        items-center
                        justify-center
                        rounded-full
                        border
                        border-emerald-300
                        bg-emerald-50
                      "
                    >
                      <div
                        className="
                          h-1.5
                          w-1.5
                          rounded-full
                          bg-emerald-500
                        "
                      />
                    </div>

                    <p
                      className="
                        text-[9px]
                        font-semibold
                        uppercase
                        tracking-wide
                        text-slate-400
                      "
                    >
                      Start
                    </p>

                    <p
                      className="
                        mt-1
                        text-xs
                        leading-5
                        text-slate-700
                      "
                    >
                      {selectedTrip.start_address ||
                        "Start address not recorded"}
                    </p>

                    <p
                      className="
                        mt-1
                        text-[10px]
                        text-slate-400
                      "
                    >
                      {formatDateTime(
                        selectedTrip.start_time,
                      )}
                    </p>
                  </div>

                  <div
                    className="
                      relative
                    "
                  >
                    <div
                      className="
                        absolute
                        -left-8
                        top-0
                        flex
                        h-4
                        w-4
                        items-center
                        justify-center
                        rounded-full
                        border
                        border-[#FDC1C9]
                        bg-[#FDC1C9]/20
                      "
                    >
                      <MapPin
                        size={9}
                        className="
                          text-[#A92F56]
                        "
                      />
                    </div>

                    <p
                      className="
                        text-[9px]
                        font-semibold
                        uppercase
                        tracking-wide
                        text-slate-400
                      "
                    >
                      End
                    </p>

                    <p
                      className="
                        mt-1
                        text-xs
                        leading-5
                        text-slate-700
                      "
                    >
                      {selectedTrip.end_address ||
                        (
                          selectedTrip.end_time
                            ? "End address not recorded"
                            : "Trip has not ended"
                        )}
                    </p>

                    <p
                      className="
                        mt-1
                        text-[10px]
                        text-slate-400
                      "
                    >
                      {selectedTrip.end_time
                        ? formatDateTime(
                            selectedTrip.end_time,
                          )
                        : "No end time recorded"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Performance */}
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
                  Trip Performance
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
                      Route
                    }
                    label="Distance"
                    value={`${formatNumber(
                      selectedTrip.distance_km,
                    )} km`}
                  />

                  <MetricCard
                    icon={
                      Clock3
                    }
                    label="Duration"
                    value={formatDuration(
                      selectedTrip.duration_mins,
                    )}
                  />

                  <MetricCard
                    icon={
                      Gauge
                    }
                    label="Average Speed"
                    value={`${formatNumber(
                      selectedTrip.avg_speed_kmh,
                    )} km/h`}
                  />

                  <MetricCard
                    icon={
                      Zap
                    }
                    label="Maximum Speed"
                    value={`${formatNumber(
                      selectedTrip.max_speed_kmh,
                    )} km/h`}
                  />

                  <MetricCard
                    icon={
                      Fuel
                    }
                    label="Fuel Consumed"
                    value={`${formatNumber(
                      selectedTrip.fuel_consumed,
                      2,
                    )} L`}
                  />

                  <MetricCard
                    icon={
                      Leaf
                    }
                    label="Eco Score"
                    value={String(
                      selectedTrip.eco_score,
                    )}
                  />
                </div>
              </div>

              {/* Sustainability */}
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
                  Eco-driving Data
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
                      Leaf
                    }
                    label="Green Points"
                    value={formatNumber(
                      selectedTrip.green_points,
                      2,
                    )}
                  />

                  <MetricCard
                    icon={
                      Activity
                    }
                    label="CO₂ Saved"
                    value={formatNumber(
                      selectedTrip.co2_saved,
                      2,
                    )}
                  />
                </div>
              </div>

              {/* Harsh events */}
              <div
                className="
                  border-b
                  border-slate-100
                  px-5
                  py-5
                "
              >
                <div
                  className="
                    flex
                    items-center
                    justify-between
                    gap-3
                  "
                >
                  <p
                    className="
                      text-[10px]
                      font-bold
                      uppercase
                      tracking-[0.12em]
                      text-slate-400
                    "
                  >
                    Harsh Events
                  </p>

                  <span
                    className="
                      text-xs
                      font-semibold
                      text-slate-800
                    "
                  >
                    {selectedTrip.harsh_events_count ??
                      0}
                  </span>
                </div>

                {harshDetails(
                  selectedTrip.harsh_events_details,
                ) ? (
                  <pre
                    className="
                      mt-4
                      max-h-[220px]
                      overflow-auto
                      whitespace-pre-wrap
                      break-words
                      border
                      border-slate-200
                      bg-slate-50
                      p-3
                      text-[10px]
                      leading-5
                      text-slate-600
                    "
                  >
                    {harshDetails(
                      selectedTrip.harsh_events_details,
                    )}
                  </pre>
                ) : (
                  <p
                    className="
                      mt-3
                      text-xs
                      text-slate-400
                    "
                  >
                    No harsh-event
                    detail data was
                    recorded for this
                    trip.
                  </p>
                )}
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
                    label="Trip ID"
                    value={
                      selectedTrip.id
                    }
                    mono
                  />

                  <DetailRow
                    label="User ID"
                    value={
                      selectedTrip.user_id
                    }
                    mono
                  />

                  <DetailRow
                    label="Vehicle ID"
                    value={
                      selectedTrip.vehicle_id
                        ? String(
                            selectedTrip.vehicle_id,
                          )
                        : "—"
                    }
                  />

                  <DetailRow
                    label="Created"
                    value={formatDateTime(
                      selectedTrip.created_at,
                    )}
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
    typeof Gauge;

  label: string;

  value: string;
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
  label: string;
  value: string;
  mono?: boolean;
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