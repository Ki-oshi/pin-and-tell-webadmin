import type {
  Metadata,
} from "next";

import Image from "next/image";

import {
  redirect,
} from "next/navigation";

import {
  Activity,
  KeyRound,
  ShieldCheck,
} from "lucide-react";

import {
  getCurrentAdmin,
} from "@/lib/auth/session";

import LoginForm from "./login-form";


export const metadata:
  Metadata = {

    description:
      "Secure administrator access for the PIN & TELL management system.",

    robots: {
      index: false,
      follow: false,
    },
  };

export const dynamic =
  "force-dynamic";

function PinTellLogo({
  variant = "dark",
  size = 56,
}: {
  variant?: "dark" | "light";
  size?: number;
}) {
  return (
    <div
      className={`
        flex
        shrink-0
        items-center
        justify-center
        overflow-hidden
        rounded-2xl
        border
        shadow-sm
        ${
          variant === "light"
            ? "border-white/20 bg-white/10"
            : "border-slate-200 bg-white"
        }
      `}
      style={{
        width: size,
        height: size,
      }}
    >
      <Image
        src="/images/pin-tell-logo.png"
        alt="PIN & TELL logo"
        width={size}
        height={size}
        priority
        className="
          h-full
          w-full
          object-contain
          p-1.5
        "
      />
    </div>
  );
}

export default async function AdminLoginPage() {
  const admin =
    await getCurrentAdmin();

  if (admin) {
    redirect(
      "/admin",
    );
  }

  const siteKey =
    process.env
      .NEXT_PUBLIC_TURNSTILE_SITE_KEY ??
    "";

  return (
    <main
      className="
        relative
        min-h-screen
        overflow-hidden
        bg-[#F8F8FA]
        px-4
        py-6
        sm:px-6
        lg:px-8
      "
    >
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -left-40
          -top-40
          h-[420px]
          w-[420px]
          rounded-full
          bg-[#FDC1C9]/20
          blur-3xl
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -bottom-48
          -right-40
          h-[460px]
          w-[460px]
          rounded-full
          bg-[#CC3A67]/10
          blur-3xl
        "
      />

      <div
        className="
          relative
          mx-auto
          grid
          min-h-[calc(100vh-3rem)]
          w-full
          max-w-6xl
          overflow-hidden
          rounded-[28px]
          border
          border-slate-200/80
          bg-white
          shadow-2xl
          shadow-slate-900/[0.06]
          lg:grid-cols-[1.05fr_0.95fr]
        "
      >
        {/* BRAND PANEL */}
        <section
          className="
            relative
            hidden
            overflow-hidden
            bg-[#72213A]
            p-12
            text-white
            lg:flex
            lg:flex-col
            lg:justify-between
          "
        >
          <div
            aria-hidden="true"
            className="
              absolute
              -right-24
              -top-24
              h-72
              w-72
              rounded-full
              bg-[#CC3A67]/40
              blur-3xl
            "
          />

          <div
            aria-hidden="true"
            className="
              absolute
              -bottom-20
              -left-20
              h-72
              w-72
              rounded-full
              bg-[#FDC1C9]/15
              blur-3xl
            "
          />

          <div
            className="
              relative
              z-10
            "
          >
            <div
              className="
                flex
                items-center
                gap-4
              "
            >
             <PinTellLogo
                variant="light"
                size={56}
              />

              <div>
                <p
                  className="
                    text-lg
                    font-bold
                    tracking-tight
                  "
                >
                  PIN & TELL
                </p>

                <p
                  className="
                    mt-0.5
                    text-xs
                    font-medium
                    uppercase
                    tracking-[0.18em]
                    text-white/55
                  "
                >
                  Administration
                </p>
              </div>
            </div>

            <div
              className="
                mt-20
                max-w-md
              "
            >
              <div
                className="
                  mb-5
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-white/15
                  bg-white/10
                  px-3
                  py-1.5
                  text-xs
                  font-medium
                  text-white/80
                  backdrop-blur
                "
              >
                <ShieldCheck
                  size={14}
                />

                Secure
                administration
              </div>

              <h1
                className="
                  text-4xl
                  font-semibold
                  leading-[1.12]
                  tracking-[-0.035em]
                  xl:text-5xl
                "
              >
                Manage the
                platform with
                confidence.
              </h1>

              <p
                className="
                  mt-6
                  max-w-sm
                  text-[15px]
                  leading-7
                  text-white/65
                "
              >
                A centralized
                workspace for
                managing
                PIN & TELL users,
                reports, pins,
                moderation and
                platform
                activity.
              </p>
            </div>
          </div>

          <div
            className="
              relative
              z-10
              grid
              grid-cols-2
              gap-3
            "
          >
            <div
              className="
                rounded-2xl
                border
                border-white/10
                bg-white/[0.07]
                p-4
                backdrop-blur-sm
              "
            >
              <KeyRound
                size={19}
                className="
                  text-[#FDC1C9]
                "
              />

              <p
                className="
                  mt-3
                  text-sm
                  font-semibold
                "
              >
                Protected
                sessions
              </p>

              <p
                className="
                  mt-1
                  text-xs
                  leading-5
                  text-white/50
                "
              >
                Secure,
                revocable
                administrator
                access.
              </p>
            </div>

            <div
              className="
                rounded-2xl
                border
                border-white/10
                bg-white/[0.07]
                p-4
                backdrop-blur-sm
              "
            >
              <Activity
                size={19}
                className="
                  text-[#FDC1C9]
                "
              />

              <p
                className="
                  mt-3
                  text-sm
                  font-semibold
                "
              >
                Audit trail
              </p>

              <p
                className="
                  mt-1
                  text-xs
                  leading-5
                  text-white/50
                "
              >
                Security events
                are recorded
                and monitored.
              </p>
            </div>
          </div>
        </section>

        {/* LOGIN PANEL */}
        <section
          className="
            flex
            items-center
            justify-center
            px-5
            py-10
            sm:px-10
            lg:px-14
            xl:px-16
          "
        >
          <div
            className="
              w-full
              max-w-[430px]
            "
          >
            {/* MOBILE BRAND */}
            <div
              className="
                mb-10
                flex
                items-center
                gap-3
                lg:hidden
              "
            >
              <PinTellLogo
                variant="dark"
                size={48}
              />

              <div>
                <p
                  className="
                    font-bold
                    text-slate-900
                  "
                >
                  PIN & TELL
                </p>

                <p
                  className="
                    text-xs
                    text-slate-500
                  "
                >
                  Administration
                </p>
              </div>
            </div>

            <div
              className="
                mb-8
              "
            >
              <p
                className="
                  text-sm
                  font-semibold
                  text-[#A92F56]
                "
              >
                Administrator
                access
              </p>

              <h2
                className="
                  mt-2
                  text-3xl
                  font-semibold
                  tracking-[-0.03em]
                  text-slate-950
                "
              >
                Welcome back
              </h2>

              <p
                className="
                  mt-3
                  text-sm
                  leading-6
                  text-slate-500
                "
              >
                Sign in with
                your authorized
                PIN & TELL
                administrator
                account.
              </p>
            </div>

            <LoginForm
              siteKey={
                siteKey
              }
            />

            <div
              className="
                mt-8
                border-t
                border-slate-100
                pt-6
                text-center
              "
            >
              <p
                className="
                  text-xs
                  leading-5
                  text-slate-400
                "
              >
                Access is
                restricted to
                authorized
                personnel.
                Authentication
                activity may be
                recorded for
                security and
                auditing.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}