import Link from "next/link";
import type { Metadata } from "next";
import {
  AlertCircle, ArrowRight, CheckCircle2, ChevronRight, CircleDot,
  Flag, ShieldAlert, ShieldCheck, Sparkles, TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { getReportsPageData } from "@/lib/admin/reports";
import { getContentViolationsData } from "@/lib/admin/content-violations";
import ReportsTable from "@/components/admin/reports/reports-table";
import ContentViolationsTable from "@/components/admin/reports/content-violations-table";

export const metadata: Metadata = { title: "Reports" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type ReportsPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
    type?: string | string[];
    pin?: string | string[];
    page?: string | string[];
  }>;
};

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
function formatNumber(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? "—" : new Intl.NumberFormat("en-PH").format(value);
}
function statusHref(status: string, query: string, type: string, pin: string): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (type !== "all") params.set("type", type);
  if (pin) params.set("pin", pin);
  if (status !== "all") params.set("status", status);
  const qs = params.toString();
  return `/admin/reports${qs ? `?${qs}` : ""}`;
}

type StatCard = {
  label: string;
  value: number | null;
  note: string;
  icon: LucideIcon;
  status: string;
  iconStyle: string;
  borderStyle: string;
};
function SummaryCard({ item, href, selected }: { item: StatCard; href: string; selected: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={href}
      aria-label={`View ${item.label.toLowerCase()}`}
      aria-current={selected ? "page" : undefined}
      className={`group relative flex min-h-[170px] flex-col overflow-hidden rounded-2xl border bg-white p-5 shadow-sm shadow-slate-950/[0.025] transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A92F56] ${selected ? "border-[#A92F56]/60 ring-1 ring-[#A92F56]/15" : item.borderStyle}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.iconStyle}`}>
          <Icon size={20} strokeWidth={1.9} />
        </span>
        <ArrowRight size={16} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#A92F56]" />
      </div>
      <p className="mt-5 text-xs font-semibold text-slate-500">{item.label}</p>
      <p className="mt-1 text-[30px] font-bold leading-none tracking-[-0.045em] text-slate-950 tabular-nums">{formatNumber(item.value)}</p>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <p className="text-[11px] leading-4 text-slate-500">{item.note}</p>
        <ChevronRight size={14} className="shrink-0 text-slate-300 group-hover:text-[#A92F56]" />
      </div>
    </Link>
  );
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams;
  const query = firstValue(params.q);
  const status = firstValue(params.status) || "all";
  const type = firstValue(params.type) || "all";
  const pin = firstValue(params.pin);
  const parsedPin = Number.parseInt(pin, 10);
  const parsedPage = Number.parseInt(firstValue(params.page) || "1", 10);

  // Preserve both independent server-side data sources and their existing filters.
  const [data, contentViolations] = await Promise.all([
    getReportsPageData({
      page: Number.isFinite(parsedPage) ? parsedPage : 1,
      search: query,
      status,
      type,
      pinId: Number.isFinite(parsedPin) ? parsedPin : null,
    }),
    getContentViolationsData(),
  ]);

  const cards: StatCard[] = [
    { label: "Pending Reports", value: data.stats.pending, note: "Awaiting an admin decision", icon: ShieldAlert, status: "pending", iconStyle: "bg-amber-50 text-amber-600", borderStyle: "border-slate-200 hover:border-amber-200" },
    { label: "Under Review", value: data.stats.reviewing, note: "Cases being investigated", icon: CircleDot, status: "reviewing", iconStyle: "bg-sky-50 text-sky-600", borderStyle: "border-slate-200 hover:border-sky-200" },
    { label: "Resolved Today", value: data.stats.resolvedToday, note: "Closed today · view resolved", icon: CheckCircle2, status: "resolved", iconStyle: "bg-emerald-50 text-emerald-600", borderStyle: "border-slate-200 hover:border-emerald-200" },
    { label: "Total Reports", value: data.stats.total, note: "All recorded submissions", icon: Flag, status: "all", iconStyle: "bg-[#A92F56]/10 text-[#A92F56]", borderStyle: "border-slate-200 hover:border-[#A92F56]/40" },
  ];
  const selectedStatus = ["pending", "reviewing", "resolved", "dismissed", "suspended", "outdated"].includes(status) ? status : "all";
  const selectedType = ["spam", "harassment", "inappropriate", "copyright", "misinformation", "other"].includes(type) ? type : "all";

  return (
    <main className="space-y-6 pb-8 text-slate-900">
      <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#A92F56]/[0.07] blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 right-1/3 h-48 w-48 rounded-full bg-sky-100/60 blur-3xl" />
        <div className="relative flex flex-col gap-5 px-5 py-6 sm:px-7 sm:py-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#A92F56]/10 text-[#A92F56]"><ShieldCheck size={24} /></span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A92F56]">PIN & TELL / Trust &amp; Safety</p>
              <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em] text-slate-950 sm:text-[28px]">Reports &amp; Violations</h1>
              <p className="mt-2 max-w-2xl text-xs leading-6 text-slate-500 sm:text-sm">Investigate user reports, follow enforcement activity, and keep the community safe from one moderation workspace.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/pin-image-reviews" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition hover:border-[#A92F56]/40 hover:text-[#A92F56]"><Sparkles size={15} />Photo Review</Link>
            <Link href="#content-violations" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#A92F56] px-4 text-xs font-semibold text-white transition hover:bg-[#872442]"><ShieldAlert size={15} />Content Violations<ArrowRight size={14} /></Link>
          </div>
        </div>
      </header>

      {data.hasErrors && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <AlertCircle size={17} className="mt-0.5 shrink-0" />Some reports could not be loaded. Counts and rows may be incomplete; check the server logs.
        </div>
      )}

      <section aria-label="Report statistics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((item) => <SummaryCard key={item.label} item={item} href={statusHref(item.status, query, type, pin)} selected={selectedStatus === item.status} />)}
      </section>

      <section aria-label="Moderation workspaces" className="grid gap-3 lg:grid-cols-2">
        <Link href="#report-queue" className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#A92F56]/30 hover:shadow-md sm:p-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#A92F56]/10 text-[#A92F56]"><Flag size={21} /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-900">Report queue</span><span className="mt-1 block text-xs leading-5 text-slate-500">Review incoming reports, assign cases, resolve or dismiss.</span></span>
          <ChevronRight size={18} className="shrink-0 text-slate-300 group-hover:text-[#A92F56]" />
        </Link>
        <Link href="#content-violations" className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#A92F56]/30 hover:shadow-md sm:p-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><TrendingUp size={21} /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-900">Automated enforcement</span><span className="mt-1 block text-xs leading-5 text-slate-500">Inspect strikes, severity, suspension status and history.</span></span>
          <ChevronRight size={18} className="shrink-0 text-slate-300 group-hover:text-[#A92F56]" />
        </Link>
      </section>

      <section id="report-queue" aria-label="Report queue" className="scroll-mt-6">
        <ReportsTable
          reports={data.reports}
          pagination={data.pagination}
          initialQuery={query}
          initialStatus={selectedStatus}
          initialType={selectedType}
          initialPin={Number.isFinite(parsedPin) ? String(parsedPin) : ""}
        />
      </section>
      <section id="content-violations" aria-label="Content violations" className="scroll-mt-6">
        <ContentViolationsTable
          rows={contentViolations.rows}
          stats={contentViolations.stats}
          activeWindowDays={contentViolations.activeWindowDays}
          hasErrors={contentViolations.hasErrors}
        />
      </section>
    </main>
  );
}
