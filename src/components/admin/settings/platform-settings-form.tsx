"use client";

import { useEffect, useId, useMemo, useState, useTransition } from "react";
import {
  AlertCircle, ArrowRight, Check, CheckCircle2, Eye, EyeOff, FileText,
  KeyRound, Laptop, Loader2, LockKeyhole, Mail, RotateCcw, Save,
  ShieldAlert, ShieldCheck, SlidersHorizontal, UserRound, X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  changeAdminPasswordAction,
  revokeAllAdminSessionsAction,
  savePolicySettingAction,
  updateAdminAccountAction,
} from "@/app/admin/(protected)/settings/actions";
import RichTextEditor from "@/components/admin/settings/rich-text-editor";
import type { AdminPolicySetting, AdminSettingsAccount } from "@/lib/admin/platform-settings";

type Props = {
  account: AdminSettingsAccount;
  policies: AdminPolicySetting[];
  activeSessions: number;
};

type Notice = { type: "success" | "error"; message: string } | null;
type AccountBaseline = { fullName: string; email: string };

const INPUT = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[12px] text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#CC3A67] focus:ring-4 focus:ring-[#FDC1C9]/30 disabled:cursor-not-allowed disabled:bg-slate-50";

function formatDateTime(value: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric",
    minute: "2-digit", timeZone: "Asia/Manila",
  }).format(date);
}

function titleCase(value: string): string {
  return value.replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isHiddenPolicy(policy: AdminPolicySetting): boolean {
  const key = policy.key.trim().toLowerCase().replace(/[\s.-]+/g, "_").replace(/_+/g, "_");
  return ["terms_of_service", "term_of_service", "terms_service", "tos", "cookie_policy"].includes(key) || key.includes("gdpr");
}

function normalizeSettingType(type: string): string {
  return type.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function isBooleanSetting(policy: AdminPolicySetting): boolean {
  return ["boolean", "bool", "toggle", "switch"].includes(normalizeSettingType(policy.type));
}

function isNumberSetting(policy: AdminPolicySetting): boolean {
  return ["number", "numeric", "integer", "int", "float", "double", "decimal"].includes(normalizeSettingType(policy.type));
}

function parseBoolean(value: string): boolean {
  return ["1", "true", "yes", "on", "enabled"].includes(value.trim().toLowerCase());
}

function serializeBoolean(enabled: boolean, originalValue: string): string {
  switch (originalValue.trim().toLowerCase()) {
    case "1": case "0": return enabled ? "1" : "0";
    case "yes": case "no": return enabled ? "yes" : "no";
    case "enabled": case "disabled": return enabled ? "enabled" : "disabled";
    case "on": case "off": return enabled ? "on" : "off";
    default: return enabled ? "true" : "false";
  }
}

function goToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function PlatformSettingsForm({ account, policies, activeSessions }: Props) {
  const router = useRouter();

  const [accountBaseline, setAccountBaseline] = useState<AccountBaseline>({
    fullName: account.full_name ?? "", email: account.email,
  });
  const [fullName, setFullName] = useState(account.full_name ?? "");
  const [email, setEmail] = useState(account.email);
  const [accountPassword, setAccountPassword] = useState("");
  const [accountNotice, setAccountNotice] = useState<Notice>(null);
  const [accountPending, startAccountTransition] = useTransition();
  const accountChanged = fullName.trim() !== accountBaseline.fullName ||
    email.trim().toLowerCase() !== accountBaseline.email.trim().toLowerCase();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null);
  const [passwordPending, startPasswordTransition] = useTransition();

  const [sessionPassword, setSessionPassword] = useState("");
  const [sessionNotice, setSessionNotice] = useState<Notice>(null);
  const [sessionPending, startSessionTransition] = useTransition();
  const [sessionConfirmOpen, setSessionConfirmOpen] = useState(false);

  const visiblePolicies = useMemo(() => policies.filter((policy) => !isHiddenPolicy(policy)), [policies]);
  const initialPolicyValues = useMemo(
    () => Object.fromEntries(visiblePolicies.map((policy) => [policy.key, policy.value ?? ""])) as Record<string, string>,
    [visiblePolicies],
  );
  const [policyValues, setPolicyValues] = useState<Record<string, string>>(() => ({ ...initialPolicyValues }));
  const [policyBaseline, setPolicyBaseline] = useState<Record<string, string>>(() => ({ ...initialPolicyValues }));
  const [policyNotice, setPolicyNotice] = useState<Notice>(null);
  const [policyPending, startPolicyTransition] = useTransition();
  const changedPolicyKeys = useMemo(() => visiblePolicies.map((policy) => policy.key).filter(
    (key) => (policyValues[key] ?? "") !== (policyBaseline[key] ?? ""),
  ), [visiblePolicies, policyValues, policyBaseline]);
  const changedPolicySet = useMemo(() => new Set(changedPolicyKeys), [changedPolicyKeys]);

  useEffect(() => {
    if (!sessionConfirmOpen) return;
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !sessionPending) setSessionConfirmOpen(false);
    }
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [sessionConfirmOpen, sessionPending]);

  function saveAccount() {
    if (!accountChanged || accountPending) return;
    setAccountNotice(null);
    if (!accountPassword) {
      setAccountNotice({ type: "error", message: "Enter your current password to authenticate these changes." });
      return;
    }
    startAccountTransition(async () => {
      const result = await updateAdminAccountAction({
        fullName: fullName.trim(), email: email.trim(), currentPassword: accountPassword,
      });
      if (!result.success) {
        setAccountNotice({ type: "error", message: result.message });
        if (result.field === "currentPassword") setAccountPassword("");
        return;
      }
      setAccountPassword("");
      if (result.account) {
        const baseline: AccountBaseline = {
          fullName: result.account.full_name ?? "", email: result.account.email,
        };
        setFullName(baseline.fullName);
        setEmail(baseline.email);
        setAccountBaseline(baseline);
      }
      setAccountNotice({ type: "success", message: result.message });
      if (result.requiresReauth) router.replace("/admin/login");
      router.refresh();
    });
  }

  function resetAccount() {
    setFullName(accountBaseline.fullName);
    setEmail(accountBaseline.email);
    setAccountPassword("");
    setAccountNotice(null);
  }

  function changePassword() {
    if (passwordPending) return;
    setPasswordNotice(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordNotice({ type: "error", message: "Complete all password fields before continuing." });
      return;
    }
    startPasswordTransition(async () => {
      const result = await changeAdminPasswordAction({ currentPassword, newPassword, confirmPassword });
      if (!result.success) {
        setPasswordNotice({ type: "error", message: result.message });
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordNotice({ type: "success", message: result.message });
      if (result.requiresReauth) router.replace("/admin/login");
      router.refresh();
    });
  }

  function requestSessionRevocation() {
    setSessionNotice(null);
    if (!sessionPassword) {
      setSessionNotice({ type: "error", message: "Enter your current password before signing out administrator sessions." });
      return;
    }
    setSessionConfirmOpen(true);
  }

  function revokeSessions() {
    if (sessionPending) return;
    setSessionConfirmOpen(false);
    setSessionNotice(null);
    startSessionTransition(async () => {
      const result = await revokeAllAdminSessionsAction({ currentPassword: sessionPassword });
      if (!result.success) {
        setSessionNotice({ type: "error", message: result.message });
        setSessionPassword("");
        return;
      }
      setSessionPassword("");
      router.replace("/admin/login");
      router.refresh();
    });
  }

  function updatePolicy(key: string, value: string) {
    setPolicyValues((current) => ({ ...current, [key]: value }));
    setPolicyNotice(null);
  }

  function resetPolicies() {
    setPolicyValues({ ...policyBaseline });
    setPolicyNotice(null);
  }

  function savePolicies() {
    if (changedPolicyKeys.length === 0 || policyPending) return;
    setPolicyNotice(null);
    const keysToSave = [...changedPolicyKeys];
    startPolicyTransition(async () => {
      const successful: string[] = [];
      const failures: string[] = [];
      for (const key of keysToSave) {
        const result = await savePolicySettingAction({ key, value: policyValues[key] ?? "" });
        if (result.success) successful.push(key);
        else failures.push(`${titleCase(key)}: ${result.message}`);
      }
      if (successful.length > 0) {
        setPolicyBaseline((current) => {
          const next = { ...current };
          for (const key of successful) next[key] = policyValues[key] ?? "";
          return next;
        });
      }
      if (failures.length > 0) {
        setPolicyNotice({
          type: "error",
          message: successful.length > 0
            ? `${successful.length} policy ${successful.length === 1 ? "was" : "policies were"} saved, but ${failures.length} failed. ${failures.join(" ")}`
            : failures.join(" "),
        });
      } else {
        setPolicyNotice({
          type: "success",
          message: successful.length === 1 ? "Policy saved successfully." : `${successful.length} policies saved successfully.`,
        });
      }
      router.refresh();
    });
  }

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[232px_minmax(0,1fr)]">
      <nav aria-label="Settings sections" className="xl:sticky xl:top-[88px]">
        <div className="rounded-[22px] border border-slate-200 bg-white p-3 shadow-sm">
          <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Settings sections</p>
          <NavButton icon={UserRound} title="Admin account" description="Profile & login" onClick={() => goToSection("settings-account")} />
          <NavButton icon={ShieldCheck} title="Security" description="Password & sessions" onClick={() => goToSection("settings-security")} />
          <NavButton icon={FileText} title="Policies" description={`${visiblePolicies.length} editable ${visiblePolicies.length === 1 ? "policy" : "policies"}`} onClick={() => goToSection("settings-policies")} />
          <div className="mt-3 rounded-2xl border border-rose-100 bg-rose-50/60 p-3.5">
            <ShieldCheck size={17} className="text-[#A92F56]" />
            <p className="mt-2 text-[11px] font-semibold text-slate-800">Security first</p>
            <p className="mt-1 text-[10px] leading-5 text-slate-500">Sensitive account actions require your current password.</p>
          </div>
        </div>
      </nav>

      <div className="min-w-0 space-y-5">
        <section id="settings-account" className="scroll-mt-24 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
          <SectionHeader icon={UserRound} eyebrow="Profile" title="Admin Account" description="Update your profile and the email used to sign in to the admin dashboard." />
          <div className="p-5 sm:p-6">
            <NoticeBox notice={accountNotice} />
            <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_260px]">
              <div className="min-w-0 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField label="Full name" icon={UserRound} value={fullName} disabled={accountPending} maxLength={100} autoComplete="name" onChange={(value) => { setFullName(value); setAccountNotice(null); }} />
                  <TextField label="Email address" type="email" icon={Mail} value={email} disabled={accountPending} autoComplete="email" onChange={(value) => { setEmail(value); setAccountNotice(null); }} />
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-3.5 py-3 text-[11px] leading-5 text-amber-800">
                  Changing your login email signs out all administrator sessions, including your current session.
                </div>
                <div className="max-w-md">
                  <PasswordField label="Current password" value={accountPassword} disabled={accountPending} placeholder="Required to save account changes" autoComplete="current-password" onChange={(value) => { setAccountPassword(value); setAccountNotice(null); }} />
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <PrimaryButton disabled={!accountChanged || accountPending} loading={accountPending} loadingText="Saving account..." onClick={saveAccount}><Save size={15} /> Save changes</PrimaryButton>
                  <SecondaryButton disabled={!accountChanged || accountPending} onClick={resetAccount}><RotateCcw size={14} /> Reset</SecondaryButton>
                  {accountChanged && <span className="ml-1 text-[10px] font-semibold text-amber-700">Unsaved changes</span>}
                </div>
              </div>
              <aside className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="mb-4 flex items-center gap-3 border-b border-slate-200 pb-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#A92F56]/10 text-[#A92F56]"><UserRound size={19} /></span>
                  <div><p className="text-[12px] font-semibold text-slate-800">Account details</p><p className="mt-0.5 text-[10px] text-slate-500">Administrator profile</p></div>
                </div>
                <MetadataRow label="Role" value={titleCase(account.role)} />
                <MetadataRow label="Status" value={titleCase(account.status)} />
                <MetadataRow label="Created" value={formatDateTime(account.created_at)} />
                <MetadataRow label="Last seen" value={formatDateTime(account.last_seen)} />
                <MetadataRow label="Admin ID" value={account.id} mono />
              </aside>
            </div>
          </div>
        </section>

        <section id="settings-security" className="scroll-mt-24 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
          <SectionHeader icon={ShieldCheck} eyebrow="Account protection" title="Security" description="Manage your password and signed-in administrator sessions." />
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"><KeyRound size={18} /></span>
              <div><h3 className="text-[13px] font-bold text-slate-900">Change password</h3><p className="mt-1 text-[11px] leading-5 text-slate-500">Updating your password signs out every administrator session.</p></div>
            </div>
            <NoticeBox notice={passwordNotice} />
            <div className="max-w-2xl space-y-4">
              <PasswordField label="Current password" value={currentPassword} disabled={passwordPending} placeholder="Your current password" autoComplete="current-password" onChange={(value) => { setCurrentPassword(value); setPasswordNotice(null); }} />
              <div className="grid gap-4 sm:grid-cols-2">
                <PasswordField label="New password" value={newPassword} disabled={passwordPending} placeholder="At least 12 characters" autoComplete="new-password" onChange={(value) => { setNewPassword(value); setPasswordNotice(null); }} />
                <PasswordField label="Confirm new password" value={confirmPassword} disabled={passwordPending} placeholder="Repeat your new password" autoComplete="new-password" onChange={(value) => { setConfirmPassword(value); setPasswordNotice(null); }} />
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-[10px] leading-5 text-amber-800">
                <LockKeyhole size={15} className="mt-0.5 shrink-0" /> Use at least 12 characters and choose a password different from your current password.
              </div>
              <PrimaryButton dark disabled={passwordPending} loading={passwordPending} loadingText="Updating password..." onClick={changePassword}><KeyRound size={15} /> Change password</PrimaryButton>
            </div>
          </div>
          <div className="p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"><Laptop size={18} /></span>
                <div><h3 className="text-[13px] font-bold text-slate-900">Administrator sessions</h3><p className="mt-1 max-w-md text-[11px] leading-5 text-slate-500">Sign out all sessions if your account was left open on another device.</p></div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><span className="text-2xl font-bold text-slate-900">{activeSessions}</span><span className="text-[10px] font-semibold leading-4 text-slate-500">Active<br />sessions</span></div>
            </div>
            <NoticeBox notice={sessionNotice} />
            <div className="max-w-lg space-y-3">
              <PasswordField label="Current password" value={sessionPassword} disabled={sessionPending} placeholder="Required to revoke active sessions" autoComplete="current-password" onChange={(value) => { setSessionPassword(value); setSessionNotice(null); }} />
              <button type="button" disabled={sessionPending} onClick={requestSessionRevocation} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-[11px] font-bold text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50">
                {sessionPending ? <><Loader2 size={15} className="animate-spin" /> Signing out...</> : <><ShieldAlert size={15} /> Sign out all sessions</>}
              </button>
              <p className="text-[10px] text-slate-500">This also signs you out of the current browser.</p>
            </div>
          </div>
        </section>

        <section id="settings-policies" className="scroll-mt-24 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
          <SectionHeader icon={FileText} eyebrow="Content management" title="Policies" description="Edit the existing policies shown in PIN & TELL. Changes are saved only when you select Save policies." />
          {visiblePolicies.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><FileText size={25} /></span>
              <p className="mt-4 text-sm font-semibold text-slate-700">No editable policies</p>
              <p className="mt-1 text-[11px] text-slate-500">No matching policy records currently exist in the database.</p>
            </div>
          ) : (
            <>
              <div className="p-5 sm:p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div><p className="text-[12px] font-semibold text-slate-800">Editable policies</p><p className="mt-1 text-[10px] leading-5 text-slate-500">Rich text, numeric values, and toggle controls are supported.</p></div>
                  <span className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1.5 text-[10px] font-bold text-[#A92F56]">{visiblePolicies.length} {visiblePolicies.length === 1 ? "policy" : "policies"}</span>
                </div>
                <NoticeBox notice={policyNotice} />
                <div className="space-y-4">
                  {visiblePolicies.map((policy) => (
                    <PolicyEditor key={policy.key} policy={policy} value={policyValues[policy.key] ?? ""} originalValue={policyBaseline[policy.key] ?? ""} changed={changedPolicySet.has(policy.key)} disabled={policyPending} onChange={(value) => updatePolicy(policy.key, value)} />
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex items-start gap-2.5">
                  {changedPolicyKeys.length === 0 ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" /> : <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600" />}
                  <div><p className="text-[11px] font-bold text-slate-800">{changedPolicyKeys.length === 0 ? "All changes saved" : `${changedPolicyKeys.length} unsaved ${changedPolicyKeys.length === 1 ? "change" : "changes"}`}</p><p className="mt-0.5 text-[10px] leading-5 text-slate-500">Policy updates are applied to their existing database records.</p></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <SecondaryButton disabled={changedPolicyKeys.length === 0 || policyPending} onClick={resetPolicies}><RotateCcw size={14} /> Reset</SecondaryButton>
                  <PrimaryButton disabled={changedPolicyKeys.length === 0 || policyPending} loading={policyPending} loadingText="Saving policies..." onClick={savePolicies}><Save size={14} /> Save policies</PrimaryButton>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {sessionConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-[3px]" onMouseDown={(event) => { if (event.target === event.currentTarget) setSessionConfirmOpen(false); }}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="revoke-sessions-title" aria-describedby="revoke-sessions-description" className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600"><ShieldAlert size={23} /></span>
              <button type="button" aria-label="Close confirmation" onClick={() => setSessionConfirmOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={17} /></button>
            </div>
            <h2 id="revoke-sessions-title" className="mt-5 text-lg font-bold tracking-tight text-slate-900">Sign out all administrator sessions?</h2>
            <p id="revoke-sessions-description" className="mt-2 text-[12px] leading-6 text-slate-500">This will revoke all active sessions for your administrator account, including the one you are using now. You will need to sign in again.</p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <SecondaryButton disabled={sessionPending} onClick={() => setSessionConfirmOpen(false)}>Cancel</SecondaryButton>
              <button type="button" disabled={sessionPending} onClick={revokeSessions} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-[11px] font-bold text-white transition hover:bg-red-700 disabled:opacity-50"><ShieldAlert size={15} /> Sign out all</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavButton({ icon: Icon, title, description, onClick }: {
  icon: typeof UserRound; title: string; description: string; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-rose-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CC3A67]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-[#A92F56]/10 group-hover:text-[#A92F56]"><Icon size={16} /></span>
      <span className="min-w-0 flex-1"><span className="block text-[11px] font-bold text-slate-700 group-hover:text-[#A92F56]">{title}</span><span className="mt-0.5 block truncate text-[10px] text-slate-400">{description}</span></span>
      <ArrowRight size={14} className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#A92F56]" />
    </button>
  );
}

function SectionHeader({ icon: Icon, eyebrow, title, description }: {
  icon: typeof UserRound; eyebrow: string; title: string; description: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white px-5 py-5 sm:px-6">
      <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#A92F56]">{eyebrow}</p><h2 className="mt-1 text-[16px] font-bold tracking-tight text-slate-950">{title}</h2><p className="mt-1 text-[11px] leading-5 text-slate-500">{description}</p></div>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#A92F56]/10 text-[#A92F56]"><Icon size={18} /></span>
    </div>
  );
}

function TextField({ label, value, onChange, type = "text", disabled, icon: Icon, maxLength, autoComplete }: {
  label: string; value: string; onChange: (value: string) => void; type?: string; disabled?: boolean;
  icon: typeof UserRound; maxLength?: number; autoComplete?: string;
}) {
  return (
    <label className="block"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">{label}</span>
      <span className="relative block"><Icon size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type={type} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} maxLength={maxLength} autoComplete={autoComplete} className={`${INPUT} pl-10`} />
      </span>
    </label>
  );
}

function PasswordField({ label, value, disabled, placeholder, autoComplete, onChange }: {
  label: string; value: string; disabled: boolean; placeholder: string; autoComplete: string; onChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const inputId = useId();
  return (
    <div className="block"><label htmlFor={inputId} className="mb-2 block text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">{label}</label>
      <div className="relative"><LockKeyhole size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input id={inputId} type={visible ? "text" : "password"} value={value} disabled={disabled} placeholder={placeholder} autoComplete={autoComplete} onChange={(event) => onChange(event.target.value)} className={`${INPUT} pl-10 pr-11`} />
        <button type="button" aria-label={visible ? "Hide password" : "Show password"} disabled={disabled} onClick={() => setVisible((current) => !current)} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40">{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button>
      </div>
    </div>
  );
}

function NoticeBox({ notice }: { notice: Notice }) {
  if (!notice) return null;
  const success = notice.type === "success";
  return (
    <div role={success ? "status" : "alert"} className={`mb-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-[11px] leading-5 ${success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
      {success ? <CheckCircle2 size={17} className="mt-0.5 shrink-0" /> : <AlertCircle size={17} className="mt-0.5 shrink-0" />}<p>{notice.message}</p>
    </div>
  );
}

function MetadataRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="mt-3 border-b border-slate-200/70 pb-3 last:border-b-0 last:pb-0"><p className="text-[10px] font-semibold text-slate-400">{label}</p><p className={`mt-1 break-all text-[11px] font-semibold text-slate-700 ${mono ? "font-mono text-[10px]" : ""}`}>{value}</p></div>;
}

function PrimaryButton({ children, disabled, loading, loadingText, dark = false, onClick }: {
  children: React.ReactNode; disabled: boolean; loading: boolean; loadingText: string; dark?: boolean; onClick: () => void;
}) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-[11px] font-bold text-white shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CC3A67] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${dark ? "bg-[#72213A] hover:bg-[#5f1930]" : "bg-[#A92F56] hover:bg-[#8f2748]"}`}>
      {loading ? <><Loader2 size={15} className="animate-spin" />{loadingText}</> : children}
    </button>
  );
}

function SecondaryButton({ children, disabled, onClick }: {
  children: React.ReactNode; disabled: boolean; onClick: () => void;
}) {
  return <button type="button" disabled={disabled} onClick={onClick} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CC3A67] disabled:cursor-not-allowed disabled:opacity-40">{children}</button>;
}

function PolicyEditor({ policy, value, originalValue, changed, disabled, onChange }: {
  policy: AdminPolicySetting; value: string; originalValue: string; changed: boolean;
  disabled: boolean; onChange: (value: string) => void;
}) {
  return (
    <article className={`overflow-hidden rounded-2xl border bg-white transition ${changed ? "border-amber-200 ring-2 ring-amber-50" : "border-slate-200"}`}>
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2.5"><h3 className="text-[12px] font-bold text-slate-900">{titleCase(policy.key)}</h3>{changed && <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700">Unsaved</span>}</div>
          {policy.description && <p className="mt-1 text-[11px] leading-5 text-slate-500">{policy.description}</p>}
        </div>
        <div className="shrink-0 text-[10px] text-slate-400 sm:text-right"><p className="font-semibold text-slate-500">{policy.grp}</p><p className="mt-1">Updated {formatDateTime(policy.updated_at)}</p></div>
      </div>
      <div className="p-4 sm:p-5">
        {isBooleanSetting(policy) ? (
          <BooleanPolicyControl value={value} originalValue={originalValue} disabled={disabled} onChange={onChange} />
        ) : isNumberSetting(policy) ? (
          <input aria-label={titleCase(policy.key)} type="number" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className={`${INPUT} max-w-md`} />
        ) : (
          <RichTextEditor value={value} disabled={disabled} onChange={onChange} />
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-400"><span>Key: <code className="font-mono text-slate-500">{policy.key}</code></span><span>Type: {policy.type}</span></div>
      </div>
    </article>
  );
}

function BooleanPolicyControl({ value, originalValue, disabled, onChange }: {
  value: string; originalValue: string; disabled: boolean; onChange: (value: string) => void;
}) {
  const enabled = parseBoolean(value);
  return (
    <div className="flex max-w-md items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
      <div><p className="flex items-center gap-2 text-[12px] font-semibold text-slate-800">{enabled ? <Check size={15} className="text-emerald-600" /> : <X size={15} className="text-slate-400" />}{enabled ? "Enabled" : "Disabled"}</p><p className="mt-1 text-[10px] text-slate-500">Toggle this setting for the platform.</p></div>
      <button type="button" role="switch" aria-label="Toggle policy setting" aria-checked={enabled} disabled={disabled} onClick={() => onChange(serializeBoolean(!enabled, originalValue || value))} className={`relative h-7 w-12 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CC3A67] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${enabled ? "bg-[#A92F56]" : "bg-slate-300"}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${enabled ? "left-[24px]" : "left-1"}`} />
      </button>
    </div>
  );
}
