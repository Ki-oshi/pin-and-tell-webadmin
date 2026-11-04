"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, CalendarDays, Car, ChevronLeft, ChevronRight, Download,
  Eye, Fuel, Gauge, Hash, ImageIcon, Search, Star, User, X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import type { AdminFuelLogRow } from "@/lib/admin/fuel-logs";

type Props = {
  logs: AdminFuelLogRow[];
  pagination: { page: number; pageSize: number; total: number; pageCount: number };
  initialQuery: string;
  initialPeriod: string;
  initialData: string;
  initialSort: string;
};

function userName(log: AdminFuelLogRow): string {
  return log.user?.full_name?.trim() || log.user?.username?.trim() || "Unknown user";
}

function vehicleName(log: AdminFuelLogRow): string {
  return log.vehicle?.nickname?.trim() || log.vehicle?.vehicle_name?.trim() || `Vehicle #${log.vehicle_id}`;
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "U";
}

function formatNumber(value: number | null, digits = 2): string {
  return value === null || !Number.isFinite(value) ? "—" : new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" }).format(date);
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila",
  }).format(date);
}

// Avoid spreadsheet formula execution when exported values are opened in Excel.
function escapeCsv(value: string | number | null | undefined): string {
  const raw = String(value ?? "");
  const escaped = /^[\s]*[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${escaped.replace(/"/g, '""')}"`;
}

function UserAvatar({ log, size = "h-9 w-9" }: { log: AdminFuelLogRow; size?: string }) {
  if (log.user?.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={log.user.avatar_url} alt="" loading="lazy" referrerPolicy="no-referrer" className={`${size} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-[#A92F56]/10 text-[10px] font-bold text-[#A92F56]`}>
      {initials(userName(log))}
    </span>
  );
}

function VehicleThumb({ log, size = "h-10 w-12" }: { log: AdminFuelLogRow; size?: string }) {
  if (log.vehicle?.image_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={log.vehicle.image_url} alt="" loading="lazy" referrerPolicy="no-referrer" className={`${size} shrink-0 rounded-xl border border-slate-200 object-cover`} />;
  }
  return <span className={`${size} flex shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400`}><Car size={18} /></span>;
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-b-0">
      <dt className="shrink-0 text-[11px] text-slate-500">{label}</dt>
      <dd className={`min-w-0 break-all text-right text-[11px] font-semibold text-slate-800 ${mono ? "font-mono text-[10px]" : ""}`}>{value}</dd>
    </div>
  );
}

function SummaryMetric({ icon: Icon, label, value }: { icon: typeof Fuel; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
      <div className="flex items-center gap-2 text-slate-500"><Icon size={14} /><span className="text-[10px] font-semibold">{label}</span></div>
      <p className="mt-2 break-words text-sm font-bold text-slate-900 sm:text-base">{value}</p>
    </div>
  );
}

function EfficiencyPill({ value }: { value: number | null }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
      value === null ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700"
    }`}>
      <Gauge size={11} /> {value === null ? "Not recorded" : `${formatNumber(value, 2)} L/100 km`}
    </span>
  );
}

export default function FuelLogsTable({ logs, pagination, initialQuery, initialPeriod, initialData, initialSort }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentParams = searchParams.toString();
  const [query, setQuery] = useState(initialQuery);
  const [selectedLog, setSelectedLog] = useState<AdminFuelLogRow | null>(null);

  // Keep the server-side search, URL query, and pagination behavior intact.
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(currentParams);
      const cleaned = query.trim();
      if (cleaned) params.set("q", cleaned);
      else params.delete("q");
      params.delete("page");
      const next = params.toString();
      if (next !== currentParams) router.replace(next ? `/admin/fuel-logs?${next}` : "/admin/fuel-logs");
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [query, currentParams, router]);

  useEffect(() => {
    if (!selectedLog) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setSelectedLog(null); };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedLog]);

  const showing = useMemo(() => {
    if (pagination.total === 0) return "0 fuel logs";
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
    router.replace(next ? `/admin/fuel-logs?${next}` : "/admin/fuel-logs");
  }

  function pageUrl(page: number): string {
    const params = new URLSearchParams(currentParams);
    params.set("page", String(page));
    return `/admin/fuel-logs?${params.toString()}`;
  }

  function exportPage() {
    if (logs.length === 0) return;
    const rows: (string | number | null | undefined)[][] = [
      ["Fuel Log ID", "User", "User ID", "Vehicle", "Vehicle ID", "Fuel Type", "Date", "Liters", "Cost", "Odometer KM", "Efficiency L/100KM", "Created At"],
      ...logs.map((log) => [log.id, userName(log), log.user_id, vehicleName(log), log.vehicle_id,
        log.vehicle?.fuel_type, log.date, log.liters, log.cost, log.odometer_km,
        log.efficiency_l_100km, log.created_at]),
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pin-tell-fuel-logs-page-${pagination.page}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <section aria-labelledby="fuel-registry-title" className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="fuel-registry-title" className="text-sm font-bold text-slate-900 sm:text-base">Fuel log records</h2>
              <p className="mt-1 text-[11px] text-slate-500">Explore refueling entries and related vehicle data.</p>
            </div>
            <span className="rounded-full bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-[#A92F56]">{formatNumber(pagination.total, 0)} records</span>
          </div>

          <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-[360px]">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                aria-label="Search fuel logs"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search log ID, user, vehicle or user ID..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-10 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#A92F56] focus:bg-white focus:ring-4 focus:ring-rose-100"
              />
              {query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-700"><X size={14} /></button>}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select aria-label="Filter by time period" value={initialPeriod} onChange={(event) => updateFilter("period", event.target.value, "all")} className="h-11 min-w-[120px] flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none transition hover:border-slate-300 focus:border-[#A92F56] sm:flex-none">
                <option value="all">All time</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option>
              </select>
              <select aria-label="Filter by data completeness" value={initialData} onChange={(event) => updateFilter("data", event.target.value, "all")} className="h-11 min-w-[152px] flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none transition hover:border-slate-300 focus:border-[#A92F56] sm:flex-none">
                <option value="all">All records</option><option value="with_efficiency">With efficiency</option><option value="without_efficiency">Without efficiency</option><option value="with_odometer">With odometer</option>
              </select>
              <select aria-label="Sort fuel logs" value={initialSort} onChange={(event) => updateFilter("sort", event.target.value, "newest")} className="h-11 min-w-[146px] flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none transition hover:border-slate-300 focus:border-[#A92F56] sm:flex-none">
                <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="liters">Highest liters</option><option value="cost">Highest cost</option><option value="efficiency">Lowest L/100 km</option>
              </select>
              <button type="button" onClick={exportPage} disabled={logs.length === 0} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#A92F56]/20 bg-rose-50 px-4 text-xs font-bold text-[#A92F56] transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40">
                <Download size={15} /> Export page
              </button>
            </div>
          </div>
        </div>

        {logs.length > 0 ? (
          <>
            {/* Mobile / tablet cards prevent the desktop table from overflowing small screens. */}
            <div className="grid gap-3 p-4 lg:hidden">
              {logs.map((log) => (
                <article key={log.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-[#A92F56]"><Fuel size={18} /></span>
                      <div className="min-w-0"><p className="truncate text-xs font-bold text-slate-900">Fuel Log #{log.id}</p><p className="mt-0.5 text-[10px] text-slate-500">{formatDate(log.date)}</p></div>
                    </div>
                    <EfficiencyPill value={log.efficiency_l_100km} />
                  </div>
                  <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3"><UserAvatar log={log} size="h-8 w-8" /><span className="min-w-0 truncate text-xs font-semibold text-slate-700">{userName(log)}</span></div>
                  <div className="mt-2 flex items-center gap-2"><VehicleThumb log={log} size="h-8 w-10" /><span className="min-w-0 truncate text-xs text-slate-600">{vehicleName(log)}</span></div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
                    <div><dt className="text-[10px] text-slate-400">Fuel added</dt><dd className="mt-1 text-xs font-bold text-slate-900">{formatNumber(log.liters)} L</dd></div>
                    <div><dt className="text-[10px] text-slate-400">Recorded cost</dt><dd className="mt-1 text-xs font-bold text-slate-900">{formatNumber(log.cost)}</dd></div>
                    <div><dt className="text-[10px] text-slate-400">Odometer</dt><dd className="mt-1 text-xs font-semibold text-slate-700">{log.odometer_km === null ? "—" : `${formatNumber(log.odometer_km, 1)} km`}</dd></div>
                    <div><dt className="text-[10px] text-slate-400">Vehicle ID</dt><dd className="mt-1 text-xs font-semibold text-slate-700">#{log.vehicle_id}</dd></div>
                  </dl>
                  <button type="button" onClick={() => setSelectedLog(log)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#A92F56] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-[#8d2446]"><Eye size={14} /> View fuel log</button>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1110px] border-collapse text-left">
                <thead><tr className="border-b border-slate-100 bg-slate-50/70">
                  {["Log", "User", "Vehicle", "Date", "Liters", "Cost", "Odometer", "Efficiency", ""].map((heading) =>
                    <th key={heading || "action"} scope="col" className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 first:pl-6 last:pr-6">{heading}</th>
                  )}
                </tr></thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-100/90 transition last:border-0 hover:bg-rose-50/25">
                      <td className="py-4 pl-6 pr-3"><div className="flex items-center gap-2.5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-[#A92F56]"><Fuel size={16} /></span><div><p className="whitespace-nowrap text-xs font-bold text-slate-800">#{log.id}</p><p className="mt-0.5 whitespace-nowrap text-[10px] text-slate-400">Fuel entry</p></div></div></td>
                      <td className="px-3 py-4"><div className="flex min-w-[125px] items-center gap-2"><UserAvatar log={log} size="h-8 w-8" /><div className="min-w-0"><p className="max-w-[145px] truncate text-[11px] font-semibold text-slate-800">{userName(log)}</p><p className="max-w-[145px] truncate text-[10px] text-slate-400">{log.user?.username ? `@${log.user.username}` : log.user_id}</p></div></div></td>
                      <td className="px-3 py-4"><div className="flex min-w-[145px] items-center gap-2"><VehicleThumb log={log} size="h-9 w-11" /><div className="min-w-0"><p className="max-w-[150px] truncate text-[11px] font-semibold text-slate-800">{vehicleName(log)}</p><p className="text-[10px] text-slate-400">{log.vehicle?.fuel_type || "Fuel type —"}</p></div></div></td>
                      <td className="whitespace-nowrap px-3 py-4 text-[11px] text-slate-500">{formatDate(log.date)}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-xs font-bold text-slate-800">{formatNumber(log.liters)} <span className="text-[10px] font-normal text-slate-400">L</span></td>
                      <td className="whitespace-nowrap px-3 py-4 text-xs font-semibold text-slate-700">{formatNumber(log.cost)}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-[11px] text-slate-600">{formatNumber(log.odometer_km, 1)} <span className="text-[10px] text-slate-400">km</span></td>
                      <td className="px-3 py-4"><EfficiencyPill value={log.efficiency_l_100km} /></td>
                      <td className="py-4 pl-3 pr-6 text-right"><button type="button" onClick={() => setSelectedLog(log)} aria-label={`View fuel log ${log.id}`} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-[11px] font-semibold text-[#A92F56] transition hover:bg-rose-50"><Eye size={13} /> View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex min-h-[310px] flex-col items-center justify-center px-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-[#A92F56]"><Fuel size={24} /></span>
            <h3 className="mt-4 text-sm font-bold text-slate-800">No fuel logs found</h3>
            <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">Try another search or change the filters to see more fuel records.</p>
            <button type="button" onClick={() => { setQuery(""); updateFilter("period", "all", "all"); }} className="mt-4 rounded-xl border border-rose-200 px-4 py-2 text-xs font-semibold text-[#A92F56] hover:bg-rose-50">Clear search and period</button>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="text-[11px] font-medium text-slate-500">Showing {showing}</span>
          <nav aria-label="Fuel log pages" className="flex items-center gap-2">
            {pagination.page > 1 ? (
              <Link href={pageUrl(pagination.page - 1)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-600 hover:border-rose-200 hover:text-[#A92F56]"><ChevronLeft size={13} /> Previous</Link>
            ) : <span className="inline-flex items-center gap-1 rounded-xl border border-slate-100 px-3 py-2 text-[11px] text-slate-300"><ChevronLeft size={13} /> Previous</span>}
            <span className="px-2 text-[11px] font-semibold text-slate-600">{pagination.page} / {pagination.pageCount}</span>
            {pagination.page < pagination.pageCount ? (
              <Link href={pageUrl(pagination.page + 1)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-600 hover:border-rose-200 hover:text-[#A92F56]">Next <ChevronRight size={13} /></Link>
            ) : <span className="inline-flex items-center gap-1 rounded-xl border border-slate-100 px-3 py-2 text-[11px] text-slate-300">Next <ChevronRight size={13} /></span>}
          </nav>
        </div>
      </section>

      {selectedLog && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/45 px-3 py-5 backdrop-blur-[3px] sm:px-5 sm:py-8">
          <button type="button" tabIndex={-1} aria-label="Close fuel log details" onClick={() => setSelectedLog(null)} className="fixed inset-0 cursor-default" />
          <section role="dialog" aria-modal="true" aria-labelledby="fuel-detail-title" className="relative z-10 flex max-h-[min(92vh,900px)] w-full max-w-[900px] flex-col overflow-hidden rounded-[26px] border border-white/60 bg-white shadow-2xl shadow-slate-950/25">
            <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4 sm:px-7 sm:py-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-[#A92F56]"><Fuel size={20} /></span>
                <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-[#A92F56]">Fuel record</p><h2 id="fuel-detail-title" className="mt-0.5 truncate text-lg font-bold text-slate-950">Fuel Log #{selectedLog.id}</h2><p className="text-[11px] text-slate-500">{formatDate(selectedLog.date)} · Consumption details</p></div>
              </div>
              <button type="button" autoFocus onClick={() => setSelectedLog(null)} aria-label="Close details" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"><X size={18} /></button>
            </header>

            <div className="overflow-y-auto bg-slate-50/70 px-4 py-5 sm:px-6 sm:py-6">
              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-4">
                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-[#A92F56]"><Fuel size={16} /></span><h3 className="text-sm font-bold text-slate-900">Fuel consumption</h3></div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <SummaryMetric icon={Fuel} label="Fuel added" value={`${formatNumber(selectedLog.liters, 2)} L`} />
                      <SummaryMetric icon={Hash} label="Recorded cost" value={formatNumber(selectedLog.cost, 2)} />
                      <SummaryMetric icon={Gauge} label="Odometer" value={selectedLog.odometer_km === null ? "Not recorded" : `${formatNumber(selectedLog.odometer_km, 1)} km`} />
                      <SummaryMetric icon={Gauge} label="Efficiency" value={selectedLog.efficiency_l_100km === null ? "Not recorded" : `${formatNumber(selectedLog.efficiency_l_100km, 2)} L/100 km`} />
                    </div>
                    <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-3 text-[11px] font-medium text-[#A92F56]"><CalendarDays size={15} /> Refueling date: {formatDate(selectedLog.date)}</div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-[#A92F56]"><Car size={16} /></span><h3 className="text-sm font-bold text-slate-900">Vehicle details</h3></div>
                    {selectedLog.vehicle?.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selectedLog.vehicle.image_url} alt="Vehicle" referrerPolicy="no-referrer" className="mt-4 h-[170px] w-full rounded-xl border border-slate-200 object-cover" />
                    ) : <div className="mt-4 flex h-[105px] items-center justify-center rounded-xl bg-slate-50 text-slate-300"><ImageIcon size={28} /></div>}
                    <div className="mt-3 flex items-start justify-between gap-2"><div><p className="text-sm font-bold text-slate-900">{vehicleName(selectedLog)}</p><p className="mt-1 text-[11px] text-slate-500">{selectedLog.vehicle?.fuel_type || "Fuel type not recorded"}</p></div>{selectedLog.vehicle?.is_primary && <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-semibold text-[#A92F56]"><Star size={11} /> Primary</span>}</div>
                    <dl className="mt-4">
                      <DetailRow label="Vehicle efficiency" value={selectedLog.vehicle?.efficiency_l_100km == null ? "—" : `${formatNumber(selectedLog.vehicle.efficiency_l_100km, 2)} L/100 km`} />
                      <DetailRow label="Tank size" value={selectedLog.vehicle?.tank_size == null ? "—" : `${formatNumber(selectedLog.vehicle.tank_size, 1)} L`} />
                      <DetailRow label="Vehicle ID" value={String(selectedLog.vehicle_id)} />
                    </dl>
                    <Link href={`/admin/vehicles?q=${encodeURIComponent(String(selectedLog.vehicle_id))}`} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-[#A92F56] transition hover:bg-rose-100">View vehicle <ArrowRight size={14} /></Link>
                  </section>
                </div>

                <div className="space-y-4">
                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-[#A92F56]"><User size={16} /></span><h3 className="text-sm font-bold text-slate-900">Recorded by</h3></div>
                    <div className="mt-4 flex min-w-0 items-center gap-3 rounded-xl bg-slate-50 p-3"><UserAvatar log={selectedLog} size="h-11 w-11" /><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{userName(selectedLog)}</p><p className="mt-0.5 truncate text-[11px] text-slate-500">{selectedLog.user?.username ? `@${selectedLog.user.username}` : selectedLog.user_id}</p></div></div>
                    <Link href={`/admin/users?q=${encodeURIComponent(selectedLog.user_id)}`} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">View user <ArrowRight size={14} /></Link>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-[#A92F56]"><Hash size={16} /></span><h3 className="text-sm font-bold text-slate-900">Record information</h3></div>
                    <dl className="mt-4"><DetailRow label="Fuel log ID" value={String(selectedLog.id)} /><DetailRow label="User ID" value={selectedLog.user_id} mono /><DetailRow label="Vehicle ID" value={String(selectedLog.vehicle_id)} /><DetailRow label="Fuel date" value={formatDate(selectedLog.date)} /><DetailRow label="Created at" value={formatDateTime(selectedLog.created_at)} /></dl>
                  </section>
                </div>
              </div>
            </div>
            <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-7"><p className="hidden text-[11px] text-slate-400 sm:block">Fuel activity / Record #{selectedLog.id}</p><button type="button" onClick={() => setSelectedLog(null)} className="ml-auto rounded-xl bg-[#A92F56] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#8d2446]">Close details</button></footer>
          </section>
        </div>
      )}
    </>
  );
}
