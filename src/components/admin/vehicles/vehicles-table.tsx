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
      <section aria-labelledby="vehicle-registry-title" className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="vehicle-registry-title" className="text-base font-bold tracking-tight text-slate-950">Vehicle registry</h2>
              <p className="mt-1 text-xs text-slate-500">Search and inspect registered vehicles across PIN &amp; TELL.</p>
            </div>
            <span className="rounded-full bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-[#A92F56]">
              {showing}
            </span>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-[355px]">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                aria-label="Search vehicles"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search vehicles, owners, brands or IDs..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-10 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#A92F56] focus:bg-white focus:ring-4 focus:ring-rose-100"
              />
              {query && (
                <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-700">
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <select aria-label="Filter by fuel type" value={initialFuel} onChange={(event) => updateFilter("fuel", event.target.value, "all")} className="h-11 min-w-[128px] flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none transition hover:border-slate-300 focus:border-[#A92F56] sm:flex-none">
                <option value="all">All fuel types</option>
                {fuelTypes.map((fuel) => <option key={fuel} value={fuel}>{fuel}</option>)}
              </select>
              <select aria-label="Filter by vehicle role" value={initialPrimary} onChange={(event) => updateFilter("primary", event.target.value, "all")} className="h-11 min-w-[135px] flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none transition hover:border-slate-300 focus:border-[#A92F56] sm:flex-none">
                <option value="all">All vehicles</option>
                <option value="primary">Primary only</option>
                <option value="secondary">Secondary only</option>
              </select>
              <select aria-label="Sort vehicles" value={initialSort} onChange={(event) => updateFilter("sort", event.target.value, "newest")} className="h-11 min-w-[140px] flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none transition hover:border-slate-300 focus:border-[#A92F56] sm:flex-none">
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name">Vehicle name</option>
              </select>
              <button
                type="button"
                disabled={vehicles.length === 0}
                onClick={exportPage}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#A92F56]/20 bg-rose-50 px-4 text-xs font-bold text-[#A92F56] transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download size={15} /> Export CSV
              </button>
            </div>
          </div>
        </div>

        {vehicles.length > 0 ? (
          <>
            {/* Mobile / tablet card view */}
            <div className="grid gap-3 p-4 lg:hidden sm:grid-cols-2">
              {vehicles.map((vehicle) => (
                <article key={vehicle.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <VehicleThumbnail vehicle={vehicle} size="md" />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-bold text-slate-900">{displayVehicleName(vehicle)}</h3>
                      <p className="mt-1 truncate text-[11px] text-slate-500">{vehicle.nickname ? vehicle.vehicle_name : `Vehicle #${vehicle.id}`}</p>
                      <div className="mt-2">{vehicle.is_primary ? <PrimaryPill /> : <span className="text-[11px] text-slate-400">Secondary vehicle</span>}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                    <User size={13} className="text-slate-400" />
                    <span className="truncate">{ownerName(vehicle)}</span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
                    <div><dt className="text-[10px] text-slate-400">Fuel type</dt><dd className="mt-1 truncate text-xs font-semibold text-slate-700">{vehicle.fuel_type || "—"}</dd></div>
                    <div><dt className="text-[10px] text-slate-400">Efficiency</dt><dd className="mt-1 text-xs font-semibold text-slate-700">{formatNumber(vehicle.efficiency_l_100km, 2)} L/100 km</dd></div>
                    <div><dt className="text-[10px] text-slate-400">Tank</dt><dd className="mt-1 text-xs font-semibold text-slate-700">{formatNumber(vehicle.tank_size)} L</dd></div>
                    <div><dt className="text-[10px] text-slate-400">Added</dt><dd className="mt-1 text-xs font-semibold text-slate-700">{formatDate(vehicle.created_at)}</dd></div>
                  </dl>
                  <button type="button" onClick={() => setSelectedVehicle(vehicle)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#A92F56] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-[#8d2446]">
                    <Eye size={14} /> View vehicle details
                  </button>
                </article>
              ))}
            </div>

            {/* Full data table for desktop */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1080px] border-collapse text-left">
                <thead className="border-b border-slate-100 bg-slate-50/80">
                  <tr>
                    {(["Vehicle", "Owner", "Fuel", "Efficiency", "Tank", "Preset", "Role", "Added", ""] as const).map((heading, i) => (
                      <th key={heading || `action-${i}`} className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 first:pl-6 last:pr-6">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="border-b border-slate-100 transition hover:bg-rose-50/40 last:border-0">
                      <td className="py-4 pl-6 pr-3">
                        <div className="flex items-center gap-3">
                          <VehicleThumbnail vehicle={vehicle} size="sm" />
                          <div className="min-w-0">
                            <p className="max-w-[170px] truncate text-xs font-bold text-slate-900">{displayVehicleName(vehicle)}</p>
                            <p className="mt-1 max-w-[170px] truncate text-[10px] text-slate-400">{vehicle.nickname ? vehicle.vehicle_name : `#${vehicle.id}`}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2.5">
                          <OwnerAvatar vehicle={vehicle} />
                          <div className="min-w-0"><p className="max-w-[130px] truncate text-xs font-semibold text-slate-700">{ownerName(vehicle)}</p><p className="mt-0.5 max-w-[130px] truncate text-[10px] text-slate-400">{vehicle.owner?.username ? `@${vehicle.owner.username}` : "Account"}</p></div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-600">{vehicle.fuel_type || "—"}</td>
                      <td className="px-4 py-4"><p className="text-xs font-semibold text-slate-700">{formatNumber(vehicle.efficiency_l_100km, 2)}</p><p className="mt-0.5 text-[10px] text-slate-400">L/100 km</p></td>
                      <td className="px-4 py-4 text-xs text-slate-600">{formatNumber(vehicle.tank_size)} <span className="text-[10px] text-slate-400">L</span></td>
                      <td className="px-4 py-4"><p className="max-w-[155px] truncate text-xs text-slate-600">{presetName(vehicle)}</p></td>
                      <td className="px-4 py-4">{vehicle.is_primary ? <PrimaryPill /> : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">Secondary</span>}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-[11px] text-slate-500">{formatDate(vehicle.created_at)}</td>
                      <td className="py-4 pl-3 pr-6 text-right"><button type="button" onClick={() => setSelectedVehicle(vehicle)} aria-label={`View ${displayVehicleName(vehicle)}`} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-[11px] font-semibold text-[#A92F56] transition hover:bg-rose-50"><Eye size={13} /> View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex min-h-[300px] flex-col items-center justify-center px-5 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-[#A92F56]"><Car size={24} /></span>
            <p className="mt-4 text-sm font-bold text-slate-800">No vehicles found</p>
            <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">No vehicles match the current search and filters. Try another search or reset the filters.</p>
            <button type="button" onClick={() => { setQuery(""); updateFilter("fuel", "all", "all"); }} className="mt-4 rounded-xl border border-rose-200 px-4 py-2 text-xs font-semibold text-[#A92F56] hover:bg-rose-50">Clear search / fuel filter</button>
          </div>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:px-6">
          <p className="text-[11px] font-medium text-slate-500">Showing <span className="text-slate-900">{showing}</span></p>
          <nav aria-label="Vehicle pages" className="flex items-center gap-2">
            {pagination.page > 1 ? (
              <Link href={pageUrl(pagination.page - 1)} className="rounded-xl border border-slate-200 px-3.5 py-2 text-[11px] font-semibold text-slate-600 transition hover:border-rose-200 hover:text-[#A92F56]">Previous</Link>
            ) : (
              <span className="rounded-xl border border-slate-100 px-3.5 py-2 text-[11px] text-slate-300">Previous</span>
            )}
            <span className="px-2 text-xs font-semibold text-slate-600">{pagination.page} <span className="text-slate-300">/</span> {pagination.pageCount}</span>
            {pagination.page < pagination.pageCount ? (
              <Link href={pageUrl(pagination.page + 1)} className="rounded-xl border border-slate-200 px-3.5 py-2 text-[11px] font-semibold text-slate-600 transition hover:border-rose-200 hover:text-[#A92F56]">Next</Link>
            ) : (
              <span className="rounded-xl border border-slate-100 px-3.5 py-2 text-[11px] text-slate-300">Next</span>
            )}
          </nav>
        </footer>
      </section>

      {selectedVehicle && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/45 px-3 py-5 backdrop-blur-[3px] sm:px-5 sm:py-8">
          <button type="button" tabIndex={-1} aria-label="Close vehicle details" onClick={() => setSelectedVehicle(null)} className="fixed inset-0 cursor-default" />
          <section role="dialog" aria-modal="true" aria-labelledby="vehicle-detail-title" className="relative z-10 flex max-h-[min(92vh,900px)] w-full max-w-[900px] flex-col overflow-hidden rounded-[26px] border border-white/60 bg-white shadow-2xl shadow-slate-950/25">
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4 sm:px-7 sm:py-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#A92F56]/10 text-[#A92F56]"><Car size={20} /></span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#A92F56]">Vehicle record</p>
                  <h2 id="vehicle-detail-title" className="mt-0.5 truncate text-lg font-bold tracking-tight text-slate-950">{displayVehicleName(selectedVehicle)}</h2>
                  <p className="mt-1 text-[11px] text-slate-500">Vehicle #{selectedVehicle.id}</p>
                </div>
              </div>
              <button type="button" autoFocus onClick={() => setSelectedVehicle(null)} aria-label="Close details" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"><X size={18} /></button>
            </header>

            <div className="flex-1 overflow-y-auto bg-slate-50/65 px-4 py-5 sm:px-7 sm:py-6">
              <div className="grid gap-5 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="space-y-5">
                  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    {selectedVehicle.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selectedVehicle.image_url} alt={displayVehicleName(selectedVehicle)} className="h-[220px] w-full bg-slate-100 object-cover sm:h-[255px]" />
                    ) : (
                      <div className="flex h-[220px] flex-col items-center justify-center bg-gradient-to-br from-rose-50 to-slate-100 text-[#A92F56] sm:h-[255px]"><ImageIcon size={34} strokeWidth={1.4} /><p className="mt-2 text-xs font-medium text-slate-500">No vehicle photo available</p></div>
                    )}
                    <div className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="min-w-0 text-sm font-bold text-slate-900">{selectedVehicle.vehicle_name}</h3>{selectedVehicle.is_primary ? <PrimaryPill /> : <span className="text-xs text-slate-400">Secondary</span>}</div>
                      {selectedVehicle.nickname && <p className="mt-1 text-xs text-slate-500">Nickname: <span className="font-semibold text-slate-700">{selectedVehicle.nickname}</span></p>}
                      <p className="mt-2 text-[11px] text-slate-400">Registered {formatDate(selectedVehicle.created_at)}</p>
                    </div>
                  </section>
                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Vehicle owner</p>
                    <div className="flex items-center gap-3"><OwnerAvatar vehicle={selectedVehicle} large /><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{ownerName(selectedVehicle)}</p><p className="mt-1 truncate text-[11px] text-slate-500">{selectedVehicle.owner?.username ? `@${selectedVehicle.owner.username}` : selectedVehicle.user_id}</p></div></div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Link href={`/admin/users?q=${encodeURIComponent(selectedVehicle.user_id)}`} className="flex items-center justify-center rounded-xl border border-rose-200 px-3 py-2.5 text-[11px] font-semibold text-[#A92F56] hover:bg-rose-50">View user</Link>
                      <Link href={`/admin/trips?q=${encodeURIComponent(selectedVehicle.user_id)}`} className="flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">Owner&apos;s trips</Link>
                    </div>
                  </section>
                </div>

                <div className="space-y-5">
                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <h3 className="text-sm font-bold text-slate-900">Vehicle specifications</h3>
                    <p className="mt-1 text-xs text-slate-500">Fuel and operating profile</p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <VehicleMetric icon={Fuel} label="Fuel type" value={selectedVehicle.fuel_type || "—"} />
                      <VehicleMetric icon={Gauge} label="Efficiency" value={selectedVehicle.efficiency_l_100km !== null ? `${formatNumber(selectedVehicle.efficiency_l_100km, 2)} L/100 km` : "—"} />
                      <VehicleMetric icon={Fuel} label="Tank capacity" value={selectedVehicle.tank_size !== null ? `${formatNumber(selectedVehicle.tank_size, 1)} L` : "—"} />
                      <VehicleMetric icon={Star} label="Role" value={selectedVehicle.is_primary ? "Primary" : "Secondary"} />
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-[#A92F56]"><Car size={16} /></span><h3 className="text-sm font-bold text-slate-900">Linked vehicle preset</h3></div>
                    {selectedVehicle.preset ? (
                      <>
                        <p className="mt-4 text-sm font-semibold text-slate-900">{presetName(selectedVehicle)}</p>
                        <p className="mt-1 text-[11px] text-slate-400">Preset #{selectedVehicle.preset.id}</p>
                        <dl className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                          <VehicleDetail label="Vehicle type" value={selectedVehicle.preset.vehicle_type || "—"} />
                          <VehicleDetail label="Brand" value={selectedVehicle.preset.brand || "—"} />
                          <VehicleDetail label="Model" value={selectedVehicle.preset.model || "—"} />
                          <VehicleDetail label="Year" value={selectedVehicle.preset.year != null ? String(selectedVehicle.preset.year) : "—"} />
                          <VehicleDetail label="Transmission" value={selectedVehicle.preset.transmission || "—"} />
                          <VehicleDetail label="Preset tank" value={selectedVehicle.preset.tank_size != null ? `${formatNumber(selectedVehicle.preset.tank_size)} L` : "—"} />
                        </dl>
                      </>
                    ) : <p className="mt-3 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">This vehicle is not linked to a preset.</p>}
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <h3 className="mb-4 text-sm font-bold text-slate-900">Record information</h3>
                    <dl className="space-y-3">
                      <VehicleDetail label="Vehicle ID" value={String(selectedVehicle.id)} />
                      <VehicleDetail label="User ID" value={selectedVehicle.user_id} mono />
                      <VehicleDetail label="Preset ID" value={selectedVehicle.preset_id != null ? String(selectedVehicle.preset_id) : "—"} />
                      <VehicleDetail label="Created" value={formatDateTime(selectedVehicle.created_at)} />
                    </dl>
                  </section>
                </div>
              </div>
            </div>
            <footer className="flex shrink-0 justify-end border-t border-slate-100 bg-white px-5 py-3 sm:px-7">
              <button type="button" onClick={() => setSelectedVehicle(null)} className="rounded-xl bg-[#A92F56] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#8d2446]">Close details</button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}

function PrimaryPill() {
  return <span className="inline-flex items-center gap-1 rounded-full border border-rose-100 bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-[#A92F56]"><Star size={11} fill="currentColor" /> Primary</span>;
}

function VehicleThumbnail({ vehicle, size }: { vehicle: AdminVehicleRow; size: "sm" | "md" }) {
  const style = size === "sm" ? "h-11 w-14" : "h-16 w-20";
  return vehicle.image_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={vehicle.image_url} alt="" loading="lazy" className={`${style} shrink-0 rounded-xl border border-slate-200 object-cover`} />
  ) : (
    <span className={`${style} flex shrink-0 items-center justify-center rounded-xl bg-rose-50 text-[#A92F56]`}><Car size={20} /></span>
  );
}

function OwnerAvatar({ vehicle, large = false }: { vehicle: AdminVehicleRow; large?: boolean }) {
  const size = large ? "h-11 w-11" : "h-8 w-8";
  return vehicle.owner?.avatar_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={vehicle.owner.avatar_url} alt="" loading="lazy" className={`${size} shrink-0 rounded-full object-cover`} />
  ) : (
    <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-[#A92F56]/10 text-[10px] font-bold text-[#A92F56]`}>{initials(ownerName(vehicle))}</span>
  );
}

function VehicleMetric({ icon: Icon, label, value }: { icon: typeof Car; label: string; value: string }) {
  return <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/70 p-3"><div className="flex items-center gap-2 text-slate-400"><Icon size={14} /><span className="text-[10px] font-semibold">{label}</span></div><p className="mt-2 break-words text-xs font-bold text-slate-800 sm:text-sm">{value}</p></div>;
}

function VehicleDetail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="flex items-start justify-between gap-4"><dt className="shrink-0 text-[11px] text-slate-500">{label}</dt><dd className={`min-w-0 break-all text-right text-[11px] font-semibold text-slate-800 ${mono ? "font-mono text-[10px]" : ""}`}>{value}</dd></div>;
}
