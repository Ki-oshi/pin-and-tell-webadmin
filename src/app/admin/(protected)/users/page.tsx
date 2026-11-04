import Link from "next/link";
import type { Metadata } from "next";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Ban,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  LockKeyhole,
  ShieldCheck,
  UserRoundCheck,
  UserRoundX,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { getUsersPageData } from "@/lib/admin/users";
import UsersTable from "@/components/admin/users/users-table";

/**
 * PIN & TELL — Users administration.
 * UI-only refresh. Existing data fetching, search parameters, table,
 * pagination, and all user-management actions are preserved.
 */
export const metadata: Metadata = { title: "Users" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type UsersPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
    page?: string | string[];
  }>;
};

type AccountStatus = "all" | "active" | "suspended" | "banned";
type CardTone = "rose" | "emerald" | "amber" | "red";

const tones: Record<CardTone, { icon: string; bar: string; hover: string; selected: string }> = {
  rose: {
    icon: "bg-rose-50 text-[#A92F56] ring-rose-100",
    bar: "bg-[#A92F56]",
    hover: "hover:border-rose-200",
    selected: "border-rose-300 ring-2 ring-rose-100",
  },
  emerald: {
    icon: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    bar: "bg-emerald-500",
    hover: "hover:border-emerald-200",
    selected: "border-emerald-300 ring-2 ring-emerald-100",
  },
  amber: {
    icon: "bg-amber-50 text-amber-700 ring-amber-100",
    bar: "bg-amber-500",
    hover: "hover:border-amber-200",
    selected: "border-amber-300 ring-2 ring-amber-100",
  },
  red: {
    icon: "bg-red-50 text-red-700 ring-red-100",
    bar: "bg-red-500",
    hover: "hover:border-red-200",
    selected: "border-red-300 ring-2 ring-red-100",
  },
};

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatNumber(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("en-US").format(value)
    : "—";
}

function safeShare(count: number | null | undefined, total: number | null | undefined): number | null {
  if (
    typeof count !== "number" || !Number.isFinite(count) || count < 0 ||
    typeof total !== "number" || !Number.isFinite(total) || total <= 0
  ) return null;
  return Math.min(100, Math.max(0, (count / total) * 100));
}

function filterHref(status: AccountStatus, query: string): string {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (status !== "all") params.set("status", status);
  const suffix = params.toString();
  // Reset pagination when switching status. Preserve the search term.
  return `/admin/users${suffix ? `?${suffix}` : ""}`;
}

function MetricCard({
  label, value, description, icon: Icon, tone, href, selected,
}: {
  label: string;
  value: number | null | undefined;
  description: string;
  icon: LucideIcon;
  tone: CardTone;
  href: string;
  selected: boolean;
}) {
  const style = tones[tone];
  return (
    <Link
      href={href}
      aria-current={selected ? "page" : undefined}
      aria-label={`Filter users: ${label}`}
      className={`group relative flex min-h-[176px] flex-col overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A92F56] sm:p-6 ${selected ? style.selected : `border-slate-200 ${style.hover}`}`}
    >
      <div aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 ${style.bar}`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-[-0.05em] text-slate-950 sm:text-[34px]">{formatNumber(value)}</p>
        </div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${style.icon}`}>
          <Icon size={21} strokeWidth={1.9} />
        </span>
      </div>
      <div className="mt-auto flex items-end justify-between gap-3 pt-5">
        <p className="min-w-0 text-xs leading-5 text-slate-500">{description}</p>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition group-hover:bg-rose-50 group-hover:text-[#A92F56]">
          <ArrowUpRight size={15} />
        </span>
      </div>
    </Link>
  );
}

function ShareBar({
  label, value, total, bar, href,
}: {
  label: string;
  value: number | null | undefined;
  total: number | null | undefined;
  bar: string;
  href: string;
}) {
  const share = safeShare(value, total);
  return (
    <Link href={href} className="group block rounded-lg p-2 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A92F56]">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-slate-700 transition group-hover:text-[#A92F56]">{label}</span>
        <span className="flex items-center gap-2 text-xs font-bold text-slate-900">
          {formatNumber(value)}
          <span className="min-w-[43px] text-right text-[11px] font-medium text-slate-400">{share === null ? "—" : `${share.toFixed(1)}%`}</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${share ?? 0}%` }} />
      </div>
    </Link>
  );
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const params = await searchParams;
  const query = firstValue(params.q);
  const rawStatus = firstValue(params.status) || "all";
  const selectedStatus: AccountStatus = (
    ["active", "suspended", "banned"].includes(rawStatus)
      ? rawStatus
      : "all"
  ) as AccountStatus;
  const parsedPage = Number.parseInt(firstValue(params.page) || "1", 10);

  const data = await getUsersPageData({
    page: Number.isFinite(parsedPage) ? parsedPage : 1,
    search: query,
    status: rawStatus,
  });

  const stats: Array<{
    label: string;
    value: number | null | undefined;
    description: string;
    icon: LucideIcon;
    tone: CardTone;
    status: AccountStatus;
  }> = [
    { label: "Total users", value: data.stats.total, description: "All registered accounts", icon: UsersRound, tone: "rose", status: "all" },
    { label: "Active", value: data.stats.active, description: "Accounts in good standing", icon: UserRoundCheck, tone: "emerald", status: "active" },
    { label: "Suspended", value: data.stats.suspended, description: "Temporarily restricted accounts", icon: UserRoundX, tone: "amber", status: "suspended" },
    { label: "Banned", value: data.stats.banned, description: "Accounts with active bans", icon: Ban, tone: "red", status: "banned" },
  ];

  return (
    <main className="space-y-6 pb-8 text-slate-900">
      <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-[#A92F56]/[0.06] blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 right-1/3 h-52 w-52 rounded-full bg-sky-100/60 blur-3xl" />
        <div className="relative flex flex-col gap-5 px-5 py-6 sm:px-7 sm:py-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#A92F56]/10 text-[#A92F56]">
              <UsersRound size={23} strokeWidth={1.9} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A92F56]">PIN &amp; TELL / COMMUNITY MANAGEMENT</p>
              <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-950 sm:text-[29px]">Users</h1>
              <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
                Manage community accounts, view account status, and review restrictions from one workspace.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Link href="/admin/activity-logs" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A92F56]">
              <Activity size={15} /> Activity logs
            </Link>
            <Link href="/admin/bans" className="inline-flex items-center gap-2 rounded-lg bg-[#A92F56] px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-[#8e2549] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A92F56]">
              <ShieldCheck size={15} /> Manage restrictions <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {data.hasErrors && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
          <CircleAlert size={18} className="mt-0.5 shrink-0" />
          <p>Some user information could not be loaded. Unavailable values are shown as an em dash. Check the server console for details.</p>
        </div>
      )}

      <section aria-labelledby="account-summary-heading">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#A92F56]">Community snapshot</p>
            <h2 id="account-summary-heading" className="mt-1 text-base font-bold text-slate-900">Account overview</h2>
          </div>
          <p className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
            <CheckCircle2 size={12} /> Select a card to filter the directory
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <MetricCard
              key={stat.status}
              label={stat.label}
              value={stat.value}
              description={stat.description}
              icon={stat.icon}
              tone={stat.tone}
              href={filterHref(stat.status, query)}
              selected={selectedStatus === stat.status}
            />
          ))}
        </div>
      </section>

      <section aria-label="Account status and administration" className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><ShieldCheck size={19} /></span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 sm:text-base">Account status breakdown</h2>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">Each status as a share of registered accounts</p>
            </div>
          </div>
          <div className="space-y-2 px-4 py-4 sm:px-5 sm:py-5">
            <ShareBar label="Active accounts" value={data.stats.active} total={data.stats.total} bar="bg-emerald-500" href={filterHref("active", query)} />
            <ShareBar label="Suspended accounts" value={data.stats.suspended} total={data.stats.total} bar="bg-amber-500" href={filterHref("suspended", query)} />
            <ShareBar label="Banned accounts" value={data.stats.banned} total={data.stats.total} bar="bg-rose-500" href={filterHref("banned", query)} />
          </div>
        </article>

        <Link href="/admin/bans" className="group relative flex min-h-[245px] flex-col justify-between overflow-hidden rounded-2xl border border-[#A92F56]/20 bg-gradient-to-br from-[#A92F56] to-[#782342] p-5 text-white shadow-sm transition hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:p-6">
          <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-16 h-56 w-56 rounded-full border-[26px] border-white/[0.06]" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-50"><LockKeyhole size={12} /> Account safety</span>
            <h2 className="mt-4 text-lg font-bold tracking-tight sm:text-xl">Manage account restrictions</h2>
            <p className="mt-2 max-w-sm text-xs leading-6 text-rose-100 sm:text-sm">Review banned accounts and enforcement measures in the dedicated restrictions workspace.</p>
          </div>
          <span className="relative mt-5 inline-flex w-fit items-center gap-2 rounded-lg bg-white px-3.5 py-2.5 text-xs font-bold text-[#A92F56] transition group-hover:bg-rose-50">
            Open restrictions <ArrowRight size={15} />
          </span>
        </Link>
      </section>

      <section aria-labelledby="directory-heading" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Users size={19} /></span>
            <div>
              <h2 id="directory-heading" className="text-sm font-bold text-slate-900 sm:text-base">User directory</h2>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">Search profiles, filter account statuses, and manage users</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
            {formatNumber(data.users.length)} loaded on this page <ChevronRight size={13} className="text-slate-400" />
          </span>
        </div>
        <div className="min-w-0">
          <UsersTable
            users={data.users}
            pagination={data.pagination}
            initialQuery={query}
            initialStatus={selectedStatus}
          />
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} /> PIN &amp; TELL Admin · Community management</span>
        <span>Live data from existing user-management sources</span>
      </footer>
    </main>
  );
}
