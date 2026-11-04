"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import {
  AlertCircle, ArrowRight, CalendarDays, Check, CheckCircle2,
  ChevronLeft, ChevronRight, Copy, ExternalLink, Eye, Flag, Heart,
  ImageIcon, Info, Loader2, MapPin, MapPinned, MessageCircle,
  Navigation, Search, ShieldAlert, ShieldCheck, SlidersHorizontal,
  X, type LucideIcon,
} from "lucide-react";
import { flagPinForReviewAction, type FlagPinInput } from "@/app/admin/(protected)/reports/actions";
import type { AdminPinRow } from "@/lib/admin/pins";

type PinsTableProps = {
  pins: AdminPinRow[];
  categories: string[];
  pagination: { page: number; pageSize: number; total: number; pageCount: number };
  initialQuery: string;
  initialCategory: string;
  initialSort: string;
};
type FlagType = FlagPinInput["type"];
type Feedback = { type: "success" | "error"; text: string };

const FLAG_TYPES: { value: FlagType; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "copyright", label: "Copyright" },
  { value: "misinformation", label: "Misinformation" },
  { value: "other", label: "Other" },
];

function readable(value: string | null | undefined) {
  if (!value) return "General";
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (s) => s.toUpperCase());
}
function formatDate(value: string | null): string {
  if (!value || Number.isNaN(new Date(value).getTime())) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila",
  }).format(new Date(value));
}
function formatDateTime(value: string | null): string {
  if (!value || Number.isNaN(new Date(value).getTime())) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila",
  }).format(new Date(value));
}
function creatorName(pin: AdminPinRow): string {
  return pin.creator?.full_name?.trim() || pin.creator?.username?.trim() || pin.creator_email?.trim() || "Unknown user";
}
function creatorInitials(pin: AdminPinRow): string {
  return creatorName(pin).split(/\s+/).slice(0, 2).map((v) => v[0] ?? "").join("").toUpperCase() || "U";
}
function CategoryBadge({ value }: { value: string | null }) {
  return <span className="inline-flex max-w-full items-center rounded-full border border-[#A92F56]/15 bg-[#A92F56]/[0.065] px-2.5 py-1 text-[11px] font-semibold text-[#A92F56]">{readable(value)}</span>;
}
function PinThumb({ pin, size = "sm" }: { pin: AdminPinRow; size?: "sm" | "lg" }) {
  const big = size === "lg";
  return (
    <div className={`relative shrink-0 overflow-hidden border border-slate-100 bg-slate-100 ${big ? "h-32 w-full rounded-2xl" : "h-12 w-12 rounded-xl"}`}>
      {pin.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={pin.photo_url} alt={`Photo of ${pin.title}`} className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
      ) : <div className="flex h-full w-full items-center justify-center text-slate-400"><MapPin size={big ? 28 : 18} /></div>}
    </div>
  );
}
function Avatar({ pin }: { pin: AdminPinRow }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F9E7EC] text-[11px] font-bold text-[#92274A]">
      {creatorInitials(pin)}
    </div>
  );
}
function DetailTile({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
      <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500"><Icon size={14} />{label}</div>
      <div className="mt-2 min-w-0 break-words text-sm font-semibold text-slate-900">{children}</div>
    </div>
  );
}
function getFocusable(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(
    'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])',
  )).filter((element) => element.getClientRects().length > 0);
}
function getMapEmbedUrl(latitude: number, longitude: number): string {
  const bbox = [
    Math.max(-180, longitude - 0.005), Math.max(-90, latitude - 0.0035),
    Math.min(180, longitude + 0.005), Math.min(90, latitude + 0.0035),
  ];
  const qs = new URLSearchParams({ bbox: bbox.join(","), layer: "mapnik", marker: `${latitude},${longitude}` });
  return `https://www.openstreetmap.org/export/embed.html?${qs}`;
}
function validCoordinates(pin: AdminPinRow): boolean {
  return Number.isFinite(pin.latitude) && Number.isFinite(pin.longitude) &&
    Math.abs(pin.latitude) <= 90 && Math.abs(pin.longitude) <= 180;
}

export default function PinsTable({ pins, categories, pagination, initialQuery, initialCategory, initialSort }: PinsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentParams = searchParams.toString();
  const [query, setQuery] = useState(initialQuery);
  const [selectedPinId, setSelectedPinId] = useState<number | null>(null);
  const [flagPin, setFlagPin] = useState<AdminPinRow | null>(null);
  const [flagType, setFlagType] = useState<FlagType>("inappropriate");
  const [flagReason, setFlagReason] = useState("");
  const [flagDetails, setFlagDetails] = useState("");
  const [flagError, setFlagError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [locallyFlaggedPinIds, setLocallyFlaggedPinIds] = useState<Set<number>>(() => new Set<number>());
  const [copied, setCopied] = useState<"id" | "coordinates" | null>(null);
  const [isFlagging, startFlagTransition] = useTransition();
  const detailDialogRef = useRef<HTMLDivElement | null>(null);
  const flagDialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const selectedPin = useMemo(() => selectedPinId === null ? null : pins.find((pin) => pin.id === selectedPinId) ?? null, [pins, selectedPinId]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setQuery(initialQuery));
    return () => window.cancelAnimationFrame(frame);
  }, [initialQuery]);

  // Server-side search: debounce typing, preserve filters, reset page only when query changes.
  useEffect(() => {
    if (query.trim() === (searchParams.get("q") ?? "").trim()) return;
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(currentParams);
      if (query.trim()) params.set("q", query.trim()); else params.delete("q");
      params.delete("page");
      const next = params.toString();
      router.replace(next ? `/admin/pins?${next}` : "/admin/pins");
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [query, currentParams, router, searchParams]);

  useEffect(() => {
    if (selectedPinId !== null && !pins.some((pin) => pin.id === selectedPinId) && !flagPin) setSelectedPinId(null);
  }, [pins, selectedPinId, flagPin]);

  // Lock background scrolling and restore focus to the action that opened the dialog.
  useEffect(() => {
    if (!selectedPinId && !flagPin) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = oldOverflow;
      previousFocusRef.current?.focus();
    };
  }, [selectedPinId, flagPin]);

  // Only the topmost dialog receives keyboard focus and Escape / Tab handling.
  useEffect(() => {
    const active = flagPin ? flagDialogRef.current : selectedPin ? detailDialogRef.current : null;
    if (!active) return;
    if (!active.contains(document.activeElement)) active.querySelector<HTMLElement>("[data-initial-focus]")?.focus();
    function onKeyDown(event: KeyboardEvent) {
      const dialog = flagPin ? flagDialogRef.current : detailDialogRef.current;
      if (!dialog) return;
      if (event.key === "Escape") {
        event.preventDefault();
        if (isFlagging) return;
        if (flagPin) { setFlagPin(null); setFlagError(null); }
        else setSelectedPinId(null);
        return;
      }
      if (event.key !== "Tab") return;
      const elements = getFocusable(dialog);
      if (!elements.length) { event.preventDefault(); return; }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selectedPin, flagPin, isFlagging]);

  const showingText = pagination.total === 0 ? "0 pins" :
    `${(pagination.page - 1) * pagination.pageSize + 1}–${Math.min(pagination.page * pagination.pageSize, pagination.total)} of ${pagination.total} pins`;
  const getOpenReports = (pin: AdminPinRow) => Math.max(pin.open_reports_count, locallyFlaggedPinIds.has(pin.id) ? 1 : 0);

  function setUrlParam(key: string, value: string, fallback: string) {
    const params = new URLSearchParams(currentParams);
    if (value === fallback) params.delete(key); else params.set(key, value);
    params.delete("page");
    const next = params.toString();
    router.replace(next ? `/admin/pins?${next}` : "/admin/pins");
  }
  function pageUrl(page: number) {
    const params = new URLSearchParams(currentParams);
    params.set("page", String(page));
    return `/admin/pins?${params.toString()}`;
  }
  function viewPin(pin: AdminPinRow) {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    setSelectedPinId(pin.id);
    setFeedback(null);
    setCopied(null);
  }
  function openFlag(pin: AdminPinRow) {
    if (getOpenReports(pin) > 0) {
      setFeedback({ type: "error", text: `Pin #${pin.id} already has an open moderation report. Open its existing report instead.` });
      return;
    }
    if (!selectedPinId) previousFocusRef.current = document.activeElement as HTMLElement | null;
    setFeedback(null); setFlagError(null); setFlagType("inappropriate"); setFlagReason(""); setFlagDetails("");
    setFlagPin(pin);
  }
  function closeFlag() { if (!isFlagging) { setFlagPin(null); setFlagError(null); } }
  async function copyValue(kind: "id" | "coordinates", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  }
  function submitFlag() {
    if (!flagPin || isFlagging) return;
    const reason = flagReason.trim();
    if (reason.length < 3) { setFlagError("Please enter a specific reason (at least 3 characters)."); return; }
    const target = flagPin;
    setFlagError(null);
    startFlagTransition(async () => {
      try {
        const result = await flagPinForReviewAction({
          pinId: target.id, type: flagType, reason, details: flagDetails.trim(),
        });
        if (!result.success) { setFlagError(result.message); return; }
        setLocallyFlaggedPinIds((previous) => new Set(previous).add(target.id));
        setFeedback({ type: "success", text: result.message });
        setFlagPin(null); setFlagReason(""); setFlagDetails("");
        router.refresh();
      } catch {
        setFlagError("Could not submit the report. Check your connection and retry.");
      }
    });
  }

  return (
    <>
      <section aria-label="Pin directory" className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm shadow-slate-950/[0.025]">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#A92F56]">CONTENT DIRECTORY</p>
            <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-950">All published pins</h2>
            <p className="mt-1 text-xs text-slate-500">Search locations, inspect details, and flag content that needs review.</p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-600"><MapPin size={13}/>{showingText}</span>
        </div>

        {feedback && (
          <div role={feedback.type === "error" ? "alert" : "status"} className={`mx-5 mt-4 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-xs ${feedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
            <div className="flex items-start gap-2">{feedback.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}<p>{feedback.text}</p></div>
            <button type="button" onClick={() => setFeedback(null)} aria-label="Dismiss notification" className="rounded p-1 hover:bg-black/5"><X size={14}/></button>
          </div>
        )}

        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 lg:flex-row lg:items-end lg:justify-between">
          <label className="block w-full lg:max-w-[430px]">
            <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">Search pins</span>
            <span className="relative block">
              <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Title, description, creator, or subcategory…" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#A92F56]/50 focus:bg-white focus:ring-4 focus:ring-[#A92F56]/[0.07]" />
              {query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X size={15}/></button>}
            </span>
          </label>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-end">
            <label className="block min-w-0 sm:min-w-[170px]">
              <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600"><SlidersHorizontal size={13}/>Category</span>
              <select value={initialCategory} onChange={(event) => setUrlParam("category", event.target.value, "all")} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-[#A92F56]">
                <option value="all">All categories</option>
                {categories.map((category) => <option key={category} value={category}>{readable(category)}</option>)}
              </select>
            </label>
            <label className="block min-w-0 sm:min-w-[160px]">
              <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">Sort by</span>
              <select value={initialSort} onChange={(event) => setUrlParam("sort", event.target.value, "newest")} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-[#A92F56]">
                <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option>
              </select>
            </label>
          </div>
        </div>

        {pins.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center px-5 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><MapPinned size={24}/></div>
            <h3 className="mt-4 text-sm font-bold text-slate-900">No pins match these filters</h3>
            <p className="mt-1 text-xs text-slate-500">Try another search or category.</p>
            <Link href="/admin/pins" className="mt-4 text-xs font-bold text-[#A92F56] hover:underline">Clear all filters</Link>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1050px] border-collapse text-left">
                <thead className="bg-slate-50/80">
                  <tr className="border-b border-slate-100">
                    {(["Pin", "Category", "Creator", "Engagement", "Reports", "Created", "Actions"] as const).map((item) => <th key={item} className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 first:pl-6 last:pr-6">{item}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {pins.map((pin) => {
                    const openReports = getOpenReports(pin);
                    return (
                      <tr key={pin.id} className="border-b border-slate-100 transition last:border-0 hover:bg-[#FCF8FA]">
                        <td className="px-6 py-4">
                          <div className="flex min-w-[215px] items-center gap-3">
                            <PinThumb pin={pin} />
                            <div className="min-w-0">
                              <p className="max-w-[205px] truncate text-xs font-bold text-slate-900" title={pin.title}>{pin.title || "Untitled pin"}</p>
                              <p className="mt-1 text-[11px] text-slate-400">Pin #{pin.id}{pin.subcategory ? ` · ${readable(pin.subcategory)}` : ""}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4"><CategoryBadge value={pin.category}/></td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2.5"><Avatar pin={pin}/><div className="min-w-0"><p className="max-w-[130px] truncate text-xs font-semibold text-slate-800">{creatorName(pin)}</p>{pin.creator?.username && <p className="mt-0.5 max-w-[135px] truncate text-[10px] text-slate-400">@{pin.creator.username.replace(/^@/, "")}</p>}</div></div>
                        </td>
                        <td className="px-4 py-4"><div className="flex items-center gap-3 text-[11px] font-medium text-slate-600"><span title="Likes" className="flex gap-1"><Heart size={13}/>{pin.likes_count}</span><span title="Comments" className="flex gap-1"><MessageCircle size={13}/>{pin.comments_count}</span><span title="Vouches" className="flex gap-1"><ShieldCheck size={13}/>{pin.vouches_count}</span></div></td>
                        <td className="px-4 py-4">
                          {openReports ? <Link href={`/admin/reports?pin=${pin.id}`} className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100"><ShieldAlert size={12}/>{openReports} open</Link> : <span className="text-xs text-slate-400">None</span>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">{formatDate(pin.created_at)}</td>
                        <td className="px-4 py-4 pr-6">
                          <div className="flex items-center justify-end gap-2">
                            {openReports ? <Link href={`/admin/reports?pin=${pin.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 text-[11px] font-bold text-amber-800 hover:bg-amber-100"><ShieldAlert size={13}/>Review</Link> : <button type="button" onClick={() => openFlag(pin)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#A92F56]/15 bg-[#A92F56]/[0.055] px-3 text-[11px] font-bold text-[#A92F56] hover:bg-[#A92F56]/10"><Flag size={13}/>Flag</button>}
                            <button type="button" onClick={() => viewPin(pin)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[11px] font-bold text-slate-700 hover:border-[#A92F56]/25 hover:text-[#A92F56]"><Eye size={13}/>View</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-slate-100 md:hidden">
              {pins.map((pin) => {
                const openReports = getOpenReports(pin);
                return (
                  <article key={pin.id} className="p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <PinThumb pin={pin}/>
                      <div className="min-w-0 flex-1"><h3 className="line-clamp-2 text-sm font-bold text-slate-900">{pin.title || "Untitled pin"}</h3><p className="mt-1 text-[11px] text-slate-500">#{pin.id} · {formatDate(pin.created_at)}</p></div>
                      <CategoryBadge value={pin.category}/>
                    </div>
                    <p className="mt-3 truncate text-xs text-slate-500">By {creatorName(pin)}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500"><span className="inline-flex items-center gap-1"><Heart size={13}/>{pin.likes_count}</span><span className="inline-flex items-center gap-1"><MessageCircle size={13}/>{pin.comments_count}</span><span className="inline-flex items-center gap-1"><ShieldAlert size={13}/>{openReports} reports</span></div>
                    <div className="mt-4 flex items-center gap-2">
                      <button type="button" onClick={() => viewPin(pin)} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#A92F56] px-3 text-xs font-bold text-white"><Eye size={14}/>View details</button>
                      {openReports ? <Link href={`/admin/reports?pin=${pin.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-bold text-amber-800"><ShieldAlert size={13}/>Review</Link> : <button type="button" onClick={() => openFlag(pin)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#A92F56]/20 px-3 text-xs font-bold text-[#A92F56]"><Flag size={13}/>Flag</button>}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-slate-500">Showing {showingText}</span>
          <nav aria-label="Pins pagination" className="flex items-center gap-2">
            {pagination.page > 1 ? <Link href={pageUrl(pagination.page - 1)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"><ChevronLeft size={14}/>Previous</Link> : <span className="inline-flex h-9 cursor-not-allowed items-center gap-1 rounded-lg border border-slate-100 px-3 text-xs text-slate-300"><ChevronLeft size={14}/>Previous</span>}
            <span className="px-2 text-xs font-bold tabular-nums text-slate-600">{pagination.page} / {Math.max(1, pagination.pageCount)}</span>
            {pagination.page < pagination.pageCount ? <Link href={pageUrl(pagination.page + 1)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">Next<ChevronRight size={14}/></Link> : <span className="inline-flex h-9 cursor-not-allowed items-center gap-1 rounded-lg border border-slate-100 px-3 text-xs text-slate-300">Next<ChevronRight size={14}/></span>}
          </nav>
        </div>
      </section>

      {selectedPin && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-[3px] sm:p-5" onMouseDown={(event) => { if (event.currentTarget === event.target && !flagPin) setSelectedPinId(null); }}>
          <div ref={detailDialogRef} role="dialog" aria-modal="true" aria-labelledby="pin-detail-title" aria-hidden={Boolean(flagPin)} tabIndex={-1} className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-2xl outline-none sm:max-h-[90vh]">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#A92F56]/10 text-[#A92F56]"><MapPinned size={20}/></div><div><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#A92F56]">PIN RECORD · #{selectedPin.id}</p><h2 id="pin-detail-title" className="text-base font-bold text-slate-950">Pin details</h2></div></div>
              <button type="button" data-initial-focus aria-label="Close pin details" disabled={Boolean(flagPin)} onClick={() => setSelectedPinId(null)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"><X size={18}/></button>
            </div>
            <div className="overflow-y-auto p-5 sm:p-6">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <div className="min-w-0 space-y-5">
                  <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-slate-100">
                    {selectedPin.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selectedPin.photo_url} alt={`Photo of ${selectedPin.title}`} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-contain" />
                    ) : <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400"><ImageIcon size={32}/><span className="text-xs">No photo attached to this pin</span></div>}
                  </div>
                  <div><div className="flex flex-wrap items-center gap-2"><CategoryBadge value={selectedPin.category}/>{selectedPin.subcategory && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">{readable(selectedPin.subcategory)}</span>}</div><h3 className="mt-3 text-xl font-bold leading-7 tracking-tight text-slate-950">{selectedPin.title || "Untitled pin"}</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{selectedPin.description || "No description was provided."}</p></div>
                  <section aria-label="Pin engagement" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { label: "Likes", value: selectedPin.likes_count, icon: Heart },
                      { label: "Comments", value: selectedPin.comments_count, icon: MessageCircle },
                      { label: "Vouches", value: selectedPin.vouches_count, icon: ShieldCheck },
                      { label: "Reports", value: getOpenReports(selectedPin), icon: ShieldAlert },
                    ].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"><Icon size={15} className="text-[#A92F56]"/><p className="mt-2 text-xl font-bold text-slate-900 tabular-nums">{value}</p><p className="mt-1 text-[11px] text-slate-500">{label}</p></div>)}
                  </section>
                  <section className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center gap-3"><Avatar pin={selectedPin}/><div className="min-w-0 flex-1"><p className="text-xs font-bold text-slate-900">{creatorName(selectedPin)}</p><p className="mt-0.5 truncate text-[11px] text-slate-500">{selectedPin.creator?.username ? `@${selectedPin.creator.username.replace(/^@/, "")}` : selectedPin.creator_email || "Pin creator"}</p></div>{selectedPin.creator_id && <Link href={`/admin/users?q=${encodeURIComponent(selectedPin.creator_id)}`} className="inline-flex items-center gap-1 text-xs font-bold text-[#A92F56] hover:underline">View user<ArrowRight size={13}/></Link>}</div></section>
                </div>
                <div className="min-w-0 space-y-4">
                  <section className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><MapPin size={17} className="text-[#A92F56]"/>Pin location</h3><span className="text-[10px] font-semibold text-slate-400">Map preview</span></div>
                    {validCoordinates(selectedPin) ? <iframe key={selectedPin.id} title={`Map location of pin #${selectedPin.id}`} src={getMapEmbedUrl(selectedPin.latitude, selectedPin.longitude)} className="mt-3 h-[210px] w-full rounded-xl border border-slate-100 bg-slate-100" referrerPolicy="strict-origin-when-cross-origin" loading="lazy" /> : <div className="mt-3 flex h-32 items-center justify-center rounded-xl bg-slate-50 text-xs text-slate-500">Location coordinates unavailable</div>}
                    <p className="mt-3 break-all font-mono text-[11px] text-slate-500">{selectedPin.latitude}, {selectedPin.longitude}</p>
                    <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => copyValue("coordinates", `${selectedPin.latitude}, ${selectedPin.longitude}`)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">{copied === "coordinates" ? <Check size={13}/> : <Copy size={13}/>}{copied === "coordinates" ? "Copied" : "Copy coordinates"}</button>{validCoordinates(selectedPin) && <a target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps?q=${encodeURIComponent(`${selectedPin.latitude},${selectedPin.longitude}`)}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"><Navigation size={13}/>Open map<ExternalLink size={11}/></a>}</div>
                  </section>
                  <section className="rounded-2xl border border-slate-200 p-4"><h3 className="mb-3 text-sm font-bold text-slate-900">Record details</h3><div className="grid grid-cols-2 gap-2"><DetailTile icon={MapPin} label="Pin ID"><button type="button" onClick={() => copyValue("id", String(selectedPin.id))} className="inline-flex items-center gap-1.5 text-[#A92F56]">#{selectedPin.id}{copied === "id" ? <Check size={13}/> : <Copy size={13}/>}</button></DetailTile><DetailTile icon={CalendarDays} label="Created">{formatDateTime(selectedPin.created_at)}</DetailTile></div></section>
                  <section className={`rounded-2xl border p-4 ${getOpenReports(selectedPin) ? "border-amber-200 bg-amber-50/60" : "border-slate-200 bg-slate-50/50"}`}>
                    <div className="flex gap-2"><ShieldAlert size={17} className={getOpenReports(selectedPin) ? "text-amber-700" : "text-[#A92F56]"}/><div className="flex-1"><h3 className="text-sm font-bold text-slate-900">Moderation status</h3><p className="mt-1 text-xs leading-5 text-slate-600">{getOpenReports(selectedPin) ? `This published pin has ${getOpenReports(selectedPin)} open report(s). Review the existing case before taking further action.` : "No open user reports are recorded for this pin. You can flag it for an admin review if needed."}</p></div></div>
                    <div className="mt-4">{getOpenReports(selectedPin) ? <Link href={`/admin/reports?pin=${selectedPin.id}`} className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white text-xs font-bold text-amber-800 hover:bg-amber-100"><Eye size={14}/>Review existing reports<ArrowRight size={14}/></Link> : <button type="button" onClick={() => openFlag(selectedPin)} className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-[#A92F56] text-xs font-bold text-white transition hover:bg-[#882743]"><Flag size={14}/>Flag this pin for review</button>}</div>
                  </section>
                </div>
              </div>
            </div>
            <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6"><p className="text-[11px] text-slate-500"><Info size={13} className="mr-1 inline"/>Flagging creates a report; it does not remove the pin.</p><button type="button" onClick={() => setSelectedPinId(null)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Close</button></footer>
          </div>
        </div>
      )}

      {flagPin && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-[3px] sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) closeFlag(); }}>
          <div ref={flagDialogRef} role="dialog" aria-modal="true" aria-labelledby="flag-pin-title" aria-describedby="flag-pin-description" tabIndex={-1} className="flex max-h-[94vh] w-full max-w-xl flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-2xl outline-none">
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#A92F56]/10 text-[#A92F56]"><Flag size={20}/></div><div><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#A92F56]">MODERATION / NEW CASE</p><h2 id="flag-pin-title" className="text-base font-bold text-slate-950">Flag pin for review</h2></div></div><button data-initial-focus type="button" disabled={isFlagging} onClick={closeFlag} aria-label="Close flag dialog" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"><X size={18}/></button></header>
            <div className="space-y-4 overflow-y-auto p-5 sm:p-6">
              <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"><PinThumb pin={flagPin}/><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{flagPin.title || "Untitled pin"}</p><p className="mt-1 text-[11px] text-slate-500">Pin #{flagPin.id} · {creatorName(flagPin)}</p></div></div>
              <p id="flag-pin-description" className="text-xs leading-5 text-slate-600">Create a new report for an administrator to investigate. The pin remains published unless a separate moderation action is taken.</p>
              {flagError && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"><AlertCircle size={16} className="shrink-0"/>{flagError}</div>}
              <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-700">Report type</span><select value={flagType} onChange={(event) => setFlagType(event.target.value as FlagType)} disabled={isFlagging} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#A92F56] disabled:opacity-60">{FLAG_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label className="block"><span className="mb-1.5 flex items-center justify-between gap-3 text-xs font-bold text-slate-700">Reason <span className="font-normal text-slate-400">{flagReason.length}/200</span></span><input value={flagReason} onChange={(event) => { setFlagReason(event.target.value); if (flagError) setFlagError(null); }} disabled={isFlagging} maxLength={200} placeholder="Briefly explain the concern" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none placeholder:text-slate-400 focus:border-[#A92F56] disabled:opacity-60" /></label>
              <label className="block"><span className="mb-1.5 flex items-center justify-between gap-3 text-xs font-bold text-slate-700">Additional details <span className="font-normal text-slate-400">Optional · {flagDetails.length}/2000</span></span><textarea value={flagDetails} onChange={(event) => setFlagDetails(event.target.value)} disabled={isFlagging} maxLength={2000} rows={4} placeholder="Provide any context or evidence that might help the reviewer…" className="w-full resize-y rounded-xl border border-slate-200 p-3 text-sm leading-6 outline-none placeholder:text-slate-400 focus:border-[#A92F56] disabled:opacity-60"/></label>
              <div className="flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50/75 p-3 text-xs leading-5 text-sky-900"><ShieldAlert size={16} className="mt-0.5 shrink-0"/>Flagging sends a report to the Reports queue. It does not delete the pin or restrict the creator automatically.</div>
            </div>
            <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-6"><button type="button" disabled={isFlagging} onClick={closeFlag} className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button><button type="button" onClick={submitFlag} disabled={isFlagging || flagReason.trim().length < 3} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#A92F56] px-4 text-xs font-bold text-white hover:bg-[#882743] disabled:cursor-not-allowed disabled:opacity-50">{isFlagging ? <Loader2 size={15} className="animate-spin"/> : <Flag size={15}/>} {isFlagging ? "Submitting…" : "Submit report"}</button></footer>
          </div>
        </div>
      )}
    </>
  );
}
