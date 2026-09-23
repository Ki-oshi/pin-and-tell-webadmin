import type {
  Metadata,
} from "next";

import {
  Settings2,
  ShieldCheck,
} from "lucide-react";

import PlatformSettingsForm from "@/components/admin/settings/platform-settings-form";

import {
  getAdminSettingsPageData,
} from "@/lib/admin/platform-settings";

export const metadata:
  Metadata = {
  title:
    "Platform Settings",
};

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

export default async function PlatformSettingsPage() {
  const data =
    await getAdminSettingsPageData();

  return (
    <div
      className="
        space-y-5
      "
    >
      {/* =========================
          PAGE HEADER
      ========================== */}

      <section
        className="
          border
          border-slate-200
          bg-white
          p-5
        "
      >
        <div
          className="
            flex
            flex-col
            gap-4
            lg:flex-row
            lg:items-center
            lg:justify-between
          "
        >
          <div
            className="
              flex
              items-start
              gap-3
            "
          >
            <div
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                bg-[#A92F56]/[0.08]
                text-[#A92F56]
              "
            >
              <Settings2
                size={18}
              />
            </div>

            <div>
              <h1
                className="
                  text-sm
                  font-semibold
                  text-slate-950
                "
              >
                Platform Settings
              </h1>

              <p
                className="
                  mt-1
                  max-w-3xl
                  text-[11px]
                  leading-5
                  text-slate-500
                "
              >
                Manage your
                administrator account,
                security credentials,
                active sessions, and
                existing platform
                policies.
              </p>
            </div>
          </div>

          <div
            className="
              flex
              items-center
              gap-2
              border
              border-emerald-200
              bg-emerald-50
              px-3
              py-2
              text-[10px]
              font-medium
              text-emerald-700
            "
          >
            <ShieldCheck
              size={14}
            />

            <span>
              Authenticated Admin
            </span>
          </div>
        </div>
      </section>

      {/* =========================
          SETTINGS
      ========================== */}

      <PlatformSettingsForm
        account={
          data.account
        }
        policies={
          data.policies
        }
        activeSessions={
          data.activeSessions
        }
      />
    </div>
  );
}