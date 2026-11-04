"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Eye,
  RefreshCw,
  Search,
  ShieldAlert,
  User,
  X,
} from "lucide-react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import ActionConfirmModal from "@/components/admin/action-confirm-modal";

import CreateBanModal from "./create-ban-modal";

import {
  revokeBanAction,
  syncExpiredBansAction,
} from "@/app/admin/(protected)/bans/actions";

import type {
  AdminBanRow,
  BanStatus,
} from "@/lib/admin/bans";

type Props = {
  bans: AdminBanRow[];

  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };

  initialQuery: string;
  initialStatus: string;
  initialType: string;
};

function label(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

function personName(
  ban: AdminBanRow,
) {
  return (
    ban.user?.full_name?.trim() ||
    ban.user?.username?.trim() ||
    ban.user_id
  );
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone:
        "Asia/Manila",
    },
  ).format(
    new Date(value),
  );
}

function durationLabel(
  ban: AdminBanRow,
) {
  if (
    ban.duration_type ===
    "permanent"
  ) {
    return "Permanent";
  }

  return `${ban.duration_value ?? "—"} ${label(
    ban.duration_type,
  )}`;
}

function StatusBadge({
  status,
}: {
  status: BanStatus;
}) {
  const styles = {
    active:
      "border-rose-200 bg-rose-50 text-rose-700",

    expired:
      "border-slate-200 bg-slate-100 text-slate-600",

    revoked:
      "border-amber-200 bg-amber-50 text-amber-700",
  };

  return (
    <span
      className={`
        inline-flex
        items-center
        rounded-full
        border
        px-2.5
        py-1
        text-[10px]
        font-semibold
        uppercase
        tracking-wide
        ${styles[status]}
      `}
    >
      {label(status)}
    </span>
  );
}

export default function BansTable({
  bans,
  pagination,
  initialQuery,
  initialStatus,
  initialType,
}: Props) {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const currentParams =
    searchParams.toString();

  const [
    query,
    setQuery,
  ] = useState(
    initialQuery,
  );

  const [
    selectedBanId,
    setSelectedBanId,
  ] =
    useState<
      number | null
    >(null);

  const selectedBan =
    useMemo(
      () =>
        selectedBanId ===
        null
          ? null
          : bans.find(
              (ban) =>
                ban.id ===
                selectedBanId,
            ) ?? null,
      [
        bans,
        selectedBanId,
      ],
    );

  const [
    createOpen,
    setCreateOpen,
  ] = useState(false);

  const [
    revokeOpen,
    setRevokeOpen,
  ] = useState(false);

  const [
    syncOpen,
    setSyncOpen,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] =
    useState<{
      type:
        | "success"
        | "error";
      text: string;
    } | null>(null);

  const [
    pending,
    startTransition,
  ] = useTransition();

  useEffect(() => {
    const frame =
      window.requestAnimationFrame(
        () => {
          setQuery(
            initialQuery,
          );
        },
      );

    return () =>
      window.cancelAnimationFrame(
        frame,
      );
  }, [
    initialQuery,
  ]);

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          const params =
            new URLSearchParams(
              currentParams,
            );

          const value =
            query.trim();

          if (value) {
            params.set(
              "q",
              value,
            );
          } else {
            params.delete(
              "q",
            );
          }

          params.delete(
            "page",
          );

          const next =
            params.toString();

          if (
            next !==
            currentParams
          ) {
            router.replace(
              next
                ? `/admin/bans?${next}`
                : "/admin/bans",
            );
          }
        },
        350,
      );

    return () =>
      window.clearTimeout(
        timer,
      );
  }, [
    query,
    currentParams,
    router,
  ]);

  const showing =
    useMemo(() => {
      if (
        pagination.total === 0
      ) {
        return "0 bans";
      }

      const start =
        (pagination.page - 1) *
          pagination.pageSize +
        1;

      const end =
        Math.min(
          pagination.page *
            pagination.pageSize,
          pagination.total,
        );

      return `${start}–${end} of ${pagination.total}`;
    }, [
      pagination,
    ]);

  function updateFilter(
    key: string,
    value: string,
    defaultValue: string,
  ) {
    const params =
      new URLSearchParams(
        currentParams,
      );

    if (
      value ===
      defaultValue
    ) {
      params.delete(
        key,
      );
    } else {
      params.set(
        key,
        value,
      );
    }

    params.delete(
      "page",
    );

    const next =
      params.toString();

    router.replace(
      next
        ? `/admin/bans?${next}`
        : "/admin/bans",
    );
  }

  function pageUrl(
    page: number,
  ) {
    const params =
      new URLSearchParams(
        currentParams,
      );

    params.set(
      "page",
      String(page),
    );

    return `/admin/bans?${params.toString()}`;
  }

  function confirmRevoke() {
    if (!selectedBan) {
      return;
    }

    startTransition(
      async () => {
        const result =
          await revokeBanAction(
            selectedBan.id,
          );

        setRevokeOpen(
          false,
        );

        setMessage({
          type:
            result.success
              ? "success"
              : "error",

          text:
            result.message,
        });

        if (
          result.success
        ) {
          router.refresh();
        }
      },
    );
  }

  function confirmSync() {
    startTransition(
      async () => {
        const result =
          await syncExpiredBansAction();

        setSyncOpen(
          false,
        );

        setMessage({
          type:
            result.success
              ? "success"
              : "error",

          text:
            result.message,
        });

        if (
          result.success
        ) {
          router.refresh();
        }
      },
    );
  }


  useEffect(() => {
    if (selectedBanId === null || revokeOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedBanId(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedBanId, revokeOpen]);

  return (
    <>
      {message && (
        <div role="status" className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-xs leading-5 ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          {message.type === "success" ? <CheckCircle2 size={17} className="mt-0.5 shrink-0" /> : <ShieldAlert size={17} className="mt-0.5 shrink-0" />}
          <span className="flex-1">{message.text}</span>
          <button type="button" aria-label="Dismiss notification" onClick={() => setMessage(null)} className="rounded p-0.5 hover:bg-black/5"><X size={15} /></button>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-950/[0.03]">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#A92F56]/10 text-[#A92F56]"><Ban size={19} /></span>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-slate-950">Enforcement records</h2>
              <p className="mt-1 text-xs text-slate-500">Search, review, and manage user bans</p>
            </div>
            <span className="ml-1 hidden rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold tabular-nums text-slate-600 sm:inline-flex">{pagination.total}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setSyncOpen(true)} disabled={pending} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition hover:border-[#A92F56]/40 hover:text-[#A92F56] disabled:opacity-50">
              <RefreshCw size={15} className={pending ? "animate-spin" : ""} /> Sync Expired
            </button>
            <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#A92F56] px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-[#872442] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A92F56]">
              <Ban size={15} /> Create Ban
            </button>
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-100 bg-slate-50/45 px-5 py-4 sm:px-6 lg:grid-cols-[minmax(230px,1fr)_180px_180px]">
          <label className="relative block min-w-0">
            <span className="sr-only">Search bans</span>
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by user, ID or reason..." className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#A92F56]/60 focus:ring-2 focus:ring-[#A92F56]/10" />
            {query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={15} /></button>}
          </label>
          <label className="min-w-0">
            <span className="sr-only">Filter by ban status</span>
            <select value={initialStatus} onChange={(event) => updateFilter("status", event.target.value, "all")} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition focus:border-[#A92F56]/60 focus:ring-2 focus:ring-[#A92F56]/10">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
            </select>
          </label>
          <label className="min-w-0">
            <span className="sr-only">Filter by ban type</span>
            <select value={initialType} onChange={(event) => updateFilter("type", event.target.value, "all")} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition focus:border-[#A92F56]/60 focus:ring-2 focus:ring-[#A92F56]/10">
              <option value="all">All types</option>
              <option value="temporary_ban">Temporary</option>
              <option value="permanent_ban">Permanent</option>
              <option value="temporary_ip_ban">IP Ban</option>
            </select>
          </label>
        </div>

        {bans.length > 0 ? (
          <>
            <div className="divide-y divide-slate-100 lg:hidden">
              {bans.map((ban) => (
                <article key={ban.id} className="p-5 transition hover:bg-slate-50/60 sm:px-6">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A92F56]/10 text-[#A92F56]"><User size={17} /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">{personName(ban)}</p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">{ban.user?.username ? `@${ban.user.username}` : ban.user_id}</p>
                    </div>
                    <StatusBadge status={ban.effective_status} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
                    <div><p className="text-[10px] text-slate-400">Restriction</p><p className="mt-1 text-xs font-semibold text-slate-700">{label(ban.ban_type)}</p></div>
                    <div><p className="text-[10px] text-slate-400">Duration</p><p className="mt-1 text-xs font-semibold text-slate-700">{durationLabel(ban)}</p></div>
                    <div className="col-span-2"><p className="text-[10px] text-slate-400">Reason</p><p className="mt-1 break-words text-xs leading-5 text-slate-700">{ban.reason}</p></div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-[11px] text-slate-500">Ban #{ban.id} · {formatDate(ban.starts_at)}</span>
                    <button type="button" onClick={() => { setSelectedBanId(ban.id); setMessage(null); }} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:border-[#A92F56]/40 hover:text-[#A92F56]"><Eye size={14} /> Details</button>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1030px] border-collapse text-left">
                <thead><tr className="border-b border-slate-100 bg-slate-50/75 text-[10px] font-bold uppercase tracking-[0.075em] text-slate-500">
                  <th scope="col" className="px-6 py-4">Account</th>
                  <th scope="col" className="px-4 py-4">Restriction</th>
                  <th scope="col" className="px-4 py-4">Reason</th>
                  <th scope="col" className="px-4 py-4">Issued by</th>
                  <th scope="col" className="px-4 py-4">Status</th>
                  <th scope="col" className="px-4 py-4">Start / Expiry</th>
                  <th scope="col" className="px-6 py-4 text-right">Action</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {bans.map((ban) => (
                    <tr key={ban.id} className="transition hover:bg-rose-50/25">
                      <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A92F56]/10 text-[#A92F56]"><User size={17} /></div><div className="min-w-0"><p className="max-w-[165px] truncate text-xs font-bold text-slate-900">{personName(ban)}</p><p className="mt-1 max-w-[165px] truncate text-[10px] text-slate-400">{ban.user?.username ? `@${ban.user.username}` : ban.user_id}</p></div></div></td>
                      <td className="px-4 py-4"><p className="text-xs font-semibold text-slate-800">{label(ban.ban_type)}</p><p className="mt-1 text-[11px] text-slate-500">{durationLabel(ban)}</p></td>
                      <td className="px-4 py-4"><p title={ban.reason} className="max-w-[200px] truncate text-xs text-slate-600">{ban.reason}</p><p className="mt-1 text-[10px] text-slate-400">Ban #{ban.id}</p></td>
                      <td className="px-4 py-4"><p className="max-w-[140px] truncate text-xs text-slate-600">{ban.admin?.full_name || ban.admin?.email || "Unknown"}</p></td>
                      <td className="px-4 py-4"><StatusBadge status={ban.effective_status} /></td>
                      <td className="px-4 py-4"><p className="whitespace-nowrap text-[11px] text-slate-700">{formatDate(ban.starts_at)}</p><p className="mt-1 whitespace-nowrap text-[10px] text-slate-400">{ban.expires_at ? `Until ${formatDate(ban.expires_at)}` : "No expiry"}</p></td>
                      <td className="px-6 py-4 text-right"><button type="button" onClick={() => { setSelectedBanId(ban.id); setMessage(null); }} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 transition hover:border-[#A92F56]/40 hover:text-[#A92F56]"><Eye size={14} /> View <ChevronRight size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex min-h-[290px] flex-col items-center justify-center px-5 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Ban size={25} /></span>
            <h3 className="mt-4 text-sm font-bold text-slate-800">No ban records found</h3>
            <p className="mt-2 max-w-sm text-xs leading-5 text-slate-500">Try a different search or filter, or create a new restriction.</p>
            <button type="button" onClick={() => setCreateOpen(true)} className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-[#A92F56] px-4 text-xs font-semibold text-white hover:bg-[#872442]"><Ban size={14} /> Create Ban</button>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-[11px] text-slate-500">Showing <span className="font-semibold text-slate-700">{showing}</span> records</p>
          <nav aria-label="Ban pagination" className="flex items-center gap-2">
            {pagination.page > 1 ? <Link href={pageUrl(pagination.page - 1)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-[#A92F56]/40 hover:text-[#A92F56]"><ChevronLeft size={15} /> Previous</Link> : <span className="inline-flex h-9 cursor-not-allowed items-center gap-1 rounded-lg border border-slate-100 px-3 text-xs text-slate-300"><ChevronLeft size={15} /> Previous</span>}
            <span className="rounded-lg bg-white px-3 py-2 text-[11px] font-semibold tabular-nums text-slate-600">{pagination.page} / {pagination.pageCount}</span>
            {pagination.page < pagination.pageCount ? <Link href={pageUrl(pagination.page + 1)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-[#A92F56]/40 hover:text-[#A92F56]">Next <ChevronRight size={15} /></Link> : <span className="inline-flex h-9 cursor-not-allowed items-center gap-1 rounded-lg border border-slate-100 px-3 text-xs text-slate-300">Next <ChevronRight size={15} /></span>}
          </nav>
        </div>
      </section>

      {selectedBan && !revokeOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/50 px-3 py-6 backdrop-blur-[3px] sm:px-6" role="presentation">
          <button type="button" aria-label="Close ban details" onClick={() => setSelectedBanId(null)} className="absolute inset-0 cursor-default" />
          <section role="dialog" aria-modal="true" aria-labelledby="ban-detail-title" className="relative z-10 flex max-h-[min(91vh,850px)] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20">
            <header className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-rose-50/70 via-white to-white px-5 py-5 sm:px-7 sm:py-6">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#A92F56]/10 text-[#A92F56]"><ShieldAlert size={21} /></span>
                <div><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#A92F56]">Enforcement details</p><h2 id="ban-detail-title" className="mt-1 text-lg font-bold tracking-tight text-slate-950">Ban #{selectedBan.id}</h2><p className="mt-1 text-xs text-slate-500">Restriction history and enforcement information</p></div>
              </div>
              <button type="button" aria-label="Close details" onClick={() => setSelectedBanId(null)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"><X size={18} /></button>
            </header>
            <div className="overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex min-w-0 items-center gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#A92F56]/10 text-[#A92F56]"><User size={21} /></div><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{personName(selectedBan)}</p><p className="mt-1 break-all text-[11px] text-slate-500">{selectedBan.user_id}</p></div></div>
                <StatusBadge status={selectedBan.effective_status} />
              </div>
              <section aria-label="Restriction information" className="mt-5">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Restriction information</h3>
                <dl className="grid gap-3 sm:grid-cols-2">
                  {([
                    ["Ban type", label(selectedBan.ban_type)],
                    ["Duration", durationLabel(selectedBan)],
                    ["Started", formatDate(selectedBan.starts_at)],
                    ["Expires", selectedBan.expires_at ? formatDate(selectedBan.expires_at) : "Never"],
                    ["Revoked", selectedBan.revoked_at ? formatDate(selectedBan.revoked_at) : "—"],
                    ["Issued by", selectedBan.admin?.full_name || selectedBan.admin?.email || "Unknown"],
                  ] as const).map(([title, value]) => (
                    <div key={title} className="rounded-xl border border-slate-100 bg-white px-4 py-3"><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{title}</dt><dd className="mt-1.5 break-words text-xs font-semibold text-slate-800">{value}</dd></div>
                  ))}
                </dl>
              </section>
              {selectedBan.ip_address && <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4"><h3 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">IP address</h3><p className="mt-2 break-all font-mono text-xs text-slate-800">{selectedBan.ip_address}</p></div>}
              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4"><h3 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Reason for restriction</h3><p className="mt-2 whitespace-pre-wrap break-words text-xs leading-6 text-slate-700">{selectedBan.reason}</p></div>
              {selectedBan.report && <div className="mt-4"><h3 className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Linked report</h3><Link href={`/admin/reports?q=${selectedBan.report.id}`} className="group flex items-start justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50/50 p-4 transition hover:border-[#A92F56]/35"><div className="min-w-0"><p className="text-xs font-bold text-[#A92F56]">Report #{selectedBan.report.id}</p><p className="mt-1 break-words text-[11px] text-slate-600">{selectedBan.report.reason}</p></div><ExternalLink size={15} className="shrink-0 text-[#A92F56]" /></Link></div>}
              {selectedBan.effective_status === "expired" && <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-800"><Clock3 size={16} className="mt-0.5 shrink-0" /> This temporary restriction has elapsed. Use Sync Expired if its stored status has not been updated.</p>}
            </div>
            <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <Link href={`/admin/users?q=${encodeURIComponent(selectedBan.user_id)}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:border-[#A92F56]/40 hover:text-[#A92F56]"><User size={15} /> View User <ExternalLink size={14} /></Link>
              {selectedBan.effective_status === "active" ? <button type="button" onClick={() => setRevokeOpen(true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-xs font-semibold text-white transition hover:bg-rose-700"><ShieldAlert size={15} /> Revoke Ban</button> : <button type="button" onClick={() => setSelectedBanId(null)} className="inline-flex h-10 items-center justify-center rounded-xl bg-[#A92F56] px-5 text-xs font-semibold text-white hover:bg-[#872442]">Done</button>}
            </footer>
          </section>
        </div>
      )}

      <CreateBanModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={(successMessage) => { setMessage({ type: "success", text: successMessage || "Ban created successfully." }); router.refresh(); }}
      />
      <ActionConfirmModal
        open={revokeOpen}
        title="Revoke this ban?"
        description={selectedBan ? `Ban #${selectedBan.id} will be revoked. The user's account status will be recalculated based on any other active restrictions.` : ""}
        confirmLabel="Revoke Ban"
        variant="danger"
        loading={pending}
        onClose={() => { if (!pending) setRevokeOpen(false); }}
        onConfirm={confirmRevoke}
      />
      <ActionConfirmModal
        open={syncOpen}
        title="Synchronize expired bans?"
        description="Temporary bans whose expiration time has passed will be marked expired, and affected user account statuses will be recalculated."
        confirmLabel="Sync Expired"
        variant="warning"
        loading={pending}
        onClose={() => { if (!pending) setSyncOpen(false); }}
        onConfirm={confirmSync}
      />
    </>
  );
}
