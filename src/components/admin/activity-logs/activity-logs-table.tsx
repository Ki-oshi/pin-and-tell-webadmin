"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowRight, Bot, ChevronLeft, ChevronRight, Clock3, Download,
  Eye, FileText, Globe2, Laptop, Search, ShieldCheck, Table2, User, X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import type { AdminActivityLogRow, ActivityActor } from "@/lib/admin/activity-logs";

type Props = {
  logs: AdminActivityLogRow[];
  pagination: { page: number; pageSize: number; total: number; pageCount: number };
  initialQuery: string;
  initialActor: string;
  initialPeriod: string;
  initialSort: string;
};

function formatLabel(value: string | null): string {
  return value ? value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "—";
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
    second: "2-digit", timeZone: "Asia/Manila",
  }).format(date);
}

function formatTableDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(date);
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U";
}

function actorName(actor: ActivityActor, actorType: string | null): string {
  if (actor?.kind === "admin") return actor.full_name?.trim() || actor.email || "Administrator";
  if (actor?.kind === "user") return actor.full_name?.trim() || actor.username?.trim() || "User";
  if (actor?.kind === "system" || actorType === "system") return "System";
  if (actorType === "admin") return "Administrator";
  if (actorType === "user") return "User";
  return "Unknown actor";
}

function actorSubtitle(actor: ActivityActor, actorId: string | null): string {
  if (actor?.kind === "admin") return actor.email || "Administrator";
  if (actor?.kind === "user") return actor.username ? `@${actor.username}` : actor.id;
  if (actor?.kind === "system") return "Automated event";
  return actorId || "No actor ID";
}

function shortId(value: string | null): string {
  if (!value) return "—";
  return value.length <= 20 ? value : `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function actorBadgeStyle(actorType: string | null): string {
  switch (actorType) {
    case "admin": return "bg-rose-50 text-[#A92F56]";
    case "user": return "bg-blue-50 text-blue-700";
    case "system": return "bg-violet-50 text-violet-700";
    default: return "bg-slate-100 text-slate-600";
  }
}

// Preserve the existing navigation, including the legacy rejected-photo-review target workaround.
function targetHref(log: AdminActivityLogRow): string | null {
  if (!log.target_table || !log.target_id) return null;
  const target = encodeURIComponent(log.target_id);
  if (log.action_type === "pin_photo_rejected" && log.target_table === "pins" &&
      /^[a-f0-9-]{36}$/i.test(log.target_id)) {
    return "/admin/pin-image-reviews";
  }
  switch (log.target_table) {
    case "profiles": return `/admin/users?q=${target}`;
    case "pins": return `/admin/pins?q=${target}`;
    case "pin_moderation_queue": return "/admin/pin-image-reviews";
    case "reports": return `/admin/reports?q=${target}`;
    case "user_bans": return `/admin/bans?q=${target}`;
    case "trips": return `/admin/trips?q=${target}`;
    case "user_vehicles": return `/admin/vehicles?q=${target}`;
    case "fuel_logs": return `/admin/fuel-logs?q=${target}`;
    default: return null;
  }
}

// Prevent spreadsheet apps from evaluating untrusted log fields as formulas.
function escapeCsv(value: string | number | null | undefined): string {
  const raw = String(value ?? "");
  const safe = /^[\s]*[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

function ActorVisual({ log, size = "sm" }: { log: AdminActivityLogRow; size?: "sm" | "lg" }) {
  const dimension = size === "lg" ? "h-11 w-11" : "h-9 w-9";
  const iconSize = size === "lg" ? 19 : 15;
  if (log.actor?.kind === "user" && log.actor.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={log.actor.avatar_url} alt="" loading="lazy" referrerPolicy="no-referrer" className={`${dimension} shrink-0 rounded-full object-cover`} />;
  }
  if (log.actor_type === "admin") {
    return <span className={`${dimension} flex shrink-0 items-center justify-center rounded-full bg-rose-50 text-[#A92F56]`}><ShieldCheck size={iconSize} /></span>;
  }
  if (log.actor_type === "system") {
    return <span className={`${dimension} flex shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600`}><Bot size={iconSize} /></span>;
  }
  return (
    <span className={`${dimension} flex shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-700`}>
      {log.actor_type === "user" ? initials(actorName(log.actor, log.actor_type)) : <User size={iconSize} />}
    </span>
  );
}

function ActorPill({ actorType }: { actorType: string | null }) {
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-bold ${actorBadgeStyle(actorType)}`}>{actorType ? formatLabel(actorType) : "Unknown"}</span>;
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-b-0">
      <dt className="shrink-0 text-[11px] text-slate-500">{label}</dt>
      <dd className={`min-w-0 break-all text-right text-[11px] font-semibold text-slate-800 ${mono ? "font-mono text-[10px]" : ""}`}>{value}</dd>
    </div>
  );
}

function SectionHeading({ icon: Icon, title }: { icon: typeof Activity; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-[#A92F56]"><Icon size={16} /></span>
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
    </div>
  );
}

export default function ActivityLogsTable({ logs, pagination, initialQuery, initialActor, initialPeriod, initialSort }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentParams = searchParams.toString();
  const [query, setQuery] = useState(initialQuery);
  const [selectedLog, setSelectedLog] = useState<AdminActivityLogRow | null>(null);

  // Keep URL-backed search/filters and server pagination intact.
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(currentParams);
      const cleaned = query.trim();
      if (cleaned) params.set("q", cleaned);
      else params.delete("q");
      params.delete("page");
      const next = params.toString();
      if (next !== currentParams) router.replace(next ? `/admin/activity-logs?${next}` : "/admin/activity-logs");
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [query, currentParams, router]);

  useEffect(() => {
    if (!selectedLog) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setSelectedLog(null); };
    document.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onEscape);
    };
  }, [selectedLog]);

  const showing = useMemo(() => {
    if (pagination.total === 0) return "0 activity logs";
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
    router.replace(next ? `/admin/activity-logs?${next}` : "/admin/activity-logs");
  }

  function pageUrl(page: number): string {
    const params = new URLSearchParams(currentParams);
    params.set("page", String(page));
    return `/admin/activity-logs?${params.toString()}`;
  }

  function exportPage() {
    if (logs.length === 0) return;
    const rows: (string | number | null | undefined)[][] = [
      ["Log ID", "Actor Type", "Actor", "Actor ID", "Action Type", "Description", "Target Table", "Target ID", "IP Address", "User Agent", "Created At"],
      ...logs.map((log) => [log.id, log.actor_type, actorName(log.actor, log.actor_type), log.actor_id,
        log.action_type, log.description, log.target_table, log.target_id, log.ip_address, log.user_agent, log.created_at]),
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pin-tell-activity-logs-page-${pagination.page}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <section aria-labelledby="activity-registry-title" className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="activity-registry-title" className="text-sm font-bold text-slate-900 sm:text-base">Activity history</h2>
              <p className="mt-1 text-[11px] text-slate-500">Search and inspect recorded events across the platform.</p>
            </div>
            <span className="rounded-full bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-[#A92F56]">{new Intl.NumberFormat("en-US").format(pagination.total)} records</span>
          </div>

          <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-[370px]">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                aria-label="Search activity logs"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search action, actor, target, IP or ID..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-10 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#A92F56] focus:bg-white focus:ring-4 focus:ring-rose-100"
              />
              {query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-700"><X size={14} /></button>}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select aria-label="Filter by actor" value={initialActor} onChange={(event) => updateFilter("actor", event.target.value, "all")} className="h-11 min-w-[125px] flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none hover:border-slate-300 focus:border-[#A92F56] sm:flex-none">
                <option value="all">All actors</option><option value="admin">Administrators</option><option value="user">Users</option><option value="system">System</option>
              </select>
              <select aria-label="Filter by time period" value={initialPeriod} onChange={(event) => updateFilter("period", event.target.value, "all")} className="h-11 min-w-[132px] flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none hover:border-slate-300 focus:border-[#A92F56] sm:flex-none">
                <option value="all">All time</option><option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option>
              </select>
              <select aria-label="Sort activity logs" value={initialSort} onChange={(event) => updateFilter("sort", event.target.value, "newest")} className="h-11 min-w-[135px] flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none hover:border-slate-300 focus:border-[#A92F56] sm:flex-none">
                <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
              </select>
              <button type="button" onClick={exportPage} disabled={logs.length === 0} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#A92F56]/20 bg-rose-50 px-4 text-xs font-bold text-[#A92F56] transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40">
                <Download size={15} /> Export page
              </button>
            </div>
          </div>
        </div>

        {logs.length > 0 ? (
          <>
            <div className="grid gap-3 p-4 lg:hidden">
              {logs.map((log) => (
                <article key={log.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5"><ActorVisual log={log} /><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-900">{actorName(log.actor, log.actor_type)}</p><p className="mt-0.5 truncate text-[10px] text-slate-500">{actorSubtitle(log.actor, log.actor_id)}</p></div></div>
                    <ActorPill actorType={log.actor_type} />
                  </div>
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <p className="break-all font-mono text-[11px] font-bold text-[#A92F56]">{log.action_type}</p>
                    <p className="mt-1.5 line-clamp-3 text-xs leading-5 text-slate-600">{log.description}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-[10px] text-slate-500">
                    <span className="inline-flex items-center gap-1.5"><Clock3 size={12} /> {formatTableDate(log.created_at)}</span>
                    <span className="font-medium">{log.target_table ? formatLabel(log.target_table) : "No target"}</span>
                  </div>
                  <button type="button" onClick={() => setSelectedLog(log)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#A92F56] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-[#8d2446]"><Eye size={14} /> View activity</button>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1140px] border-collapse text-left">
                <thead><tr className="border-b border-slate-100 bg-slate-50/70">
                  {["Time", "Actor", "Type", "Action", "Description", "Target", "IP Address", ""].map((heading) =>
                    <th key={heading || "action"} scope="col" className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 first:pl-6 last:pr-6">{heading}</th>
                  )}
                </tr></thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-100/90 transition last:border-0 hover:bg-rose-50/25">
                      <td className="whitespace-nowrap py-4 pl-6 pr-3 text-[11px] text-slate-500">{formatTableDate(log.created_at)}</td>
                      <td className="px-3 py-4"><div className="flex min-w-[145px] items-center gap-2.5"><ActorVisual log={log} /><div className="min-w-0"><p className="max-w-[175px] truncate text-[11px] font-semibold text-slate-800">{actorName(log.actor, log.actor_type)}</p><p className="max-w-[175px] truncate text-[10px] text-slate-400">{actorSubtitle(log.actor, log.actor_id)}</p></div></div></td>
                      <td className="px-3 py-4"><ActorPill actorType={log.actor_type} /></td>
                      <td className="px-3 py-4"><span className="block max-w-[190px] truncate font-mono text-[10px] font-semibold text-slate-700" title={log.action_type}>{log.action_type}</span></td>
                      <td className="px-3 py-4"><p className="max-w-[240px] truncate text-[11px] text-slate-600" title={log.description}>{log.description}</p></td>
                      <td className="px-3 py-4"><p className="max-w-[115px] truncate text-[10px] font-semibold text-slate-600">{log.target_table ? formatLabel(log.target_table) : "No target"}</p><p className="mt-1 max-w-[115px] truncate font-mono text-[9px] text-slate-400" title={log.target_id || undefined}>{shortId(log.target_id)}</p></td>
                      <td className="px-3 py-4"><span className="font-mono text-[10px] text-slate-500">{log.ip_address || "—"}</span></td>
                      <td className="py-4 pl-3 pr-6 text-right"><button type="button" onClick={() => setSelectedLog(log)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-[#A92F56]"><Eye size={13} /> View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex min-h-[265px] flex-col items-center justify-center px-6 py-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-[#A92F56]"><Activity size={24} /></span>
            <h3 className="mt-4 text-sm font-bold text-slate-800">No activity logs found</h3>
            <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">Try another search or change the actor and date filters.</p>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="text-[11px] font-medium text-slate-500">Showing {showing}</span>
          <nav aria-label="Activity log pages" className="flex items-center gap-2">
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
          <button type="button" tabIndex={-1} aria-label="Close activity details" onClick={() => setSelectedLog(null)} className="fixed inset-0 cursor-default" />
          <section role="dialog" aria-modal="true" aria-labelledby="activity-detail-title" className="relative z-10 flex max-h-[min(92vh,920px)] w-full max-w-[900px] flex-col overflow-hidden rounded-[26px] border border-white/60 bg-white shadow-2xl shadow-slate-950/25">
            <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4 sm:px-7 sm:py-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-[#A92F56]"><Activity size={20} /></span>
                <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-[#A92F56]">Audit event</p><h2 id="activity-detail-title" className="mt-0.5 truncate text-lg font-bold text-slate-950">Activity Log #{selectedLog.id}</h2><p className="text-[11px] text-slate-500">{formatDateTime(selectedLog.created_at)} · Historical record</p></div>
              </div>
              <button type="button" autoFocus onClick={() => setSelectedLog(null)} aria-label="Close details" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"><X size={18} /></button>
            </header>

            <div className="overflow-y-auto bg-slate-50/70 px-4 py-5 sm:px-6 sm:py-6">
              <div className="grid gap-4 lg:grid-cols-[1.12fr_0.88fr]">
                <div className="space-y-4">
                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <SectionHeading icon={FileText} title="Event details" />
                    <p className="mt-4 break-all rounded-xl bg-rose-50 px-3 py-2.5 font-mono text-xs font-bold text-[#A92F56]">{selectedLog.action_type}</p>
                    <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Description</p>
                    <p className="mt-1.5 whitespace-pre-wrap break-words text-xs leading-6 text-slate-700">{selectedLog.description || "No description recorded"}</p>
                    <dl className="mt-4"><DetailRow label="Time (PH)" value={formatDateTime(selectedLog.created_at)} /></dl>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <SectionHeading icon={Table2} title="Target record" />
                    {selectedLog.target_table ? (
                      <>
                        <dl className="mt-4">
                          <DetailRow label="Target table" value={selectedLog.target_table} mono />
                          <DetailRow label="Target ID" value={selectedLog.target_id || "—"} mono />
                        </dl>
                        {targetHref(selectedLog) && (
                          <Link href={targetHref(selectedLog) as string} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-[#A92F56] transition hover:bg-rose-100">View target <ArrowRight size={14} /></Link>
                        )}
                      </>
                    ) : <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">No database target was recorded for this event.</p>}
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <SectionHeading icon={Globe2} title="Request context" />
                    <div className="mt-4 space-y-3">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="flex items-center gap-2 text-slate-500"><Globe2 size={13} /><span className="text-[10px] font-bold">IP address</span></div>
                        <p className="mt-2 break-all font-mono text-[11px] text-slate-700">{selectedLog.ip_address || "Not recorded"}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="flex items-center gap-2 text-slate-500"><Laptop size={13} /><span className="text-[10px] font-bold">User agent</span></div>
                        <p className="mt-2 break-words text-[11px] leading-5 text-slate-700">{selectedLog.user_agent || "Not recorded"}</p>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="space-y-4">
                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <SectionHeading icon={User} title="Performed by" />
                    <div className="mt-4 flex min-w-0 items-center gap-3 rounded-xl bg-slate-50 p-3">
                      <ActorVisual log={selectedLog} size="lg" />
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{actorName(selectedLog.actor, selectedLog.actor_type)}</p><p className="mt-1 truncate text-[11px] text-slate-500">{actorSubtitle(selectedLog.actor, selectedLog.actor_id)}</p></div>
                    </div>
                    <div className="mt-3"><ActorPill actorType={selectedLog.actor_type} /></div>
                    {selectedLog.actor?.kind === "user" && (
                      <Link href={`/admin/users?q=${encodeURIComponent(selectedLog.actor.id)}`} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">View user <ArrowRight size={14} /></Link>
                    )}
                    {selectedLog.actor?.kind === "admin" && (
                      <dl className="mt-3"><DetailRow label="Role" value={formatLabel(selectedLog.actor.role)} /><DetailRow label="Status" value={formatLabel(selectedLog.actor.status)} /></dl>
                    )}
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <SectionHeading icon={Activity} title="Record information" />
                    <dl className="mt-4">
                      <DetailRow label="Log ID" value={String(selectedLog.id)} mono />
                      <DetailRow label="Actor type" value={selectedLog.actor_type || "—"} />
                      <DetailRow label="Actor ID" value={selectedLog.actor_id || "—"} mono />
                      <DetailRow label="Created" value={formatDateTime(selectedLog.created_at)} />
                    </dl>
                  </section>
                  <div className="flex items-start gap-2.5 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3">
                    <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#A92F56]" />
                    <p className="text-[11px] leading-5 text-[#87324b]">This view is read-only. Audit events cannot be edited or deleted here.</p>
                  </div>
                </div>
              </div>
            </div>
            <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-7"><p className="hidden text-[11px] text-slate-400 sm:block">Audit history / Record #{selectedLog.id}</p><button type="button" onClick={() => setSelectedLog(null)} className="ml-auto rounded-xl bg-[#A92F56] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#8d2446]">Close details</button></footer>
          </section>
        </div>
      )}
    </>
  );
}
