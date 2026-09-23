import type {
  Metadata,
} from "next";

import Image from "next/image";

import {
  redirect,
} from "next/navigation";

import {
  Activity,
  CircleCheck,
  KeyRound,
  MapPin,
  Navigation,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import {
  getCurrentAdmin,
} from "@/lib/auth/session";

import LoginForm from "./login-form";

export const metadata:
  Metadata = {
  title:
    "Admin Login | PIN & TELL",

  description:
    "Secure administrator access for the PIN & TELL management system.",

  robots: {
    index:
      false,

    follow:
      false,
  },
};

export const dynamic =
  "force-dynamic";

/* =========================================================
   LOGO
========================================================= */

function PinTellLogo({
  variant = "dark",
  size = 56,
}: {
  variant?:
    | "dark"
    | "light";

  size?:
    number;
}) {
  return (
    <div
      className={`
        relative
        flex
        shrink-0
        items-center
        justify-center
        overflow-hidden
        rounded-2xl
        border
        shadow-sm
        ${
          variant ===
          "light"
            ? "border-white/20 bg-white/10 shadow-black/10"
            : "border-slate-200 bg-white shadow-slate-900/5"
        }
      `}
      style={{
        width:
          size,

        height:
          size,
      }}
    >
      <Image
        src="/images/pin-tell-logo.png"
        alt="PIN & TELL logo"
        width={
          size
        }
        height={
          size
        }
        priority
        className="
          h-full
          w-full
          object-contain
          p-1.5
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-x-2
          top-0
          h-px
          bg-gradient-to-r
          from-transparent
          via-white/70
          to-transparent
        "
      />
    </div>
  );
}

/* =========================================================
   SUBTLE MAP BACKGROUND
========================================================= */

function BrandPanelMapOverlay() {
  return (
    <div
      aria-hidden="true"
      className="
        pointer-events-none
        absolute
        inset-0
        overflow-hidden
      "
    >
      {/* soft texture */}
      <div
        className="
          absolute
          inset-0
          opacity-[0.18]
        "
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)
          `,
          backgroundSize:
            "34px 34px",
        }}
      />

      {/* subtle map route lines */}
      <svg
        viewBox="0 0 1000 1000"
        className="
          absolute
          inset-0
          h-full
          w-full
        "
        preserveAspectRatio="none"
      >
        <path
          d="M70 180 C 150 140, 210 180, 280 240 S 430 330, 530 300 S 700 220, 820 290 S 930 420, 930 420"
          fill="none"
          stroke="rgba(255,255,255,0.11)"
          strokeWidth="2.2"
          strokeDasharray="8 12"
          strokeLinecap="round"
        />

        <path
          d="M110 650 C 180 590, 240 560, 330 575 S 500 650, 610 620 S 760 520, 870 560"
          fill="none"
          stroke="rgba(255,255,255,0.09)"
          strokeWidth="2"
          strokeDasharray="10 14"
          strokeLinecap="round"
        />

        <path
          d="M160 90 C 235 170, 260 250, 230 355 S 220 560, 320 650 S 480 770, 590 820"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1.8"
          strokeDasharray="7 12"
          strokeLinecap="round"
        />

        <path
          d="M640 110 C 600 170, 585 245, 610 330 S 720 490, 735 585 S 690 760, 640 845"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1.8"
          strokeDasharray="8 14"
          strokeLinecap="round"
        />

        <path
          d="M320 420 C 410 395, 465 430, 545 470 S 690 585, 780 620"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1.6"
          strokeDasharray="6 12"
          strokeLinecap="round"
        />
      </svg>

      {/* soft geographic glow */}
      <div
        className="
          absolute
          -right-20
          top-10
          h-72
          w-72
          rounded-full
          bg-white/[0.04]
          blur-3xl
        "
      />

      <div
        className="
          absolute
          -bottom-20
          left-6
          h-72
          w-72
          rounded-full
          bg-white/[0.03]
          blur-3xl
        "
      />

      {/* map pins */}
      <div
        className="
          absolute
          left-[16%]
          top-[16%]
          text-white/12
        "
      >
        <MapPin size={18} strokeWidth={1.8} />
      </div>

      <div
        className="
          absolute
          left-[28%]
          top-[38%]
          text-white/10
        "
      >
        <MapPin size={16} strokeWidth={1.8} />
      </div>

      <div
        className="
          absolute
          left-[67%]
          top-[22%]
          text-white/10
        "
      >
        <MapPin size={18} strokeWidth={1.8} />
      </div>

      <div
        className="
          absolute
          left-[77%]
          top-[54%]
          text-white/12
        "
      >
        <MapPin size={17} strokeWidth={1.8} />
      </div>

      <div
        className="
          absolute
          left-[54%]
          top-[70%]
          text-white/10
        "
      >
        <MapPin size={16} strokeWidth={1.8} />
      </div>

      <div
        className="
          absolute
          left-[22%]
          top-[78%]
          text-white/10
        "
      >
        <MapPin size={17} strokeWidth={1.8} />
      </div>

      {/* subtle point markers */}
      <span
        className="
          absolute
          left-[35%]
          top-[28%]
          h-1.5
          w-1.5
          rounded-full
          bg-white/20
        "
      />

      <span
        className="
          absolute
          left-[72%]
          top-[35%]
          h-1.5
          w-1.5
          rounded-full
          bg-white/20
        "
      />

      <span
        className="
          absolute
          left-[43%]
          top-[62%]
          h-1.5
          w-1.5
          rounded-full
          bg-white/15
        "
      />

      <span
        className="
          absolute
          left-[82%]
          top-[76%]
          h-1.5
          w-1.5
          rounded-full
          bg-white/15
        "
      />
    </div>
  );
}

/* =========================================================
   LOGIN PAGE
========================================================= */

export default async function AdminLoginPage() {
  const admin =
    await getCurrentAdmin();

  if (
    admin
  ) {
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
      {/* page background */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-0
        "
        style={{
          backgroundImage: `
            radial-gradient(circle at 12% 15%, rgba(253,193,201,0.18), transparent 28%),
            radial-gradient(circle at 88% 85%, rgba(204,58,103,0.08), transparent 30%),
            linear-gradient(rgba(114,33,58,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(114,33,58,0.02) 1px, transparent 1px)
          `,
          backgroundSize:
            "auto, auto, 36px 36px, 36px 36px",
        }}
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -left-36
          -top-36
          h-[420px]
          w-[420px]
          rounded-full
          bg-[#FDC1C9]/18
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
          h-[470px]
          w-[470px]
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
          shadow-[0_30px_90px_rgba(64,29,42,0.10)]
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
          <BrandPanelMapOverlay />

          {/* very subtle top sheen */}
          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              inset-x-0
              top-0
              h-28
              bg-gradient-to-b
              from-white/[0.03]
              to-transparent
            "
          />

          {/* Header */}
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
                justify-between
                gap-4
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
                  <div
                    className="
                      flex
                      items-center
                      gap-2
                    "
                  >
                    <p
                      className="
                        text-lg
                        font-bold
                        tracking-tight
                      "
                    >
                      PIN &amp; TELL
                    </p>

                    <span
                      className="
                        h-1.5
                        w-1.5
                        rounded-full
                        bg-[#FDC1C9]
                        shadow-[0_0_10px_rgba(253,193,201,0.55)]
                      "
                    />
                  </div>

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
                  flex
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-white/10
                  bg-black/10
                  px-3
                  py-1.5
                  text-[10px]
                  font-medium
                  text-white/60
                  backdrop-blur
                "
              >
                <span
                  className="
                    h-1.5
                    w-1.5
                    rounded-full
                    bg-emerald-400
                    shadow-[0_0_8px_rgba(52,211,153,0.65)]
                  "
                />

                System online
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
                <ShieldCheck size={14} />
                Secure administration
                <Sparkles
                  size={12}
                  className="
                    text-[#FDC1C9]
                  "
                />
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
                platform with{" "}
                <span
                  className="
                    relative
                    inline-block
                    text-[#FDC1C9]
                  "
                >
                  confidence.
                  <span
                    aria-hidden="true"
                    className="
                      absolute
                      -bottom-1
                      left-0
                      h-px
                      w-full
                      bg-gradient-to-r
                      from-[#FDC1C9]/70
                      to-transparent
                    "
                  />
                </span>
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
                workspace for managing
                PIN &amp; TELL users,
                reports, pins,
                moderation and
                platform activity.
              </p>

              <div
                className="
                  mt-7
                  flex
                  flex-wrap
                  items-center
                  gap-x-5
                  gap-y-2
                  text-[10px]
                  font-medium
                  text-white/45
                "
              >
                <span
                  className="
                    flex
                    items-center
                    gap-1.5
                  "
                >
                  <CircleCheck
                    size={12}
                    className="
                      text-[#FDC1C9]
                    "
                  />
                  Secure access
                </span>

                <span
                  className="
                    flex
                    items-center
                    gap-1.5
                  "
                >
                  <CircleCheck
                    size={12}
                    className="
                      text-[#FDC1C9]
                    "
                  />
                  Audit logging
                </span>

                <span
                  className="
                    flex
                    items-center
                    gap-1.5
                  "
                >
                  <CircleCheck
                    size={12}
                    className="
                      text-[#FDC1C9]
                    "
                  />
                  Session control
                </span>
              </div>
            </div>
          </div>

          {/* Bottom cards */}
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
                relative
                overflow-hidden
                rounded-2xl
                border
                border-white/10
                bg-white/[0.07]
                p-4
                backdrop-blur-sm
                transition
                duration-300
                hover:-translate-y-0.5
                hover:border-white/20
                hover:bg-white/[0.10]
              "
            >
              <div className="relative">
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
                  Protected sessions
                </p>

                <p
                  className="
                    mt-1
                    text-xs
                    leading-5
                    text-white/50
                  "
                >
                  Secure, revocable
                  administrator access.
                </p>
              </div>
            </div>

            <div
              className="
                relative
                overflow-hidden
                rounded-2xl
                border
                border-white/10
                bg-white/[0.07]
                p-4
                backdrop-blur-sm
                transition
                duration-300
                hover:-translate-y-0.5
                hover:border-white/20
                hover:bg-white/[0.10]
              "
            >
              <div className="relative">
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
                  Security events are
                  recorded and monitored.
                </p>
              </div>
            </div>
          </div>

          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              bottom-[168px]
              right-10
              flex
              items-center
              gap-2
              text-white/[0.12]
            "
          >
            <Navigation size={13} />
            <div
              className="
                h-px
                w-12
                bg-white/10
              "
            />
            <MapPin size={13} />
          </div>
        </section>

        {/* LOGIN PANEL */}
        <section
          className="
            relative
            flex
            items-center
            justify-center
            overflow-hidden
            px-5
            py-10
            sm:px-10
            lg:px-14
            xl:px-16
          "
        >
          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              -right-24
              top-24
              h-56
              w-56
              rounded-full
              bg-[#FDC1C9]/18
              blur-3xl
            "
          />

          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              bottom-6
              left-8
              h-32
              w-32
              rounded-full
              bg-[#CC3A67]/[0.04]
              blur-2xl
            "
          />

          <div
            className="
              relative
              z-10
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
                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >
                  <p
                    className="
                      font-bold
                      text-slate-900
                    "
                  >
                    PIN &amp; TELL
                  </p>

                  <span
                    className="
                      h-1.5
                      w-1.5
                      rounded-full
                      bg-[#CC3A67]
                    "
                  />
                </div>

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
              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-4
                "
              >
                <p
                  className="
                    inline-flex
                    items-center
                    gap-1.5
                    text-sm
                    font-semibold
                    text-[#A92F56]
                  "
                >
                  <span
                    className="
                      h-1.5
                      w-1.5
                      rounded-full
                      bg-[#CC3A67]
                      shadow-[0_0_8px_rgba(204,58,103,0.45)]
                    "
                  />
                  Administrator access
                </p>

                <ShieldCheck
                  size={18}
                  className="
                    text-[#A92F56]/40
                  "
                />
              </div>

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
                PIN &amp; TELL
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
              <div
                className="
                  mb-3
                  flex
                  items-center
                  justify-center
                  gap-2
                  text-[10px]
                  font-medium
                  text-slate-400
                "
              >
                <span
                  className="
                    h-px
                    w-7
                    bg-slate-200
                  "
                />

                <ShieldCheck size={12} />

                SECURE ADMIN PORTAL

                <span
                  className="
                    h-px
                    w-7
                    bg-slate-200
                  "
                />
              </div>

              <p
                className="
                  text-xs
                  leading-5
                  text-slate-400
                "
              >
                Access is restricted to
                authorized personnel.
                Authentication activity may
                be recorded for security and
                auditing.
              </p>
            </div>
          </div>
        </section>

        {/* top accent line */}
        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            left-0
            right-0
            top-0
            z-20
            h-[2px]
            bg-gradient-to-r
            from-transparent
            via-[#CC3A67]/50
            to-transparent
          "
        />
      </div>
    </main>
  );
}