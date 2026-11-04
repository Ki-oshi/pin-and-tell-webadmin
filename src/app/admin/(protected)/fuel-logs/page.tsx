import type { Metadata } from "next";
import { CalendarDays, Fuel, Gauge, Route, ShieldCheck } from "lucide-react";
import FuelLogsTable from "@/components/admin/fuel-logs/fuel-logs-table";
import { getFuelLogsPageData } from "@/lib/admin/fuel-logs";

export const metadata: Metadata = { title: "Fuel Logs" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  searchParams: Promise<{
    q?: string | string[];
    period?: string | string[];
    data?: string | string[];
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

export default async function FuelLogsPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = firstValue(params.q);
  const requestedPeriod = firstValue(params.period);
  const requestedData = firstValue(params.data);
  const requestedSort = firstValue(params.sort);

  const period = ["all", "7d", "30d", "90d"].includes(requestedPeriod) ? requestedPeriod : "all";
  const dataFilter = ["all", "with_efficiency", "without_efficiency", "with_odometer"].includes(requestedData)
    ? requestedData : "all";
  const sort = ["newest", "oldest", "liters", "cost", "efficiency"].includes(requestedSort)
    ? requestedSort : "newest";
  const rawPage = firstValue(params.page);
  const parsedPage = /^\d+$/.test(rawPage) ? Number(rawPage) : 1;
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const data = await getFuelLogsPageData({ page, search: query, period, data: dataFilter, sort });

  const stats = [
    {
      label: "Fuel Logs",
      value: data.stats.total,
      description: "All recorded fuel entries",
      icon: Fuel,
      iconStyle: "bg-rose-50 text-[#A92F56]",
    },
    {
      label: "Last 30 Days",
      value: data.stats.last30Days,
      description: "Recently recorded refuels",
      icon: CalendarDays,
      iconStyle: "bg-blue-50 text-blue-600",
    },
    {
      label: "Efficiency Data",
      value: data.stats.withEfficiency,
      description: "Entries with efficiency values",
      icon: Gauge,
      iconStyle: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Odometer Data",
      value: data.stats.withOdometer,
      description: "Entries with distance readings",
      icon: Route,
      iconStyle: "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <div className="space-y-6 pb-6">
      <header className="relative overflow-hidden rounded-3xl border border-rose-100 bg-white px-5 py-6 shadow-sm sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-16 -top-24 h-60 w-60 rounded-full bg-rose-100/50 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#A92F56]/10 text-[#A92F56]">
              <Fuel size={23} strokeWidth={1.9} />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A92F56]">Operations / Consumption</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-[28px]">Fuel Logs</h1>
              <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">
                Review refueling activity, fuel efficiency, odometer readings, and the vehicles behind every record.
              </p>
            </div>
          </div>
          <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-rose-100 bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-[#A92F56]">
            <ShieldCheck size={14} /> Fuel activity overview
          </span>
        </div>
      </header>

      {data.hasErrors && (
        <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
          Some fuel log, user, or vehicle information could not be loaded. Check the server console for details.
        </div>
      )}

      <section aria-label="Fuel log statistics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

      <FuelLogsTable
        key={`${query}-${period}-${dataFilter}-${sort}-${page}`}
        logs={data.logs}
        pagination={data.pagination}
        initialQuery={query}
        initialPeriod={period}
        initialData={dataFilter}
        initialSort={sort}
      />
    </div>
  );
}
