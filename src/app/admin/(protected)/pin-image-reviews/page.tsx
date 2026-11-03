"use client";

/**
 * PIN & TELL — three-way photo moderation workspace.
 * GET includes auto decisions from audit logs and human reviews from the queue.
 * POST still only accepts manual decisions for pending queue submissions.
 */
import {
  Activity, AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2,
  ChevronRight, Clock3, Eye, FileText, Filter, ImageIcon, Loader2,
  LockKeyhole, RefreshCw, Search, Shield, ShieldAlert, ShieldCheck,
  ShieldX, Sparkles, UserRound, X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Status = "pending" | "approved" | "rejected";
type View = "all" | Status;
type PhotoPreview = { path: string; signedUrl: string | null };
type Finding = {
  category?: string;
  violation?: string;
  severity?: string;
  confidence?: number;
  evidence?: string;
  policyReason?: string;
  source?: string;
};
type ImageScan = {
  decision?: string;
  description?: string;
  reason?: string;
  model?: string;
  uncertain?: boolean;
  overallConfidence?: number;
  categories?: string[];
  findings?: Finding[];
};
type ModerationItem = {
  id: string;
  source: "queue" | "automated";
  status: Status;
  decisionBy: "ai" | "admin" | "awaiting_admin";
  title: string;
  description: string | null;
  category: string | null;
  submittedBy: string | null;
  submitterName: string | null;
  reviewerId: string | null;
  reviewerName: string | null;
  pinId: number | null;
  reviewId: string | null;
  createdAt: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  photoCount: number;
  imageScans: ImageScan[];
  violationCodes: string[];
  aiDecisions: string[];
  previews: PhotoPreview[];
  auditOnly: boolean;
};
type Counts = Record<View, number>;
type FeedResponse = {
  success?: boolean;
  error?: string;
  items?: ModerationItem[];
  counts?: Counts | null;
  pagination?: {
    page: number;
    pageSize: number;
    total: number | null;
    hasNext: boolean;
    hasPrevious: boolean;
  };
};
type DecisionResponse = { success?: boolean; error?: string; pinId?: number | null };

const ENDPOINT = "/api/admin/pin-image-reviews";
const tabs: Array<{ value: View; label: string; icon: typeof Activity }> = [
  { value: "all", label: "All decisions", icon: Activity },
  { value: "pending", label: "Needs review", icon: Clock3 },
  { value: "approved", label: "Approved", icon: CheckCircle2 },
  { value: "rejected", label: "Rejected", icon: ShieldX },
];

const categoryLabels: Record<string, string> = {
  sexual: "Sexual content", violence: "Violence", "violence/graphic": "Graphic violence",
  "self-harm": "Self-harm", offensive_gesture: "Offensive gesture",
  hate_symbol: "Hate symbol", other_unsafe: "Other unsafe imagery",
  exposed_breasts: "Exposed breasts", exposed_genitals: "Exposed genitals",
  sexual_activity: "Sexual activity", sexually_explicit_content: "Explicit sexual content",
  suspected_nudity: "Suspected nudity", graphic_injury: "Graphic injury",
  gore_or_mutilation: "Gore or mutilation", middle_finger: "Offensive gesture",
  threatening_weapon: "Threatening weapon", physical_assault: "Physical assault",
};

function readable(code: string): string {
  return categoryLabels[code] ?? code.replaceAll("_", " ").replaceAll("/", " / ");
}
function formatDate(value: string | null, full = false): string {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila", year: "numeric", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", ...(full ? { second: "2-digit" } : {}),
  }).format(date);
}
function countLabel(count: number | undefined): string {
  return typeof count === "number" ? new Intl.NumberFormat("en-US").format(count) : "—";
}
function shortId(value: string | null): string {
  if (!value) return "—";
  return value.length > 22 ? `${value.slice(0, 9)}…${value.slice(-6)}` : value;
}
function errorText(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
function statusMeta(status: Status) {
  if (status === "approved") return {
    label: "Approved", icon: CheckCircle2,
    badge: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    iconClass: "bg-emerald-50 text-emerald-700",
  };
  if (status === "rejected") return {
    label: "Rejected", icon: ShieldX,
    badge: "bg-rose-50 text-rose-800 ring-rose-200",
    iconClass: "bg-rose-50 text-rose-700",
  };
  return {
    label: "Needs review", icon: Clock3,
    badge: "bg-amber-50 text-amber-800 ring-amber-200",
    iconClass: "bg-amber-50 text-amber-700",
  };
}

function StatusBadge({ status }: { status: Status }) {
  const meta = statusMeta(status);
  const Icon = meta.icon;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${meta.badge}`}>
      <Icon size={12} strokeWidth={2.5} /> {meta.label}
    </span>
  );
}
function DecisionBadge({ item }: { item: ModerationItem }) {
  const automatic = item.decisionBy === "ai";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
      {automatic ? <Sparkles size={12} /> : item.status === "pending" ? <Clock3 size={12} /> : <UserRound size={12} />}
      {automatic ? "AI · automatic" : item.status === "pending" ? "Awaiting admin" : "Admin decision"}
    </span>
  );
}

function Preview({ item, large = false, onClick }: {
  item: ModerationItem;
  large?: boolean;
  onClick?: (url: string) => void;
}) {
  const photo = item.previews.find((p) => !!p.signedUrl);
  if (photo?.signedUrl) {
    return (
      <button type="button" onClick={() => onClick?.(photo.signedUrl!)}
        className={`group relative block overflow-hidden bg-slate-100 text-left ${large ? "aspect-video w-full rounded-xl" : "h-24 w-28 shrink-0 rounded-xl sm:h-28 sm:w-36"}`}
        aria-label={`Enlarge photo for ${item.title}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.signedUrl} alt="Reviewed map pin submission" loading="lazy"
          referrerPolicy="no-referrer" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        <span className="absolute bottom-2 right-2 rounded-md bg-slate-950/70 p-1.5 text-white"><Eye size={14} /></span>
      </button>
    );
  }
  return (
    <div className={`flex shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 text-center text-slate-400 ${large ? "min-h-48 w-full" : "h-24 w-28 sm:h-28 sm:w-36"}`}>
      {item.status === "rejected" ? <ShieldX size={24} /> : <ImageIcon size={24} />}
      <span className="max-w-36 text-[10px] leading-4">
        {item.source === "automated" && item.status === "rejected"
          ? "Rejected image not retained"
          : item.status === "pending" ? "Preview unavailable · refresh" : "No public preview"}
      </span>
    </div>
  );
}

function Findings({ item }: { item: ModerationItem }) {
  const scans = Array.isArray(item.imageScans) ? item.imageScans : [];
  if (item.auditOnly) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600">
          This is an automated audit record. Full scan details and the original rejected image
          were not saved in the moderation queue. The information below comes from Activity Logs.
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AI classification</div>
            <div className="mt-1 text-sm font-semibold capitalize text-slate-800">{item.aiDecisions.map(readable).join(", ") || "Not recorded"}</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Flagged issue codes</div>
            <div className="mt-1 text-sm font-semibold capitalize text-slate-800">{item.violationCodes.map(readable).join(", ") || "None recorded"}</div>
          </div>
        </div>
      </div>
    );
  }
  if (!scans.length) return (
    <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">No saved AI analysis is available for this submission. Inspect the image before deciding.</p>
  );
  return (
    <div className="space-y-3">
      {scans.map((scan, index) => (
        <div key={index} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-slate-900">Photo {index + 1}</p>
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold capitalize text-slate-600 ring-1 ring-slate-200">AI: {scan.decision ?? "unknown"}</span>
          </div>
          {scan.description && <p className="mt-3 text-sm leading-6 text-slate-700">{scan.description}</p>}
          {scan.reason && <p className="mt-2 text-xs leading-5 text-slate-600"><strong className="text-slate-800">Reason:</strong> {scan.reason}</p>}
          {scan.uncertain && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">Model uncertainty reported.</p>}
          {typeof scan.overallConfidence === "number" && Number.isFinite(scan.overallConfidence) && (
            <p className="mt-2 text-[11px] text-slate-500">Model confidence estimate: {Math.round(scan.overallConfidence * 100)}% (not a calibrated probability)</p>
          )}
          {(scan.findings ?? []).length > 0 ? (
            <div className="mt-3 space-y-2">
              {scan.findings?.map((finding, i) => (
                <div key={i} className="rounded-lg border border-rose-100 bg-white p-3">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="text-xs font-bold capitalize text-rose-800">{readable(finding.violation || finding.category || "Unknown concern")}</span>
                    <span className="text-[11px] capitalize text-slate-500">{finding.severity ?? "Unknown"} severity</span>
                  </div>
                  {finding.evidence && <p className="mt-2 text-xs leading-5 text-slate-700"><strong>AI evidence:</strong> {finding.evidence}</p>}
                  {finding.policyReason && <p className="mt-1 text-xs leading-5 text-slate-600"><strong>Policy:</strong> {finding.policyReason}</p>}
                  {typeof finding.confidence === "number" && Number.isFinite(finding.confidence) &&
                    <p className="mt-1 text-[11px] text-slate-500">Finding confidence estimate: {Math.round(finding.confidence * 100)}%</p>}
                </div>
              ))}
            </div>
          ) : <p className="mt-3 text-xs text-slate-500">No specific policy finding recorded for this scan.</p>}
          {scan.model && <p className="mt-3 break-all text-[10px] text-slate-400">Model: {scan.model}</p>}
        </div>
      ))}
    </div>
  );
}

export default function PinImageReviewsPage() {
  const [view, setView] = useState<View>("all");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [pagination, setPagination] = useState<FeedResponse["pagination"]>();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<ModerationItem | null>(null);
  const [confirmation, setConfirmation] = useState<"approve" | "reject" | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const loadFeed = useCallback(async (currentView: View, currentPage: number, signal?: AbortSignal) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`${ENDPOINT}?view=${currentView}&page=${currentPage}`, {
        credentials: "same-origin", cache: "no-store", signal,
      });
      const data = await response.json() as FeedResponse;
      if (response.status === 401) throw new Error("Your admin session has expired. Please sign in again.");
      if (!response.ok || data.success !== true || !Array.isArray(data.items)) {
        throw new Error(data.error || "Unable to load moderation activity.");
      }
      if (signal?.aborted) return;
      setItems(data.items);
      setCounts(data.counts ?? null);
      setPagination(data.pagination);
    } catch (error) {
      if (signal?.aborted) return;
      setErrorMessage(errorText(error, "Could not load moderation records."));
      setItems([]);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadFeed(view, page, controller.signal);
    return () => controller.abort();
  }, [view, page, loadFeed]);

  useEffect(() => {
    if (!selected && !confirmation && !lightbox) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (lightbox) setLightbox(null);
        else if (confirmation && !busy) setConfirmation(null);
        else if (!busy) setSelected(null);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [selected, confirmation, lightbox, busy]);

  // Keep keyboard focus inside the active dialog and restore it afterward.
  useEffect(() => {
    if (!selected && !confirmation && !lightbox) return;
    const selector = lightbox ? "[data-moderation-lightbox]" : confirmation
      ? "[data-moderation-confirm]" : "[data-moderation-drawer]";
    const dialog = document.querySelector<HTMLElement>(selector);
    if (!dialog) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not(:disabled),input:not(:disabled),textarea:not(:disabled),a[href]'
    )).filter((element) => element.getClientRects().length > 0);
    focusable()[0]?.focus();
    const trapTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const controls = focusable();
      if (!controls.length) { event.preventDefault(); return; }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", trapTab);
    return () => {
      document.removeEventListener("keydown", trapTab);
      previouslyFocused?.focus();
    };
  }, [selected, confirmation, lightbox]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => [item.title, item.category, item.submitterName,
      item.submittedBy, item.pinId === null ? "" : String(item.pinId),
      item.violationCodes.join(" "), item.aiDecisions.join(" ")]
      .some((value) => String(value ?? "").toLowerCase().includes(q)));
  }, [items, search]);

  function changeView(next: View) {
    setView(next);
    setPage(1);
    setSearch("");
    setNotice(null);
    setSelected(null);
  }
  function openDetail(item: ModerationItem) {
    setSelected(item);
    setNotes("");
    setConfirmation(null);
    setErrorMessage(null);
  }
  async function submitDecision() {
    if (!selected || !confirmation || !selected.reviewId ||
        selected.status !== "pending" || selected.source !== "queue" || busy) return;
    const reason = notes.trim();
    if (confirmation === "reject" && !reason) {
      setErrorMessage("A rejection reason is required.");
      return;
    }
    setBusy(true);
    setErrorMessage(null);
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: selected.reviewId, decision: confirmation, notes: reason || undefined }),
      });
      const data = await response.json() as DecisionResponse;
      if (!response.ok || data.success !== true) throw new Error(data.error || "Review decision failed.");
      setNotice(confirmation === "approve"
        ? `Photo approved. Published pin #${data.pinId ?? "—"}.`
        : "Photo submission rejected and removed from the pending queue.");
      setConfirmation(null);
      setSelected(null);
      await loadFeed(view, page);
    } catch (error) {
      setErrorMessage(errorText(error, "Unable to save the review decision."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-[75vh] space-y-5 pb-10 text-slate-900">
      {/* Workspace header */}
      <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-sm sm:px-7 sm:py-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#A92F56]/[0.06] blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#A92F56]/10 text-[#A92F56]"><Shield size={22} /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#A92F56]">PIN &amp; TELL / Trust &amp; safety</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-[28px]">Photo moderation</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Track automated decisions and review only submissions that need a human judgment.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/activity-logs" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"><FileText size={15} /> Activity logs</Link>
            <button type="button" disabled={loading || busy} onClick={() => void loadFeed(view, page)} className="inline-flex items-center gap-2 rounded-lg bg-[#A92F56] px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-[#8e2549] disabled:opacity-50">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>
        <div className="relative mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><Sparkles size={14} className="text-[#A92F56]" /> Three-way AI moderation enabled</span>
          <span className="flex items-center gap-1.5"><LockKeyhole size={14} /> Private previews expire after ~2 minutes</span>
          <span className="flex items-center gap-1.5"><Clock3 size={14} /> Times shown in Philippine time</span>
        </div>
      </header>

      {/* Summary */}
      <section aria-label="Moderation summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {([
          { key: "all", label: "Total records", icon: Activity, hint: "Queue + recorded AI events", tone: "text-slate-700 bg-slate-100" },
          { key: "pending", label: "Needs review", icon: Clock3, hint: "Requires an admin", tone: "text-amber-700 bg-amber-50" },
          { key: "approved", label: "Approved", icon: CheckCircle2, hint: "AI + admin approved", tone: "text-emerald-700 bg-emerald-50" },
          { key: "rejected", label: "Rejected", icon: ShieldX, hint: "AI + admin rejected", tone: "text-rose-700 bg-rose-50" },
        ] as const).map((stat) => {
          const Icon = stat.icon;
          return (
            <button key={stat.key} type="button" onClick={() => changeView(stat.key)}
              className={`rounded-xl border bg-white p-4 text-left shadow-sm transition hover:border-[#A92F56]/40 hover:shadow-md sm:p-5 ${view === stat.key ? "border-[#A92F56]/50 ring-1 ring-[#A92F56]/20" : "border-slate-200"}`}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500">{stat.label}</span>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${stat.tone}`}><Icon size={16} /></span>
              </div>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{countLabel(counts?.[stat.key])}</p>
              <p className="mt-1 text-[11px] text-slate-400">{stat.hint}</p>
            </button>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Moderation records">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Moderation activity</h2>
            <p className="mt-0.5 text-xs text-slate-500">Browse decisions and investigate exceptions</p>
          </div>
          <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-400 focus-within:border-[#A92F56] sm:w-64">
            <Search size={16} />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search loaded page" aria-label="Search loaded moderation entries" className="w-full min-w-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400" />
            {search && <button type="button" aria-label="Clear search" onClick={() => setSearch("")}><X size={14} /></button>}
          </label>
        </div>
        <nav aria-label="Moderation status" className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 pt-2 sm:px-5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return <button key={tab.value} type="button" onClick={() => changeView(tab.value)}
              aria-current={view === tab.value ? "page" : undefined}
              className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold transition sm:px-4 ${view === tab.value ? "border-[#A92F56] text-[#A92F56]" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
              <Icon size={15} /> {tab.label}
              {typeof counts?.[tab.value] === "number" && <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${view === tab.value ? "bg-[#A92F56]/10" : "bg-slate-100"}`}>{counts[tab.value]}</span>}
            </button>;
          })}
        </nav>

        {errorMessage && !selected && <div role="alert" className="mx-4 mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 sm:mx-6"><AlertCircle size={18} className="shrink-0" /> {errorMessage}</div>}
        {notice && <div role="status" className="mx-4 mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 sm:mx-6"><CheckCircle2 size={18} /> {notice}</div>}

        {loading ? (
          <div className="flex min-h-72 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 size={20} className="animate-spin text-[#A92F56]" /> Loading moderation activity…</div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">{search ? <Search size={24} /> : <ShieldCheck size={24} />}</div>
            <h3 className="text-base font-bold text-slate-900">{search ? "No matching records on this page" : `No ${view === "all" ? "moderation records" : view === "pending" ? "pending reviews" : `${view} records`}`}</h3>
            <p className="max-w-sm text-sm text-slate-500">{search ? "Search checks the loaded page only. Try another keyword or navigate pages." : "New moderation activity will appear here when it is recorded."}</p>
            {search && <button type="button" onClick={() => setSearch("")} className="text-xs font-semibold text-[#A92F56]">Clear search</button>}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((item) => {
              const concerns = item.violationCodes.slice(0, 3);
              return (
                <article key={item.id} className="flex flex-col gap-4 px-4 py-5 transition hover:bg-slate-50/60 sm:flex-row sm:items-center sm:px-6">
                  <Preview item={item} onClick={setLightbox} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><StatusBadge status={item.status} /><DecisionBadge item={item} /></div>
                    <h3 className="mt-2 truncate text-sm font-bold text-slate-950 sm:text-base" title={item.title}>{item.title}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1"><Clock3 size={12} /> {formatDate(item.status === "pending" ? item.createdAt : item.reviewedAt ?? item.createdAt)}</span>
                      {item.submitterName && <span className="inline-flex items-center gap-1"><UserRound size={12} /> {item.submitterName}</span>}
                      {item.pinId !== null && <span>Pin #{item.pinId}</span>}
                      <span>{item.photoCount || "Unknown"} {item.photoCount === 1 ? "photo" : "photos"}</span>
                    </div>
                    {concerns.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">{concerns.map((code) => <span key={code} className="rounded-md bg-rose-50 px-2 py-1 text-[11px] font-medium capitalize text-rose-800">{readable(code)}</span>)}</div>
                    ) : item.status === "approved" ? <p className="mt-2 text-xs text-emerald-700">No violations recorded in this decision</p>
                      : item.status === "pending" ? <p className="mt-2 text-xs text-amber-700">Open details to inspect the AI findings</p> : null}
                  </div>
                  <button type="button" onClick={() => openDetail(item)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 transition hover:border-[#A92F56] hover:text-[#A92F56]">
                    View details <ChevronRight size={15} />
                  </button>
                </article>
              );
            })}
          </div>
        )}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-4 text-xs text-slate-500 sm:px-6">
          <div className="flex items-center gap-2"><Filter size={14} /> Page {page}{pagination?.total !== null && pagination?.total !== undefined ? ` · ${countLabel(pagination.total)} records in this view` : ""}</div>
          <div className="flex items-center gap-2">
            <button type="button" disabled={loading || !pagination?.hasPrevious} onClick={() => setPage((p) => Math.max(1, p - 1))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600 disabled:opacity-40"><ArrowLeft size={14} /> Previous</button>
            <button type="button" disabled={loading || !pagination?.hasNext || page >= 20} onClick={() => setPage((p) => Math.min(20, p + 1))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600 disabled:opacity-40">Next <ArrowRight size={14} /></button>
          </div>
        </footer>
      </section>

      <p className="flex items-start gap-2 px-1 text-xs leading-5 text-slate-500"><LockKeyhole size={15} className="mt-0.5 shrink-0" /> Automatically rejected images are not retained for preview. Automated history is derived from audit entries, which may be incomplete if logging failed. Private pending previews expire after around two minutes; use Refresh to renew them.</p>

      {/* Inspection drawer */}
      {selected && <div className="fixed inset-0 z-[90] flex justify-end bg-slate-950/55" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setSelected(null); }}>
        <section data-moderation-drawer role="dialog" aria-modal="true" aria-labelledby="moderation-detail-title" className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
          <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-7">
            <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-widest text-[#A92F56]">Moderation details</p><h2 id="moderation-detail-title" className="mt-1 truncate text-lg font-bold text-slate-950">{selected.title}</h2></div>
            <button type="button" aria-label="Close details" onClick={() => setSelected(null)} disabled={busy} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40"><X size={20} /></button>
          </header>
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
            <div className="flex flex-wrap items-center gap-2"><StatusBadge status={selected.status} /><DecisionBadge item={selected} /></div>
            <Preview item={selected} large onClick={setLightbox} />
            {selected.previews.filter((p) => p.signedUrl).length > 1 && (
              <div className="flex gap-2 overflow-x-auto">{selected.previews.filter((p) => p.signedUrl).slice(1).map((p) => (
                <button key={p.path} type="button" onClick={() => setLightbox(p.signedUrl)} className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.signedUrl!} alt="Additional submitted photo" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}</div>
            )}
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-xs sm:grid-cols-3">
              <div><span className="text-slate-400">Submitted</span><p className="mt-1 font-semibold text-slate-700">{formatDate(selected.createdAt)}</p></div>
              <div><span className="text-slate-400">Decided by</span><p className="mt-1 font-semibold text-slate-700">{selected.decisionBy === "ai" ? "AI / system" : selected.decisionBy === "admin" ? selected.reviewerName || "Administrator" : "Awaiting administrator"}</p></div>
              <div><span className="text-slate-400">Photos</span><p className="mt-1 font-semibold text-slate-700">{selected.photoCount || "Not recorded"}</p></div>
              <div className="col-span-2 sm:col-span-3"><span className="text-slate-400">Submitted by</span><p className="mt-1 break-all font-semibold text-slate-700">{selected.submitterName || shortId(selected.submittedBy)} {selected.submitterName && selected.submittedBy ? `· ${shortId(selected.submittedBy)}` : ""}</p></div>
              {selected.pinId !== null && <div><span className="text-slate-400">Published pin</span><p className="mt-1 font-semibold text-[#A92F56]"><Link href={`/admin/pins?q=${selected.pinId}`}>#{selected.pinId}</Link></p></div>}
              {selected.reviewedAt && <div><span className="text-slate-400">Decision time</span><p className="mt-1 font-semibold text-slate-700">{formatDate(selected.reviewedAt)}</p></div>}
            </div>
            {selected.description && <section><h3 className="text-sm font-bold text-slate-900">Pin description</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{selected.description}</p></section>}
            <section><div className="mb-3 flex items-center gap-2"><ShieldAlert size={17} className="text-[#A92F56]" /><h3 className="text-sm font-bold text-slate-900">AI screening evidence</h3></div><Findings item={selected} /></section>
            {selected.reviewNotes && <section className="rounded-xl border border-slate-200 p-4"><h3 className="text-sm font-bold">Admin review notes</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{selected.reviewNotes}</p></section>}
            {selected.status === "pending" && selected.source === "queue" && (
              <section className="rounded-xl border border-[#A92F56]/20 bg-[#A92F56]/[0.03] p-4">
                <h3 className="text-sm font-bold text-slate-900">Administrator decision</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">Inspect the image and context before publishing. A rejection reason is mandatory.</p>
                <label htmlFor="moderation-notes" className="mt-3 block text-xs font-semibold text-slate-700">Reviewer notes</label>
                <textarea id="moderation-notes" rows={3} value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} placeholder="Add a reason or review context…" className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white p-3 text-sm outline-none focus:border-[#A92F56]" />
              </section>
            )}
          </div>
          {selected.status === "pending" && selected.source === "queue" && (
            <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:px-7">
              <button type="button" onClick={() => { setErrorMessage(null); setConfirmation("reject"); }} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-800 hover:bg-rose-100"><ShieldX size={16} /> Reject</button>
              <button type="button" onClick={() => { setErrorMessage(null); setConfirmation("approve"); }} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800"><Check size={16} /> Approve &amp; publish</button>
            </footer>
          )}
        </section>
      </div>}

      {/* Confirmation overlays the details drawer */}
      {selected && confirmation && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/70 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setConfirmation(null); }}>
        <section data-moderation-confirm role="alertdialog" aria-modal="true" aria-labelledby="moderation-confirm-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${confirmation === "approve" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{confirmation === "approve" ? <CheckCircle2 size={22} /> : <ShieldX size={22} />}</div>
          <h2 id="moderation-confirm-title" className="mt-4 text-lg font-bold">{confirmation === "approve" ? "Approve this submission?" : "Reject this submission?"}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{confirmation === "approve" ? "The pin and its photos will become publicly visible." : "The pin will not be published and its private staged photos will be removed."}</p>
          <p className="mt-3 truncate rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-800">{selected.title}</p>
          {confirmation === "reject" && <div className="mt-4"><label htmlFor="reject-reason" className="text-xs font-bold text-slate-700">Rejection reason (required)</label><textarea id="reject-reason" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={3} className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-[#A92F56]" placeholder="Explain why this cannot be published" /></div>}
          {errorMessage && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{errorMessage}</p>}
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={() => setConfirmation(null)} disabled={busy} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50">Cancel</button>
            <button type="button" onClick={() => void submitDecision()} disabled={busy || (confirmation === "reject" && !notes.trim())} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 ${confirmation === "approve" ? "bg-emerald-700" : "bg-rose-700"}`}>{busy && <Loader2 size={16} className="animate-spin" />} {confirmation === "approve" ? "Confirm approval" : "Confirm rejection"}</button>
          </div>
        </section>
      </div>}

      {lightbox && <div data-moderation-lightbox role="dialog" aria-modal="true" aria-label="Full-size photo preview" className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/95 p-5" onClick={() => setLightbox(null)}>
        <button type="button" aria-label="Close photo" className="absolute right-5 top-5 rounded-lg bg-white/15 p-2 text-white" onClick={() => setLightbox(null)}><X size={22} /></button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={lightbox} alt="Full-size moderated photo" referrerPolicy="no-referrer" className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
      </div>}
    </main>
  );
}
