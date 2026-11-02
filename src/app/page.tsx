import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowDown,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  Compass,
  Download,
  ExternalLink,
  Film,
  Fuel,
  Heart,
  Leaf,
  MapPin,
  MapPinned,
  Navigation,
  Play,
  Route,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";

/**
 * PUBLIC HOMEPAGE · PIN & TELL
 * File: src/app/page.tsx
 *
 * Server-rendered on purpose: all motion is lightweight CSS (including
 * progressive-enhancement scroll timelines), with zero client-side JS.
 * The administrative system and its auth routes are not referenced here.
 */
export const metadata: Metadata = {
  title: "PIN & TELL | Find More Than a Destination",
  description:
    "PIN & TELL connects community map pins, travel, fuel logs, and driving insights in one Android experience. Explore the app and download the official release.",
  icons: {
    icon: "/images/pin-tell-logo.png",
    apple: "/images/pin-tell-logo.png",
  },
  // The root layout currently defaults to noindex for the admin site.
  // This public landing page explicitly opts in to indexing.
  robots: { index: true, follow: true },
};

function safePublicUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

const apkUrl = safePublicUrl(process.env.NEXT_PUBLIC_ANDROID_APK_URL);
const playStoreUrl = safePublicUrl(
  process.env.NEXT_PUBLIC_ANDROID_PLAY_STORE_URL,
);
const avpUrl = safePublicUrl(process.env.NEXT_PUBLIC_AVP_VIDEO_URL);

function youtubeEmbedUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    let id: string | null = null;
    if (hostname === "youtu.be" || hostname === "www.youtu.be") {
      id = parsed.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (
      hostname === "youtube.com" ||
      hostname === "www.youtube.com" ||
      hostname === "m.youtube.com" ||
      hostname === "www.youtube-nocookie.com" ||
      hostname === "youtube-nocookie.com"
    ) {
      id = parsed.pathname.startsWith("/shorts/") ||
        parsed.pathname.startsWith("/embed/")
        ? parsed.pathname.split("/")[2] ?? null
        : parsed.searchParams.get("v");
    }
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id)
      ? `https://www.youtube-nocookie.com/embed/${id}`
      : null;
  } catch {
    return null;
  }
}

const avpEmbed = youtubeEmbedUrl(avpUrl);

function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3">
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-white p-1 shadow-[0_4px_22px_rgba(0,0,0,.1)]">
        <Image
          src="/images/pin-tell-logo.png"
          alt="PIN & TELL logo"
          width={44}
          height={44}
          sizes="44px"
          priority
          className="h-full w-full object-contain"
        />
      </span>
      <span
        className={`text-[16px] font-black tracking-[-.055em] sm:text-lg ${
          light ? "text-white" : "text-[#482130]"
        }`}
      >
        PIN <span className={light ? "text-[#FDC1C9]" : "text-[#A92F56]"}>&</span> TELL
      </span>
    </span>
  );
}

function Label({
  children,
  light = false,
}: {
  children: ReactNode;
  light?: boolean;
}) {
  return (
    <div className={`pt-label ${light ? "text-[#FFBFCF]" : "text-[#A92F56]"}`}>
      <span className="pt-label-dash" aria-hidden="true" />
      {children}
    </div>
  );
}

function ApkButton({
  light = false,
  big = false,
}: {
  light?: boolean;
  big?: boolean;
}) {
  const className = `pt-pill pt-pill-primary ${big ? "pt-pill-big" : ""} ${
    light ? "pt-pill-on-dark" : ""
  }`;

  if (!apkUrl) {
    return (
      <span className={`${className} pt-pill-disabled`} aria-label="APK coming soon">
        <Download size={17} strokeWidth={2} /> APK coming soon
      </span>
    );
  }

  return (
    <a
      href={apkUrl}
      className={className}
      download={apkUrl.startsWith("/") ? "pin-and-tell.apk" : undefined}
      target={apkUrl.startsWith("/") ? undefined : "_blank"}
      rel={apkUrl.startsWith("/") ? undefined : "noopener noreferrer"}
    >
      <Download size={17} strokeWidth={2} /> Download for Android
      <ArrowUpRight size={17} />
    </a>
  );
}

/** Original illustrative map UI. This is not a screenshot or user data. */
function RouteMap({ short = false }: { short?: boolean }) {
  return (
    <div className={`pt-map ${short ? "pt-map-short" : ""}`} aria-label="Illustrative community map">
      <svg
        className="pt-map-svg"
        viewBox="0 0 440 460"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label="Illustrated city map with a highlighted route between two stops"
      >
        <rect width="440" height="460" fill="#F1EFE5" />
        <path d="M-40 22L132 -30L194 149L-43 203Z" fill="#E2EBD9" />
        <path d="M293 -35L499 -14L489 204L343 187L265 88Z" fill="#E0EAD7" />
        <path d="M-40 361L113 295L210 505L-30 505Z" fill="#DBE7D4" />
        <path d="M266 319L473 254V505H267Z" fill="#DCEAD3" />
        <path
          d="M373 -50C317 44 347 123 415 195C477 262 423 376 371 503"
          stroke="#BBDDE7"
          strokeWidth="44"
          fill="none"
        />
        <g fill="none" stroke="#FAF9F5" strokeLinecap="round">
          <path d="M-50 86L486 366" strokeWidth="32" />
          <path d="M60 -35L257 505" strokeWidth="28" />
          <path d="M-60 387L485 67" strokeWidth="31" />
          <path d="M286 -40L150 507" strokeWidth="22" />
          <path d="M-36 243L483 224" strokeWidth="14" />
        </g>
        <g fill="none" stroke="#D7D2C8" strokeWidth="1.8" strokeDasharray="5 11">
          <path d="M-50 86L486 366" />
          <path d="M60 -35L257 505" />
          <path d="M-60 387L485 67" />
          <path d="M286 -40L150 507" />
        </g>
        <path
          className="pt-route-shadow"
          d="M85 339C120 275 127 181 206 191C283 202 272 88 336 115"
          fill="none"
          stroke="#FFFFFF"
          strokeLinecap="round"
          strokeWidth="11"
        />
        <path
          className="pt-route-line"
          d="M85 339C120 275 127 181 206 191C283 202 272 88 336 115"
          fill="none"
          stroke="#BE3E64"
          strokeLinecap="round"
          strokeWidth="5"
          pathLength="100"
        />
        <circle className="pt-map-stop" cx="85" cy="339" r="11" fill="#fff" stroke="#A92F56" strokeWidth="5" />
        <circle className="pt-map-stop pt-map-stop-late" cx="336" cy="115" r="11" fill="#fff" stroke="#A92F56" strokeWidth="5" />
        <g fill="#4B6459" fontSize="11" fontWeight="700" fontFamily="Arial, sans-serif" opacity=".7">
          <text x="54" y="62">WEST SIDE</text>
          <text x="278" y="418">RIVERSIDE</text>
          <text x="32" y="420">PARK</text>
        </g>
      </svg>
      <div className="pt-map-flag pt-map-flag-one">
        <MapPin size={15} fill="#A92F56" color="#A92F56" />
        Coffee stop
      </div>
      <div className="pt-map-flag pt-map-flag-two">
        <MapPin size={15} fill="#A92F56" color="#A92F56" />
        New discovery
      </div>
      <span className="pt-map-index">MAP / 01 — COMMUNITY EXPLORATION</span>
    </div>
  );
}

function PhoneScene() {
  return (
    <div className="pt-scene" aria-label="Illustrative PIN & TELL Android app preview">
      <div className="pt-scene-halo" aria-hidden="true" />
      <div className="pt-scene-ring pt-scene-ring-a" aria-hidden="true" />
      <div className="pt-scene-ring pt-scene-ring-b" aria-hidden="true" />
      <div className="pt-scene-coordinate pt-scene-coordinate-a" aria-hidden="true">14°36′ N</div>
      <div className="pt-scene-coordinate pt-scene-coordinate-b" aria-hidden="true">121°02′ E</div>

      <div className="pt-phone-float">
        <div className="pt-phone">
          <div className="pt-phone-screen">
            <div className="pt-phone-island" aria-hidden="true" />
            <div className="pt-phone-header">
              <div>
                <p className="pt-phone-overline">GOOD DAY, EXPLORER</p>
                <h3>Find your place.</h3>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF0F4]">
                <Image
                  src="/images/pin-tell-logo.png"
                  alt=""
                  width={31}
                  height={31}
                  sizes="31px"
                  className="h-8 w-8 object-contain"
                />
              </span>
            </div>
            <div className="pt-phone-map">
              <RouteMap />
            </div>
            <div className="pt-phone-info">
              <span className="pt-phone-info-icon"><Navigation size={20} /></span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[#4B2633]">Go somewhere new</p>
                <p className="mt-0.5 text-[10px] text-[#977E85]">Discover places shared nearby</p>
              </div>
              <ArrowUpRight size={17} color="#A92F56" />
            </div>
            <div className="pt-phone-tabs" aria-hidden="true">
              <MapPinned size={18} color="#A92F56" />
              <Route size={18} />
              <Fuel size={18} />
              <Users size={18} />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-floating-note pt-floating-note-left">
        <span className="pt-note-icon"><MapPinned size={19} /></span>
        <span><strong>Someone pinned a place.</strong><small>Now you can discover it.</small></span>
      </div>
      <div className="pt-floating-note pt-floating-note-right">
        <span className="pt-note-icon pt-note-icon-green"><Leaf size={19} /></span>
        <span><strong>One journey, more insight.</strong><small>Trips, fuel and more.</small></span>
      </div>
      <p className="pt-scene-caption">Visual concept / Not an actual app screenshot</p>
    </div>
  );
}

function SectionIntro({
  number,
  eyebrow,
  children,
  light = false,
}: {
  number: string;
  eyebrow: string;
  children: ReactNode;
  light?: boolean;
}) {
  return (
    <div className="pt-section-intro pt-view-enter">
      <span className={`pt-chapter-number ${light ? "text-white/35" : "text-[#C99AAA]"}`}>{number}</span>
      <div>
        <Label light={light}>{eyebrow}</Label>
        {children}
      </div>
    </div>
  );
}

const styles = String.raw`
  /* These styles are limited to the public homepage: nothing global is changed. */
  html:has(.pt-home) { scroll-behavior:smooth; }
  .pt-home { --pt-ink:#472432; --pt-red:#A92F56; --pt-pink:#CC3A67; --pt-blush:#FDC1C9; --pt-cream:#FFF9F7; font-family:Arial,Helvetica,sans-serif; }
  .pt-home * { scroll-margin-top:100px; }
  .pt-home ::selection { background:#FDC1C9; color:#48212D; }
  .pt-label { display:flex; align-items:center; gap:12px; font-size:10px; font-weight:800; letter-spacing:.23em; text-transform:uppercase; }
  .pt-label-dash { display:block; width:26px; height:2px; background:currentColor; flex-shrink:0; }
  .pt-serif { font-family:Georgia,'Times New Roman',serif; font-style:italic; font-weight:400; letter-spacing:-.07em; }
  .pt-header { transition:background .3s ease,border-color .3s ease; }
  .pt-header a { text-decoration:none; }
  .pt-navlink { position:relative; padding-block:9px; }
  .pt-navlink::after { content:''; position:absolute; bottom:1px; left:0; height:1px; width:100%; background:#FDC1C9; transform:scaleX(0); transform-origin:left; transition:transform .3s cubic-bezier(.22,1,.36,1); }
  .pt-navlink:hover::after,.pt-navlink:focus-visible::after { transform:scaleX(1); }
  .pt-pill { position:relative; display:inline-flex; align-items:center; justify-content:center; gap:12px; min-height:48px; border-radius:100px; padding:13px 22px; font-size:12px; font-weight:800; text-decoration:none; letter-spacing:.005em; overflow:hidden; transition:transform .3s cubic-bezier(.2,.8,.2,1),box-shadow .3s ease,background .3s ease; white-space:nowrap; }
  .pt-pill:hover { transform:translateY(-3px); }
  .pt-pill:focus-visible,.pt-home a:focus-visible,.pt-home summary:focus-visible { outline:3px solid #FDC1C9; outline-offset:4px; }
  .pt-pill-primary { background:#A92F56; color:#fff; box-shadow:0 12px 35px -15px #A92F56; }
  .pt-pill-primary::before { content:''; position:absolute; inset:-100% -70%; transform:translateX(-120%) rotate(25deg); background:linear-gradient(90deg,transparent,rgba(255,255,255,.2),transparent); transition:transform .8s cubic-bezier(.2,.9,.2,1); pointer-events:none; }
  .pt-pill-primary:hover::before { transform:translateX(120%) rotate(25deg); }
  .pt-pill-primary:hover { background:#892341; box-shadow:0 18px 36px -14px #A92F56; }
  .pt-pill-on-dark { background:#FFF0E9; color:#64253E; box-shadow:0 18px 45px -20px #18040D; }
  .pt-pill-on-dark:hover { background:white; }
  .pt-pill-big { min-height:60px; padding:17px 30px; font-size:14px; }
  .pt-pill-disabled { cursor:not-allowed; opacity:.72; box-shadow:none; }
  .pt-pill-disabled:hover { transform:none; }
  .pt-hero { isolation:isolate; position:relative; background:#3C1627; overflow:hidden; }
  .pt-hero::before { content:''; pointer-events:none; position:absolute; inset:0; opacity:.58; background:radial-gradient(ellipse 55% 65% at 76% 42%,#9D365C 0%,transparent 73%),radial-gradient(ellipse 50% 80% at -10% 100%,#6E2340,transparent 75%); }
  .pt-hero::after { content:''; pointer-events:none; position:absolute; inset:0; opacity:.15; background-image:linear-gradient(to right,rgba(255,255,255,.2) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,.2) 1px,transparent 1px); background-size:84px 84px; mask-image:linear-gradient(90deg,transparent 5%,black 65%,transparent 100%); }
  .pt-hero-glow { position:absolute; width:500px; height:500px; border-radius:50%; left:-270px; top:-200px; border:1px solid rgba(255,255,255,.16); box-shadow:0 0 0 80px rgba(255,255,255,.018),0 0 0 160px rgba(255,255,255,.012); animation:pt-breathe 7s ease-in-out infinite alternate; }
  .pt-hero-display { font-size:clamp(4.2rem,8.2vw,8.1rem); line-height:.92; letter-spacing:-.085em; font-weight:900; }
  .pt-hero-lead { font-size:clamp(15px,1.5vw,18px); line-height:1.9; }
  .pt-hero-reveal { animation:pt-rise .9s cubic-bezier(.16,1,.3,1) both; }
  .pt-hero-reveal-1 { animation-delay:.08s; }
  .pt-hero-reveal-2 { animation-delay:.22s; }
  .pt-hero-reveal-3 { animation-delay:.36s; }
  .pt-hero-reveal-4 { animation-delay:.5s; }
  .pt-hero-reveal-5 { animation-delay:.64s; }
  .pt-hero-underline { position:relative; white-space:nowrap; display:inline-block; }
  .pt-hero-underline::after { content:''; height:6px; position:absolute; left:3%; right:2%; bottom:-12px; background:#FDC1C9; transform-origin:left; transform:rotate(-2deg) scaleX(0); animation:pt-line-in .65s 1s cubic-bezier(.16,1,.3,1) forwards; border-radius:20px; }
  .pt-hero-index { writing-mode:vertical-rl; font-size:10px; font-weight:800; letter-spacing:.22em; }
  .pt-scene { width:100%; max-width:610px; min-height:660px; position:relative; display:flex; align-items:center; justify-content:center; isolation:isolate; }
  .pt-scene-halo { position:absolute; height:500px; width:500px; border-radius:50%; background:radial-gradient(circle,rgba(253,193,201,.23),transparent 67%); filter:blur(3px); animation:pt-breathe 5s ease-in-out infinite alternate; }
  .pt-scene-ring { position:absolute; border:1px solid rgba(255,255,255,.15); border-radius:50%; animation:pt-orbit 34s linear infinite; }
  .pt-scene-ring::before { content:''; display:block; width:8px; height:8px; border-radius:50%; position:absolute; left:50%; top:-4px; background:#FDC1C9; box-shadow:0 0 17px 4px rgba(253,193,201,.5); }
  .pt-scene-ring-a { width:440px; height:440px; }
  .pt-scene-ring-b { width:560px; height:560px; border-style:dashed; border-color:rgba(255,255,255,.11); animation-direction:reverse; animation-duration:55s; }
  .pt-scene-coordinate { position:absolute; z-index:2; font-size:10px; font-family:monospace; letter-spacing:.16em; color:#E8ABB9; }
  .pt-scene-coordinate-a { right:7%; top:13%; }
  .pt-scene-coordinate-b { left:2%; bottom:17%; }
  .pt-phone-float { position:relative; z-index:3; animation:pt-floating 6s ease-in-out infinite; }
  .pt-phone { transform:rotate(6deg); padding:7px; border:2px solid #170A12; width:285px; border-radius:45px; background:#190A12; box-shadow:0 52px 90px -30px rgba(5,2,5,.65),inset 0 0 0 1px rgba(255,255,255,.18); transition:transform .7s cubic-bezier(.2,.8,.2,1); }
  .pt-phone:hover { transform:rotate(1deg) scale(1.025); }
  .pt-phone-screen { position:relative; overflow:hidden; background:#FFFDFB; border-radius:36px; color:#4A2835; }
  .pt-phone-island { position:absolute; z-index:5; top:9px; left:50%; transform:translateX(-50%); height:18px; width:84px; background:#180B13; border-radius:20px; }
  .pt-phone-header { padding:45px 17px 15px; display:flex; align-items:center; justify-content:space-between; }
  .pt-phone-header h3 { font-size:19px; font-weight:900; letter-spacing:-.055em; }
  .pt-phone-overline { color:#B64969; font-size:9px; font-weight:800; letter-spacing:.12em; margin-bottom:5px; }
  .pt-phone-map { margin-inline:11px; border-radius:18px; overflow:hidden; }
  .pt-map { height:325px; width:100%; position:relative; background:#F1EFE5; overflow:hidden; isolation:isolate; }
  .pt-map-short { height:380px; border-radius:15px; }
  .pt-map-svg { position:absolute; inset:0; width:100%; height:100%; }
  .pt-route-shadow { opacity:.86; }
  .pt-route-line { stroke-dasharray:100; stroke-dashoffset:100; animation:pt-route-draw 3.3s 1s cubic-bezier(.25,.8,.25,1) both; }
  .pt-map-stop { animation:pt-pin-pop .6s 2.7s cubic-bezier(.16,1,.3,1) both; transform-box:fill-box; transform-origin:center; }
  .pt-map-stop-late { animation-delay:3.2s; }
  .pt-map-flag { position:absolute; z-index:1; display:flex; align-items:center; gap:6px; border:1px solid rgba(161,74,104,.1); border-radius:9px; padding:7px 9px; background:#fff; color:#512C3A; box-shadow:0 10px 25px rgba(84,46,59,.13); font-weight:800; font-size:9px; animation:pt-pin-label .7s 3.1s both; }
  .pt-map-flag-one { left:8%; bottom:18%; }
  .pt-map-flag-two { right:9%; top:17%; animation-delay:3.4s; }
  .pt-map-index { position:absolute; left:12px; bottom:10px; letter-spacing:.15em; font-size:7px; font-weight:700; color:#6D7770; opacity:.7; }
  .pt-phone-info { display:flex; align-items:center; gap:10px; border:1px solid #F5E5E9; padding:11px; margin:13px 13px 0; font-size:11px; border-radius:12px; }
  .pt-phone-info-icon { display:flex; align-items:center; justify-content:center; width:39px; height:39px; color:#A92F56; border-radius:9px; background:#F9E6EB; }
  .pt-phone-tabs { margin:14px 20px 12px; padding-top:12px; border-top:1px solid #F3E5E8; display:flex; justify-content:space-around; color:#B3A3A8; }
  .pt-floating-note { z-index:5; position:absolute; display:flex; align-items:center; gap:10px; border:1px solid rgba(238,211,221,.8); padding:13px 16px; border-radius:14px; background:rgba(255,255,255,.96); box-shadow:0 20px 40px -15px rgba(28,3,18,.32); color:#4A2835; animation:pt-note-float 5s ease-in-out infinite alternate; }
  .pt-floating-note strong { display:block; font-size:11px; white-space:nowrap; letter-spacing:-.01em; }
  .pt-floating-note small { display:block; margin-top:4px; font-size:10px; color:#947A86; white-space:nowrap; }
  .pt-note-icon { display:grid; place-items:center; width:37px; height:37px; background:#FCE6EE; border-radius:11px; color:#A92F56; }
  .pt-note-icon-green { background:#E5F0E4; color:#46805B; }
  .pt-floating-note-left { left:0; top:25%; transform:rotate(-6deg); }
  .pt-floating-note-right { right:-1%; bottom:19%; transform:rotate(5deg); animation-delay:1.2s; }
  .pt-scene-caption { position:absolute; left:50%; bottom:0; transform:translateX(-50%); white-space:nowrap; font-size:9px; color:rgba(255,255,255,.5); letter-spacing:.04em; }
  .pt-marquee-shell { overflow:hidden; border-block:1px solid #E9D7DE; background:#FFF9F8; }
  .pt-marquee-track { display:flex; align-items:center; gap:36px; width:max-content; padding-block:19px; animation:pt-marquee 38s linear infinite; }
  .pt-marquee-shell:hover .pt-marquee-track { animation-play-state:paused; }
  .pt-marquee-word { display:inline-flex; align-items:center; gap:36px; flex-shrink:0; font-size:12px; font-weight:900; letter-spacing:.2em; color:#6D374C; }
  .pt-marquee-diamond { height:7px; width:7px; background:#C64970; transform:rotate(45deg); }
  .pt-section-intro { display:flex; align-items:start; gap:25px; }
  .pt-chapter-number { line-height:1; font-size:12px; font-weight:900; letter-spacing:.12em; padding-top:3px; }
  .pt-section-title { font-size:clamp(2.6rem,5vw,5rem); line-height:1.08; letter-spacing:-.07em; font-weight:900; }
  .pt-layout-grid { display:grid; gap:24px; }
  .pt-editorial-card { position:relative; overflow:hidden; border:1px solid #E8D8DE; border-radius:24px; transition:transform .5s cubic-bezier(.2,.8,.2,1),box-shadow .5s ease,border-color .5s ease; }
  .pt-editorial-card:hover { transform:translateY(-7px); box-shadow:0 38px 65px -44px rgba(114,33,58,.34); border-color:#DCADB9; }
  .pt-card-arrow { transition:transform .3s cubic-bezier(.2,.8,.2,1); }
  .pt-editorial-card:hover .pt-card-arrow { transform:translate(4px,-4px); }
  .pt-card-number { font-size:11px; font-weight:800; letter-spacing:.2em; }
  .pt-motion-tag { display:inline-flex; align-items:center; gap:8px; border-radius:999px; padding:8px 12px; border:1px solid #E6CBD4; font-size:10px; font-weight:800; letter-spacing:.09em; text-transform:uppercase; color:#8A3454; }
  .pt-map-editorial { overflow:hidden; position:relative; background:#F5EFE7; border-radius:22px; }
  .pt-map-editorial::after { content:''; pointer-events:none; position:absolute; inset:0; border:1px solid rgba(255,255,255,.7); border-radius:inherit; }
  .pt-metric-line { fill:none; stroke:#FDC1C9; stroke-width:4; stroke-linecap:round; stroke-linejoin:round; stroke-dasharray:10 5; animation:pt-dash 9s linear infinite; }
  .pt-metric-glow { fill:none; stroke:#D44E79; stroke-width:2; opacity:.65; }
  .pt-travel-bars { display:flex; align-items:end; gap:9px; height:116px; }
  .pt-travel-bars span { display:block; width:100%; border-radius:6px 6px 0 0; background:linear-gradient(0deg,#A92F56,#FDC1C9); transform-origin:bottom; animation:pt-bars 1.2s cubic-bezier(.16,1,.3,1) both; }
  .pt-travel-bars span:nth-child(2) { animation-delay:.18s; }
  .pt-travel-bars span:nth-child(3) { animation-delay:.36s; }
  .pt-travel-bars span:nth-child(4) { animation-delay:.54s; }
  .pt-travel-bars span:nth-child(5) { animation-delay:.72s; }
  .pt-travel-bars span:nth-child(6) { animation-delay:.90s; }
  .pt-travel-bars span:nth-child(7) { animation-delay:1.08s; }
  .pt-tile-shine { position:absolute; inset:0; background:linear-gradient(135deg,transparent 35%,rgba(255,255,255,.25) 49%,transparent 62%); transform:translateX(-110%); transition:transform .9s; pointer-events:none; }
  .pt-editorial-card:hover .pt-tile-shine { transform:translateX(110%); }
  .pt-step { border-top:1px solid #DABDC6; padding-top:22px; transition:border-color .3s ease; }
  .pt-step:hover { border-color:#A92F56; }
  .pt-step-index { font-size:56px; font-weight:900; line-height:1; letter-spacing:-.07em; color:#DEBFC9; transition:color .3s,transform .3s; }
  .pt-step:hover .pt-step-index { color:#A92F56; transform:translateY(-4px); }
  .pt-video-shell { position:relative; overflow:hidden; border-radius:24px; background:#26111C; box-shadow:0 32px 100px -50px rgba(40,6,22,.5); }
  .pt-video-shell::before { content:''; position:absolute; z-index:0; inset:0; background:radial-gradient(ellipse at 50% 20%,rgba(211,78,122,.45),transparent 60%); pointer-events:none; }
  .pt-video-placeholder { background:repeating-linear-gradient(90deg,transparent 0px,transparent 80px,rgba(255,255,255,.045) 81px),radial-gradient(circle at 75% 18%,#8E3155,transparent 60%),linear-gradient(125deg,#53203A,#22101D); }
  .pt-video-play { animation:pt-soft-pulse 3.5s ease-in-out infinite; }
  .pt-video-play::after { position:absolute; content:''; inset:-12px; border:1px solid rgba(255,255,255,.27); border-radius:50%; animation:pt-expand 3.5s ease-out infinite; }
  .pt-download-grid { background-image:radial-gradient(rgba(255,255,255,.16) 1px,transparent 1px); background-size:24px 24px; mask-image:linear-gradient(90deg,transparent 3%,black 88%); }
  .pt-download-orb { width:380px; height:380px; border-radius:50%; position:absolute; right:-95px; top:-140px; border:1px solid rgba(255,255,255,.2); box-shadow:0 0 0 40px rgba(255,255,255,.035),0 0 0 80px rgba(255,255,255,.025),0 0 0 120px rgba(255,255,255,.02); animation:pt-breathe 6s ease-in-out infinite alternate; }
  .pt-footer-link { position:relative; text-decoration:none; transition:color .25s; }
  .pt-footer-link:hover { color:#fff; }
  .pt-footer-link::after { position:absolute; content:''; bottom:-4px; left:0; width:100%; height:1px; background:#FDC1C9; transform-origin:left; transform:scaleX(0); transition:transform .3s ease; }
  .pt-footer-link:hover::after { transform:scaleX(1); }
  @keyframes pt-rise { from {opacity:0;transform:translateY(30px)} to {opacity:1;transform:translateY(0)} }
  @keyframes pt-line-in { to {transform:rotate(-2deg) scaleX(1)} }
  @keyframes pt-breathe { from {transform:scale(.94);opacity:.5} to {transform:scale(1.08);opacity:1} }
  @keyframes pt-orbit { to {transform:rotate(360deg)} }
  @keyframes pt-floating { 0%,100% {transform:translateY(0)} 50% {transform:translateY(-17px)} }
  @keyframes pt-note-float { from {translate:0 0} to {translate:0 -12px} }
  @keyframes pt-route-draw { to {stroke-dashoffset:0} }
  @keyframes pt-pin-pop { from {opacity:0;transform:scale(0)} to {opacity:1;transform:scale(1)} }
  @keyframes pt-pin-label { from {opacity:0;transform:translateY(9px)} to {opacity:1;transform:translateY(0)} }
  @keyframes pt-marquee { to {transform:translateX(-50%)} }
  @keyframes pt-dash { to {stroke-dashoffset:-100} }
  @keyframes pt-bars { from {transform:scaleY(.06);opacity:.3} to {transform:scaleY(1);opacity:1} }
  @keyframes pt-soft-pulse { 50% {transform:scale(1.06)} }
  @keyframes pt-expand { 0% {opacity:.65;transform:scale(.8)} 70%,100% {opacity:0;transform:scale(1.28)} }
  @keyframes pt-inview { from {opacity:.4;transform:translateY(32px)} to {opacity:1;transform:translateY(0)} }
  @keyframes pt-progress { from {transform:scaleX(0)} to {transform:scaleX(1)} }
  @supports (animation-timeline: view()) {
    .pt-view-enter { animation:pt-inview linear both; animation-timeline:view(); animation-range:entry 0% cover 30%; }
    .pt-view-enter-late { animation:pt-inview linear both; animation-timeline:view(); animation-range:entry 0% cover 42%; }
  }
  @supports (animation-timeline: scroll()) {
    .pt-page-progress { transform-origin:left; animation:pt-progress linear both; animation-timeline:scroll(root block); }
  }
  @media (min-width:1024px) { .pt-scene { margin-left:0; } .pt-phone { width:318px; } .pt-phone-map .pt-map { height:350px; } }
  @media (max-width:767px) {
    .pt-scene { min-height:580px; max-width:470px; }
    .pt-scene-ring-a { width:360px;height:360px; }
    .pt-scene-ring-b { width:480px;height:480px; }
    .pt-scene-halo { width:390px;height:390px; }
    .pt-phone { width:260px; transform:rotate(4deg); }
    .pt-map { height:270px; }
    .pt-phone-map .pt-map { height:270px; }
    .pt-floating-note { padding:10px; }
    .pt-floating-note-left { left:-1%;top:17%; }
    .pt-floating-note-right { right:0%;bottom:14%; }
    .pt-floating-note strong { font-size:9px; }
    .pt-floating-note small { font-size:8px; }
    .pt-note-icon { height:30px;width:30px; }
    .pt-scene-coordinate { display:none; }
  }
  @media (max-width:410px) {
    .pt-floating-note-left { left:-6%; }
    .pt-floating-note-right { right:-6%; }
    .pt-phone { width:246px; }
    .pt-scene { min-height:555px; }
    .pt-scene-ring-b { width:430px;height:430px; }
  }
  @media (prefers-reduced-motion:reduce) {
    html:has(.pt-home) { scroll-behavior:auto; }
    .pt-home *, .pt-home *::before, .pt-home *::after { animation-duration:.01ms!important; animation-iteration-count:1!important; scroll-behavior:auto!important; transition-duration:.01ms!important; }
    .pt-view-enter,.pt-view-enter-late,.pt-hero-reveal { opacity:1!important;transform:none!important; }
    .pt-route-line { stroke-dashoffset:0!important; }
    .pt-hero-underline::after { transform:rotate(-2deg) scaleX(1)!important; }
    .pt-page-progress { display:none; }
  }
`;

export default function HomePage() {
  return (
    <div id="top" className="pt-home min-h-screen overflow-x-clip bg-[#FFFDFC] text-[#472432]">
      <style>{styles}</style>
      <div className="pt-page-progress pointer-events-none fixed left-0 top-0 z-[70] h-[3px] w-full bg-[#FDC1C9]" aria-hidden="true" />

      {/* Public navigation: intentionally NO admin links. */}
      <header className="pt-header sticky top-0 z-50 border-b border-white/10 bg-[#391322]/95 text-white backdrop-blur-xl">
        <div className="mx-auto flex h-[78px] max-w-[1320px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
          <a href="#top" className="shrink-0" aria-label="PIN & TELL home"><Wordmark light /></a>
          <nav aria-label="Main public navigation" className="hidden items-center gap-8 lg:flex">
            <a className="pt-navlink text-[12px] font-bold tracking-wide text-white/75 hover:text-white" href="#discover">Discover</a>
            <a className="pt-navlink text-[12px] font-bold tracking-wide text-white/75 hover:text-white" href="#journeys">On the road</a>
            <a className="pt-navlink text-[12px] font-bold tracking-wide text-white/75 hover:text-white" href="#avp">Watch the film</a>
            <Link className="pt-navlink text-[12px] font-bold tracking-wide text-white/75 hover:text-white" href="/about">Our team</Link>
          </nav>
          <a href="#download" className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-[#FDC1C9]/35 bg-[#FDC1C9] px-4 text-[11px] font-black text-[#4A1C2D] transition-all hover:-translate-y-0.5 hover:bg-white sm:px-5 sm:text-xs">
            Get the app <ArrowUpRight size={16} />
          </a>
        </div>
        <nav aria-label="Mobile public navigation" className="flex items-center justify-center gap-6 overflow-x-auto border-t border-white/10 px-3 py-3 text-[11px] font-bold text-white/75 lg:hidden">
          <a className="whitespace-nowrap hover:text-white" href="#discover">Discover</a>
          <a className="whitespace-nowrap hover:text-white" href="#journeys">Journeys</a>
          <a className="whitespace-nowrap hover:text-white" href="#avp">AVP</a>
          <Link className="whitespace-nowrap hover:text-white" href="/about">About</Link>
        </nav>
      </header>

      <main>
        {/* 01 — editorial, cinematic hero */}
        <section className="pt-hero text-white" aria-labelledby="hero-title">
          <div className="pt-hero-glow" aria-hidden="true" />
          <div className="relative z-10 mx-auto grid max-w-[1320px] items-center gap-2 px-5 pb-14 pt-14 sm:px-8 md:pb-16 lg:min-h-[780px] lg:grid-cols-[1.02fr_.98fr] lg:gap-3 lg:px-12 lg:py-12">
            <div className="relative z-20 max-w-[700px] lg:pb-10">
              <div className="pt-hero-reveal pt-hero-reveal-1 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[.19em] text-[#FFC8D5]">
                <span className="flex h-2 w-2 rounded-full bg-[#FDC1C9] shadow-[0_0_18px_#FDC1C9]" aria-hidden="true" />
                A new kind of journey begins here
              </div>
              <h1 id="hero-title" className="pt-hero-display mt-9 text-white">
                <span className="pt-hero-reveal pt-hero-reveal-2 block">Go beyond</span>
                <span className="pt-hero-reveal pt-hero-reveal-3 block">the <span className="pt-serif pt-hero-underline text-[#FDC1C9]">familiar.</span></span>
              </h1>
              <p className="pt-hero-reveal pt-hero-reveal-4 pt-hero-lead mt-9 max-w-[495px] text-[#F0CED9]">
                Every corner has something worth finding. Explore community-shared places, keep track of your trips, and make every drive more meaningful.
              </p>
              <div className="pt-hero-reveal pt-hero-reveal-5 mt-9 flex flex-wrap items-center gap-4">
                <ApkButton light big />
                <a href="#discover" className="inline-flex min-h-12 items-center gap-2 text-[12px] font-bold text-white/80 transition-colors hover:text-white">
                  Explore the experience <ArrowDownRight size={17} />
                </a>
              </div>
              <div className="pt-hero-reveal pt-hero-reveal-5 mt-11 flex flex-wrap items-center gap-x-7 gap-y-3 text-[10px] font-semibold uppercase tracking-[.11em] text-[#E8B4C5]">
                <span className="flex items-center gap-2"><Check size={14} /> Android app</span>
                <span className="flex items-center gap-2"><Check size={14} /> Community-led</span>
                <span className="flex items-center gap-2"><Check size={14} /> Map-first</span>
              </div>
            </div>
            <PhoneScene />
          </div>
          <div className="absolute bottom-7 left-[max(20px,calc((100vw-1320px)/2+48px))] z-10 hidden items-center gap-3 text-[10px] font-bold uppercase tracking-[.2em] text-white/50 lg:flex">
            <ArrowDown size={16} className="animate-bounce" /> Scroll to discover
          </div>
          <span className="pt-hero-index absolute bottom-10 right-6 z-10 hidden text-white/35 lg:block">PIN & TELL — 2026</span>
        </section>

        {/* Kinetic wayfinding strip. Duplicate sequence is purely for seamless looping. */}
        <div className="pt-marquee-shell" aria-label="Discover, share, explore, and move">
          <div className="pt-marquee-track" aria-hidden="true">
            {Array.from({ length: 2 }).flatMap((_, outer) =>
              ["DISCOVER", "SAVE THE MOMENT", "SHARE", "KEEP MOVING", "EXPLORE", "REPEAT"].map((word, inner) => (
                <span className="pt-marquee-word" key={`${outer}-${inner}`}>
                  <span className="pt-marquee-diamond" />{word}
                </span>
              )),
            )}
          </div>
        </div>

        {/* 02 — feature storytelling, not a wall of identical cards */}
        <section id="discover" className="px-5 py-24 sm:px-8 sm:py-32 lg:px-12">
          <span id="features" className="block h-0" aria-hidden="true" />
          <span id="experience" className="block h-0" aria-hidden="true" />
          <div className="mx-auto max-w-[1180px]">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div className="max-w-[800px]">
                <SectionIntro number="01" eyebrow="The experience">
                  <h2 className="pt-section-title mt-5">
                    A whole world, <span className="pt-serif text-[#A92F56]">one pin</span> at a time.
                  </h2>
                </SectionIntro>
              </div>
              <p className="pt-view-enter max-w-[300px] text-[13px] leading-7 text-[#8C737E]">
                Discover what matters on the map. Then take the story with you on every journey.
              </p>
            </div>

            <div className="pt-layout-grid mt-14 lg:grid-cols-[1.3fr_.7fr]">
              <article className="pt-editorial-card pt-view-enter bg-[#F8F0EC] p-5 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="pt-card-number text-[#AD627B]">DISCOVER / 001</p>
                    <h3 className="mt-3 text-3xl font-black tracking-[-.06em] sm:text-[40px]">The map is just<br />the beginning.</h3>
                    <p className="mt-3 max-w-[425px] text-[13px] leading-7 text-[#806E73]">Find places that other people have shared. Or leave a pin for the next explorer.</p>
                  </div>
                  <span className="pt-card-arrow rounded-full border border-[#DAB9C4] p-3 text-[#A92F56]"><ArrowUpRight size={19} /></span>
                </div>
                <div className="pt-map-editorial mt-8 h-[320px] sm:h-[380px]">
                  <RouteMap short />
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <span className="pt-motion-tag"><MapPinned size={13} /> Community pins</span>
                  <span className="pt-motion-tag"><Heart size={13} /> Places worth sharing</span>
                </div>
                <span className="pt-tile-shine" aria-hidden="true" />
              </article>

              <div className="grid gap-6">
                <article className="pt-editorial-card pt-view-enter-late flex min-h-[265px] flex-col justify-between bg-[#72213A] p-7 text-white sm:p-8">
                  <div className="flex items-start justify-between">
                    <p className="pt-card-number text-[#FDC1C9]">PEOPLE / 002</p>
                    <Users size={27} className="text-[#FDC1C9]" />
                  </div>
                  <div>
                    <p className="pt-serif text-[42px] leading-none text-[#FDC1C9]">Better together.</p>
                    <h3 className="mt-5 text-xl font-extrabold tracking-[-.04em]">A map made by people.</h3>
                    <p className="mt-3 text-[13px] leading-7 text-white/75">Useful finds, community contributions, and the small discoveries worth passing on.</p>
                  </div>
                  <div className="pointer-events-none absolute -bottom-16 -right-16 h-44 w-44 rounded-full border-[26px] border-white/5" aria-hidden="true" />
                </article>
                <article className="pt-editorial-card pt-view-enter-late flex min-h-[265px] flex-col justify-between bg-[#FFF8F9] p-7 sm:p-8">
                  <div className="flex items-start justify-between">
                    <p className="pt-card-number text-[#AD627B]">TRUST / 003</p>
                    <ShieldCheck size={27} className="text-[#A92F56]" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-extrabold tracking-[-.055em]">Made for a more thoughtful community.</h3>
                    <p className="mt-3 text-[13px] leading-7 text-[#856E79]">Reporting and administrator moderation help keep the things we share respectful and useful.</p>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>

        {/* 03 — trips, fuel, eco driving */}
        <section id="journeys" className="relative overflow-hidden bg-[#421B2C] px-5 py-24 text-white sm:px-8 sm:py-32 lg:px-12">
          <div className="pointer-events-none absolute -right-48 top-20 h-[520px] w-[520px] rounded-full border border-white/10" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-24 top-36 h-[420px] w-[420px] rounded-full border border-white/10" aria-hidden="true" />
          <div className="relative mx-auto max-w-[1180px]">
            <SectionIntro number="02" eyebrow="Beyond the map" light>
              <h2 className="pt-section-title mt-5 max-w-[720px]">
                It's not just where you go.<br /><span className="pt-serif text-[#FDC1C9]">It's how you get there.</span>
              </h2>
            </SectionIntro>
            <p className="pt-view-enter mt-6 max-w-[570px] text-[14px] leading-8 text-[#E5BFCB]">
              Keep track of your journey, fuel activity, and driving habits. The details make the story richer.
            </p>

            <div className="mt-14 grid gap-5 md:grid-cols-3">
              <article className="pt-editorial-card pt-view-enter min-h-[365px] border-white/15 bg-[#57243A] p-7 text-white sm:p-8">
                <div className="flex items-center justify-between"><span className="text-[10px] font-black tracking-[.16em] text-[#F7BFCF]">01 / TRIPS</span><Route size={24} className="text-[#FDC1C9]" /></div>
                <div className="mt-12 flex items-end justify-between gap-2">
                  <div><p className="text-[10px] uppercase tracking-[.18em] text-white/55">Your journey</p><p className="mt-3 text-4xl font-black tracking-[-.07em]">A to B<span className="text-[#FDC1C9]">.</span></p></div>
                  <Navigation size={30} className="mb-1 text-[#FDC1C9]" />
                </div>
                <svg viewBox="0 0 275 95" className="mt-5 w-full" aria-hidden="true">
                  <path d="M5 80C42 69 44 10 89 26S158 93 199 47S251 17 270 12" className="pt-metric-line" />
                  <circle cx="5" cy="80" r="5" fill="#FDC1C9" /><circle cx="270" cy="12" r="5" fill="#FDC1C9" />
                </svg>
                <h3 className="mt-3 text-[15px] font-bold">Trip & mileage tracking</h3>
                <p className="mt-2 text-[12px] leading-7 text-white/65">Keep a clearer picture of the places you've been.</p>
              </article>

              <article className="pt-editorial-card pt-view-enter-late min-h-[365px] border-white/15 bg-[#FFF5F2] p-7 text-[#50263A] sm:p-8">
                <div className="flex items-center justify-between"><span className="text-[10px] font-black tracking-[.16em] text-[#A95371]">02 / FUEL</span><Fuel size={24} className="text-[#A92F56]" /></div>
                <div className="mt-9 rounded-xl border border-[#EED8DC] bg-white px-4 pb-2 pt-5">
                  <div className="flex items-center justify-between"><span className="text-[10px] font-bold text-[#926E7B]">A clearer look at every stop</span><span className="h-2 w-2 rounded-full bg-[#CC3A67]" /></div>
                  <div className="pt-travel-bars mt-5" aria-hidden="true">
                    {["38%", "71%", "52%", "88%", "62%", "77%", "55%"].map((height, i) => <span key={i} style={{ height }} />)}
                  </div>
                  <div className="flex justify-between py-3 text-[9px] font-bold text-[#AA8994]"><span>FUEL LOG</span><span>ILLUSTRATION</span></div>
                </div>
                <h3 className="mt-5 text-[15px] font-bold">Fuel monitoring</h3>
                <p className="mt-2 text-[12px] leading-7 text-[#8E7180]">Record fuel activity and follow the numbers that matter to your vehicle.</p>
              </article>

              <article className="pt-editorial-card pt-view-enter-late min-h-[365px] border-white/15 bg-[#702642] p-7 text-white sm:p-8">
                <div className="flex items-center justify-between"><span className="text-[10px] font-black tracking-[.16em] text-[#F7BFCF]">03 / HABITS</span><Leaf size={24} className="text-[#FDC1C9]" /></div>
                <div className="mt-14 flex items-center justify-center">
                  <div className="relative flex h-36 w-36 items-center justify-center rounded-full border border-[#FDC1C9]/25">
                    <div className="absolute inset-3 rounded-full border-[9px] border-[#FDC1C9]/15" />
                    <div className="absolute inset-3 rounded-full border-[9px] border-transparent border-t-[#FDC1C9] border-r-[#FDC1C9] -rotate-45" />
                    <Leaf className="text-[#FDC1C9]" size={46} />
                  </div>
                </div>
                <h3 className="mt-8 text-[15px] font-bold">Eco-driving insights</h3>
                <p className="mt-2 text-[12px] leading-7 text-white/65">Better understand your driving patterns and make more intentional choices.</p>
              </article>
            </div>
            <p className="mt-6 text-[10px] leading-5 text-white/45">Illustrative product visuals. Not live trip, fuel or driving data.</p>
          </div>
        </section>

        {/* 04 — short, clear onboarding */}
        <section id="how-it-works" className="bg-[#FFFBF8] px-5 py-24 sm:px-8 sm:py-32 lg:px-12">
          <div className="mx-auto max-w-[1180px]">
            <SectionIntro number="03" eyebrow="Getting started">
              <h2 className="pt-section-title mt-5">The next chapter is <span className="pt-serif text-[#A92F56]">yours.</span></h2>
            </SectionIntro>
            <div className="mt-14 grid gap-9 md:grid-cols-3">
              {[
                { number:"01", title:"Get PIN & TELL.", description:"Download the official release for your Android device.", icon:Download },
                { number:"02", title:"Make it yours.", description:"Install the app and sign in to set up your profile.", icon:Smartphone },
                { number:"03", title:"Find your way.", description:"Explore community pins, share places, and track the road ahead.", icon:Compass },
              ].map((step) => {
                const Icon = step.icon;
                return (
                  <div className="pt-step pt-view-enter" key={step.number}>
                    <div className="flex items-start justify-between"><span className="pt-step-index">{step.number}</span><Icon size={23} className="mt-2 text-[#A92F56]" /></div>
                    <h3 className="mt-7 text-xl font-black tracking-[-.04em]">{step.title}</h3>
                    <p className="mt-3 max-w-[310px] text-[13px] leading-7 text-[#89717D]">{step.description}</p>
                  </div>
                );
              })}
            </div>
            <a href="#download" className="mt-12 inline-flex items-center gap-2 text-[12px] font-black text-[#A92F56] transition-all hover:gap-4">Ready? Get the app <ArrowRight size={17} /></a>
          </div>
        </section>

        {/* 05 — AVP; lazy loaded, no autoplay */}
        <section id="avp" className="bg-[#F5E9E9] px-5 py-24 sm:px-8 sm:py-32 lg:px-12">
          <div className="mx-auto max-w-[1180px]">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div className="max-w-[770px]">
                <SectionIntro number="04" eyebrow="The project film">
                  <h2 className="pt-section-title mt-5">There's more to <span className="pt-serif text-[#A92F56]">the story.</span></h2>
                </SectionIntro>
                <p className="pt-view-enter mt-6 max-w-[580px] text-[13px] leading-7 text-[#806974]">Meet the idea behind PIN & TELL and see how people, places, and travel come together in our audiovisual presentation.</p>
              </div>
              <Link href="/about" className="inline-flex items-center gap-2 self-start text-[12px] font-black text-[#A92F56] transition-all hover:gap-4">Meet the team <ArrowUpRight size={17} /></Link>
            </div>
            <div className="pt-video-shell pt-view-enter mt-12 p-3 sm:p-5">
              <div className="relative z-10 aspect-video w-full overflow-hidden rounded-[16px] bg-[#321520]">
                {avpEmbed ? (
                  <iframe
                    title="PIN & TELL audiovisual presentation"
                    src={avpEmbed}
                    className="absolute inset-0 h-full w-full border-0"
                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    loading="lazy"
                  />
                ) : avpUrl ? (
                  <video
                    aria-label="PIN & TELL audiovisual presentation"
                    key={avpUrl}
                    src={avpUrl}
                    controls
                    playsInline
                    preload="none"
                    poster="/images/pin-tell-logo.png"
                    className="absolute inset-0 h-full w-full bg-black object-contain"
                  >Your browser does not support HTML5 video.</video>
                ) : (
                  <div className="pt-video-placeholder absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
                    <div className="pt-video-play relative flex h-20 w-20 items-center justify-center rounded-full border border-white/40 bg-white/15 text-white backdrop-blur-sm sm:h-24 sm:w-24" aria-hidden="true"><Play size={35} className="ml-1" fill="currentColor" /></div>
                    <p className="mt-9 text-[10px] font-bold uppercase tracking-[.25em] text-[#FDC1C9]">The PIN & TELL film</p>
                    <h3 className="mt-4 text-2xl font-black tracking-[-.05em] text-white sm:text-4xl">Our story. Coming into focus.</h3>
                    <p className="mt-4 max-w-[430px] text-xs leading-6 text-white/65">Add your AVP video to bring this chapter to life.</p>
                  </div>
                )}
              </div>
              <div className="relative z-10 flex items-center justify-between gap-3 px-2 pb-1 pt-4 text-white/65 sm:px-3">
                <span className="inline-flex items-center gap-2 text-[11px] font-bold text-white"><Film size={16} color="#FDC1C9" /> Behind PIN & TELL</span>
                <span className="text-[10px] uppercase tracking-[.15em]">Audiovisual presentation</span>
              </div>
            </div>
          </div>
        </section>

        {/* 06 — direct download and installation guidance */}
        <section id="download" className="relative isolate overflow-hidden bg-[#A92F56] px-5 py-24 text-white sm:px-8 sm:py-32 lg:px-12">
          <div className="pt-download-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
          <div className="pt-download-orb pointer-events-none" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-[1180px] items-center gap-14 lg:grid-cols-[1.2fr_.8fr]">
            <div className="pt-view-enter">
              <Label light>Only one thing left to do</Label>
              <h2 className="mt-7 max-w-[740px] text-[clamp(3.5rem,7.7vw,7.2rem)] font-black leading-[.98] tracking-[-.08em]">
                Make your <span className="pt-serif text-[#FDC1C9]">move.</span>
              </h2>
              <p className="mt-7 max-w-[520px] text-[15px] leading-8 text-white/85">A community-powered world of discoveries and journeys is waiting on your Android phone.</p>
              <div className="mt-9 flex flex-wrap gap-3">
                <ApkButton light big />
                {playStoreUrl && (
                  <a href={playStoreUrl} target="_blank" rel="noopener noreferrer" className="pt-pill border border-white/40 bg-white/10 text-white hover:bg-white/20">
                    Google Play <ExternalLink size={16} />
                  </a>
                )}
              </div>
              {!apkUrl && <p className="mt-5 text-[12px] leading-6 text-white/75">The official APK link will appear as soon as a release is available.</p>}
              <div className="mt-10 inline-flex items-center gap-2 border-t border-white/20 pt-5 text-[11px] font-semibold text-white/75"><ShieldCheck size={17} /> Download only official releases you trust.</div>
            </div>
            <div className="pt-view-enter-late rounded-[24px] border border-white/30 bg-white/10 p-7 shadow-[0_35px_80px_-35px_rgba(39,6,21,.35)] backdrop-blur-md sm:p-9">
              <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-white/20"><Smartphone size={21} /></span><div><p className="text-[15px] font-black">On your Android</p><p className="mt-1 text-[11px] text-white/65">Installation, simplified</p></div></div>
              <ol className="mt-8 space-y-6">
                {[
                  "Download the official signed PIN & TELL APK.",
                  "Open the file on your Android device.",
                  "If prompted, allow your browser or file manager to install the app.",
                  "Finish installing, then explore.",
                ].map((text, i) => (
                  <li key={text} className="flex items-start gap-4 border-b border-white/15 pb-5 last:border-0 last:pb-0"><span className="text-[11px] font-black text-[#FDC1C9]">0{i + 1}</span><p className="text-[12px] leading-6 text-white/90">{text}</p></li>
                ))}
              </ol>
              <p className="mt-6 text-[10px] leading-5 text-white/60">Android may show a security prompt for apps installed outside Google Play.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#351723] px-5 pb-8 pt-16 text-white sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1180px]">
          <div className="flex flex-col justify-between gap-10 border-b border-white/15 pb-14 md:flex-row md:items-start">
            <div><a href="#top" className="inline-flex" aria-label="Back to PIN & TELL homepage"><Wordmark light /></a><p className="mt-5 max-w-[260px] text-[12px] leading-7 text-white/55">Find more than a destination.<br />Every place has a story.</p></div>
            <div className="grid grid-cols-2 gap-x-12 gap-y-5 sm:grid-cols-3 sm:gap-x-16">
              <div className="flex flex-col items-start gap-3"><p className="mb-1 text-[10px] font-bold uppercase tracking-[.2em] text-[#FDC1C9]">Explore</p><a className="pt-footer-link text-[12px] text-white/65" href="#discover">Discover</a><a className="pt-footer-link text-[12px] text-white/65" href="#journeys">The journey</a><a className="pt-footer-link text-[12px] text-white/65" href="#avp">Our AVP</a></div>
              <div className="flex flex-col items-start gap-3"><p className="mb-1 text-[10px] font-bold uppercase tracking-[.2em] text-[#FDC1C9]">PIN & TELL</p><Link className="pt-footer-link text-[12px] text-white/65" href="/about">The team</Link><a className="pt-footer-link text-[12px] text-white/65" href="#how-it-works">Get started</a><a className="pt-footer-link text-[12px] text-white/65" href="#download">Download</a></div>
              <div className="flex flex-col items-start gap-3"><p className="mb-1 text-[10px] font-bold uppercase tracking-[.2em] text-[#FDC1C9]">Legal</p><Link className="pt-footer-link text-[12px] text-white/65" href="/privacy-policy">Privacy Policy</Link><Link className="pt-footer-link text-[12px] text-white/65" href="/terms-and-conditions">Terms &amp; Conditions</Link></div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-7 text-[10px] text-white/40"><span>© {new Date().getFullYear()} PIN & TELL</span><span>Designed for the journey, and the people along the way.</span></div>
        </div>
      </footer>
    </div>
  );
}
