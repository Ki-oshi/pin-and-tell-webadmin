import type { Metadata } from "next";
import { BadgeCheck, Settings2, ShieldCheck, SlidersHorizontal } from "lucide-react";

import PlatformSettingsForm from "@/components/admin/settings/platform-settings-form";
import { getAdminSettingsPageData } from "@/lib/admin/platform-settings";

export const metadata: Metadata = { title: "Platform Settings" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PlatformSettingsPage() {
  const data = await getAdminSettingsPageData();

  return (
    <div className="space-y-5 pb-8">
      <header className="relative overflow-hidden rounded-3xl border border-rose-100 bg-white px-5 py-6 shadow-sm sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-16 -top-24 h-60 w-60 rounded-full bg-rose-100/50 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#A92F56]/10 text-[#A92F56]">
              <Settings2 size={21} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-[#A92F56]">Account &amp; platform</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-[28px]">Platform Settings</h1>
              <p className="mt-2 max-w-2xl text-xs leading-6 text-slate-500 sm:text-[13px]">
                Manage administrator details, account security, active sessions, and PIN &amp; TELL policies in one place.
              </p>
            </div>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-[11px] font-semibold text-emerald-700">
            <BadgeCheck size={15} /> Authenticated administrator
          </span>
        </div>
        <div className="relative mt-6 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "Protected account", description: "Password-confirmed changes" },
            { icon: SlidersHorizontal, title: "Platform controls", description: "Settings saved to your database" },
            { icon: Settings2, title: "Policy management", description: "Edit existing public policy content" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-3.5 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#A92F56] shadow-sm"><Icon size={15} /></span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-800">{item.title}</p>
                  <p className="mt-0.5 text-[10px] leading-4 text-slate-500">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </header>

      <PlatformSettingsForm
        account={data.account}
        policies={data.policies}
        activeSessions={data.activeSessions}
      />
    </div>
  );
}
