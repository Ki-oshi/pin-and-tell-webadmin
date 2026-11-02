"use client";

/**
 * PIN & TELL — moderator review screen using the existing admin dashboard.
 * Protected by src/app/admin/(protected)/layout.tsx; every API request also
 * independently checks the custom admin session and reviewer allowlist.
 */

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Eye,
  ImageIcon,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type ReviewStatus = "pending" | "approved" | "rejected";
type PhotoPreview = { path: string; signedUrl: string | null };
type ImageScan = {
  decision?: "allow" | "block" | "review";
  categories?: string[];
  scores?: Record<string, number>;
  model?: string;
};
type Review = {
  id: string;
  userId: string;
  operation: "create" | "edit";
  pinId: number | null;
  submission: {
    title?: string;
    description?: string | null;
    category?: string;
    subcategory?: string | null;
    latitude?: number;
    longitude?: number;
  };
  imageScans: ImageScan[];
  status: ReviewStatus;
  createdAt: string;
  reviewerId: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  previews: PhotoPreview[];
};
type ApiFailure = { success?: boolean; error?: string; code?: string };
type QueueResponse = ApiFailure & { reviews?: Review[]; previewExpiresInSeconds?: number };
type DecisionResponse = ApiFailure & { status?: ReviewStatus; pinId?: number | null };

const API = "/api/admin/pin-image-reviews";
function timeInManila(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  }).format(date);
}

function safeError(value: unknown, fallback: string): string {
  if (value instanceof Error && value.message) return value.message;
  return fallback;
}

export default function PinImageReviewsPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<ReviewStatus>("pending");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyReviewId, setBusyReviewId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const loadReviews = useCallback(async (nextStatus: ReviewStatus) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`${API}?status=${nextStatus}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = (await response.json()) as QueueResponse;
      if (response.status === 401) {
        setReviews([]);
        throw new Error("Your admin session expired. Sign in to the dashboard again.");
      }
      if (!response.ok || data.success !== true || !Array.isArray(data.reviews)) {
        throw new Error(data.error || "Unable to load the photo moderation queue.");
      }
      setReviews(data.reviews);
    } catch (error) {
      setErrorMessage(safeError(error, "Unable to connect to the review service."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReviews(status);
  }, [status, loadReviews]);

  useEffect(() => {
    if (!lightboxUrl) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxUrl(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxUrl]);

  async function decide(review: Review, decision: "approve" | "reject") {
    if (busyReviewId) return;
    const cleanedNotes = (notes[review.id] ?? "").trim();
    if (decision === "reject" && !cleanedNotes) {
      setErrorMessage("Enter a rejection reason before rejecting a photo pin.");
      return;
    }
    if (decision === "approve" && !window.confirm(
      `Approve “${review.submission.title || "Untitled pin"}”? The photo and pin will become publicly visible.`,
    )) return;
    if (decision === "reject" && !window.confirm(
      "Reject this pin? The submission will not be published, and staged photos will be removed.",
    )) return;

    setBusyReviewId(review.id);
    setErrorMessage(null);
    setNotice(null);
    try {
      const response = await fetch(API, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reviewId: review.id,
          decision,
          notes: cleanedNotes || undefined,
        }),
      });
      const data = (await response.json()) as DecisionResponse;
      if (response.status === 401) {
        throw new Error("Your admin session expired. Sign in to the dashboard again.");
      }
      if (!response.ok || data.success !== true) {
        throw new Error(data.error || "Could not complete this review.");
      }
      setNotice(decision === "approve"
        ? `Approved and published pin #${data.pinId ?? "—"}.`
        : "Submission rejected; the pin was not published.");
      setNotes((current) => { const copy = { ...current }; delete copy[review.id]; return copy; });
      await loadReviews(status);
    } catch (error) {
      setErrorMessage(safeError(error, "Unable to complete review."));
    } finally {
      setBusyReviewId(null);
    }
  }

  const heading = (
    <div className="flex flex-col gap-3 border-b border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
      <div>
        <Link href="/admin/pins" className="mb-3 inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-[#A92F56]">
          <ArrowLeft size={14} /> Back to Pins
        </Link>
        <div className="flex items-center gap-2 text-[#A92F56]"><ShieldCheck size={20} /><span className="text-[11px] font-bold uppercase tracking-[0.2em]">PIN &amp; TELL / Moderation</span></div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Photo review queue</h1>
        <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">Review photos flagged by AI before they appear in the public map. Approval and rejection are recorded server-side.</p>
      </div>
      <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
        <LockKeyhole size={14} /> Protected by your admin session
      </span>
    </div>
  );

  return (
    <div className="min-h-[70vh] bg-slate-50 text-slate-900">
      {heading}
      <div className="mx-auto max-w-6xl space-y-5 p-5 sm:p-7">
        {errorMessage && (
          <div role="alert" className="flex items-start gap-3 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div className="flex-1">{errorMessage}</div>
            <button type="button" aria-label="Dismiss error" onClick={() => setErrorMessage(null)}><X size={16} /></button>
          </div>
        )}
        {notice && (
          <div role="status" className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><CheckCircle2 size={18} />{notice}</div>
        )}
            <div className="flex flex-wrap items-center justify-between gap-3 border border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center gap-1" role="tablist" aria-label="Review status">
                {(["pending", "approved", "rejected"] as const).map((item) => (
                  <button key={item} role="tab" aria-selected={status === item} type="button" onClick={() => { setStatus(item); setNotice(null); }} className={`px-3 py-2 text-xs font-bold capitalize transition ${status === item ? "bg-[#A92F56] text-white" : "text-slate-500 hover:bg-slate-100"}`}>{item}</button>
                ))}
              </div>
              <button type="button" onClick={() => void loadReviews(status)} disabled={loading || !!busyReviewId} className="inline-flex items-center gap-2 border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50">
                <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh previews
              </button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center gap-2 border border-slate-200 bg-white p-12 text-sm text-slate-500"><Loader2 className="animate-spin" size={18} /> Loading reviews…</div>
            ) : reviews.length === 0 ? (
              <div className="border border-slate-200 bg-white p-12 text-center">
                <ShieldCheck size={32} className="mx-auto text-[#A92F56]" />
                <h2 className="mt-4 text-base font-bold">No {status} reviews</h2>
                <p className="mt-1 text-sm text-slate-500">The most recent 25 matching submissions will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <article key={review.id} className="overflow-hidden border border-slate-200 bg-white">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                      <div>
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#A92F56]"><Clock3 size={13} /> {timeInManila(review.createdAt)} · {review.operation}</div>
                        <h2 className="mt-1 text-lg font-bold">{review.submission.title?.trim() || "Untitled pin"}</h2>
                        <p className="mt-1 text-xs text-slate-500">Submitted by {review.userId}</p>
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-bold capitalize ${review.status === "pending" ? "bg-amber-50 text-amber-800" : review.status === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{review.status}</span>
                    </div>
                    <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.85fr)]">
                      <div className="space-y-4">
                        {review.previews.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {review.previews.map((photo, index) => photo.signedUrl ? (
                              <button type="button" key={photo.path} onClick={() => setLightboxUrl(photo.signedUrl)} aria-label={`Enlarge photo ${index + 1}`} className="group relative aspect-square overflow-hidden bg-slate-100">
                                {/* Signed private previews do not require Next image optimization. */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={photo.signedUrl} alt={`Submitted pin photo ${index + 1}`} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" referrerPolicy="no-referrer" />
                                <span className="absolute bottom-2 right-2 bg-black/70 p-2 text-white"><Eye size={15} /></span>
                              </button>
                            ) : (
                              <div key={photo.path} className="flex aspect-square items-center justify-center bg-slate-100 text-xs text-slate-500"><ImageIcon size={18} /> Preview unavailable</div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex min-h-28 items-center justify-center gap-2 bg-slate-100 px-4 text-center text-xs text-slate-500"><ImageIcon size={17} /> {status === "pending" ? "Photo previews unavailable; try Refresh." : "Private previews are removed after review."}</div>
                        )}
                        <div className="space-y-1 text-sm">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pin description</p>
                          <p className="whitespace-pre-wrap leading-6 text-slate-700">{review.submission.description || "No description"}</p>
                          <p className="pt-2 text-xs text-slate-500">Category: {review.submission.category || "General"} {review.submission.subcategory ? `· ${review.submission.subcategory}` : ""}</p>
                          {typeof review.submission.latitude === "number" && Number.isFinite(review.submission.latitude) && typeof review.submission.longitude === "number" && Number.isFinite(review.submission.longitude) && (
                            <p className="text-xs text-slate-500">Coordinates: {review.submission.latitude}, {review.submission.longitude}</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="border border-slate-200 bg-slate-50 p-4">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">AI image analysis</h3>
                          {Array.isArray(review.imageScans) && review.imageScans.length > 0 ? review.imageScans.map((scan, index) => (
                            <div key={index} className="mt-3 border-t border-slate-200 pt-3 text-sm">
                              <div className="flex items-center justify-between gap-2"><span className="font-semibold">Photo {index + 1}</span><span className="font-semibold capitalize text-[#A92F56]">{scan.decision || "Unknown"}</span></div>
                              <p className="mt-1 text-xs text-slate-600">Categories: {scan.categories?.length ? scan.categories.join(", ") : "No specific category supplied"}</p>
                              {scan.scores && Object.entries(scan.scores).filter(([key]) => scan.categories?.includes(key)).slice(0, 5).map(([category, score]) => (
                                <p key={category} className="mt-1 text-[11px] text-slate-500">{category}: {Math.round(Math.max(0, Math.min(1, score)) * 100)}% model score</p>
                              ))}
                            </div>
                          )) : <p className="mt-2 text-xs text-slate-500">No scan details available.</p>}
                          <p className="mt-3 text-[11px] leading-5 text-slate-500">AI findings are a screening signal, not proof of a violation. Review the full image and its context before deciding.</p>
                        </div>
                        {review.status === "pending" ? (
                          <div>
                            <label htmlFor={`notes-${review.id}`} className="text-xs font-bold text-slate-700">Reviewer notes</label>
                            <textarea id={`notes-${review.id}`} rows={3} maxLength={1000} value={notes[review.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [review.id]: event.target.value }))} placeholder="Reason or context (required when rejecting)" className="mt-2 w-full resize-y border border-slate-300 p-3 text-sm outline-none focus:border-[#A92F56]" />
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button type="button" disabled={!!busyReviewId || loading} onClick={() => void decide(review, "approve")} className="inline-flex items-center gap-2 bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50">{busyReviewId === review.id ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Approve &amp; publish</button>
                              <button type="button" disabled={!!busyReviewId || loading} onClick={() => void decide(review, "reject")} className="inline-flex items-center gap-2 border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-800 hover:bg-rose-100 disabled:opacity-50"><ShieldX size={15} /> Reject</button>
                            </div>
                          </div>
                        ) : <div className="border-t border-slate-200 pt-3 text-xs leading-6 text-slate-500">Reviewed {timeInManila(review.reviewedAt)}{review.pinId ? ` · Published pin #${review.pinId}` : ""}{review.reviewNotes ? <p className="mt-1 whitespace-pre-wrap">Notes: {review.reviewNotes}</p> : null}</div>}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <p className="flex items-center gap-2 text-xs text-slate-500"><LockKeyhole size={13} /> Preview links expire after approximately two minutes. Refresh to request new links. This page shows up to 25 items per status.</p>
      </div>
      {lightboxUrl && (
        <div role="dialog" aria-modal="true" aria-label="Private image preview" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-5" onClick={() => setLightboxUrl(null)}>
          <button type="button" aria-label="Close preview" onClick={() => setLightboxUrl(null)} className="absolute right-5 top-5 bg-white/15 p-3 text-white hover:bg-white/25"><X size={20} /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightboxUrl} alt="Full-size submitted pin photo" referrerPolicy="no-referrer" className="max-h-full max-w-full object-contain" onClick={(event) => event.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
