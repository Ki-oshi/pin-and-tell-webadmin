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
  AdminVehicleRow,
} from "@/lib/admin/vehicles";

type Props = {
  vehicles:
    AdminVehicleRow[];

  fuelTypes:
    string[];

  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };

  initialQuery:
    string;

  initialFuel:
    string;

  initialPrimary:
    string;

  initialSort:
    string;
};

function ownerName(
  vehicle:
    AdminVehicleRow,
) {
  return (
    vehicle.owner?.full_name
      ?.trim() ||
    vehicle.owner?.username
      ?.trim() ||
    "Unknown user"
  );
}

function displayVehicleName(
  vehicle:
    AdminVehicleRow,
) {
  return (
    vehicle.nickname
      ?.trim() ||
    vehicle.vehicle_name
      ?.trim() ||
    `Vehicle #${vehicle.id}`
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
      maximumFractionDigits:
        digits,
    },
  ).format(
    value,
  );
}

function formatDate(
  value: string,
) {
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
  value: string,
) {
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

function presetName(
  vehicle:
    AdminVehicleRow,
) {
  if (
    !vehicle.preset
  ) {
    return "Custom vehicle";
  }

  const parts = [
    vehicle.preset.year,
    vehicle.preset.brand,
    vehicle.preset.model,
  ].filter(
    (
      value,
    ) =>
      value !== null &&
      value !== undefined &&
      String(
        value,
      ).trim() !== "",
  );

  return (
    parts.join(
      " ",
    ) ||
    "Vehicle preset"
  );
}

function escapeCsv(
  value:
    | string
    | number
    | boolean
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

export default function VehiclesTable({
  vehicles,
  fuelTypes,
  pagination,
  initialQuery,
  initialFuel,
  initialPrimary,
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
    selectedVehicle,
    setSelectedVehicle,
  ] =
    useState<
      AdminVehicleRow | null
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
                ? `/admin/vehicles?${next}`
                : "/admin/vehicles",
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
      !selectedVehicle
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
        setSelectedVehicle(
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
    selectedVehicle,
  ]);

  const showing =
    useMemo(() => {
      if (
        pagination.total ===
        0
      ) {
        return "0 vehicles";
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
        ? `/admin/vehicles?${next}`
        : "/admin/vehicles",
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

    return `/admin/vehicles?${params.toString()}`;
  }

  function exportPage() {
    if (
      vehicles.length ===
      0
    ) {
      return;
    }

    const rows = [
      [
        "Vehicle ID",
        "Owner",
        "User ID",
        "Vehicle Name",
        "Nickname",
        "Fuel Type",
        "Efficiency L/100KM",
        "Tank Size",
        "Primary",
        "Preset ID",
        "Preset Type",
        "Preset Brand",
        "Preset Year",
        "Preset Model",
        "Transmission",
        "Created",
      ],

      ...vehicles.map(
        (
          vehicle,
        ) => [
          vehicle.id,

          ownerName(
            vehicle,
          ),

          vehicle.user_id,

          vehicle.vehicle_name,

          vehicle.nickname,

          vehicle.fuel_type,

          vehicle.efficiency_l_100km,

          vehicle.tank_size,

          Boolean(
            vehicle.is_primary,
          ),

          vehicle.preset_id,

          vehicle.preset
            ?.vehicle_type,

          vehicle.preset
            ?.brand,

          vehicle.preset
            ?.year,

          vehicle.preset
            ?.model,

          vehicle.preset
            ?.transmission,

          vehicle.created_at,
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
      `pin-tell-vehicles-page-${pagination.page}.csv`;

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
                  event.target
                    .value,
                )
              }
              placeholder="Search vehicle, owner, brand, model or ID..."
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
            {/* Fuel type */}
            <select
              value={
                initialFuel
              }
              onChange={(
                event,
              ) =>
                updateFilter(
                  "fuel",
                  event.target
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
                All fuel types
              </option>

              {fuelTypes.map(
                (
                  fuel,
                ) => (
                  <option
                    key={
                      fuel
                    }
                    value={
                      fuel
                    }
                  >
                    {fuel}
                  </option>
                ),
              )}
            </select>

            {/* Primary */}
            <select
              value={
                initialPrimary
              }
              onChange={(
                event,
              ) =>
                updateFilter(
                  "primary",
                  event.target
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
                All vehicles
              </option>

              <option value="primary">
                Primary only
              </option>

              <option value="secondary">
                Secondary only
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
                  event.target
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

              <option value="name">
                Vehicle name
              </option>
            </select>

            <button
              type="button"
              onClick={
                exportPage
              }
              disabled={
                vehicles.length ===
                0
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
        {vehicles.length >
        0 ? (
          <div
            className="
              overflow-x-auto
            "
          >
            <table
              className="
                w-full
                min-w-[1180px]
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
                    "Vehicle",
                    "Owner",
                    "Fuel",
                    "Efficiency",
                    "Tank",
                    "Preset",
                    "Primary",
                    "Added",
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
                {vehicles.map(
                  (
                    vehicle,
                  ) => (
                    <tr
                      key={
                        vehicle.id
                      }
                      className="
                        border-b
                        border-slate-100
                        last:border-b-0
                        hover:bg-slate-50/60
                      "
                    >
                      {/* Vehicle */}
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
                          {vehicle.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={
                                vehicle.image_url
                              }
                              alt=""
                              className="
                                h-10
                                w-12
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
                                h-10
                                w-12
                                shrink-0
                                items-center
                                justify-center
                                bg-slate-100
                                text-slate-400
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
                                max-w-[180px]
                                truncate
                                text-xs
                                font-semibold
                                text-slate-800
                              "
                            >
                              {displayVehicleName(
                                vehicle,
                              )}
                            </p>

                            <p
                              className="
                                mt-0.5
                                max-w-[180px]
                                truncate
                                text-[9px]
                                text-slate-400
                              "
                            >
                              {vehicle.nickname
                                ? vehicle.vehicle_name
                                : `Vehicle #${vehicle.id}`}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Owner */}
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
                          {vehicle.owner
                            ?.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={
                                vehicle.owner
                                  .avatar_url
                              }
                              alt=""
                              className="
                                h-7
                                w-7
                                shrink-0
                                rounded-full
                                object-cover
                              "
                            />
                          ) : (
                            <div
                              className="
                                flex
                                h-7
                                w-7
                                shrink-0
                                items-center
                                justify-center
                                rounded-full
                                bg-[#A92F56]/10
                                text-[9px]
                                font-semibold
                                text-[#A92F56]
                              "
                            >
                              {initials(
                                ownerName(
                                  vehicle,
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
                                max-w-[140px]
                                truncate
                                text-[11px]
                                font-medium
                                text-slate-700
                              "
                            >
                              {ownerName(
                                vehicle,
                              )}
                            </p>

                            {vehicle.owner
                              ?.username && (
                              <p
                                className="
                                  mt-0.5
                                  max-w-[140px]
                                  truncate
                                  text-[9px]
                                  text-slate-400
                                "
                              >
                                @
                                {
                                  vehicle
                                    .owner
                                    .username
                                }
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Fuel */}
                      <td
                        className="
                          px-4
                          py-3.5
                        "
                      >
                        <span
                          className="
                            inline-flex
                            items-center
                            gap-1.5
                            text-xs
                            text-slate-600
                          "
                        >
                          <Fuel
                            size={12}
                            className="
                              text-slate-400
                            "
                          />

                          {vehicle.fuel_type ||
                            "—"}
                        </span>
                      </td>

                      {/* Efficiency */}
                      <td
                        className="
                          px-4
                          py-3.5
                        "
                      >
                        <p
                          className="
                            text-xs
                            font-medium
                            text-slate-700
                          "
                        >
                          {formatNumber(
                            vehicle.efficiency_l_100km,
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
                          L/100 km
                        </p>
                      </td>

                      {/* Tank */}
                      <td
                        className="
                          px-4
                          py-3.5
                          text-xs
                          text-slate-600
                        "
                      >
                        {formatNumber(
                          vehicle.tank_size,
                          1,
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

                      {/* Preset */}
                      <td
                        className="
                          px-4
                          py-3.5
                        "
                      >
                        <p
                          className="
                            max-w-[170px]
                            truncate
                            text-xs
                            text-slate-600
                          "
                        >
                          {presetName(
                            vehicle,
                          )}
                        </p>

                        {vehicle.preset
                          ?.vehicle_type && (
                          <p
                            className="
                              mt-0.5
                              text-[9px]
                              text-slate-400
                            "
                          >
                            {
                              vehicle
                                .preset
                                .vehicle_type
                            }
                          </p>
                        )}
                      </td>

                      {/* Primary */}
                      <td
                        className="
                          px-4
                          py-3.5
                        "
                      >
                        {vehicle.is_primary ? (
                          <span
                            className="
                              inline-flex
                              items-center
                              gap-1.5
                              border
                              border-[#FDC1C9]
                              bg-[#FDC1C9]/20
                              px-2
                              py-1
                              text-[10px]
                              font-semibold
                              text-[#A92F56]
                            "
                          >
                            <Star
                              size={10}
                            />

                            Primary
                          </span>
                        ) : (
                          <span
                            className="
                              text-[10px]
                              text-slate-400
                            "
                          >
                            Secondary
                          </span>
                        )}
                      </td>

                      {/* Created */}
                      <td
                        className="
                          px-4
                          py-3.5
                          text-[11px]
                          text-slate-500
                        "
                      >
                        {formatDate(
                          vehicle.created_at,
                        )}
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
                            setSelectedVehicle(
                              vehicle,
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
                  ),
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
            <Car
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
              No vehicles found
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
          <p
            className="
              text-[11px]
              text-slate-400
            "
          >
            {showing}
          </p>

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
          VEHICLE DRAWER
      ====================== */}
      {selectedVehicle && (
        <>
          <button
            type="button"
            aria-label="Close vehicle details"
            onClick={() =>
              setSelectedVehicle(
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
            {/* Drawer Header */}
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
              <div
                className="
                  min-w-0
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >
                  <p
                    className="
                      max-w-[300px]
                      truncate
                      text-sm
                      font-semibold
                      text-slate-950
                    "
                  >
                    {displayVehicleName(
                      selectedVehicle,
                    )}
                  </p>

                  {selectedVehicle.is_primary && (
                    <span
                      className="
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
                      Primary
                    </span>
                  )}
                </div>

                <p
                  className="
                    mt-1
                    text-[10px]
                    text-slate-400
                  "
                >
                  Vehicle #
                  {
                    selectedVehicle.id
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedVehicle(
                    null,
                  )
                }
                className="
                  flex
                  h-8
                  w-8
                  shrink-0
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
              {/* Vehicle image */}
              <div
                className="
                  border-b
                  border-slate-100
                  p-5
                "
              >
                {selectedVehicle.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={
                      selectedVehicle.image_url
                    }
                    alt=""
                    className="
                      h-[220px]
                      w-full
                      border
                      border-slate-200
                      object-cover
                    "
                  />
                ) : (
                  <div
                    className="
                      flex
                      h-[180px]
                      w-full
                      flex-col
                      items-center
                      justify-center
                      border
                      border-slate-200
                      bg-slate-50
                      text-slate-300
                    "
                  >
                    <ImageIcon
                      size={28}
                    />

                    <span
                      className="
                        mt-2
                        text-[10px]
                      "
                    >
                      No vehicle image
                    </span>
                  </div>
                )}

                <div
                  className="
                    mt-4
                  "
                >
                  <h3
                    className="
                      text-base
                      font-semibold
                      text-slate-950
                    "
                  >
                    {selectedVehicle.vehicle_name}
                  </h3>

                  {selectedVehicle.nickname && (
                    <p
                      className="
                        mt-1
                        text-xs
                        text-slate-500
                      "
                    >
                      Nickname:{" "}
                      <span
                        className="
                          font-medium
                          text-slate-700
                        "
                      >
                        {
                          selectedVehicle.nickname
                        }
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Owner */}
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
                  Owner
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
                  {selectedVehicle.owner
                    ?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={
                        selectedVehicle
                          .owner
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
                        ownerName(
                          selectedVehicle,
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
                      {ownerName(
                        selectedVehicle,
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
                      {selectedVehicle.owner
                        ?.username
                        ? `@${selectedVehicle.owner.username}`
                        : selectedVehicle.user_id}
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

                <div
                  className="
                    mt-3
                    flex
                    gap-2
                  "
                >
                  <Link
                    href={`/admin/users?q=${encodeURIComponent(
                      selectedVehicle.user_id,
                    )}`}
                    className="
                      inline-flex
                      h-9
                      flex-1
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

                  <Link
                    href={`/admin/trips?q=${encodeURIComponent(
                      selectedVehicle.user_id,
                    )}`}
                    className="
                      inline-flex
                      h-9
                      flex-1
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
                    Owner&apos;s Trips
                  </Link>
                </div>
              </div>

              {/* Vehicle specification */}
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
                  Vehicle Details
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
                    label="Fuel Type"
                    value={
                      selectedVehicle.fuel_type ||
                      "—"
                    }
                  />

                  <MetricCard
                    icon={
                      Gauge
                    }
                    label="Efficiency"
                    value={
                      selectedVehicle.efficiency_l_100km !==
                      null
                        ? `${formatNumber(
                            selectedVehicle.efficiency_l_100km,
                            2,
                          )} L/100 km`
                        : "—"
                    }
                  />

                  <MetricCard
                    icon={
                      Fuel
                    }
                    label="Tank Size"
                    value={
                      selectedVehicle.tank_size !==
                      null
                        ? `${formatNumber(
                            selectedVehicle.tank_size,
                            1,
                          )} L`
                        : "—"
                    }
                  />

                  <MetricCard
                    icon={
                      Star
                    }
                    label="Vehicle Role"
                    value={
                      selectedVehicle.is_primary
                        ? "Primary"
                        : "Secondary"
                    }
                  />
                </div>
              </div>

              {/* Preset */}
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
                  Vehicle Preset
                </p>

                {selectedVehicle.preset ? (
                  <div
                    className="
                      border
                      border-slate-200
                      bg-slate-50/50
                      p-4
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
                          h-9
                          w-9
                          shrink-0
                          items-center
                          justify-center
                          bg-white
                          text-[#A92F56]
                        "
                      >
                        <Car
                          size={16}
                        />
                      </div>

                      <div
                        className="
                          min-w-0
                        "
                      >
                        <p
                          className="
                            text-sm
                            font-semibold
                            text-slate-900
                          "
                        >
                          {presetName(
                            selectedVehicle,
                          )}
                        </p>

                        <p
                          className="
                            mt-1
                            text-[10px]
                            text-slate-400
                          "
                        >
                          Preset #
                          {
                            selectedVehicle.preset.id
                          }
                        </p>
                      </div>
                    </div>

                    <div
                      className="
                        mt-4
                        space-y-3
                      "
                    >
                      <DetailRow
                        label="Type"
                        value={
                          selectedVehicle
                            .preset
                            .vehicle_type ||
                          "—"
                        }
                      />

                      <DetailRow
                        label="Brand"
                        value={
                          selectedVehicle
                            .preset
                            .brand ||
                          "—"
                        }
                      />

                      <DetailRow
                        label="Model"
                        value={
                          selectedVehicle
                            .preset
                            .model ||
                          "—"
                        }
                      />

                      <DetailRow
                        label="Year"
                        value={
                          selectedVehicle
                            .preset
                            .year
                            ? String(
                                selectedVehicle
                                  .preset
                                  .year,
                              )
                            : "—"
                        }
                      />

                      <DetailRow
                        label="Transmission"
                        value={
                          selectedVehicle
                            .preset
                            .transmission ||
                          "—"
                        }
                      />

                      <DetailRow
                        label="Preset Tank Size"
                        value={
                          selectedVehicle
                            .preset
                            .tank_size !==
                          null
                            ? `${formatNumber(
                                selectedVehicle
                                  .preset
                                  .tank_size,
                                1,
                              )} L`
                            : "—"
                        }
                      />
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
                    <p
                      className="
                        text-xs
                        text-slate-500
                      "
                    >
                      This vehicle is
                      not linked to a
                      vehicle preset.
                    </p>
                  </div>
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
                    label="Vehicle ID"
                    value={
                      String(
                        selectedVehicle.id,
                      )
                    }
                  />

                  <DetailRow
                    label="User ID"
                    value={
                      selectedVehicle.user_id
                    }
                    mono
                  />

                  <DetailRow
                    label="Preset ID"
                    value={
                      selectedVehicle.preset_id
                        ? String(
                            selectedVehicle.preset_id,
                          )
                        : "—"
                    }
                  />

                  <DetailRow
                    label="Created"
                    value={
                      formatDateTime(
                        selectedVehicle.created_at,
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
    typeof Car;

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