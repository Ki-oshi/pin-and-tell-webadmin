import type { Metadata } from "next";
import { Activity, Bot, ShieldCheck, ShieldEllipsis, Users } from "lucide-react";
import ActivityLogsTable from "@/components/admin/activity-logs/activity-logs-table";
import { getActivityLogsPageData } from "@/lib/admin/activity-logs";

export const metadata: Metadata = { title: "Activity Logs" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  searchParams: Promise<{
    q?: string | string[];
    actor?: string | string[];
    period?: string | string[];
    sort?: string | string[];
    page?: string | string[];
  }>;
};

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatNumber(value: number | null): string {
  return value === null ? "—" : new Intl.NumberFormat("en-US").format(value);
}

export default async function ActivityLogsPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = firstValue(params.q);
  const requestedActor = firstValue(params.actor);
  const requestedPeriod = firstValue(params.period);
  const requestedSort = firstValue(params.sort);
  const actor = ["all", "admin", "user", "system"].includes(requestedActor) ? requestedActor : "all";
  const period = ["all", "24h", "7d", "30d", "90d"].includes(requestedPeriod) ? requestedPeriod : "all";
  const sort = ["newest", "oldest"].includes(requestedSort) ? requestedSort : "newest";
  const rawPage = firstValue(params.page);
  const parsedPage = /^\d+$/.test(rawPage) ? Number(rawPage) : 1;
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const data = await getActivityLogsPageData({ page, search: query, actor, period, sort });

  const stats = [
    {
      label: "Activity Logs",
      value: data.stats.total,
      description: `${formatNumber(data.stats.last24Hours)} recorded in the last 24 hours`,
      icon: Activity,
      iconStyle: "bg-rose-50 text-[#A92F56]",
    },
    {
      label: "Admin Activity",
      value: data.stats.admins,
      description: "Administrative audit events",
      icon: ShieldCheck,
      iconStyle: "bg-amber-50 text-amber-600",
    },
    {
      label: "User Activity",
      value: data.stats.users,
      description: "Events attributed to users",
      icon: Users,
      iconStyle: "bg-blue-50 text-blue-600",
    },
    {
      label: "System Events",
      value: data.stats.systems,
      description: "Automated system activity",
      icon: Bot,
      iconStyle: "bg-violet-50 text-violet-600",
    },
  ];

  return (
    <div className="space-y-6 pb-6">
      <header className="relative overflow-hidden rounded-3xl border border-rose-100 bg-white px-5 py-6 shadow-sm sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-16 -top-24 h-60 w-60 rounded-full bg-rose-100/50 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#A92F56]/10 text-[#A92F56]">
              <Activity size={23} strokeWidth={1.9} />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A92F56]">Security / Audit trail</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-[28px]">Activity Logs</h1>
              <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">
                Trace administrative actions, user events, and automated system activity across PIN &amp; TELL.
              </p>
            </div>
          </div>
          <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-rose-100 bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-[#A92F56]">
            <ShieldEllipsis size={14} /> Read-only audit records
          </span>
        </div>
      </header>

      {data.hasErrors && (
        <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
          Some activity log or actor information could not be loaded. Available records are still displayed below.
        </div>
      )}

      <section aria-label="Activity log statistics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article key={stat.label} className="group rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500">{stat.label}</p>
                  <p className="mt-2 text-[28px] font-bold leading-none tracking-[-0.04em] text-slate-950">{formatNumber(stat.value)}</p>
                  <p className="mt-2 text-[11px] leading-5 text-slate-400">{stat.description}</p>
                </div>
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${stat.iconStyle}`}>
                  <Icon size={19} strokeWidth={1.8} />
                </span>
              </div>
              <div className="mt-4 h-1 w-12 rounded-full bg-[#A92F56]/20 transition-all group-hover:w-20 group-hover:bg-[#A92F56]/70" />
            </article>
          );
        })}
      </section>

      <section aria-label="Audit policy" className="flex items-start gap-3 rounded-[22px] border border-slate-200/80 bg-white px-4 py-4 shadow-sm sm:px-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <ShieldCheck size={18} />
        </span>
        <div>
          <h2 className="text-xs font-bold text-slate-800">Audit trail integrity</h2>
          <p className="mt-1 max-w-3xl text-[11px] leading-5 text-slate-500">
            These are historical audit entries for visibility and investigation. This page does not offer edit or delete controls for logged events.
          </p>
        </div>
      </section>

      <ActivityLogsTable
        key={`${query}-${actor}-${period}-${sort}-${page}`}
        logs={data.logs}
        pagination={data.pagination}
        initialQuery={query}
        initialActor={actor}
        initialPeriod={period}
        initialSort={sort}
      />
    </div>
  );
}
