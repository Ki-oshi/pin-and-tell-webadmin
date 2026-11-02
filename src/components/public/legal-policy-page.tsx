import "server-only";

import Image from "next/image";
import Link from "next/link";
import sanitizeHtml from "sanitize-html";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Download,
  FileText,
  LockKeyhole,
  ScrollText,
  ShieldCheck,
} from "lucide-react";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * PUBLIC LEGAL POLICY RENDERER — src/components/public/legal-policy-page.tsx
 * Both public pages use this component, which reads the existing published
 * content from platform_settings. It does not modify policy text or admin UI.
 * No user-supplied policy HTML is rendered before server-side sanitization.
 */
export type PublicLegalPolicyKey = "privacy_policy" | "terms_and_conditions";

type LegalPolicyPageProps = { policyKey: PublicLegalPolicyKey };
type PolicyRecord = { value: string | null; updated_at: string | null };
type PolicyResult =
  | { status: "ready"; content: string; updatedAt: string | null }
  | { status: "missing" }
  | { status: "error" };

const POLICY_CONFIG = {
  privacy_policy: {
    title: "Privacy Policy",
    titleFirst: "Your privacy.",
    titleSecond: "Our promise.",
    eyebrow: "YOUR PRIVACY MATTERS",
    description:
      "Learn how PIN & TELL handles personal information, according to the policy published by the team.",
    icon: LockKeyhole,
    otherLabel: "Terms & Conditions",
    otherHref: "/terms-and-conditions",
    documentNumber: "01",
  },
  terms_and_conditions: {
    title: "Terms & Conditions",
    titleFirst: "The rules of",
    titleSecond: "the road.",
    eyebrow: "USING PIN & TELL",
    description:
      "Read the rules and conditions that apply to using the PIN & TELL platform, as published by the team.",
    icon: ScrollText,
    otherLabel: "Privacy Policy",
    otherHref: "/privacy-policy",
    documentNumber: "02",
  },
} as const;

async function loadPublishedPolicy(policyKey: PublicLegalPolicyKey): Promise<PolicyResult> {
  try {
    // Runs on the server only; the Supabase service-role key is never sent to visitors.
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("platform_settings")
      .select("value, updated_at")
      .eq("key", policyKey)
      .maybeSingle();

    if (error) {
      console.error(`[PUBLIC LEGAL] Unable to read ${policyKey}:`, error);
      return { status: "error" };
    }

    const record = data as PolicyRecord | null;
    const value = record?.value?.trim() ?? "";
    if (!value) return { status: "missing" };

    return {
      status: "ready",
      content: value,
      updatedAt: record?.updated_at ?? null,
    };
  } catch (error) {
    console.error(`[PUBLIC LEGAL] Unable to load ${policyKey}:`, error);
    return { status: "error" };
  }
}

/**
 * Make plain email addresses clickable, while leaving existing <a> elements
 * alone. Work on sanitized HTML only; never modify tags or attributes.
 * This keeps Terms and Privacy mailto behavior consistent.
 */
function linkifyPolicyEmails(sanitizedHtml: string): string {
  const emailPattern =
    /(?<![A-Z0-9._%+-])([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})(?![A-Z0-9_%-])/gi;

  let insideLink = false;
  let codeDepth = 0;

  return sanitizedHtml
    .split(/(<[^>]+>)/g)
    .map((part) => {
      if (part.startsWith("<")) {
        if (/^<a(?:\s|>)/i.test(part)) insideLink = true;
        if (/^<\/a\s*>/i.test(part)) insideLink = false;
        if (/^<(?:pre|code)(?:\s|>)/i.test(part)) codeDepth += 1;
        if (/^<\/(?:pre|code)\s*>/i.test(part)) codeDepth = Math.max(0, codeDepth - 1);
        return part;
      }
      if (insideLink || codeDepth > 0) return part;
      return part.replace(emailPattern, (email) => `<a href="mailto:${email}">${email}</a>`);
    })
    .join("");
}

function safePolicyHtml(value: string): { html: string; isHtml: boolean } {
  const isHtml = /<\/?[a-z][\s\S]*?>/i.test(value);
  const html = sanitizeHtml(value, {
    allowedTags: [
      "h1", "h2", "h3", "h4", "h5", "h6",
      "p", "br", "strong", "b", "em", "i", "u", "s", "del",
      "ul", "ol", "li", "blockquote", "hr", "pre", "code",
      "a", "div", "span", "table", "thead", "tbody", "tr", "th", "td",
      "sup", "sub",
    ],
    allowedAttributes: {
      a: ["href", "title"],
      p: ["style"], h1: ["style"], h2: ["style"], h3: ["style"],
      h4: ["style"], div: ["style"],
    },
    allowedStyles: { "*": { "text-align": [/^(left|right|center|justify)$/] } },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      a: (_tagName, attributes) => ({
        tagName: "a",
        attribs: {
          href: attributes.href ?? "",
          title: attributes.title ?? "",
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
    },
    nonTextTags: ["style", "script", "textarea", "option", "xmp", "noscript"],
    nestingLimit: 30,
  });
  return { html: linkifyPolicyEmails(html), isHtml };
}

function formatUpdatedDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Manila",
  }).format(date);
}

function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-white p-1 shadow-[0_4px_22px_rgba(0,0,0,.1)]">
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
      <span className={`text-[16px] font-black tracking-[-.055em] sm:text-lg ${light ? "text-white" : "text-[#482130]"}`}>
        PIN <span className={light ? "text-[#FDC1C9]" : "text-[#A92F56]"}>&amp;</span> TELL
      </span>
    </span>
  );
}

const legalStyles = String.raw`
  .ptl { --wine:#391322; --rose:#A92F56; --blush:#FDC1C9; }
  .ptl * { box-sizing:border-box; }
  .ptl ::selection { background:#FDC1C9; color:#391322; }
  .ptl-serif { font-family:Georgia,"Times New Roman",serif; font-style:italic; font-weight:400; letter-spacing:-.065em; }
  .ptl-nav { position:relative; text-decoration:none; }
  .ptl-nav::after { content:""; position:absolute; bottom:-6px; left:0; right:0; height:1px; background:#FDC1C9; transform:scaleX(0); transform-origin:left; transition:transform .3s; }
  .ptl-nav:hover::after,.ptl-nav:focus-visible::after { transform:scaleX(1); }
  .ptl-hero { isolation:isolate; position:relative; overflow:hidden; background:#3C1627; }
  .ptl-hero::before { content:""; position:absolute; inset:0; pointer-events:none; background:radial-gradient(ellipse 50% 85% at 85% 37%,rgba(170,53,99,.5),transparent 75%),radial-gradient(ellipse 55% 75% at -10% 110%,rgba(131,41,78,.5),transparent 73%); }
  .ptl-hero::after { content:""; position:absolute; inset:0; pointer-events:none; background-image:linear-gradient(to right,rgba(255,255,255,.12) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,.12) 1px,transparent 1px); background-size:84px 84px; opacity:.72; mask-image:linear-gradient(90deg,transparent 0%,black 80%,transparent 100%); }
  .ptl-hero-word { position:absolute; top:-12%; right:-8%; pointer-events:none; font-size:clamp(10rem,30vw,26rem); line-height:1; font-weight:900; letter-spacing:-.16em; color:transparent; -webkit-text-stroke:1px rgba(255,255,255,.12); }
  .ptl-orbit { position:absolute; right:-100px; bottom:-220px; width:460px; height:460px; border:1px solid rgba(255,255,255,.19); border-radius:50%; box-shadow:0 0 0 65px rgba(255,255,255,.025),0 0 0 130px rgba(255,255,255,.018); animation:ptl-orbit 35s linear infinite; }
  .ptl-orbit::after { position:absolute; content:""; width:9px; height:9px; top:13%; left:14%; border-radius:50%; background:#FDC1C9; box-shadow:0 0 20px #FDC1C9; }
  .ptl-label { display:inline-flex; align-items:center; gap:13px; font-size:10px; font-weight:800; letter-spacing:.19em; text-transform:uppercase; }
  .ptl-label::before { content:""; width:48px; height:1px; background:currentColor; opacity:.7; }
  .ptl-title { font-size:clamp(3.45rem,7vw,7rem); line-height:.97; font-weight:900; letter-spacing:-.083em; }
  .ptl-rise { animation:ptl-rise .85s cubic-bezier(.16,1,.3,1) both; }
  .ptl-delay-1 { animation-delay:.10s; } .ptl-delay-2 { animation-delay:.23s; } .ptl-delay-3 { animation-delay:.38s; } .ptl-delay-4 { animation-delay:.5s; }
  .ptl-progress { display:none; transform-origin:left; }
  @supports (animation-timeline:scroll()) { .ptl-progress { display:block; animation:ptl-progress linear both; animation-timeline:scroll(root block); } }
  .ptl-link { display:inline-flex; align-items:center; gap:8px; transition:gap .25s,color .25s; }
  .ptl-link:hover { gap:14px; }
  .ptl-footer-link { position:relative; transition:color .25s; }
  .ptl-footer-link:hover { color:#fff; }
  .ptl-footer-link::after { content:""; position:absolute; height:1px; left:0; right:0; bottom:-4px; background:#FDC1C9; transform:scaleX(0); transform-origin:left; transition:transform .3s; }
  .ptl-footer-link:hover::after { transform:scaleX(1); }
  .ptl-rich { overflow-wrap:anywhere; color:#665760; font-size:14px; line-height:1.9; }
  .ptl-rich > :first-child { margin-top:0!important; }
  .ptl-rich h1,.ptl-rich h2,.ptl-rich h3,.ptl-rich h4,.ptl-rich h5,.ptl-rich h6 { color:#482130; font-weight:800; letter-spacing:-.04em; line-height:1.28; }
  .ptl-rich h1 { margin:0 0 26px; font-size:clamp(27px,3vw,35px); }
  .ptl-rich h2 { margin:40px 0 15px; font-size:clamp(23px,2.6vw,29px); }
  .ptl-rich h3 { margin:30px 0 13px; font-size:19px; }
  .ptl-rich h4,.ptl-rich h5,.ptl-rich h6 { margin:24px 0 10px; font-size:16px; }
  .ptl-rich p { margin:0 0 21px; }
  .ptl-rich strong,.ptl-rich b { color:#482130; font-weight:800; }
  .ptl-rich a { color:#A92F56; text-decoration:underline; text-underline-offset:4px; font-weight:650; }
  .ptl-rich a:hover { color:#72213A; }
  .ptl-rich ul,.ptl-rich ol { margin:0 0 22px; padding-left:27px; }
  .ptl-rich ul { list-style:disc; } .ptl-rich ol { list-style:decimal; }
  .ptl-rich li { margin-bottom:8px; padding-left:3px; }
  .ptl-rich blockquote { margin:28px 0; padding:22px 24px; border-left:3px solid #A92F56; background:#FFF5F7; }
  .ptl-rich hr { margin:36px 0; border:0; border-top:1px solid #EADCE1; }
  .ptl-rich pre { overflow-x:auto; margin:20px 0; padding:20px; border-radius:10px; background:#FFF1F5; font-size:12px; line-height:1.6; }
  .ptl-rich code { overflow-wrap:anywhere; }
  .ptl-rich table { display:block; width:100%; overflow-x:auto; margin:24px 0; border-collapse:collapse; }
  .ptl-rich th,.ptl-rich td { border:1px solid #EADCE1; padding:10px; text-align:left; }
  .ptl-rich th { background:#FFF5F7; color:#482130; }
  .ptl-rich:focus-within { scroll-margin-top:130px; }
  .ptl-view-enter { opacity:1; }
  @keyframes ptl-rise { from {opacity:0;transform:translateY(28px)} to {opacity:1;transform:translateY(0)} }
  @keyframes ptl-orbit { to {transform:rotate(360deg)} }
  @keyframes ptl-progress { from {transform:scaleX(0)} to {transform:scaleX(1)} }
  @keyframes ptl-view { from {opacity:.55;transform:translateY(24px)} to {opacity:1;transform:translateY(0)} }
  @supports (animation-timeline:view()) { .ptl-view-enter { animation:ptl-view linear both; animation-timeline:view(); animation-range:entry 0% cover 24%; } }
  @media (min-width:640px) { .ptl-rich { font-size:15px; } }
  @media (prefers-reduced-motion:reduce) {
    .ptl *, .ptl *::before, .ptl *::after { animation-duration:.01ms!important; animation-iteration-count:1!important; transition-duration:.01ms!important; }
    .ptl-rise,.ptl-view-enter { opacity:1!important; transform:none!important; }
    .ptl-progress { display:none!important; }
  }
`;

export default async function LegalPolicyPage({ policyKey }: LegalPolicyPageProps) {
  const policy = POLICY_CONFIG[policyKey];
  const Icon = policy.icon;
  const result = await loadPublishedPolicy(policyKey);
  const updated = result.status === "ready" ? formatUpdatedDate(result.updatedAt) : null;
  const document = result.status === "ready" ? safePolicyHtml(result.content) : null;

  return (
    <div id="top" className="ptl min-h-screen overflow-x-clip bg-[#FFFDFC] text-[#472432]">
      <style>{legalStyles}</style>
      <div className="ptl-progress pointer-events-none fixed left-0 top-0 z-[70] h-[3px] w-full bg-[#FDC1C9]" aria-hidden="true" />
      {/* Public website only. The admin login is intentionally not linked. */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#391322]/95 text-white backdrop-blur-xl">
        <div className="mx-auto flex h-[78px] max-w-[1320px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
          <Link href="/" aria-label="PIN & TELL public homepage" className="shrink-0"><Wordmark light /></Link>
          <nav aria-label="Main public navigation" className="hidden items-center gap-8 lg:flex">
            <Link href="/#discover" className="ptl-nav text-[12px] font-bold text-white/75 hover:text-white">Discover</Link>
            <Link href="/#journeys" className="ptl-nav text-[12px] font-bold text-white/75 hover:text-white">On the road</Link>
            <Link href="/#avp" className="ptl-nav text-[12px] font-bold text-white/75 hover:text-white">Watch the film</Link>
            <Link href="/about" className="ptl-nav text-[12px] font-bold text-white/75 hover:text-white">Our team</Link>
          </nav>
          <Link href="/#download" className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-[#FDC1C9]/35 bg-[#FDC1C9] px-4 text-[11px] font-black text-[#4A1C2D] transition-all hover:-translate-y-0.5 hover:bg-white sm:px-5 sm:text-xs">Get the app <ArrowUpRight size={16} /></Link>
        </div>
        <nav aria-label="Mobile public navigation" className="flex items-center justify-center gap-6 overflow-x-auto border-t border-white/10 px-3 py-3 text-[11px] font-bold text-white/75 lg:hidden">
          <Link href="/" className="whitespace-nowrap hover:text-white">Home</Link>
          <Link href="/#avp" className="whitespace-nowrap hover:text-white">AVP</Link>
          <Link href="/about" className="whitespace-nowrap hover:text-white">About</Link>
          <span aria-current="page" className="whitespace-nowrap text-[#FDC1C9]">{policyKey === "privacy_policy" ? "Privacy" : "Terms"}</span>
        </nav>
      </header>

      <main>
        <section className="ptl-hero px-5 pb-20 pt-12 text-white sm:px-8 sm:pb-24 sm:pt-16 lg:px-12 lg:pb-28" aria-labelledby="policy-heading">
          <span className="ptl-hero-word" aria-hidden="true">{policy.documentNumber}</span>
          <span className="ptl-orbit" aria-hidden="true" />
          <div className="relative z-10 mx-auto max-w-[1180px]">
            <Link href="/" className="ptl-rise ptl-delay-1 ptl-link text-[11px] font-bold text-[#FDC1C9]"><ArrowLeft size={15} /> Back to homepage</Link>
            <div className="mt-14 grid items-end gap-9 lg:mt-20 lg:grid-cols-[1fr_.38fr] lg:gap-12">
              <div>
                <p className="ptl-rise ptl-delay-1 ptl-label text-[#FDC1C9]">{policy.eyebrow}</p>
                <h1 id="policy-heading" className="ptl-title mt-8">
                  <span className="ptl-rise ptl-delay-2 block">{policy.titleFirst}</span>
                  <span className="ptl-rise ptl-delay-3 ptl-serif block text-[#FDC1C9]">{policy.titleSecond}</span>
                </h1>
                <p className="ptl-rise ptl-delay-4 mt-8 max-w-[580px] text-[14px] leading-[1.9] text-[#F0CED9] sm:text-[15px]">{policy.description}</p>
              </div>
              <div className="ptl-rise ptl-delay-4 hidden border-t border-white/25 pb-2 pt-6 lg:block">
                <p className="text-[10px] font-black uppercase tracking-[.19em] text-[#FDC1C9]">PUBLIC DOCUMENT / {policy.documentNumber}</p>
                <p className="mt-4 text-[13px] font-semibold text-white">{policy.title}</p>
                <p className="mt-2 text-[11px] leading-6 text-white/60">PIN &amp; TELL platform policy</p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 pb-24 pt-12 sm:px-8 sm:pb-32 sm:pt-16 lg:px-12">
          <div className="mx-auto max-w-[1180px]">
            <div className="ptl-view-enter mb-9 flex flex-wrap items-center justify-between gap-4 border-b border-[#E8D9DF] pb-7">
              <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.14em] text-[#8D6B78]"><ShieldCheck size={17} className="text-[#A92F56]" /> Official PIN &amp; TELL document</p>
              {updated && <p className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#806E76]"><CalendarDays size={16} className="text-[#A92F56]" /> Updated {updated}</p>}
            </div>
            <div className="grid items-start gap-9 lg:grid-cols-[255px_minmax(0,1fr)] lg:gap-16">
              <aside className="ptl-view-enter lg:sticky lg:top-[112px]">
                <p className="ptl-label text-[#A92F56]">DOCUMENT LIBRARY</p>
                <nav aria-label="Public legal documents" className="mt-7 border-y border-[#E8D9DF]">
                  <Link href="/privacy-policy" aria-current={policyKey === "privacy_policy" ? "page" : undefined} className={`flex items-center justify-between gap-3 border-b border-[#E8D9DF] py-5 text-[12px] font-bold transition-colors ${policyKey === "privacy_policy" ? "text-[#A92F56]" : "text-[#81727A] hover:text-[#A92F56]"}`}><span className="inline-flex items-center gap-2"><LockKeyhole size={17} /> Privacy Policy</span><ArrowUpRight size={15} /></Link>
                  <Link href="/terms-and-conditions" aria-current={policyKey === "terms_and_conditions" ? "page" : undefined} className={`flex items-center justify-between gap-3 py-5 text-[12px] font-bold transition-colors ${policyKey === "terms_and_conditions" ? "text-[#A92F56]" : "text-[#81727A] hover:text-[#A92F56]"}`}><span className="inline-flex items-center gap-2"><ScrollText size={17} /> Terms &amp; Conditions</span><ArrowUpRight size={15} /></Link>
                </nav>
                <div className="mt-8 bg-[#F3E5E8] p-6">
                  <Icon size={24} strokeWidth={1.6} className="text-[#A92F56]" />
                  <p className="mt-5 text-[13px] font-extrabold text-[#482130]">{policy.title}</p>
                  <p className="mt-2 text-[12px] leading-6 text-[#806E76]">Read the current published document below. You can return here anytime to check for updates.</p>
                  <Link href="/#download" className="ptl-link mt-5 text-[11px] font-black text-[#A92F56]">Explore the app <ArrowRight size={15} /></Link>
                </div>
              </aside>

              <article className="ptl-view-enter min-w-0 border border-[#E8D9DF] bg-white p-6 shadow-[0_24px_65px_-50px_rgba(75,24,46,.25)] sm:p-9 lg:p-12" aria-label={`${policy.title} document`}>
                <div className="mb-10 flex flex-wrap items-center justify-between gap-3 border-b border-[#EDE1E5] pb-7">
                  <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#A92F56]">PIN &amp; TELL / LEGAL</p><h2 className="mt-3 text-[24px] font-black tracking-[-.05em] text-[#482130] sm:text-[29px]">{policy.title}</h2></div>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center bg-[#FFF1F5] text-[#A92F56]"><Icon size={23} /></span>
                </div>
                {result.status === "ready" && document ? (
                  <div
                    className={`ptl-rich min-w-0 ${document.isHtml ? "whitespace-normal" : "whitespace-pre-wrap"}`}
                    dangerouslySetInnerHTML={{ __html: document.html }}
                  />
                ) : (
                  <div className="py-14 text-center">
                    <FileText size={28} className="mx-auto text-[#A92F56]" />
                    <h3 className="mt-6 text-[20px] font-black text-[#482130]">{result.status === "missing" ? "This policy has not been published yet" : "Policy temporarily unavailable"}</h3>
                    <p className="mx-auto mt-4 max-w-[450px] text-[13px] leading-7 text-[#807077]">{result.status === "missing" ? "The team has not published this document yet. Please check back later." : "We couldn't load the latest version of this document. Please try again later."}</p>
                  </div>
                )}
                <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-[#EDE1E5] pt-6">
                  <span className="text-[11px] font-bold uppercase tracking-[.1em] text-[#987F89]">End of document</span>
                  <Link href={policy.otherHref} className="ptl-link text-[12px] font-bold text-[#A92F56]">Read {policy.otherLabel} <ArrowRight size={16} /></Link>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="bg-[#A92F56] px-5 py-16 text-white sm:px-8 sm:py-20 lg:px-12">
          <div className="ptl-view-enter mx-auto flex max-w-[1180px] flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div>
              <p className="ptl-label text-[#FDC1C9]">KEEP EXPLORING</p>
              <h2 className="mt-5 text-[clamp(2.7rem,5vw,4.6rem)] font-black leading-[1.07] tracking-[-.075em]">Your next chapter <span className="ptl-serif text-[#FDC1C9]">awaits.</span></h2>
            </div>
            <Link href="/#download" className="ptl-link inline-flex h-12 items-center gap-3 rounded-full bg-white px-6 text-[12px] font-black text-[#72213A] transition-colors hover:bg-[#FFF1F5]"><Download size={17} /> Get PIN &amp; TELL <ArrowUpRight size={16} /></Link>
          </div>
        </section>
      </main>

      <footer className="bg-[#351723] px-5 pb-8 pt-16 text-white sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1180px]">
          <div className="flex flex-col justify-between gap-10 border-b border-white/15 pb-14 md:flex-row md:items-start">
            <div><Link href="/" className="inline-flex" aria-label="PIN & TELL public homepage"><Wordmark light /></Link><p className="mt-5 max-w-[260px] text-[12px] leading-7 text-white/55">Find more than a destination.<br />Every place has a story.</p></div>
            <nav aria-label="Footer navigation" className="grid grid-cols-2 gap-x-12 gap-y-5 sm:grid-cols-3 sm:gap-x-16">
              <div className="flex flex-col items-start gap-3"><p className="mb-1 text-[10px] font-bold uppercase tracking-[.2em] text-[#FDC1C9]">Explore</p><Link className="ptl-footer-link text-[12px] text-white/65" href="/#discover">Discover</Link><Link className="ptl-footer-link text-[12px] text-white/65" href="/#journeys">The journey</Link><Link className="ptl-footer-link text-[12px] text-white/65" href="/#avp">Our AVP</Link></div>
              <div className="flex flex-col items-start gap-3"><p className="mb-1 text-[10px] font-bold uppercase tracking-[.2em] text-[#FDC1C9]">PIN &amp; TELL</p><Link className="ptl-footer-link text-[12px] text-white/65" href="/about">The team</Link><Link className="ptl-footer-link text-[12px] text-white/65" href="/#how-it-works">Get started</Link><Link className="ptl-footer-link text-[12px] text-white/65" href="/#download">Download</Link></div>
              <div className="flex flex-col items-start gap-3"><p className="mb-1 text-[10px] font-bold uppercase tracking-[.2em] text-[#FDC1C9]">Legal</p><Link className="ptl-footer-link text-[12px] text-white/65" href="/privacy-policy">Privacy Policy</Link><Link className="ptl-footer-link text-[12px] text-white/65" href="/terms-and-conditions">Terms &amp; Conditions</Link></div>
            </nav>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-7 text-[10px] text-white/40"><span>© {new Date().getFullYear()} PIN &amp; TELL</span><span>Designed for the journey, and the people along the way.</span></div>
        </div>
      </footer>
    </div>
  );
}
