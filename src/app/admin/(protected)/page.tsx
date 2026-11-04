import Link from "next/link";
import type { Metadata } from "next";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Ban,
  BarChart3,
  CarFront,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileText,
  Gauge,
  MapPin,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

import {
  getDashboardData,
  type DashboardLog,
  type DashboardReport,
} from "@/lib/admin/dashboard";

/**
 * PIN & TELL — admin overview.
 * UI-only refresh: reads the existing dashboard service; no new API calls,
 * database changes, client state, or invented moderation statistics.
 */
export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Tone = "rose" | "blue" | "amber" | "violet";

const tones: Record<Tone, { icon: string; bar: string; border: string }> = {
  rose: {
    icon: "bg-rose-50 text-[#A92F56] ring-rose-100",
    bar: "bg-[#A92F56]",
    border: "hover:border-rose-200",
  },
  blue: {
    icon: "bg-sky-50 text-sky-700 ring-sky-100",
    bar: "bg-sky-600",
    border: "hover:border-sky-200",
  },
  amber: {
    icon: "bg-amber-50 text-amber-700 ring-amber-100",
    bar: "bg-amber-500",
    border: "hover:border-amber-200",
  },
  violet: {
    icon: "bg-violet-50 text-violet-700 ring-violet-100",
    bar: "bg-violet-600",
    border: "hover:border-violet-200",
  },
};

function formatNumber(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("en-US").format(value)
    : "—";
}

function formatRelativeTime(value: string | null | undefined): string {
  if (!value) return "Unknown date";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Unknown date";
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1_440) return `${Math.floor(minutes / 60)}h ago`;
  if (minutes < 10_080) return `${Math.floor(minutes / 1_440)}d ago`;
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric",
  }).format(new Date(value));
}

function formatToday(): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila", weekday: "long", month: "long", day: "numeric", year: "numeric",
  }).format(new Date());
}

function readable(value: string | null | undefined): string {
  if (!value) return "Unknown";
  return value.replace(/[_-]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function reportTarget(report: DashboardReport): string {
  if (report.reported_user_id) return "User account";
  if (report.pin_id) return `Pin #${report.pin_id}`;
  if (report.comment_id) return `Comment #${report.comment_id}`;
  return "Content";
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const colors: Record<string, string> = {
    pending: "bg-amber-50 text-amber-800 ring-amber-200",
    reviewing: "bg-sky-50 text-sky-800 ring-sky-200",
    resolved: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    dismissed: "bg-slate-100 text-slate-600 ring-slate-200",
    suspended: "bg-rose-50 text-rose-800 ring-rose-200",
    outdated: "bg-slate-100 text-slate-500 ring-slate-200",
  };
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset ${colors[normalized] ?? colors.dismissed}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${normalized === "pending" ? "bg-amber-500" : normalized === "reviewing" ? "bg-sky-500" : normalized === "resolved" ? "bg-emerald-500" : "bg-slate-400"}`} />
      {readable(status)}
    </span>
  );
}

function SectionHeading({
  icon: Icon, title, subtitle, href, linkText = "View all",
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  href?: string;
  linkText?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6 sm:py-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Icon size={19} strokeWidth={1.9} />
        </div>
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-900 sm:text-base">{title}</h2>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">{subtitle}</p>
        </div>
      </div>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-[#A92F56] transition hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A92F56]">
          {linkText} <ArrowUpRight size={14} />
        </Link>
      )}
    </div>
  );
}

function MetricCard({
  label, value, detail, icon: Icon, href, tone,
}: {
  label: string;
  value: number | null | undefined;
  detail: string;
  icon: LucideIcon;
  href: string;
  tone: Tone;
}) {
  return (
    <Link href={href} className={`group relative flex min-h-[180px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A92F56] sm:p-6 ${tones[tone].border}`}>
      <div className={`absolute inset-x-0 top-0 h-1 ${tones[tone].bar}`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-[-0.05em] text-slate-950 sm:text-[34px]">{formatNumber(value)}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${tones[tone].icon}`}>
          <Icon size={21} strokeWidth={1.9} />
        </div>
      </div>
      <div className="mt-auto flex items-end justify-between gap-3 pt-5">
        <span className="min-w-0 text-xs leading-5 text-slate-500">{detail}</span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition group-hover:bg-rose-50 group-hover:text-[#A92F56]">
          <ArrowUpRight size={15} />
        </span>
      </div>
    </Link>
  );
}

function RecentReport({ report }: { report: DashboardReport }) {
  return (
    <div className="group grid gap-3 border-b border-slate-100 px-5 py-4 transition hover:bg-slate-50/70 last:border-b-0 sm:px-6 md:grid-cols-[minmax(0,1.6fr)_minmax(110px,0.7fr)_minmax(105px,0.7fr)_auto] md:items-center md:gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-[#A92F56]">
          <ShieldAlert size={17} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-900">Report #{report.id}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{report.reason || "No reason provided"}</p>
          <p className="mt-1.5 text-[11px] text-slate-400">{readable(report.type)} · {reportTarget(report)}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 md:block">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 md:hidden">Status</span>
        <StatusPill status={report.status} />
      </div>
      <p className="hidden truncate text-xs font-medium text-slate-500 md:block">{reportTarget(report)}</p>
      <p className="text-right text-[11px] whitespace-nowrap text-slate-400">{formatRelativeTime(report.created_at)}</p>
    </div>
  );
}

function ActivityIcon({ action }: { action: string }) {
  const lower = action.toLowerCase();
  if (lower.includes("image") || lower.includes("photo") || lower.includes("policy")) return { icon: Sparkles, tone: "bg-violet-50 text-violet-700" };
  if (lower.includes("ban") || lower.includes("suspend")) return { icon: Ban, tone: "bg-rose-50 text-rose-700" };
  if (lower.includes("report")) return { icon: ShieldAlert, tone: "bg-amber-50 text-amber-700" };
  if (lower.includes("pin")) return { icon: MapPin, tone: "bg-sky-50 text-sky-700" };
  if (lower.includes("login") || lower.includes("auth")) return { icon: ShieldCheck, tone: "bg-emerald-50 text-emerald-700" };
  return { icon: Activity, tone: "bg-slate-100 text-slate-600" };
}

function RecentActivity({ log }: { log: DashboardLog }) {
  const { icon: Icon, tone } = ActivityIcon({ action: log.action_type });
  return (
    <div className="relative flex gap-3 py-4 first:pt-0 last:pb-0">
      <div className="absolute bottom-0 left-[18px] top-12 w-px bg-slate-100 last:hidden" />
      <div className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon size={17} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="break-words text-xs font-bold text-slate-800">{readable(log.action_type)}</p>
          <span className="shrink-0 text-[11px] text-slate-400">{formatRelativeTime(log.created_at)}</span>
        </div>
        <p className="mt-1 line-clamp-3 break-words text-xs leading-5 text-slate-500">{log.description || "No additional details recorded."}</p>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="flex min-h-[190px] flex-col items-center justify-center px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Icon size={21} /></div>
      <p className="mt-3 text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const { metrics, recentReports, recentLogs, hasErrors } = await getDashboardData();

  const totalUsers = metrics.totalUsers;
  const activeUsers = metrics.activeUsers7d;
  const activeRate = typeof totalUsers === "number" && totalUsers > 0 && typeof activeUsers === "number"
    ? Math.min(100, Math.max(0, (activeUsers / totalUsers) * 100))
    : null;

  const primaryStats: Array<{
    label: string; value: number | null; detail: string; icon: LucideIcon; href: string; tone: Tone;
  }> = [
    { label: "Total users", value: totalUsers, detail: `${formatNumber(activeUsers)} active in the past 7 days`, icon: Users, href: "/admin/users", tone: "rose" },
    { label: "Published pins", value: metrics.totalPins, detail: "Locations shared on the map", icon: MapPin, href: "/admin/pins", tone: "blue" },
    { label: "Pending reports", value: metrics.pendingReports, detail: `${formatNumber(metrics.reviewingReports)} currently under review`, icon: ShieldAlert, href: "/admin/reports", tone: "amber" },
    { label: "Active bans", value: metrics.activeBans, detail: `${formatNumber(metrics.suspendedUsers)} suspended accounts`, icon: Ban, href: "/admin/bans", tone: "violet" },
  ];

  const moderationItems = [
    { label: "Pending reports", value: metrics.pendingReports, href: "/admin/reports", icon: Clock3, tone: "text-amber-700 bg-amber-50" },
    { label: "Reports under review", value: metrics.reviewingReports, href: "/admin/reports", icon: ShieldAlert, tone: "text-sky-700 bg-sky-50" },
    { label: "Active bans", value: metrics.activeBans, href: "/admin/bans", icon: Ban, tone: "text-rose-700 bg-rose-50" },
    { label: "Suspended users", value: metrics.suspendedUsers, href: "/admin/users", icon: Users, tone: "text-violet-700 bg-violet-50" },
  ];

  return (
    <main className="space-y-6 pb-8 text-slate-900">
      {/* Overview header — same soft-surface and brand language as Photo Review. */}
      <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-[#A92F56]/[0.06] blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 right-1/3 h-52 w-52 rounded-full bg-sky-100/60 blur-3xl" />
        <div className="relative flex flex-col gap-5 px-5 py-6 sm:px-7 sm:py-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#A92F56]/10 text-[#A92F56]"><BarChart3 size={23} /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A92F56]">PIN &amp; TELL / ADMIN OVERVIEW</p>
              <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-950 sm:text-[29px]">Dashboard</h1>
              <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">A clear view of your community, safety workload, and platform activity.</p>
              <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-slate-400"><Clock3 size={12} /> {formatToday()} · Philippine Time</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Link href="/admin/activity-logs" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A92F56]"><Activity size={15} /> Activity logs</Link>
            <Link href="/admin/pin-image-reviews" className="inline-flex items-center gap-2 rounded-lg bg-[#A92F56] px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-[#8e2549] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A92F56]"><Shield size={15} /> Photo moderation <ArrowRight size={14} /></Link>
          </div>
        </div>
      </header>

      {hasErrors && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
          <CircleAlert size={18} className="mt-0.5 shrink-0" />
          Some dashboard data could not be loaded. Unavailable metrics appear as an em dash; review the underlying pages before taking action.
        </div>
      )}

      <section aria-labelledby="overview-stats-heading">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#A92F56]">Platform snapshot</p>
            <h2 id="overview-stats-heading" className="mt-1 text-base font-bold text-slate-900">At a glance</h2>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200"><Activity size={12} /> Current dashboard totals</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {primaryStats.map((stat) => <MetricCard key={stat.label} {...stat} />)}
        </div>
      </section>

      {/* Most relevant destinations; the dashboard service does not supply a pending-photo count. */}
      <section aria-label="Quick moderation shortcuts" className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Link href="/admin/pin-image-reviews" className="group relative flex min-h-36 flex-col justify-between overflow-hidden rounded-2xl border border-[#A92F56]/20 bg-gradient-to-br from-[#A92F56] to-[#782342] p-5 text-white shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:gap-5 sm:p-6">
          <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 h-60 w-60 rounded-full border-[28px] border-white/[0.06]" />
          <div className="relative max-w-lg">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-50"><Sparkles size={12} /> Trust &amp; safety</span>
            <h2 className="mt-3 text-lg font-bold tracking-tight sm:text-xl">Photo moderation workspace</h2>
            <p className="mt-1.5 text-xs leading-5 text-rose-100 sm:text-sm">Inspect AI decisions and handle photos that need a human review.</p>
          </div>
          <span className="relative mt-4 inline-flex w-fit shrink-0 items-center gap-2 rounded-lg bg-white px-3.5 py-2.5 text-xs font-bold text-[#A92F56] transition group-hover:bg-rose-50 sm:mt-0">Open workspace <ArrowRight size={15} /></span>
        </Link>
        <Link href="/admin/reports" className="group flex min-h-36 items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-rose-200 hover:shadow-md sm:p-6">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><ShieldAlert size={20} /></div>
            <h2 className="mt-3 text-sm font-bold text-slate-900">Review user reports</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Check flagged content and outstanding cases.</p>
          </div>
          <ArrowUpRight size={18} className="shrink-0 text-slate-400 transition group-hover:text-[#A92F56]" />
        </Link>
      </section>

      <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)]" aria-label="Moderation activity overview">
        <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <SectionHeading icon={FileText} title="Recent reports" subtitle="The latest cases reported by your community" href="/admin/reports" />
          {recentReports.length > 0 ? (
            <>
              <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(110px,0.7fr)_minmax(105px,0.7fr)_auto] gap-4 border-b border-slate-100 bg-slate-50/70 px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 md:grid">
                <span>Report</span><span>Status</span><span>Target</span><span className="text-right">Submitted</span>
              </div>
              <div>{recentReports.map((report) => <RecentReport key={report.id} report={report} />)}</div>
            </>
          ) : (
            <EmptyState icon={ShieldCheck} title="No recent reports" description="New reports will appear here when they are submitted." />
          )}
        </article>

        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <SectionHeading icon={Shield} title="Moderation overview" subtitle="Current user-report and enforcement totals" href="/admin/reports" linkText="Manage" />
          <div className="divide-y divide-slate-100 px-5 sm:px-6">
            {moderationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.label} href={item.href} className="group flex items-center justify-between gap-3 py-4 transition hover:text-[#A92F56]">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.tone}`}><Icon size={17} /></div>
                    <span className="text-xs font-semibold text-slate-700 group-hover:text-[#A92F56]">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold tracking-tight text-slate-900">{formatNumber(item.value)}</span>
                    <ChevronRight size={15} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#A92F56]" />
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
            <p className="flex items-start gap-2 text-xs leading-5 text-slate-500"><CircleAlert size={15} className="mt-0.5 shrink-0 text-amber-600" /> Photo moderation cases have their own workspace; these counts refer to user reports and account restrictions.</p>
          </div>
        </article>
      </section>

      <section className="grid items-start gap-4 xl:grid-cols-2" aria-label="Platform insights and audit trail">
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <SectionHeading icon={Activity} title="Recent activity" subtitle="Latest logged actions across the platform" href="/admin/activity-logs" linkText="View logs" />
          {recentLogs.length > 0 ? (
            <div className="px-5 py-5 sm:px-6">{recentLogs.map((log) => <RecentActivity key={log.id} log={log} />)}</div>
          ) : (
            <EmptyState icon={Clock3} title="No recent activity" description="Administrative and system events will appear here when recorded." />
          )}
        </article>

        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <SectionHeading icon={TrendingUp} title="Platform insights" subtitle="Community engagement and mobility data" href="/admin/users" linkText="Explore users" />
          <div className="p-5 sm:p-6">
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-600">Active users · past 7 days</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{formatNumber(activeUsers)}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#A92F56] ring-1 ring-slate-100"><Users size={20} /></div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200" role={activeRate !== null ? "progressbar" : undefined} aria-valuenow={activeRate === null ? undefined : Math.round(activeRate)} aria-valuemin={activeRate === null ? undefined : 0} aria-valuemax={activeRate === null ? undefined : 100} aria-label="7-day active user share">
                <div className="h-full rounded-full bg-[#A92F56]" style={{ width: `${activeRate ?? 0}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                <span>Share of registered users</span>
                <span className="font-bold text-slate-700">{activeRate === null ? "—" : `${activeRate.toFixed(1)}%`}</span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 p-4 sm:p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-700"><Gauge size={18} /></div>
                <p className="mt-4 text-2xl font-bold tracking-tight text-slate-950">{formatNumber(metrics.totalTrips)}</p>
                <p className="mt-1 text-xs font-semibold text-slate-600">Recorded trips</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 sm:p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-700"><CarFront size={18} /></div>
                <p className="mt-4 text-2xl font-bold tracking-tight text-slate-950">{formatNumber(metrics.totalVehicles)}</p>
                <p className="mt-1 text-xs font-semibold text-slate-600">Registered vehicles</p>
              </div>
            </div>
            <Link href="/admin/pins" className="group mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3.5 transition hover:border-rose-200 hover:bg-rose-50/40">
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-700"><MapPin size={16} className="text-[#A92F56]" /> Explore published pins</span>
              <span className="flex items-center gap-2 text-xs font-bold text-slate-900">{formatNumber(metrics.totalPins)} <ArrowRight size={14} className="text-slate-400 group-hover:text-[#A92F56]" /></span>
            </Link>
          </div>
        </article>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} /> PIN &amp; TELL Admin · Operational overview</span>
        <span>Times shown in Philippine Time · Data from existing dashboard sources</span>
      </footer>
    </main>
  );
}
