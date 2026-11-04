"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  Fuel,
  Gauge,
  Leaf,
  MapPin,
  Route,
  Search,
  SlidersHorizontal,
  User,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";

import type { AdminTripRow } from "@/lib/admin/trips";

type Props = {
  trips: AdminTripRow[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
  initialQuery: string;
  initialStatus: string;
  initialPeriod: string;
  initialSort: string;
};

function formatNumber(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-PH", { maximumFractionDigits: digits }).format(value);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(date);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila",
  }).format(date);
}

function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes) || minutes < 0) return "—";
  const hours = Math.floor(minutes / 60);
  const remaining = Math.round(minutes % 60);
  if (hours === 0) return `${remaining} min`;
  if (remaining === 0) return `${hours} hr${hours === 1 ? "" : "s"}`;
  return `${hours}h ${remaining}m`;
}

function riderName(trip: AdminTripRow): string {
  return trip.user?.full_name?.trim() || trip.user?.username?.trim() || "Unknown rider";
}

function vehicleName(trip: AdminTripRow): string {
  return trip.vehicle?.nickname?.trim() || trip.vehicle?.vehicle_name?.trim() ||
    (trip.vehicle_id ? `Vehicle #${trip.vehicle_id}` : "No vehicle");
}

function initials(value: string): string {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U";
}

function tripStatus(trip: AdminTripRow): "completed" | "open" {
  return trip.end_time ? "completed" : "open";
}

function TripStatusBadge({ trip }: { trip: AdminTripRow }) {
  const completed = Boolean(trip.end_time);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
      completed ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-sky-200 bg-sky-50 text-sky-700"
    }`}>
      {completed ? <CheckCircle2 size={12} /> : <Clock3 size={12} />}
      {completed ? "Completed" : "Open trip"}
    </span>
  );
}

function EcoScoreBadge({ score }: { score: number | null | undefined }) {
  const tone = score === null || score === undefined || !Number.isFinite(score)
    ? "border-slate-200 bg-slate-50 text-slate-500"
    : score >= 85
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : score >= 70
        ? "border-sky-200 bg-sky-50 text-sky-700"
        : score >= 50
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-rose-200 bg-rose-50 text-rose-700";
  return (
    <span className={`inline-flex min-w-[44px] items-center justify-center rounded-full border px-2.5 py-1 text-[10px] font-bold tabular-nums ${tone}`}>
      {formatNumber(score, 0)}
    </span>
  );
}

function Avatar({ trip, size = "sm" }: { trip: AdminTripRow; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "h-12 w-12 text-sm" : "h-9 w-9 text-[10px]";
  return trip.user?.avatar_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={trip.user.avatar_url} alt="" referrerPolicy="no-referrer" className={`${cls} shrink-0 rounded-xl object-cover`} />
  ) : (
    <span className={`flex ${cls} shrink-0 items-center justify-center rounded-xl bg-[#A92F56]/10 font-bold text-[#A92F56]`}>
      {initials(riderName(trip))}
    </span>
  );
}

function escapeCsv(value: string | number | null | undefined): string {
  const text = String(value ?? "");
  // Prevent spreadsheet formula injection from user-controlled addresses/names.
  const safe = /^[\s\x00-\x1f]*[=+@-]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

function harshDetails(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

function MetricCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
      <div className="flex items-center gap-2 text-slate-400"><Icon size={14} /><span className="text-[10px] font-semibold uppercase tracking-[0.08em]">{label}</span></div>
      <p className="mt-2 text-base font-bold tracking-tight text-slate-900 tabular-nums">{value}</p>
    </div>
  );
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 py-2.5 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
      <span className="shrink-0 text-[11px] font-medium text-slate-500">{label}</span>
      <span className={`break-all text-[11px] font-semibold text-slate-800 sm:text-right ${mono ? "font-mono text-[10px]" : ""}`}>{value}</span>
    </div>
  );
}

export default function TripsTable({
  trips, pagination, initialQuery, initialStatus, initialPeriod, initialSort,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentParams = searchParams.toString();
  const [query, setQuery] = useState(initialQuery);
  const [selectedTrip, setSelectedTrip] = useState<AdminTripRow | null>(null);

  // The query is stored in the URL so the server can filter every page.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setQuery(initialQuery));
    return () => window.cancelAnimationFrame(frame);
  }, [initialQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(currentParams);
      const cleaned = query.trim();
      if (cleaned) params.set("q", cleaned);
      else params.delete("q");
      params.delete("page");
      const next = params.toString();
      if (next !== currentParams) router.replace(next ? `/admin/trips?${next}` : "/admin/trips");
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query, currentParams, router]);

  useEffect(() => {
    if (!selectedTrip) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedTrip(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedTrip]);

  const showing = useMemo(() => {
    if (pagination.total === 0) return "0 trips";
    const start = (pagination.page - 1) * pagination.pageSize + 1;
    const end = Math.min(pagination.page * pagination.pageSize, pagination.total);
    return `${start}–${end} of ${pagination.total}`;
  }, [pagination]);

  function updateFilter(key: string, value: string, defaultValue: string) {
    const params = new URLSearchParams(currentParams);
    if (value === defaultValue) params.delete(key);
    else params.set(key, value);
    params.delete("page");
    const next = params.toString();
    router.replace(next ? `/admin/trips?${next}` : "/admin/trips");
  }

  function pageUrl(page: number): string {
    const params = new URLSearchParams(currentParams);
    params.set("page", String(page));
    return `/admin/trips?${params.toString()}`;
  }

  function exportPage() {
    if (trips.length === 0) return;
    const rows: (string | number | null | undefined)[][] = [
      ["Trip ID", "Rider", "User ID", "Vehicle", "Vehicle ID", "Start Address", "End Address", "Distance KM", "Fuel Consumed", "Eco Score", "Duration Minutes", "Average Speed KM/H", "Maximum Speed KM/H", "Harsh Events", "Green Points", "CO2 Saved", "Status", "Start Time", "End Time"],
      ...trips.map((trip) => [
        trip.id, riderName(trip), trip.user_id, vehicleName(trip), trip.vehicle_id,
        trip.start_address, trip.end_address, trip.distance_km, trip.fuel_consumed,
        trip.eco_score, trip.duration_mins, trip.avg_speed_kmh, trip.max_speed_kmh,
        trip.harsh_events_count, trip.green_points, trip.co2_saved,
        tripStatus(trip), trip.start_time, trip.end_time,
      ]),
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pin-tell-trips-page-${pagination.page}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  const filterClass = "h-10 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 outline-none transition hover:border-slate-300 focus:border-[#A92F56] focus:ring-2 focus:ring-[#A92F56]/10";

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-950/[0.025]">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#A92F56]/10 text-[#A92F56]"><Route size={19} /></span>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Trip records</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">Browse, investigate, and export recorded journeys</p>
              </div>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-600 tabular-nums">{pagination.total} total</span>
          </div>
          <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-[370px]">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                aria-label="Search trip records"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search trips, riders, vehicles, or routes..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-10 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#A92F56] focus:bg-white focus:ring-2 focus:ring-[#A92F56]/10"
              />
              {query && (
                <button type="button" aria-label="Clear trip search" onClick={() => setQuery("")} className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-800">
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SlidersHorizontal size={15} className="mr-1 hidden text-slate-400 sm:block" />
              <select aria-label="Filter by trip status" value={initialStatus} onChange={(event) => updateFilter("status", event.target.value, "all")} className={filterClass}>
                <option value="all">All trips</option><option value="completed">Completed</option><option value="open">Open</option>
              </select>
              <select aria-label="Filter by time period" value={initialPeriod} onChange={(event) => updateFilter("period", event.target.value, "all")} className={filterClass}>
                <option value="all">All time</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option>
              </select>
              <select aria-label="Sort trip records" value={initialSort} onChange={(event) => updateFilter("sort", event.target.value, "newest")} className={filterClass}>
                <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="distance">Highest distance</option><option value="eco">Highest eco score</option>
              </select>
              <button type="button" disabled={trips.length === 0} onClick={exportPage} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#A92F56]/20 bg-[#A92F56]/[0.055] px-3.5 text-xs font-semibold text-[#A92F56] transition hover:bg-[#A92F56]/10 disabled:cursor-not-allowed disabled:opacity-40">
                <Download size={15} /> Export CSV
              </button>
            </div>
          </div>
        </div>

        {trips.length > 0 ? (
          <>
            {/* Narrow screens get readable cards instead of a squeezed table. */}
            <div className="divide-y divide-slate-100 lg:hidden">
              {trips.map((trip) => (
                <article key={trip.id} className="px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar trip={trip} />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-900">{riderName(trip)}</p>
                        <p className="mt-1 truncate text-[10px] text-slate-500">{vehicleName(trip)}</p>
                      </div>
                    </div>
                    <TripStatusBadge trip={trip} />
                  </div>
                  <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <p className="flex items-start gap-2 text-[11px] leading-5 text-slate-700"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" /> <span className="min-w-0 break-words">{trip.start_address || "Start location unavailable"}</span></p>
                    <div className="ml-[3px] h-3 border-l border-dashed border-slate-300" />
                    <p className="flex items-start gap-2 text-[11px] leading-5 text-slate-700"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#A92F56]" /> <span className="min-w-0 break-words">{trip.end_address || (trip.end_time ? "End location unavailable" : "Trip not ended")}</span></p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-600">
                    <span className="inline-flex items-center gap-1.5"><Route size={13} className="text-[#A92F56]" /> {formatNumber(trip.distance_km)} km</span>
                    <span className="inline-flex items-center gap-1.5"><Leaf size={13} className="text-emerald-600" /> Eco <EcoScoreBadge score={trip.eco_score} /></span>
                    <span className="inline-flex items-center gap-1.5"><Clock3 size={13} className="text-slate-400" /> {formatDate(trip.start_time)}</span>
                  </div>
                  <button type="button" onClick={() => setSelectedTrip(trip)} className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-[11px] font-semibold text-slate-700 transition hover:border-[#A92F56]/30 hover:bg-rose-50 hover:text-[#A92F56]">
                    <Eye size={14} /> View trip details <ArrowRight size={14} />
                  </button>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1160px] border-collapse text-left" aria-label="Trip records">
                <thead className="bg-slate-50/80">
                  <tr className="border-b border-slate-100">
                    {["Rider", "Vehicle", "Route", "Distance", "Eco", "Avg. speed", "Fuel", "Status", "Started", ""].map((heading) => (
                      <th key={heading || "action"} scope="col" className="whitespace-nowrap px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500 first:pl-5 last:pr-5">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {trips.map((trip) => (
                    <tr key={trip.id} className="transition hover:bg-rose-50/[0.35]">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3"><Avatar trip={trip} /><div className="min-w-0"><p className="max-w-[145px] truncate text-xs font-bold text-slate-800">{riderName(trip)}</p><p className="mt-0.5 max-w-[145px] truncate text-[10px] text-slate-400">{trip.user?.username ? `@${trip.user.username}` : trip.user_id}</p></div></div>
                      </td>
                      <td className="px-4 py-4"><p className="max-w-[145px] truncate text-xs font-medium text-slate-700">{vehicleName(trip)}</p><p className="mt-0.5 text-[10px] text-slate-400">{trip.vehicle?.fuel_type || "Fuel type —"}</p></td>
                      <td className="px-4 py-4"><div className="max-w-[235px]"><p className="truncate text-[11px] text-slate-700">{trip.start_address || "Start location unavailable"}</p><p className="mt-1 truncate text-[10px] text-slate-400">→ {trip.end_address || (trip.end_time ? "End location unavailable" : "Trip not ended")}</p></div></td>
                      <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-slate-800 tabular-nums">{formatNumber(trip.distance_km)} <span className="text-[10px] font-normal text-slate-400">km</span></td>
                      <td className="px-4 py-4"><EcoScoreBadge score={trip.eco_score} /></td>
                      <td className="whitespace-nowrap px-4 py-4 text-[11px] text-slate-600 tabular-nums">{formatNumber(trip.avg_speed_kmh)} <span className="text-[10px] text-slate-400">km/h</span></td>
                      <td className="whitespace-nowrap px-4 py-4 text-[11px] text-slate-600 tabular-nums">{formatNumber(trip.fuel_consumed, 2)} <span className="text-[10px] text-slate-400">L</span></td>
                      <td className="px-4 py-4"><TripStatusBadge trip={trip} /></td>
                      <td className="whitespace-nowrap px-4 py-4 text-[11px] text-slate-500">{formatDate(trip.start_time)}</td>
                      <td className="px-5 py-4 text-right"><button type="button" onClick={() => setSelectedTrip(trip)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 transition hover:border-[#A92F56]/30 hover:bg-rose-50 hover:text-[#A92F56]"><Eye size={13} /> View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Route size={25} /></span>
            <p className="mt-4 text-sm font-bold text-slate-800">No trips found</p>
            <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">Try changing the search, status, or time-period filters.</p>
            {(query || initialStatus !== "all" || initialPeriod !== "all" || initialSort !== "newest") && (
              <button type="button" onClick={() => { setQuery(""); router.replace("/admin/trips"); }} className="mt-4 rounded-xl border border-[#A92F56]/20 bg-rose-50 px-4 py-2 text-xs font-semibold text-[#A92F56] hover:bg-rose-100">Clear filters</button>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <span className="text-[11px] font-medium text-slate-500">Showing <span className="font-bold text-slate-800">{showing}</span> trips</span>
          <div className="flex items-center gap-2">
            {pagination.page > 1 ? (
              <Link href={pageUrl(pagination.page - 1)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"><ChevronLeft size={14} /> Previous</Link>
            ) : (
              <span className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-100 px-3 text-[11px] text-slate-300"><ChevronLeft size={14} /> Previous</span>
            )}
            <span className="px-2 text-[11px] font-semibold text-slate-600 tabular-nums">{pagination.page} / {pagination.pageCount}</span>
            {pagination.page < pagination.pageCount ? (
              <Link href={pageUrl(pagination.page + 1)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50">Next <ChevronRight size={14} /></Link>
            ) : (
              <span className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-100 px-3 text-[11px] text-slate-300">Next <ChevronRight size={14} /></span>
            )}
          </div>
        </div>
      </section>

      {selectedTrip && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-[3px] sm:p-6">
          <button type="button" aria-label="Close trip details" onClick={() => setSelectedTrip(null)} className="absolute inset-0" />
          <section role="dialog" aria-modal="true" aria-labelledby="trip-details-title" className="relative z-10 flex max-h-[92dvh] w-full max-w-[860px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 sm:max-h-[90dvh]">
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#A92F56]/10 text-[#A92F56]"><Route size={21} /></span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><h2 id="trip-details-title" className="text-base font-bold tracking-tight text-slate-950 sm:text-lg">Trip details</h2><TripStatusBadge trip={selectedTrip} /></div>
                  <p className="mt-1 max-w-[520px] truncate font-mono text-[10px] text-slate-400" title={String(selectedTrip.id)}>ID: {selectedTrip.id}</p>
                </div>
              </div>
              <button type="button" aria-label="Close trip details" onClick={() => setSelectedTrip(null)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"><X size={17} /></button>
            </header>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain bg-slate-50/60 px-4 py-5 sm:px-6 sm:py-6">
              <section aria-label="Rider and vehicle" className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Rider</p>
                  <div className="flex items-center gap-3"><Avatar trip={selectedTrip} size="lg" /><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{riderName(selectedTrip)}</p><p className="mt-1 truncate text-[11px] text-slate-500">{selectedTrip.user?.username ? `@${selectedTrip.user.username}` : selectedTrip.user_id}</p></div></div>
                  <Link href={`/admin/users?q=${encodeURIComponent(selectedTrip.user_id)}`} className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#A92F56] hover:text-[#872442]">View user <ArrowRight size={13} /></Link>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Vehicle</p>
                  <div className="flex items-center gap-3">
                    {selectedTrip.vehicle?.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selectedTrip.vehicle.image_url} alt="" referrerPolicy="no-referrer" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                    ) : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Car size={21} /></span>}
                    <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{vehicleName(selectedTrip)}</p><p className="mt-1 text-[11px] text-slate-500">{selectedTrip.vehicle?.fuel_type || "Fuel type not recorded"}</p></div>
                  </div>
                  {selectedTrip.vehicle?.is_primary && <span className="mt-3 inline-flex rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-semibold text-[#A92F56]">Primary vehicle</span>}
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-2"><MapPin size={17} className="text-[#A92F56]" /><h3 className="text-xs font-bold text-slate-900">Route &amp; timeline</h3></div>
                <div className="relative ml-1 border-l-2 border-dashed border-slate-200 pl-5">
                  <div className="relative pb-6">
                    <span className="absolute -left-[29px] top-0.5 h-3.5 w-3.5 rounded-full border-[3px] border-white bg-emerald-500 ring-1 ring-emerald-200" />
                    <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Start</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-800">{selectedTrip.start_address || "Start address not recorded"}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{formatDateTime(selectedTrip.start_time)}</p>
                  </div>
                  <div className="relative">
                    <span className="absolute -left-[29px] top-0.5 h-3.5 w-3.5 rounded-full border-[3px] border-white bg-[#A92F56] ring-1 ring-rose-200" />
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#A92F56]">End</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-800">{selectedTrip.end_address || (selectedTrip.end_time ? "End address not recorded" : "Trip has not ended")}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{selectedTrip.end_time ? formatDateTime(selectedTrip.end_time) : "No end time recorded"}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                <h3 className="mb-4 text-xs font-bold text-slate-900">Trip performance</h3>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <MetricCard icon={Route} label="Distance" value={`${formatNumber(selectedTrip.distance_km)} km`} />
                  <MetricCard icon={Clock3} label="Duration" value={formatDuration(selectedTrip.duration_mins)} />
                  <MetricCard icon={Gauge} label="Average speed" value={`${formatNumber(selectedTrip.avg_speed_kmh)} km/h`} />
                  <MetricCard icon={Zap} label="Maximum speed" value={`${formatNumber(selectedTrip.max_speed_kmh)} km/h`} />
                  <MetricCard icon={Fuel} label="Fuel consumed" value={`${formatNumber(selectedTrip.fuel_consumed, 2)} L`} />
                  <MetricCard icon={Leaf} label="Eco score" value={formatNumber(selectedTrip.eco_score, 0)} />
                </div>
              </section>

              <div className="grid gap-3 sm:grid-cols-2">
                <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                  <h3 className="mb-4 flex items-center gap-2 text-xs font-bold text-slate-900"><Leaf size={16} className="text-emerald-600" /> Eco-driving insights</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <MetricCard icon={Leaf} label="Green points" value={formatNumber(selectedTrip.green_points, 2)} />
                    <MetricCard icon={Activity} label="CO₂ saved" value={formatNumber(selectedTrip.co2_saved, 2)} />
                  </div>
                </section>
                <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-xs font-bold text-slate-900"><Activity size={16} className="text-amber-600" /> Harsh events</h3><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">{selectedTrip.harsh_events_count ?? 0}</span></div>
                  {harshDetails(selectedTrip.harsh_events_details) ? (
                    <pre className="mt-4 max-h-[210px] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-50 p-3 text-[10px] leading-5 text-slate-600">{harshDetails(selectedTrip.harsh_events_details)}</pre>
                  ) : <p className="mt-4 text-[11px] leading-5 text-slate-500">No detailed harsh-event information was recorded.</p>}
                </section>
              </div>

              <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                <h3 className="mb-3 text-xs font-bold text-slate-900">Record information</h3>
                <DetailRow label="Trip ID" value={String(selectedTrip.id)} mono />
                <DetailRow label="User ID" value={selectedTrip.user_id} mono />
                <DetailRow label="Vehicle ID" value={selectedTrip.vehicle_id ? String(selectedTrip.vehicle_id) : "—"} />
                <DetailRow label="Created" value={formatDateTime(selectedTrip.created_at)} />
              </section>
            </div>
            <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
              <p className="hidden items-center gap-2 text-[10px] text-slate-400 sm:inline-flex"><User size={13} /> Read-only trip record</p>
              <button type="button" onClick={() => setSelectedTrip(null)} className="ml-auto inline-flex h-9 items-center justify-center rounded-xl bg-[#A92F56] px-5 text-xs font-semibold text-white transition hover:bg-[#872442]">Close details</button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
