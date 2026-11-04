"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import {
  Activity, AlertCircle, ArrowRight, Ban, CalendarDays,
  Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Copy,
  Eye, Fingerprint, Info, Loader2, MapPin, Phone, Search,
  Shield, ShieldAlert, ShieldCheck, SlidersHorizontal, Star,
  UserRound, UserRoundCheck, Users, X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { updateUserStatusAction } from "@/app/admin/(protected)/users/actions";
import type { AdminUserRow } from "@/lib/admin/users";

type UsersTableProps = {
  users: AdminUserRow[];
  pagination: { page: number; pageSize: number; total: number; pageCount: number };
  initialQuery: string;
  initialStatus: string;
};

type AccountStatus = "active" | "suspended" | "banned";
type ActionMessage = { type: "success" | "error"; text: string };

function displayName(user: AdminUserRow): string {
  return user.full_name?.trim() || user.username?.trim() || "Unnamed user";
}

function initials(user: AdminUserRow): string {
  return displayName(user)
    .trim().split(/\s+/).slice(0, 2)
    .map((word) => word.charAt(0)).join("").toUpperCase() || "U";
}

function handle(user: AdminUserRow): string {
  return user.username?.trim()
    ? `@${user.username.replace(/^@/, "")}`
    : "No username";
}

function formatDate(value: string | null): string {
  if (!value || Number.isNaN(new Date(value).getTime())) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila",
  }).format(new Date(value));
}

function formatDateTime(value: string | null): string {
  if (!value) return "Never";
  if (Number.isNaN(new Date(value).getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila",
  }).format(new Date(value));
}

function formatCount(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value)
    ? "—" : new Intl.NumberFormat("en-PH").format(value);
}

function formatRating(value: number | null | undefined): string {
  const n = value == null ? NaN : Number(value);
  return Number.isFinite(n) ? n.toFixed(1) : "—";
}

function StatusBadge({ status }: { status: string }) {
  const appearance = status === "active"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : status === "suspended"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : status === "banned"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-slate-200 bg-slate-50 text-slate-600";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${appearance}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${
        status === "active" ? "bg-emerald-500"
          : status === "suspended" ? "bg-amber-500"
            : status === "banned" ? "bg-rose-500" : "bg-slate-400"
      }`} />
      {status}
    </span>
  );
}

function Avatar({ user, large = false }: { user: AdminUserRow; large?: boolean }) {
  return (
    <div className={`relative flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F7DDE5] to-[#FCECF1] font-bold text-[#92274A] ring-1 ring-[#A92F56]/10 ${
      large ? "h-[76px] w-[76px] text-2xl" : "h-10 w-10 text-xs"
    }`} aria-label={`Avatar initials: ${initials(user)}`}>
      {initials(user)}
      {user.is_online && (
        <span className={`absolute rounded-full border-[3px] border-white bg-emerald-500 ${
          large ? "bottom-0 right-0 h-5 w-5" : "bottom-0 right-0 h-3.5 w-3.5"
        }`} title="Currently online" />
      )}
    </div>
  );
}

function DetailItem({ icon: Icon, label, children, full = false }: {
  icon: typeof UserRound; label: string; children: ReactNode; full?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 ${full ? "sm:col-span-2" : ""}`}>
      <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
        <Icon size={14} strokeWidth={1.9} /> {label}
      </div>
      <div className="mt-2 break-words text-sm font-medium text-slate-800">{children}</div>
    </div>
  );
}

function getFocusable(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(
    'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])',
  )).filter((element) => element.getClientRects().length > 0);
}

export default function UsersTable({ users, pagination, initialQuery, initialStatus }: UsersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentParams = searchParams.toString();
  const [query, setQuery] = useState(initialQuery);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<"active" | "suspended" | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionMessage, setActionMessage] = useState<ActionMessage | null>(null);
  const [statusOverride, setStatusOverride] = useState<{ id: string; status: AccountStatus } | null>(null);
  const [isPending, startTransition] = useTransition();
  const mainDialogRef = useRef<HTMLDivElement | null>(null);
  const confirmDialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const selectedUser = useMemo(
    () => selectedUserId ? users.find((user) => user.id === selectedUserId) ?? null : null,
    [selectedUserId, users],
  );
  const selectedStatus: string | null = selectedUser
    ? statusOverride?.id === selectedUser.id ? statusOverride.status : selectedUser.status
    : null;

  // If a filter, page, or server refresh removes the selected row, close its dialog.
  useEffect(() => {
    if (selectedUserId && !users.some((user) => user.id === selectedUserId)) {
      setSelectedUserId(null);
      setConfirmStatus(null);
    }
  }, [selectedUserId, users]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setQuery(initialQuery));
    return () => window.cancelAnimationFrame(frame);
  }, [initialQuery]);

  // Debounced server-side search; preserve the status filter and reset pagination only when q changes.
  useEffect(() => {
    if (query.trim() === (searchParams.get("q") ?? "").trim()) return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(currentParams);
      const cleaned = query.trim();
      if (cleaned) params.set("q", cleaned);
      else params.delete("q");
      params.delete("page");
      const next = params.toString();
      router.replace(next ? `/admin/users?${next}` : "/admin/users");
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query, currentParams, router, searchParams]);

  // Keep keyboard focus inside the active dialog and return it to the View button on close.
  useEffect(() => {
    if (!selectedUserId) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = oldOverflow;
      previouslyFocusedRef.current?.focus();
    };
  }, [selectedUserId]);

  useEffect(() => {
    if (!selectedUser) return;
    const dialog = confirmStatus ? confirmDialogRef.current : mainDialogRef.current;
    if (!dialog) return;
    const focusTarget = dialog.querySelector<HTMLElement>("[data-initial-focus]");
    if (!dialog.contains(document.activeElement)) focusTarget?.focus();

    function onKeyDown(event: KeyboardEvent) {
      const activeDialog = confirmStatus ? confirmDialogRef.current : mainDialogRef.current;
      if (!activeDialog) return;
      if (event.key === "Escape") {
        event.preventDefault();
        if (isPending) return;
        if (confirmStatus) setConfirmStatus(null);
        else setSelectedUserId(null);
        return;
      }
      if (event.key !== "Tab") return;
      const elements = getFocusable(activeDialog);
      if (!elements.length) { event.preventDefault(); return; }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || !activeDialog.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !activeDialog.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selectedUser, confirmStatus, isPending]);

  const showingText = useMemo(() => {
    if (pagination.total === 0) return "0 users";
    const first = (pagination.page - 1) * pagination.pageSize + 1;
    const last = Math.min(pagination.page * pagination.pageSize, pagination.total);
    return `${first.toLocaleString("en-PH")}–${last.toLocaleString("en-PH")} of ${pagination.total.toLocaleString("en-PH")}`;
  }, [pagination.page, pagination.pageSize, pagination.total]);

  function updateStatusFilter(nextStatus: string) {
    const params = new URLSearchParams(currentParams);
    if (nextStatus === "all") params.delete("status");
    else params.set("status", nextStatus);
    params.delete("page");
    const suffix = params.toString();
    router.replace(suffix ? `/admin/users?${suffix}` : "/admin/users");
  }

  function pageUrl(page: number) {
    const params = new URLSearchParams(currentParams);
    params.set("page", String(page));
    return `/admin/users?${params.toString()}`;
  }

  function openUser(user: AdminUserRow) {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    setSelectedUserId(user.id);
    setConfirmStatus(null);
    setStatusOverride(null);
    setActionMessage(null);
    setCopied(false);
  }

  function closeUser() {
    if (isPending) return;
    setSelectedUserId(null);
    setConfirmStatus(null);
    setActionMessage(null);
    setStatusOverride(null);
    setCopied(false);
  }

  async function copyId() {
    if (!selectedUser) return;
    try {
      await navigator.clipboard.writeText(selectedUser.id);
      setCopied(true);
    } catch {
      setActionMessage({ type: "error", text: "Could not copy the user ID. You can select and copy it manually." });
    }
  }

  function confirmStatusChange() {
    if (!selectedUser || !confirmStatus || isPending) return;
    const userId = selectedUser.id;
    const nextStatus = confirmStatus;
    setActionMessage(null);
    startTransition(async () => {
      try {
        const result = await updateUserStatusAction(userId, nextStatus);
        if (!result.success) {
          setActionMessage({ type: "error", text: result.message });
          return;
        }
        setStatusOverride({ id: userId, status: nextStatus });
        setActionMessage({ type: "success", text: result.message });
        setConfirmStatus(null);
        router.refresh();
      } catch {
        setActionMessage({ type: "error", text: "Unable to update the account. Please try again." });
      }
    });
  }

  const statusTabs = [
    { id: "all", label: "All users" },
    { id: "active", label: "Active" },
    { id: "suspended", label: "Suspended" },
    { id: "banned", label: "Banned" },
  ];

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#A92F56]/[0.08] text-[#A92F56]">
              <Users size={21} />
            </span>
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-950">User directory</h2>
              <p className="mt-0.5 text-xs text-slate-500">Find accounts, inspect profiles, and manage access</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 lg:self-auto">
            <UserRound size={14} className="text-slate-400" /> {showingText}
          </div>
        </div>

        <div className="space-y-4 border-b border-slate-100 bg-white px-5 py-4 lg:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <label className="relative block w-full md:max-w-md">
              <span className="sr-only">Search users</span>
              <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, username, phone, or ID"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#A92F56]/50 focus:bg-white focus:ring-4 focus:ring-[#A92F56]/[0.08]"
              />
            </label>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <SlidersHorizontal size={15} className="text-[#A92F56]" /> Filter by account status
            </div>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Filter users by account status">
            {statusTabs.map((tab) => {
              const active = initialStatus === tab.id;
              return (
                <button key={tab.id} type="button" onClick={() => updateStatusFilter(tab.id)}
                  aria-pressed={active}
                  className={`rounded-full px-3.5 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A92F56] focus-visible:ring-offset-2 ${
                    active ? "bg-[#A92F56] text-white shadow-sm shadow-[#A92F56]/20" : "border border-slate-200 bg-white text-slate-600 hover:border-[#A92F56]/25 hover:bg-rose-50/60 hover:text-[#A92F56]"
                  }`}>
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {users.length ? (
          <>
            {/* Comfortable, tappable profile cards on phones and tablets. */}
            <div className="divide-y divide-slate-100 lg:hidden">
              {users.map((user) => (
                <article key={user.id} className="space-y-3 px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar user={user} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{displayName(user)}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{handle(user)}</p>
                      </div>
                    </div>
                    <StatusBadge status={user.status} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center">
                    <div><p className="text-sm font-bold text-slate-800">{formatCount(user.pin_count)}</p><p className="text-[10px] text-slate-500">Pins</p></div>
                    <div><p className="text-sm font-bold text-slate-800">{formatCount(user.reputation_score ?? user.reputation)}</p><p className="text-[10px] text-slate-500">Reputation</p></div>
                    <div><p className="text-sm font-bold text-slate-800">{formatRating(user.avg_rating)}</p><p className="text-[10px] text-slate-500">Rating</p></div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-500">{user.is_online ? "Online now" : `Last seen ${formatDateTime(user.last_seen)}`}</span>
                    <button type="button" onClick={() => openUser(user)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#A92F56]/[0.08] px-3 py-2 text-xs font-bold text-[#A92F56] hover:bg-[#A92F56]/[0.14]">
                      <Eye size={14} /> View profile <ChevronRight size={14} />
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-bold uppercase tracking-[0.09em] text-slate-500">
                    <th className="px-6 py-3.5">User</th>
                    <th className="px-3 py-3.5">Status</th>
                    <th className="px-3 py-3.5">Reputation</th>
                    <th className="px-3 py-3.5">Rating</th>
                    <th className="px-3 py-3.5">Pins</th>
                    <th className="px-3 py-3.5">Last seen</th>
                    <th className="px-3 py-3.5">Joined</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr key={user.id} className="group transition-colors hover:bg-rose-50/[0.28]">
                      <td className="px-6 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar user={user} />
                          <div className="min-w-0">
                            <p className="max-w-[195px] truncate text-sm font-semibold text-slate-900">{displayName(user)}</p>
                            <p className="mt-1 max-w-[195px] truncate text-xs text-slate-500">{handle(user)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4"><StatusBadge status={user.status} /></td>
                      <td className="px-3 py-4 text-sm font-semibold text-slate-700">{formatCount(user.reputation_score ?? user.reputation)}</td>
                      <td className="px-3 py-4">
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700"><Star size={14} className="text-amber-500" /> {formatRating(user.avg_rating)}</span>
                      </td>
                      <td className="px-3 py-4 text-sm font-medium text-slate-700">{formatCount(user.pin_count)}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-xs text-slate-600">{user.is_online ? <span className="font-semibold text-emerald-700">Online now</span> : formatDateTime(user.last_seen)}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-xs text-slate-600">{formatDate(user.created_at)}</td>
                      <td className="px-6 py-4 text-right">
                        <button type="button" onClick={() => openUser(user)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-[#A92F56]/30 hover:bg-[#A92F56]/[0.06] hover:text-[#A92F56] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A92F56]">
                          <Eye size={14} /> View <ArrowRight size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 py-14 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Search size={24} /></span>
            <h3 className="mt-4 text-base font-semibold text-slate-900">No matching users</h3>
            <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">Try another search or select a different account status.</p>
            <button type="button" onClick={() => { setQuery(""); router.replace("/admin/users"); }}
              className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Clear filters</button>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <p className="text-xs text-slate-500">Showing <strong className="font-semibold text-slate-800">{showingText}</strong></p>
          <nav className="flex items-center gap-2" aria-label="User directory pages">
            {pagination.page > 1 ? (
              <Link href={pageUrl(pagination.page - 1)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"><ChevronLeft size={15} /> Previous</Link>
            ) : (
              <span className="inline-flex h-9 cursor-not-allowed items-center gap-1 rounded-lg border border-slate-100 px-3 text-xs text-slate-400"><ChevronLeft size={15} /> Previous</span>
            )}
            <span className="min-w-14 text-center text-xs font-semibold text-slate-600">{pagination.page} / {Math.max(pagination.pageCount, 1)}</span>
            {pagination.page < pagination.pageCount ? (
              <Link href={pageUrl(pagination.page + 1)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100">Next <ChevronRight size={15} /></Link>
            ) : (
              <span className="inline-flex h-9 cursor-not-allowed items-center gap-1 rounded-lg border border-slate-100 px-3 text-xs text-slate-400">Next <ChevronRight size={15} /></span>
            )}
          </nav>
        </div>
      </section>

      {/* Detailed account view: real dialog, not a separate navigation page. */}
      {selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-[3px] sm:p-5"
          onMouseDown={(event) => { if (event.target === event.currentTarget) closeUser(); }}>
          <div ref={mainDialogRef} role="dialog" aria-modal="true" aria-labelledby="user-profile-title" aria-describedby="user-profile-description"
            className="flex max-h-[min(92dvh,850px)] w-full max-w-[820px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-950/25 sm:rounded-[24px]">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-7">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#A92F56]/[0.08] text-[#A92F56]"><UserRound size={18}/></span>
                <div>
                  <h2 id="user-profile-title" className="text-sm font-bold text-slate-900">User profile</h2>
                  <p id="user-profile-description" className="mt-0.5 text-[11px] text-slate-500">Account details and management</p>
                </div>
              </div>
              <button type="button" data-initial-focus onClick={closeUser} disabled={isPending} aria-label="Close user profile"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A92F56] disabled:opacity-50"><X size={18}/></button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="relative border-b border-[#A92F56]/10 bg-gradient-to-br from-[#FFF0F4] via-[#FFFAFB] to-white px-5 py-6 sm:px-7 sm:py-7">
                <div aria-hidden="true" className="pointer-events-none absolute right-5 top-2 text-[#A92F56]/[0.08]"><Shield size={105} strokeWidth={1}/></div>
                <div className="relative flex flex-wrap items-start gap-4 sm:items-center">
                  <Avatar user={selectedUser} large />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="max-w-full break-words text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">{displayName(selectedUser)}</h3>
                      <StatusBadge status={selectedStatus ?? selectedUser.status}/>
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-500">{handle(selectedUser)}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1"><CalendarDays size={13}/> Joined {formatDate(selectedUser.created_at)}</span>
                      <span className="inline-flex items-center gap-1"><Clock3 size={13}/> {selectedUser.is_online ? "Online now" : `Last seen ${formatDateTime(selectedUser.last_seen)}`}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-[minmax(0,1.2fr)_minmax(250px,0.8fr)]">
                <div className="min-w-0 space-y-6">
                  <section aria-labelledby="user-details-heading">
                    <div className="mb-3 flex items-center gap-2">
                      <Fingerprint size={17} className="text-[#A92F56]" />
                      <h4 id="user-details-heading" className="text-sm font-bold text-slate-900">Account information</h4>
                    </div>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      <DetailItem icon={UserRound} label="Account name">{displayName(selectedUser)}</DetailItem>
                      <DetailItem icon={Phone} label="Phone number">{selectedUser.phone_number || "Not provided"}</DetailItem>
                      <DetailItem icon={MapPin} label="Specialization">{selectedUser.specialization || "Community member"}</DetailItem>
                      <DetailItem icon={CalendarDays} label="Joined">{formatDateTime(selectedUser.created_at)}</DetailItem>
                      <DetailItem icon={Fingerprint} label="User ID" full>
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="min-w-0 flex-1 select-text break-all font-mono text-[11px] font-medium text-slate-700">{selectedUser.id}</span>
                          <button type="button" onClick={() => void copyId()} aria-label="Copy user ID" className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#A92F56] hover:bg-[#A92F56]/[0.06]">
                            {copied ? <Check size={13}/> : <Copy size={13}/>} {copied ? "Copied" : "Copy"}
                          </button>
                        </span>
                      </DetailItem>
                    </div>
                  </section>

                  <section aria-labelledby="user-metrics-heading">
                    <div className="mb-3 flex items-center gap-2"><Activity size={17} className="text-[#A92F56]"/><h4 id="user-metrics-heading" className="text-sm font-bold text-slate-900">Community activity</h4></div>
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="rounded-xl border border-slate-200 p-3.5"><MapPin size={16} className="text-[#A92F56]"/><p className="mt-3 text-xl font-bold text-slate-900">{formatCount(selectedUser.pin_count)}</p><p className="mt-1 text-[11px] text-slate-500">Published pins</p></div>
                      <div className="rounded-xl border border-slate-200 p-3.5"><ShieldCheck size={16} className="text-[#A92F56]"/><p className="mt-3 text-xl font-bold text-slate-900">{formatCount(selectedUser.reputation_score ?? selectedUser.reputation)}</p><p className="mt-1 text-[11px] text-slate-500">Reputation</p></div>
                      <div className="rounded-xl border border-slate-200 p-3.5"><Star size={16} className="text-amber-500"/><p className="mt-3 text-xl font-bold text-slate-900">{formatRating(selectedUser.avg_rating)}</p><p className="mt-1 text-[11px] text-slate-500">Avg. rating</p></div>
                    </div>
                  </section>
                </div>

                <aside className="min-w-0 space-y-4" aria-label="User account controls">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                    <div className="flex items-center gap-2"><Shield size={17} className="text-[#A92F56]"/><h4 className="text-sm font-bold text-slate-900">Account control</h4></div>
                    <p className="mt-2 text-xs leading-5 text-slate-500">Manage access while retaining the account and its data.</p>
                    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Current status</p>
                      <div className="mt-2"><StatusBadge status={selectedStatus ?? selectedUser.status}/></div>
                    </div>
                    {selectedStatus === "active" && (
                      <button type="button" disabled={isPending} onClick={() => { setConfirmStatus("suspended"); setActionMessage(null); }}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-50"><ShieldAlert size={16}/> Suspend account</button>
                    )}
                    {selectedStatus === "suspended" && (
                      <button type="button" disabled={isPending} onClick={() => { setConfirmStatus("active"); setActionMessage(null); }}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#A92F56] px-4 py-3 text-xs font-bold text-white hover:bg-[#84213F] disabled:opacity-50"><UserRoundCheck size={16}/> Reactivate account</button>
                    )}
                    {selectedStatus === "banned" && (
                      <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800">
                        <div className="flex items-center gap-2 font-semibold"><Ban size={15}/> Account banned</div>
                        <p className="mt-1">Manage the ban through Ban Management to preserve its reason, duration, and history.</p>
                        <Link href="/admin/bans" className="mt-2 inline-flex items-center gap-1 font-bold underline underline-offset-2">Open Ban Management <ArrowRight size={13}/></Link>
                      </div>
                    )}
                    {actionMessage && !confirmStatus && (
                      <div role={actionMessage.type === "error" ? "alert" : "status"} className={`mt-4 flex items-start gap-2 rounded-xl border p-3 text-xs leading-5 ${
                        actionMessage.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"
                      }`}>
                        {actionMessage.type === "success" ? <CheckCircle2 size={16} className="shrink-0"/> : <AlertCircle size={16} className="shrink-0"/>}
                        {actionMessage.text}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 rounded-xl border border-[#A92F56]/10 bg-[#A92F56]/[0.04] p-4 text-xs leading-5 text-slate-600">
                    <Info size={16} className="mt-0.5 shrink-0 text-[#A92F56]"/>
                    <p>Suspensions restrict account access without deleting account data. Permanent bans are managed separately.</p>
                  </div>
                </aside>
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-7">
              <span className="hidden items-center gap-1.5 text-xs text-slate-400 sm:inline-flex"><ShieldCheck size={14}/> Administrator view</span>
              <button type="button" onClick={closeUser} disabled={isPending} className="ml-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Close profile <X size={15}/></button>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated confirmation replaces the native browser confirm() popup. */}
      {selectedUser && confirmStatus && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => { if (event.target === event.currentTarget && !isPending) setConfirmStatus(null); }}>
          <div ref={confirmDialogRef} role="alertdialog" aria-modal="true" aria-labelledby="user-status-confirm-title" aria-describedby="user-status-confirm-description"
            className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl sm:p-7">
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
              confirmStatus === "suspended" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
            }`}>
              {confirmStatus === "suspended" ? <ShieldAlert size={24}/> : <UserRoundCheck size={24}/>}
            </span>
            <h2 id="user-status-confirm-title" className="mt-4 text-xl font-bold tracking-tight text-slate-950">
              {confirmStatus === "suspended" ? "Suspend this account?" : "Reactivate this account?"}
            </h2>
            <p id="user-status-confirm-description" className="mt-2 text-sm leading-6 text-slate-600">
              {confirmStatus === "suspended"
                ? "This account will be restricted until an administrator reactivates it. No account data will be deleted."
                : "This account will be returned to active status, restoring access subject to the app's other restrictions."}
            </p>
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <Avatar user={selectedUser}/>
              <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{displayName(selectedUser)}</p><p className="truncate text-xs text-slate-500">{handle(selectedUser)}</p></div>
            </div>
            {actionMessage?.type === "error" && (
              <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800"><AlertCircle size={16} className="shrink-0"/>{actionMessage.text}</p>
            )}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" data-initial-focus disabled={isPending} onClick={() => setConfirmStatus(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button type="button" disabled={isPending} onClick={confirmStatusChange}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 ${
                  confirmStatus === "suspended" ? "bg-amber-700 hover:bg-amber-800" : "bg-[#A92F56] hover:bg-[#84213F]"
                }`}>
                {isPending ? <Loader2 size={16} className="animate-spin"/> : confirmStatus === "suspended" ? <ShieldAlert size={16}/> : <CheckCircle2 size={16}/>}
                {isPending ? "Updating account…" : confirmStatus === "suspended" ? "Yes, suspend" : "Yes, reactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
