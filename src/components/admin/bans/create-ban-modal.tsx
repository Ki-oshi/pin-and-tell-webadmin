"use client";

/* eslint-disable @next/next/no-img-element */

import {
  useEffect,
  useState,
  useTransition,
} from "react";

import {
  Ban,
  Check,
  FileWarning,
  Loader2,
  Search,
  ShieldAlert,
  User,
  X,
} from "lucide-react";

import ActionConfirmModal from "@/components/admin/action-confirm-modal";

import {
  createBanAction,
  searchBanUsersAction,
  type BanUserSearchResult,
} from "@/app/admin/(protected)/bans/actions";

/*
 * Reports currently supplies the
 * reported user's core profile fields
 * without avatar_url.
 *
 * Manual search results use the full
 * BanUserSearchResult type.
 *
 * Keeping avatar_url optional at this
 * boundary allows both sources to use
 * the same modal safely.
 */
type BanInitialUser = {
  id: string;
  username: string | null;
  full_name: string | null;
  status: string | null;
  avatar_url?: string | null;
};

type CreateBanModalProps = {
  open: boolean;

  onClose: () => void;

  onSuccess: (
    message?: string,
  ) => void;

  initialUser?:
    BanInitialUser | null;

  sourceReportId?:
    number | null;
};

type CreateBanModalContentProps = {
  onClose: () => void;

  onSuccess: (
    message?: string,
  ) => void;

  initialUser:
    BanInitialUser | null;

  sourceReportId:
    number | null;
};

type BanType =
  | "temporary_ban"
  | "permanent_ban"
  | "temporary_ip_ban";

type DurationType =
  | "hours"
  | "days"
  | "weeks"
  | "months"
  | "permanent";

function userDisplayName(
  user:
    BanUserSearchResult | null,
) {
  if (!user) {
    return "";
  }

  return (
    user.full_name?.trim() ||
    user.username?.trim() ||
    "Unnamed User"
  );
}

function userSubtitle(
  user:
    BanUserSearchResult,
) {
  if (
    user.username
  ) {
    return `@${user.username}`;
  }

  return user.id;
}

function formatStatus(
  status:
    string | null,
) {
  if (!status) {
    return "Active";
  }

  return status
    .replace(
      /_/g,
      " ",
    )
    .replace(
      /\b\w/g,
      (
        character,
      ) =>
        character.toUpperCase(),
    );
}

export default function CreateBanModal({
  open,
  onClose,
  onSuccess,
  initialUser = null,
  sourceReportId = null,
}: CreateBanModalProps) {
  if (!open) {
    return null;
  }

  return (
    <CreateBanModalContent
      key={`${sourceReportId ?? "manual"}:${initialUser?.id ?? "none"}`}
      onClose={
        onClose
      }
      onSuccess={
        onSuccess
      }
      initialUser={
        initialUser
      }
      sourceReportId={
        sourceReportId
      }
    />
  );
}

function CreateBanModalContent({
  onClose,
  onSuccess,
  initialUser,
  sourceReportId,
}: CreateBanModalContentProps) {
  /*
   * Normalize the looser initial-user
   * shape into the complete search
   * result shape used internally.
   */
  const normalizedInitialUser:
    BanUserSearchResult | null =
    initialUser
      ? {
          id:
            initialUser.id,

          username:
            initialUser.username,

          full_name:
            initialUser.full_name,

          status:
            initialUser.status,

          avatar_url:
            initialUser.avatar_url ??
            null,
        }
      : null;

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    users,
    setUsers,
  ] =
    useState<
      BanUserSearchResult[]
    >([]);

  const [
    selectedUser,
    setSelectedUser,
  ] =
    useState<
      BanUserSearchResult | null
    >(
      normalizedInitialUser,
    );

  const originalReportedUserId =
    normalizedInitialUser?.id ??
    null;

  const [
    banType,
    setBanType,
  ] =
    useState<BanType>(
      "temporary_ban",
    );

  const [
    durationType,
    setDurationType,
  ] =
    useState<DurationType>(
      "days",
    );

  const [
    durationValue,
    setDurationValue,
  ] =
    useState(
      "7",
    );

  const [
    ipAddress,
    setIpAddress,
  ] =
    useState("");

  const [
    reason,
    setReason,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    confirmOpen,
    setConfirmOpen,
  ] =
    useState(false);

  const [
    searching,
    startSearchTransition,
  ] =
    useTransition();

  const [
    submitting,
    startSubmitTransition,
  ] =
    useTransition();

  /*
   * Manual user search.
   *
   * No synchronous setState calls are
   * performed directly in this effect.
   */
  useEffect(() => {
    const normalized =
      search.trim();

    if (
      selectedUser ||
      normalized.length <
        2
    ) {
      return;
    }

    let cancelled =
      false;

    const timeout =
      window.setTimeout(
        () => {
          startSearchTransition(
            async () => {
              const result =
                await searchBanUsersAction(
                  normalized,
                );

              if (
                cancelled
              ) {
                return;
              }

              setUsers(
                result,
              );
            },
          );
        },
        300,
      );

    return () => {
      cancelled =
        true;

      window.clearTimeout(
        timeout,
      );
    };
  }, [
    search,
    selectedUser,
  ]);

  /*
   * Link the Report ID only while
   * the selected user is still the
   * person originally reported.
   */
  const linkedReportId =
    sourceReportId &&
    originalReportedUserId &&
    selectedUser?.id ===
      originalReportedUserId
      ? sourceReportId
      : null;

  const reportWasDetached =
    Boolean(
      sourceReportId &&
        originalReportedUserId &&
        selectedUser &&
        selectedUser.id !==
          originalReportedUserId,
    );

  const displayName =
    userDisplayName(
      selectedUser,
    );

  function handleSearchChange(
    value: string,
  ) {
    setSearch(
      value,
    );

    setError(
      null,
    );

    if (
      value.trim().length <
      2
    ) {
      setUsers(
        [],
      );
    }
  }

  function selectUser(
    user:
      BanUserSearchResult,
  ) {
    setSelectedUser(
      user,
    );

    setSearch(
      "",
    );

    setUsers(
      [],
    );

    setError(
      null,
    );
  }

  function changeUser() {
    setSelectedUser(
      null,
    );

    setSearch(
      "",
    );

    setUsers(
      [],
    );

    setError(
      null,
    );
  }

  function changeBanType(
    value:
      BanType,
  ) {
    setBanType(
      value,
    );

    setError(
      null,
    );

    if (
      value ===
      "permanent_ban"
    ) {
      setDurationType(
        "permanent",
      );

      setDurationValue(
        "",
      );

      setIpAddress(
        "",
      );

      return;
    }

    if (
      durationType ===
      "permanent"
    ) {
      setDurationType(
        "days",
      );

      setDurationValue(
        "7",
      );
    }

    if (
      value !==
      "temporary_ip_ban"
    ) {
      setIpAddress(
        "",
      );
    }
  }

  function closeModal() {
    if (
      submitting
    ) {
      return;
    }

    setConfirmOpen(
      false,
    );

    onClose();
  }

  function requestCreateBan() {
    setError(
      null,
    );

    if (
      !selectedUser
    ) {
      setError(
        "Select a user before creating a ban.",
      );

      return;
    }

    if (
      reason.trim().length <
      4
    ) {
      setError(
        "Enter a clear reason for this restriction.",
      );

      return;
    }

    if (
      banType !==
        "permanent_ban" &&
      (
        !durationValue ||
        !Number.isFinite(
          Number(
            durationValue,
          ),
        ) ||
        Number(
          durationValue,
        ) < 1
      )
    ) {
      setError(
        "Enter a valid ban duration.",
      );

      return;
    }

    if (
      banType ===
        "temporary_ip_ban" &&
      !ipAddress.trim()
    ) {
      setError(
        "An IP address is required for a temporary IP ban.",
      );

      return;
    }

    setConfirmOpen(
      true,
    );
  }

  function confirmCreateBan() {
    if (
      !selectedUser
    ) {
      return;
    }

    startSubmitTransition(
      async () => {
        const result =
          await createBanAction({
            userId:
              selectedUser.id,

            reportId:
              linkedReportId,

            banType,

            durationType,

            durationValue:
              durationType ===
              "permanent"
                ? null
                : Number(
                    durationValue,
                  ),

            ipAddress:
              banType ===
              "temporary_ip_ban"
                ? ipAddress.trim() ||
                  null
                : null,

            reason:
              reason.trim(),
          });

        if (
          !result.success
        ) {
          setConfirmOpen(
            false,
          );

          setError(
            result.message,
          );

          return;
        }

        setConfirmOpen(
          false,
        );

        onSuccess(
          result.message,
        );

        onClose();
      },
    );
  }

  useEffect(() => {
    if (confirmOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmOpen, submitting, onClose]);

  return (
    <>
      <div className={`fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/50 px-3 py-6 backdrop-blur-[3px] sm:px-6 ${confirmOpen ? "hidden" : ""}`}> 
        <button type="button" aria-label="Close Create Ban" disabled={submitting} onClick={closeModal} className="absolute inset-0 cursor-default disabled:cursor-not-allowed" />
        <section role="dialog" aria-modal="true" aria-labelledby="create-ban-title" className="relative z-10 flex max-h-[min(92vh,900px)] w-full max-w-[690px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20">
          <header className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-rose-50/80 via-white to-white px-5 py-5 sm:px-7 sm:py-6">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#A92F56]/10 text-[#A92F56]"><Ban size={20} /></span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#A92F56]">Trust &amp; Safety / Enforcement</p>
                <h2 id="create-ban-title" className="mt-1 text-lg font-bold tracking-tight text-slate-950">Create Ban</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">Apply a new account restriction with an auditable reason.</p>
              </div>
            </div>
            <button type="button" aria-label="Close Create Ban" disabled={submitting} onClick={closeModal} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40"><X size={18} /></button>
          </header>

          <div className="overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
            {error && <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-5 text-rose-800"><ShieldAlert size={17} className="mt-0.5 shrink-0" /><span>{error}</span></div>}

            {sourceReportId && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50/60 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#A92F56]"><FileWarning size={17} /></span>
                <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#A92F56]">Linked report</p><p className="mt-1 text-xs font-bold text-slate-800">Report #{sourceReportId}</p><p className="mt-1 text-[11px] leading-5 text-slate-600">The ban will be linked to this report while the originally reported account remains selected.</p></div>
              </div>
            )}

            <section aria-label="Select account">
              <div className="mb-3 flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-700"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#A92F56] text-[10px] font-bold text-white">1</span> Select account</h3>{sourceReportId && selectedUser?.id === originalReportedUserId && <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-semibold text-[#A92F56]">Reported user</span>}</div>
              {!selectedUser ? (
                <div className="relative">
                  <Search size={17} className="pointer-events-none absolute left-3.5 top-[23px] -translate-y-1/2 text-slate-400" />
                  <input value={search} autoFocus onChange={(event) => handleSearchChange(event.target.value)} placeholder="Search username, name, phone or user ID..." className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#A92F56]/60 focus:ring-2 focus:ring-[#A92F56]/10" />
                  {searching && <Loader2 size={16} className="absolute right-3.5 top-[14px] animate-spin text-slate-400" />}
                  {search.trim().length >= 2 && !searching && users.length === 0 && <div role="status" className="absolute left-0 right-0 top-[49px] z-30 rounded-xl border border-slate-200 bg-white px-4 py-4 text-center text-xs text-slate-500 shadow-lg">No matching users found.</div>}
                  {users.length > 0 && <div className="absolute left-0 right-0 top-[49px] z-30 max-h-[240px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                    {users.map((user) => <button key={user.id} type="button" onClick={() => selectUser(user)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-rose-50/50">
                      {user.avatar_url ? <img src={user.avatar_url} alt="" referrerPolicy="no-referrer" className="h-9 w-9 shrink-0 rounded-xl object-cover" /> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#A92F56]/10 text-[#A92F56]"><User size={16} /></span>}
                      <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-800">{userDisplayName(user)}</span><span className="mt-0.5 block truncate text-[11px] text-slate-500">{userSubtitle(user)}</span></span>
                      <span className="shrink-0 text-[10px] font-medium text-slate-400">{formatStatus(user.status)}</span>
                    </button>)}
                  </div>}
                  <p className="mt-2 text-[11px] leading-5 text-slate-400">Enter at least two characters to find an account.</p>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                  {selectedUser.avatar_url ? <img src={selectedUser.avatar_url} alt="" referrerPolicy="no-referrer" className="h-11 w-11 shrink-0 rounded-xl object-cover" /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#A92F56]/10 text-[#A92F56]"><User size={19} /></span>}
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900">{displayName}</p><p className="mt-1 truncate text-[11px] text-slate-500">{userSubtitle(selectedUser)}</p></div>
                  <button type="button" disabled={submitting} onClick={changeUser} className="shrink-0 rounded-lg border border-rose-200 bg-white px-3 py-2 text-[11px] font-semibold text-[#A92F56] transition hover:bg-rose-50 disabled:opacity-50">Change</button>
                </div>
              )}
              {linkedReportId && <p className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-[11px] text-emerald-800"><Check size={15} className="shrink-0" /> Ban will be linked to Report #{linkedReportId}.</p>}
              {reportWasDetached && <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-5 text-amber-800">You selected an account different from the reported user. The ban will be created without a link to Report #{sourceReportId}.</p>}
            </section>

            <div className="my-6 border-t border-slate-100" />

            <section aria-label="Configure restriction">
              <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-700"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#A92F56] text-[10px] font-bold text-white">2</span> Restriction details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label htmlFor="ban-type" className="mb-2 block text-[11px] font-semibold text-slate-700">Ban type <span className="text-[#A92F56]">*</span></label>
                  <select id="ban-type" value={banType} onChange={(event) => changeBanType(event.target.value as BanType)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition focus:border-[#A92F56]/60 focus:ring-2 focus:ring-[#A92F56]/10">
                    <option value="temporary_ban">Temporary ban</option><option value="permanent_ban">Permanent ban</option><option value="temporary_ip_ban">Temporary IP ban</option>
                  </select>
                </div>
                <div><label className="mb-2 block text-[11px] font-semibold text-slate-700">Duration <span className="text-[#A92F56]">*</span></label>
                  {banType === "permanent_ban" ? <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600"><Ban size={15} /> Never expires</div> : <div className="flex gap-2"><input aria-label="Ban duration value" type="number" min="1" max="3650" value={durationValue} onChange={(event) => { setDurationValue(event.target.value); setError(null); }} className="h-11 min-w-0 w-1/2 flex-1 rounded-xl border border-slate-200 px-3 text-xs text-slate-800 outline-none transition focus:border-[#A92F56]/60 focus:ring-2 focus:ring-[#A92F56]/10" /><select aria-label="Ban duration type" value={durationType} onChange={(event) => { setDurationType(event.target.value as DurationType); setError(null); }} className="h-11 min-w-0 w-1/2 flex-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none transition focus:border-[#A92F56]/60 focus:ring-2 focus:ring-[#A92F56]/10"><option value="hours">Hours</option><option value="days">Days</option><option value="weeks">Weeks</option><option value="months">Months</option></select></div>}
                </div>
              </div>
              {banType === "temporary_ip_ban" && <div className="mt-4"><label htmlFor="ban-ip-address" className="mb-2 block text-[11px] font-semibold text-slate-700">IP address <span className="text-[#A92F56]">*</span></label><input id="ban-ip-address" value={ipAddress} onChange={(event) => { setIpAddress(event.target.value); setError(null); }} placeholder="IPv4 or IPv6 address" className="h-11 w-full rounded-xl border border-slate-200 px-3 font-mono text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#A92F56]/60 focus:ring-2 focus:ring-[#A92F56]/10" /></div>}
              <div className="mt-4"><div className="mb-2 flex items-center justify-between gap-3"><label htmlFor="ban-reason" className="text-[11px] font-semibold text-slate-700">Reason for restriction <span className="text-[#A92F56]">*</span></label><span className="text-[10px] tabular-nums text-slate-400">{reason.length}/1000</span></div>
                <textarea id="ban-reason" value={reason} onChange={(event) => { setReason(event.target.value); setError(null); }} maxLength={1000} rows={4} placeholder="Describe the violation or reason for this restriction..." className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-xs leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#A92F56]/60 focus:ring-2 focus:ring-[#A92F56]/10" />
                <p className="mt-1.5 text-[11px] text-slate-400">Provide clear context for future enforcement reviews.</p>
              </div>
            </section>
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4"><ShieldAlert size={18} className="mt-0.5 shrink-0 text-amber-700" /><p className="text-[11px] leading-5 text-amber-800">Temporary bans suspend the account. Permanent bans mark it as banned. All enforcement actions and the responsible administrator are recorded in the audit history.</p></div>
          </div>

          <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/65 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7">
            <button type="button" disabled={submitting} onClick={closeModal} className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50">Cancel</button>
            <button type="button" disabled={submitting} onClick={requestCreateBan} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#A92F56] px-5 text-xs font-bold text-white shadow-sm transition hover:bg-[#872442] disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? <><Loader2 size={15} className="animate-spin" /> Processing...</> : <><Ban size={15} /> Review &amp; Create Ban</>}
            </button>
          </footer>
        </section>
      </div>
      <ActionConfirmModal
        open={confirmOpen}
        title="Apply this ban?"
        description={selectedUser ? (linkedReportId ? `${displayName} will be restricted and the enforcement record will automatically be linked to Report #${linkedReportId}.` : `${displayName} will be restricted according to the selected ban type and duration.`) : ""}
        confirmLabel="Apply Ban"
        variant="danger"
        loading={submitting}
        onClose={() => { if (!submitting) setConfirmOpen(false); }}
        onConfirm={confirmCreateBan}
      />
    </>
  );
}
