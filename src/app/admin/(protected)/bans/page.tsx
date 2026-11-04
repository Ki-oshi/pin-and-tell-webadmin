import Link from "next/link";
import type { Metadata } from "next";
import {
  Activity, AlertCircle, ArrowUpRight, Ban, Clock3,
  ShieldAlert, ShieldCheck, ShieldX, type LucideIcon,
} from "lucide-react";

import BansTable from "@/components/admin/bans/bans-table";
import { getBansPageData } from "@/lib/admin/bans";

export const metadata: Metadata = { title: "Ban Management" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
    type?: string | string[];
    page?: string | string[];
  }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function number(value: number | null | undefined) {
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
    <article className="relative flex min-h-[166px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/[0.025] transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-[3px] ${metric.edge}`} />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500">{metric.label}</p>
          <p className="mt-2 text-[31px] font-bold leading-none tracking-[-0.05em] text-slate-950 tabular-nums">
            {number(metric.value)}
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

export default async function BansPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = first(params.q);
  const status = first(params.status) || "all";
  const type = first(params.type) || "all";
  const parsedPage = Number.parseInt(first(params.page) || "1", 10);

  // Preserve the original source, server-side filtering, statistics and pagination.
  const data = await getBansPageData({
    page: Number.isFinite(parsedPage) ? parsedPage : 1,
    search: query,
    status,
    type,
  });

  const closed = data.stats.expired === null || data.stats.revoked === null
    ? null
    : data.stats.expired + data.stats.revoked;

  const stats: Metric[] = [
    {
      label: "Active Bans",
      value: data.stats.active,
      description: `${number(data.stats.total)} enforcement records in total`,
      icon: ShieldAlert,
      tone: "bg-rose-50 text-[#A92F56]",
      edge: "bg-[#A92F56]",
    },
    {
      label: "Temporary",
      value: data.stats.temporary,
      description: "Currently active temporary restrictions",
      icon: Clock3,
      tone: "bg-amber-50 text-amber-700",
      edge: "bg-amber-400",
    },
    {
      label: "Permanent",
      value: data.stats.permanent,
      description: "Currently active permanent restrictions",
      icon: Ban,
      tone: "bg-violet-50 text-violet-700",
      edge: "bg-violet-400",
    },
    {
      label: "Closed Records",
      value: closed,
      description: `${number(data.stats.expired)} expired · ${number(data.stats.revoked)} revoked`,
      icon: ShieldX,
      tone: "bg-slate-100 text-slate-600",
      edge: "bg-slate-300",
    },
  ];

  return (
    <main className="space-y-6 pb-8 text-slate-900">
      <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#A92F56]/[0.075] blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-amber-100/45 blur-3xl" />
        <div className="relative flex flex-col gap-5 px-5 py-6 sm:px-7 sm:py-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#A92F56]/10 text-[#A92F56]">
              <ShieldCheck size={24} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A92F56]">PIN &amp; TELL / Trust &amp; Safety</p>
              <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em] text-slate-950 sm:text-[28px]">Ban Management</h1>
              <p className="mt-2 max-w-2xl text-xs leading-6 text-slate-500 sm:text-sm">
                Create and manage account restrictions, audit enforcement decisions, and keep the community protected.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/reports" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition hover:border-[#A92F56]/40 hover:text-[#A92F56]">
              <Activity size={15} /> Reports <ArrowUpRight size={14} />
            </Link>
            <Link href="/admin/users" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#A92F56] px-4 text-xs font-semibold text-white transition hover:bg-[#872442]">
              <ShieldCheck size={15} /> Manage Users <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {data.hasErrors && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          Some ban information could not be loaded. Counts or records may be incomplete; check the server logs.
        </div>
      )}

      <section aria-label="Ban statistics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((metric) => <MetricCard key={metric.label} metric={metric} />)}
      </section>

      <section id="ban-records" aria-label="Ban records" className="scroll-mt-6">
        <BansTable
          bans={data.bans}
          pagination={data.pagination}
          initialQuery={query}
          initialStatus={["active", "expired", "revoked"].includes(status) ? status : "all"}
          initialType={["temporary_ban", "permanent_ban", "temporary_ip_ban"].includes(type) ? type : "all"}
        />
      </section>
    </main>
  );
}
