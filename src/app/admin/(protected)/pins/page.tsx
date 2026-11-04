import Link from "next/link";
import type { Metadata } from "next";
import {
  AlertCircle, AlertTriangle, ArrowRight, Camera, ChevronRight,
  MapPin, MapPinned, ShieldCheck, Sparkles, TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { getPinsPageData } from "@/lib/admin/pins";
import PinsTable from "@/components/admin/pins/pins-table";

/** UI-only refresh: the existing pins data service remains the source of truth. */
export const metadata: Metadata = { title: "Pins" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PinsPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    category?: string | string[];
    sort?: string | string[];
    page?: string | string[];
  }>;
};

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
function formatNumber(value: number | null): string {
  return value == null || !Number.isFinite(value) ? "—" : new Intl.NumberFormat("en-PH").format(value);
}

type Stat = {
  title: string;
  value: number | null;
  note: string;
  icon: LucideIcon;
  tone: string;
  iconTone: string;
  href?: string;
};

function StatCard({ item }: { item: Stat }) {
  const Icon = item.icon;
  const contents = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.iconTone}`}>
          <Icon size={20} strokeWidth={1.9} />
        </div>
        {item.href && <ArrowRight size={16} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#A92F56]" />}
      </div>
      <p className="mt-5 text-[12px] font-semibold text-slate-500">{item.title}</p>
      <p className="mt-1 text-[30px] font-bold leading-tight tracking-[-0.045em] text-slate-950 tabular-nums">{formatNumber(item.value)}</p>
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <p className="text-[11px] text-slate-500">{item.note}</p>
        {item.href && <ChevronRight size={14} className="shrink-0 text-slate-300 group-hover:text-[#A92F56]" />}
      </div>
    </>
  );
  return item.href ? (
    <Link href={item.href} className={`group block rounded-2xl border bg-white p-5 shadow-sm shadow-slate-950/[0.025] transition hover:-translate-y-0.5 hover:shadow-md ${item.tone}`}>
      {contents}
    </Link>
  ) : (
    <article className={`rounded-2xl border bg-white p-5 shadow-sm shadow-slate-950/[0.025] ${item.tone}`}>{contents}</article>
  );
}

export default async function PinsPage({ searchParams }: PinsPageProps) {
  const params = await searchParams;
  const query = firstValue(params.q);
  const category = firstValue(params.category) || "all";
  const sort = firstValue(params.sort) || "newest";
  const requestedPage = Number.parseInt(firstValue(params.page) || "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const data = await getPinsPageData({ page, search: query, category, sort });
  const stats: Stat[] = [
    { title: "Published Pins", value: data.stats.total, note: "Public map locations", icon: MapPin, tone: "border-slate-200 hover:border-[#A92F56]/30", iconTone: "bg-[#A92F56]/10 text-[#A92F56]" },
    { title: "New This Week", value: data.stats.recent, note: "Created in the last 7 days", icon: TrendingUp, tone: "border-slate-200", iconTone: "bg-sky-50 text-sky-700" },
    { title: "Pins With Photos", value: data.stats.withPhotos, note: "Published media content", icon: Camera, tone: "border-slate-200", iconTone: "bg-emerald-50 text-emerald-700" },
    { title: "Open Pin Reports", value: data.stats.openReports, note: "Pending or being reviewed", icon: AlertTriangle, tone: "border-slate-200 hover:border-amber-200", iconTone: "bg-amber-50 text-amber-700", href: "/admin/reports" },
  ];

  return (
    <div className="space-y-6 pb-8 text-slate-900">
      <header className="relative overflow-hidden rounded-[22px] border border-[#A92F56]/10 bg-white p-5 shadow-sm shadow-slate-950/[0.025] sm:p-7">
        <div className="pointer-events-none absolute -right-14 -top-24 h-64 w-64 rounded-full bg-[#A92F56]/[0.045] blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#A92F56] text-white shadow-lg shadow-[#A92F56]/20">
              <MapPinned size={24} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A92F56]">PIN &amp; TELL / CONTENT MANAGEMENT</p>
              <h1 className="mt-1 text-[27px] font-bold tracking-tight text-slate-950 sm:text-[32px]">Pins</h1>
              <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">Explore published locations, inspect pin content, and manage reports from one place.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/pin-image-reviews" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#A92F56]/20 bg-[#A92F56]/[0.055] px-4 text-xs font-bold text-[#A92F56] transition hover:bg-[#A92F56]/10">
              <Sparkles size={15} /> Photo Moderation <ArrowRight size={14} />
            </Link>
            <Link href="/admin/reports" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
              <ShieldCheck size={15} /> Reports <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {data.hasErrors && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertCircle size={18} className="mt-0.5 shrink-0" /> Some pin data could not be loaded. Unavailable values may appear as “—”. Check the server logs.
        </div>
      )}

      <section aria-label="Pin statistics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => <StatCard key={stat.title} item={stat} />)}
      </section>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Link href="/admin/pin-image-reviews" className="group flex items-start justify-between gap-4 rounded-2xl border border-[#A92F56]/15 bg-gradient-to-r from-[#FFF5F8] to-white p-5 transition hover:border-[#A92F56]/30 hover:shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A92F56]/10 text-[#A92F56]"><Sparkles size={19} /></div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Photo moderation workspace</h2>
              <p className="mt-1 text-xs leading-5 text-slate-600">Inspect AI decisions and photos awaiting admin review.</p>
            </div>
          </div>
          <ArrowRight size={17} className="mt-2 shrink-0 text-[#A92F56] transition group-hover:translate-x-1" />
        </Link>
        <Link href="/admin/reports" className="group flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><AlertTriangle size={19} /></div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Content reports</h2>
              <p className="mt-1 text-xs leading-5 text-slate-600">Review flagged public pins and their associated cases.</p>
            </div>
          </div>
          <ArrowRight size={17} className="mt-2 shrink-0 text-slate-400 transition group-hover:translate-x-1" />
        </Link>
      </div>

      <PinsTable
        pins={data.pins}
        categories={data.categories}
        pagination={data.pagination}
        initialQuery={query}
        initialCategory={category}
        initialSort={["newest", "oldest", "title"].includes(sort) ? sort : "newest"}
      />
    </div>
  );
}
