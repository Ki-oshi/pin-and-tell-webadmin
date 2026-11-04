import Link from "next/link";
import type { Metadata } from "next";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Route,
  TimerReset,
  type LucideIcon,
} from "lucide-react";

import TripsTable from "@/components/admin/trips/trips-table";
import { getTripsPageData } from "@/lib/admin/trips";

export const metadata: Metadata = { title: "Trips" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
    period?: string | string[];
    sort?: string | string[];
    page?: string | string[];
  }>;
};

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined || !Number.isFinite(value)
    ? "—"
    : new Intl.NumberFormat("en-PH").format(value);
}

type Metric = {
  label: string;
  value: number | null;
  description: string;
  icon: LucideIcon;
  tone: string;
  edge: string;
};

function MetricCard({ metric }: { metric: Metric }) {
  const Icon = metric.icon;
  return (
    <article className="relative flex min-h-[165px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/[0.025] transition hover:-translate-y-0.5 hover:shadow-md">
      <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-[3px] ${metric.edge}`} />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500">{metric.label}</p>
          <p className="mt-2 text-[31px] font-bold leading-none tracking-[-0.05em] text-slate-950 tabular-nums">
            {formatNumber(metric.value)}
          </p>
        </div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${metric.tone}`}>
          <Icon size={21} strokeWidth={1.9} />
        </span>
      </div>
      <p className="mt-auto pt-5 text-[11px] leading-5 text-slate-500">{metric.description}</p>
    </article>
  );
}

export default async function TripsPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = firstValue(params.q);
  const requestedStatus = firstValue(params.status);
  const requestedPeriod = firstValue(params.period);
  const requestedSort = firstValue(params.sort);

  const status = ["all", "completed", "open"].includes(requestedStatus)
    ? requestedStatus
    : "all";
  const period = ["all", "7d", "30d", "90d"].includes(requestedPeriod)
    ? requestedPeriod
    : "all";
  const sort = ["newest", "oldest", "distance", "eco"].includes(requestedSort)
    ? requestedSort
    : "newest";
  const parsedPage = Number.parseInt(firstValue(params.page) || "1", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  // Preserve the original source, server-side search, filters, sorting and pagination.
  const data = await getTripsPageData({ page, search: query, status, period, sort });

  const stats: Metric[] = [
    {
      label: "Total Trips",
      value: data.stats.total,
      description: "All recorded journeys across the platform",
      icon: Route,
      tone: "bg-rose-50 text-[#A92F56]",
      edge: "bg-[#A92F56]",
    },
    {
      label: "Completed",
      value: data.stats.completed,
      description: "Journeys with a recorded end time",
      icon: CheckCircle2,
      tone: "bg-emerald-50 text-emerald-700",
      edge: "bg-emerald-400",
    },
    {
      label: "Open Trips",
      value: data.stats.open,
      description: "Journeys not marked as ended",
      icon: TimerReset,
      tone: "bg-sky-50 text-sky-700",
      edge: "bg-sky-400",
    },
    {
      label: "Last 7 Days",
      value: data.stats.thisWeek,
      description: "Journeys started in the last week",
      icon: Clock3,
      tone: "bg-amber-50 text-amber-700",
      edge: "bg-amber-400",
    },
  ];

  return (
    <main className="space-y-6 pb-8 text-slate-900">
      <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#A92F56]/[0.075] blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-sky-100/45 blur-3xl" />
        <div className="relative flex flex-col gap-5 px-5 py-6 sm:px-7 sm:py-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#A92F56]/10 text-[#A92F56]">
              <Route size={24} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A92F56]">
                PIN &amp; TELL / Mobility insights
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em] text-slate-950 sm:text-[28px]">Trips</h1>
              <p className="mt-2 max-w-2xl text-xs leading-6 text-slate-500 sm:text-sm">
                Explore recorded journeys, rider activity, travel performance, and eco-driving insights in one place.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/vehicles" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition hover:border-[#A92F56]/40 hover:text-[#A92F56]">
              Vehicles <ArrowUpRight size={14} />
            </Link>
            <Link href="/admin/fuel-logs" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#A92F56] px-4 text-xs font-semibold text-white transition hover:bg-[#872442]">
              Fuel Logs <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {data.hasErrors && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          Some trip, rider, or vehicle information could not be loaded. Counts or records may be incomplete; check the server logs.
        </div>
      )}

      <section aria-label="Trip statistics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((metric) => <MetricCard key={metric.label} metric={metric} />)}
      </section>

      <section id="trip-records" aria-label="Trip records" className="scroll-mt-6">
        <TripsTable
          trips={data.trips}
          pagination={data.pagination}
          initialQuery={query}
          initialStatus={status}
          initialPeriod={period}
          initialSort={sort}
        />
      </section>
    </main>
  );
}
