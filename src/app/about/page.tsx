import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  BookOpenText,
  Code2,
  Database,
  HeartHandshake,
  Mail,
  MapPin,
  Network,
  Play,
  type LucideIcon,
} from "lucide-react";

/**
 * PUBLIC ABOUT PAGE — src/app/about/page.tsx
 * This is a server component; animations are CSS-only. No admin routes.
 *
 * TO REPLACE TEAM PHOTOS:
 *   1. Put your images in public/images/team/ (e.g., lean.jpg).
 *   2. Change the member's image: null to image: "/images/team/lean.jpg".
 *   3. Adjust imagePosition to reposition a portrait, if necessary.
 *   4. Replacing the file with the same filename updates the image.
 */
export const metadata: Metadata = {
  title: "About PIN & TELL | The Team Behind the Journey",
  description:
    "Meet the four people behind PIN & TELL: the website, Android application, system analysis, and project documentation.",
  icons: {
    icon: "/images/pin-tell-logo.png",
    apple: "/images/pin-tell-logo.png",
  },
  robots: { index: true, follow: true },
};

type TeamMember = {
  role: string;
  name: string;
  initials: string | null;
  email: string;
  image: string | null;
  imagePosition: string;
  icon: LucideIcon;
  summary: string;
  responsibilities: string[];
};

const teamMembers: TeamMember[] = [
  {
    role: "Front End Developer",
    name: "Aclan, Lean Joshua",
    initials: null,
    email: "laclan5963ant@student.fatima.edu.ph",
    image: null, // Replace with "/images/team/lean.jpg"
    imagePosition: "center",
    icon: Code2,
    summary:
      "Developed the public-facing PIN & TELL website and the complete web administration interface. Worked closely with Jan to connect the website and Android app, and collaborated on the shared database.",
    responsibilities: [
      "Public website & user experience",
      "Web admin dashboard",
      "Web–Android integration",
      "Shared database development",
    ],
  },
  {
    role: "Back End / Android Developer",
    name: "Muaña, Jan Manuel N.",
    initials: null,
    email: "jnmuana6887ant@student.fatima.edu.ph",
    image: null, // Replace with "/images/team/jan.jpg"
    imagePosition: "center",
    icon: Database,
    summary:
      "Developed the full PIN & TELL Android application. Worked closely with Lean to connect the Android app and website, including their backend integrations, and collaborated on the shared database.",
    responsibilities: [
      "Full Android app development",
      "App & backend integration",
      "Web–Android integration",
      "Shared database development",
    ],
  },
  {
    role: "System Analyst",
    name: "Panti, Chester Lei V.",
    initials: null,
    email: "cvpanti6935ant@student.fatima.edu.ph",
    image: null, // Replace with "/images/team/chester.jpg"
    imagePosition: "center",
    icon: Network,
    summary:
      "Serves as the project's system analyst, focusing on requirements, workflows, and how the PIN & TELL platform fits together as a complete system.",
    responsibilities: ["Requirements analysis", "System workflows", "System evaluation"],
  },
  {
    role: "Documentation / Leader",
    name: "Niñofranco, Ashley Nicole A.",
    initials: null,
    email: "aaninofranco6975ant@student.fatima.edu.ph",
    image: null, // Replace with "/images/team/ashley.jpg"
    imagePosition: "center",
    icon: BookOpenText,
    summary:
      "Leads the team's project coordination and manages documentation that records the development, research, and progress of PIN & TELL.",
    responsibilities: ["Project leadership", "Research & documentation", "Team coordination"],
  },
];

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
          className="h-full w-full object-contain"
          priority
        />
      </span>
      <span className={`text-[16px] font-black tracking-[-.055em] sm:text-lg ${light ? "text-white" : "text-[#482130]"}`}>
        PIN <span className={light ? "text-[#FDC1C9]" : "text-[#A92F56]"}>&amp;</span> TELL
      </span>
    </span>
  );
}

const aboutStyles = String.raw`
  .pta { --wine:#391322; --rose:#A92F56; --blush:#FDC1C9; font-feature-settings:"kern"; }
  .pta * { box-sizing:border-box; }
  .pta ::selection { background:#FDC1C9; color:#391322; }
  .pta-serif { font-family:Georgia,"Times New Roman",serif; font-style:italic; font-weight:400; letter-spacing:-.065em; }
  .pta-nav { position:relative; text-decoration:none; }
  .pta-nav::after { content:""; position:absolute; bottom:-6px; left:0; width:100%; height:1px; background:#FDC1C9; transform:scaleX(0); transform-origin:left; transition:transform .3s ease; }
  .pta-nav:hover::after,.pta-nav:focus-visible::after { transform:scaleX(1); }
  .pta-rise { animation:pta-rise .85s cubic-bezier(.16,1,.3,1) both; }
  .pta-delay-1 { animation-delay:.1s; } .pta-delay-2 { animation-delay:.23s; } .pta-delay-3 { animation-delay:.37s; } .pta-delay-4 { animation-delay:.52s; }
  .pta-hero { position:relative; isolation:isolate; overflow:hidden; background:#3C1627; }
  .pta-hero::before { content:""; position:absolute; inset:0; pointer-events:none; background:radial-gradient(ellipse 52% 70% at 90% 35%,rgba(190,70,114,.48),transparent 76%),radial-gradient(ellipse at -5% 115%,rgba(134,38,76,.55),transparent 65%); }
  .pta-hero::after { content:""; position:absolute; inset:0; pointer-events:none; opacity:.12; background-image:linear-gradient(to right,#fff 1px,transparent 1px),linear-gradient(to bottom,#fff 1px,transparent 1px); background-size:83px 83px; mask-image:linear-gradient(90deg,transparent 8%,black 100%); }
  .pta-outline { position:absolute; top:6%; right:-6%; font-size:clamp(130px,26vw,420px); letter-spacing:-.15em; line-height:1; font-weight:900; -webkit-text-stroke:1px rgba(255,255,255,.11); color:transparent; user-select:none; }
  .pta-orbit { position:absolute; width:min(58vw,560px); aspect-ratio:1; right:-20%; bottom:-58%; border:1px solid rgba(255,255,255,.18); border-radius:50%; box-shadow:0 0 0 65px rgba(255,255,255,.024),0 0 0 130px rgba(255,255,255,.014); animation:pta-orbit 22s linear infinite; }
  .pta-orbit::after { content:""; position:absolute; top:16%; left:16%; width:10px; height:10px; border-radius:50%; background:#FDC1C9; box-shadow:0 0 24px #FDC1C9; }
  .pta-hero-title { font-size:clamp(4rem,8vw,8rem); font-weight:900; letter-spacing:-.085em; line-height:.95; }
  .pta-line { width:64px; height:1px; background:currentColor; opacity:.6; }
  .pta-label { display:flex; align-items:center; gap:12px; font-size:10px; font-weight:800; letter-spacing:.20em; text-transform:uppercase; }
  .pta-note { border:1px solid rgba(255,255,255,.22); background:rgba(255,255,255,.075); backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); }
  .pta-note-logo { animation:pta-float 5.8s ease-in-out infinite; }
  .pta-editorial-rule { height:1px; background:#E9D9DE; }
  .pta-stat { font-size:clamp(3rem,6vw,5.5rem); line-height:.98; font-weight:900; letter-spacing:-.08em; }
  .pta-card { position:relative; isolation:isolate; transition:transform .45s cubic-bezier(.16,1,.3,1),box-shadow .45s; }
  .pta-card:hover { transform:translateY(-7px); box-shadow:0 30px 75px -45px rgba(80,20,43,.3); }
  .pta-card::after { content:""; pointer-events:none; position:absolute; inset:0; border:1px solid transparent; transition:border-color .35s; }
  .pta-card:hover::after { border-color:#DE9CB1; }
  .pta-portrait { position:relative; overflow:hidden; isolation:isolate; background:radial-gradient(circle at 74% 25%,#BE6C8A,transparent 50%),linear-gradient(145deg,#8F2A4E,#411A2B); }
  .pta-portrait::after { content:""; position:absolute; z-index:0; width:130%; aspect-ratio:1; top:44%; left:20%; border:1px solid rgba(255,255,255,.3); border-radius:50%; box-shadow:0 0 0 38px rgba(255,255,255,.045),0 0 0 76px rgba(255,255,255,.025); transition:transform .7s; }
  .pta-card:hover .pta-portrait::after { transform:translate(-8%,-8%) scale(1.06); }
  .pta-photo { transition:transform .7s cubic-bezier(.16,1,.3,1); }
  .pta-card:hover .pta-photo { transform:scale(1.065); }
  .pta-role-line { width:26px; height:1px; background:#A92F56; transition:width .35s; }
  .pta-card:hover .pta-role-line { width:54px; }
  .pta-mail { overflow-wrap:anywhere; }
  .pta-link { display:inline-flex; align-items:center; gap:8px; transition:gap .25s,color .25s; }
  .pta-link:hover { gap:14px; }
  .pta-footer-link { position:relative; transition:color .25s; }
  .pta-footer-link:hover { color:#fff; }
  .pta-footer-link::after { content:""; position:absolute; bottom:-4px; left:0; right:0; height:1px; background:#FDC1C9; transform:scaleX(0); transform-origin:left; transition:transform .3s; }
  .pta-footer-link:hover::after { transform:scaleX(1); }
  .pta-bridge-dot { animation:pta-pulse 3s ease-in-out infinite; }
  .pta-bridge-dot:nth-child(2) { animation-delay:.4s; }
  .pta-bridge-dot:nth-child(3) { animation-delay:.8s; }
  .pta-section-enter { opacity:1; }
  @keyframes pta-rise { from { opacity:0; transform:translateY(30px); } to {opacity:1; transform:translateY(0);} }
  @keyframes pta-float { 50% { transform:translateY(-12px) rotate(3deg); } }
  @keyframes pta-orbit { to { transform:rotate(360deg); } }
  @keyframes pta-pulse { 50% { transform:scale(1.8); opacity:.55; } }
  @keyframes pta-view { from { opacity:.4; transform:translateY(34px); } to { opacity:1; transform:translateY(0); } }
  @supports (animation-timeline:view()) {
    .pta-section-enter { animation:pta-view linear both; animation-timeline:view(); animation-range:entry 0% cover 28%; }
  }
  @media (prefers-reduced-motion:reduce) {
    .pta *, .pta *::before, .pta *::after { animation-duration:.01ms!important; animation-iteration-count:1!important; transition-duration:.01ms!important; }
    .pta-rise,.pta-section-enter { opacity:1!important; transform:none!important; }
  }
`;

function TeamCard({ member, index }: { member: TeamMember; index: number }) {
  const Icon = member.icon;
  return (
    <article className="pta-card pta-section-enter grid overflow-hidden border border-[#E7D6DC] bg-white md:grid-cols-[.76fr_1.24fr]" aria-labelledby={`team-member-${index}`}>
      <div className="pta-portrait relative flex min-h-[260px] items-center justify-center sm:min-h-[330px]">
        {member.image ? (
          <Image
            src={member.image}
            alt={`Portrait of ${member.name}`}
            fill
            sizes="(max-width: 767px) 100vw, (max-width: 1200px) 35vw, 270px"
            className="pta-photo relative z-10 object-cover"
            style={{ objectPosition: member.imagePosition }}
          />
        ) : member.initials ? (
          <span className="relative z-10 text-[clamp(5rem,10vw,8rem)] font-black tracking-[-.11em] text-white/85" aria-label={`Initials ${member.initials}`}>
            {member.initials}
          </span>
        ) : null}
        <span className="absolute left-5 top-5 z-20 text-[11px] font-bold tracking-[.2em] text-white/85">0{index + 1} / 04</span>
        <span className="absolute bottom-5 left-5 z-20 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.15em] text-white/80">
          <MapPin size={12} /> PIN &amp; TELL
        </span>
      </div>
      <div className="flex flex-col p-6 sm:p-8 lg:p-9">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-[#A92F56]"><span className="pta-role-line" /><span className="text-[10px] font-extrabold uppercase tracking-[.13em]">{member.role}</span></div>
          <Icon size={19} className="shrink-0 text-[#AE8493]" strokeWidth={1.8} aria-hidden="true" />
        </div>
        <h3 id={`team-member-${index}`} className="mt-7 text-[clamp(1.45rem,2.3vw,2.2rem)] font-black leading-[1.12] tracking-[-.05em] text-[#482130]">
          {member.name}
        </h3>
        <a className="pta-mail mt-3 inline-flex items-start gap-2 text-[11px] font-semibold leading-5 text-[#A92F56] underline-offset-4 hover:underline" href={`mailto:${member.email}`}>
          <Mail size={14} className="mt-[3px] shrink-0" aria-hidden="true" /> {member.email}
        </a>
        <p className="mt-6 flex-1 text-[12px] leading-[1.9] text-[#72636A] sm:text-[13px]">{member.summary}</p>
        <div className="mt-7 border-t border-[#EFE1E6] pt-5">
          <p className="mb-3 text-[10px] font-black uppercase tracking-[.16em] text-[#9B6D7C]">Project contributions</p>
          <ul className="grid gap-x-3 gap-y-2 sm:grid-cols-2">
            {member.responsibilities.map((responsibility) => (
              <li key={responsibility} className="flex items-start gap-2 text-[11px] leading-5 text-[#705E66]">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#CC3A67]" />
                {responsibility}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

export default function AboutPage() {
  return (
    <div id="top" className="pta min-h-screen overflow-x-clip bg-[#FFFDFC] text-[#472432]">
      <style>{aboutStyles}</style>
      {/* Public website only. No administrator links or authentication. */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#391322]/95 text-white backdrop-blur-xl">
        <div className="mx-auto flex h-[78px] max-w-[1320px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
          <Link href="/" aria-label="PIN & TELL public homepage" className="shrink-0"><Wordmark light /></Link>
          <nav aria-label="Main public navigation" className="hidden items-center gap-8 lg:flex">
            <Link href="/#discover" className="pta-nav text-[12px] font-bold text-white/75 hover:text-white">Discover</Link>
            <Link href="/#journeys" className="pta-nav text-[12px] font-bold text-white/75 hover:text-white">On the road</Link>
            <Link href="/#avp" className="pta-nav text-[12px] font-bold text-white/75 hover:text-white">Watch the film</Link>
            <span aria-current="page" className="pta-nav text-[12px] font-bold text-[#FDC1C9]">Our team</span>
          </nav>
          <Link href="/#download" className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-[#FDC1C9]/35 bg-[#FDC1C9] px-4 text-[11px] font-black text-[#4A1C2D] transition-all hover:-translate-y-0.5 hover:bg-white sm:px-5 sm:text-xs">Get the app <ArrowUpRight size={16} /></Link>
        </div>
        <nav aria-label="Mobile public navigation" className="flex items-center justify-center gap-6 overflow-x-auto border-t border-white/10 px-3 py-3 text-[11px] font-bold text-white/75 lg:hidden">
          <Link href="/#discover" className="whitespace-nowrap hover:text-white">Discover</Link>
          <Link href="/#avp" className="whitespace-nowrap hover:text-white">AVP</Link>
          <span className="whitespace-nowrap text-[#FDC1C9]" aria-current="page">About</span>
        </nav>
      </header>

      <main>
        <section className="pta-hero px-5 pb-20 pt-12 text-white sm:px-8 sm:pb-28 sm:pt-16 lg:px-12 lg:pb-32" aria-labelledby="about-title">
          <span className="pta-outline" aria-hidden="true">04</span>
          <span className="pta-orbit" aria-hidden="true" />
          <div className="relative z-10 mx-auto max-w-[1180px]">
            <Link href="/" className="pta-rise pta-delay-1 pta-link inline-flex items-center text-[11px] font-bold text-[#FDC1C9]"><ArrowLeft size={15} /> Back to homepage</Link>
            <div className="mt-14 grid items-center gap-12 lg:mt-20 lg:grid-cols-[1.2fr_.8fr] lg:gap-20">
              <div>
                <p className="pta-rise pta-delay-1 pta-label text-[#FDC1C9]"><span className="pta-line" /> THE PEOPLE BEHIND THE PLATFORM</p>
                <h1 id="about-title" className="pta-hero-title mt-8">
                  <span className="pta-rise pta-delay-2 block">Made by</span>
                  <span className="pta-rise pta-delay-3 block"><span className="pta-serif text-[#FDC1C9]">people.</span></span>
                  <span className="pta-rise pta-delay-4 block">For people.</span>
                </h1>
                <p className="pta-rise pta-delay-4 mt-9 max-w-[550px] text-[15px] leading-[1.9] text-[#F0CED9]">
                  Four different roles, one shared vision. The team behind PIN &amp; TELL brings together community discovery, Android development, web technology, system analysis, and documentation.
                </p>
                <a href="#team" className="pta-rise pta-delay-4 pta-link mt-9 inline-flex h-12 items-center rounded-full bg-[#FDC1C9] px-6 text-[12px] font-black text-[#3C1627] hover:bg-white">
                  Meet the team <ArrowDownRight size={18} />
                </a>
              </div>
              <div className="pta-rise pta-delay-3 relative mx-auto w-full max-w-[390px]">
                <div className="pta-note relative overflow-hidden border border-white/20 p-7 sm:p-9">
                  <div className="relative z-10 flex items-center justify-between gap-3 border-b border-white/20 pb-5 text-[10px] font-black tracking-[.19em] text-[#FDC1C9]"><span>PIN &amp; TELL</span><span>01 / 01</span></div>
                  <div className="pta-note-logo relative z-10 mx-auto mt-10 flex h-28 w-28 items-center justify-center rounded-[26px] bg-white p-3 shadow-[0_25px_55px_-20px_rgba(0,0,0,.2)]">
                    <Image src="/images/pin-tell-logo.png" alt="PIN & TELL" width={100} height={100} sizes="100px" className="h-full w-full object-contain" />
                  </div>
                  <p className="relative z-10 mt-10 text-center text-[11px] font-extrabold uppercase tracking-[.16em] text-[#FDC1C9]">One connected experience</p>
                  <p className="relative z-10 mt-3 text-center text-2xl font-black tracking-[-.04em]">The people behind the pins.</p>
                  <div className="relative z-10 mt-9 grid grid-cols-2 border-t border-white/20 pt-6 text-center">
                    <div className="border-r border-white/20"><p className="pta-stat">04</p><p className="mt-2 text-[10px] font-semibold uppercase tracking-[.1em] text-white/65">Team members</p></div>
                    <div><p className="pta-stat">01</p><p className="mt-2 text-[10px] font-semibold uppercase tracking-[.1em] text-white/65">Shared project</p></div>
                  </div>
                </div>
                <div className="absolute -bottom-5 -left-4 h-20 w-20 border border-[#FDC1C9]/40" aria-hidden="true" />
                <div className="absolute -right-4 -top-4 h-24 w-24 border border-[#FDC1C9]/30" aria-hidden="true" />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#FFFDFC] px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
          <div className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[.7fr_1.3fr] lg:gap-24">
            <div className="pta-section-enter">
              <p className="pta-label text-[#A92F56]"><span className="pta-line" /> WHY WE BUILT IT</p>
              <h2 className="mt-6 text-[clamp(2.7rem,5vw,4.6rem)] font-black leading-[1.06] tracking-[-.075em]">A journey worth <span className="pta-serif text-[#A92F56]">sharing.</span></h2>
            </div>
            <div className="pta-section-enter lg:pt-2">
              <div className="border-t border-[#E9D9DE] py-7 sm:grid sm:grid-cols-[135px_1fr] sm:gap-8">
                <h3 className="text-[11px] font-black uppercase tracking-[.16em] text-[#A92F56]">Our vision</h3>
                <p className="mt-3 text-[14px] leading-[1.9] text-[#72636A] sm:mt-0">Make everyday exploration more connected by giving communities a space to share meaningful locations and helping travelers understand their journeys.</p>
              </div>
              <div className="border-y border-[#E9D9DE] py-7 sm:grid sm:grid-cols-[135px_1fr] sm:gap-8">
                <h3 className="text-[11px] font-black uppercase tracking-[.16em] text-[#A92F56]">Our approach</h3>
                <p className="mt-3 text-[14px] leading-[1.9] text-[#72636A] sm:mt-0">Combine approachable interfaces, dependable backend services, careful system planning, and clear documentation to keep the project useful and manageable.</p>
              </div>
              <div className="flex flex-wrap items-center gap-x-7 gap-y-3 pt-7 text-[11px] font-bold uppercase tracking-[.1em] text-[#977A85]">
                <span>Community maps</span><span className="text-[#CC3A67]">✳</span><span>Android</span><span className="text-[#CC3A67]">✳</span><span>Web &amp; data</span>
              </div>
            </div>
          </div>
        </section>

        <section id="team" className="scroll-mt-28 bg-[#F5E9E9] px-5 py-24 sm:px-8 sm:py-32 lg:px-12">
          <div className="mx-auto max-w-[1180px]">
            <div className="pta-section-enter flex flex-col justify-between gap-7 border-b border-[#E1C8D0] pb-10 lg:flex-row lg:items-end">
              <div>
                <p className="pta-label text-[#A92F56]"><span className="pta-line" /> THE FOUR BEHIND THE STORY</p>
                <h2 className="mt-6 text-[clamp(3rem,5.7vw,5.5rem)] font-black leading-[1.03] tracking-[-.075em]">Meet the <span className="pta-serif text-[#A92F56]">team.</span></h2>
              </div>
              <p className="max-w-[380px] text-[13px] leading-[1.9] text-[#76646C]">Every part of PIN &amp; TELL has someone behind it—from the app you hold to the web platform that supports it.</p>
            </div>
            <div className="mt-9 grid gap-5 lg:grid-cols-2 lg:gap-6">
              {teamMembers.map((member, index) => <TeamCard key={member.email} member={member} index={index} />)}
            </div>
          </div>
        </section>

        {/* Four roles, two platforms, one connected experience. */}
        <section className="relative isolate overflow-hidden bg-[#421B2C] px-5 py-24 text-white sm:px-8 sm:py-28 lg:px-12">
          <div
            className="pointer-events-none absolute -right-20 -top-56 h-[450px] w-[450px] rounded-full border border-white/10 shadow-[0_0_0_70px_rgba(255,255,255,.025),0_0_0_140px_rgba(255,255,255,.015)]"
            aria-hidden="true"
          />
          <div className="relative z-10 mx-auto max-w-[1180px]">
            <p className="pta-label text-[#FDC1C9]">
              <span className="pta-line" /> TWO PLATFORMS, ONE FOUNDATION
            </p>

            <div className="mt-9 grid gap-12 lg:grid-cols-[.84fr_1.16fr] lg:items-start lg:gap-16">
              <div className="pta-section-enter">
                <h2 className="text-[clamp(3rem,5.4vw,5rem)] font-black leading-[1.07] tracking-[-.075em]">
                  Built separately.
                  <br />
                  <span className="pta-serif text-[#FDC1C9]">Connected together.</span>
                </h2>
                <p className="mt-7 max-w-[520px] text-[14px] leading-[1.9] text-white/75">
                  Lean developed the public website and web administration platform, while Jan
                  built the full Android application. Both helped each other connect the two
                  platforms and worked together on the shared Supabase database.
                </p>
                <p className="mt-5 max-w-[520px] text-[14px] leading-[1.9] text-white/75">
                  Chester contributed system analysis, focusing on requirements, workflows,
                  and evaluation. Ashley led project coordination and documentation, helping
                  keep the team&apos;s work organized and recorded. All four roles helped shape
                  PIN &amp; TELL as one complete project.
                </p>
                <div className="mt-9 flex items-center gap-4 border-t border-white/20 pt-5">
                  <span className="text-[38px] font-black leading-none tracking-[-.08em] text-[#FDC1C9]">
                    04
                  </span>
                  <p className="max-w-[170px] text-[11px] font-semibold uppercase leading-5 tracking-[.12em] text-white/65">
                    Team members. One shared vision.
                  </p>
                </div>
              </div>

              <div className="pta-section-enter border border-white/20 bg-white/[.06] p-5 sm:p-7 lg:p-8">
                <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#FDC1C9]">
                  Building the platforms
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="border border-white/15 bg-white/[.045] p-4 sm:p-5">
                    <Code2 size={22} className="text-[#FDC1C9]" aria-hidden="true" />
                    <p className="mt-4 text-[15px] font-black">Web platform</p>
                    <p className="mt-1 text-[12px] font-semibold text-[#FDC1C9]">Lean Aclan</p>
                    <p className="mt-2 text-[11px] leading-[1.7] text-white/60">
                      Public website &amp; web administration
                    </p>
                  </div>
                  <div className="border border-white/15 bg-white/[.045] p-4 sm:p-5">
                    <Database size={22} className="text-[#FDC1C9]" aria-hidden="true" />
                    <p className="mt-4 text-[15px] font-black">Android app</p>
                    <p className="mt-1 text-[12px] font-semibold text-[#FDC1C9]">Jan Muaña</p>
                    <p className="mt-2 text-[11px] leading-[1.7] text-white/60">
                      Complete Android application
                    </p>
                  </div>
                </div>

                <div className="relative my-5 flex items-center justify-center gap-3 text-[#FDC1C9]" aria-hidden="true">
                  <div className="h-px flex-1 bg-white/20" />
                  <span className="pta-bridge-dot h-2 w-2 rounded-full bg-current" />
                  <span className="pta-bridge-dot h-2 w-2 rounded-full bg-current" />
                  <span className="pta-bridge-dot h-2 w-2 rounded-full bg-current" />
                  <div className="h-px flex-1 bg-white/20" />
                </div>

                <div className="border border-[#FDC1C9]/35 bg-[#FDC1C9]/10 px-4 py-4 text-center sm:px-6">
                  <HeartHandshake size={22} className="mx-auto text-[#FDC1C9]" aria-hidden="true" />
                  <p className="mt-3 text-[13px] font-black">Shared Supabase database &amp; integrations</p>
                  <p className="mt-1 text-[11px] leading-5 text-white/65">
                    Developed and connected collaboratively by Lean &amp; Jan
                  </p>
                </div>

                <p className="mt-7 text-[10px] font-extrabold uppercase tracking-[.2em] text-[#FDC1C9]">
                  Guiding the project
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="border border-white/15 bg-white/[.045] p-4 sm:p-5">
                    <Network size={22} className="text-[#FDC1C9]" aria-hidden="true" />
                    <p className="mt-4 text-[15px] font-black">System analysis</p>
                    <p className="mt-1 text-[12px] font-semibold text-[#FDC1C9]">Chester Panti</p>
                    <p className="mt-2 text-[11px] leading-[1.7] text-white/60">
                      Requirements, workflows &amp; evaluation
                    </p>
                  </div>
                  <div className="border border-white/15 bg-white/[.045] p-4 sm:p-5">
                    <BookOpenText size={22} className="text-[#FDC1C9]" aria-hidden="true" />
                    <p className="mt-4 text-[15px] font-black">Project leadership</p>
                    <p className="mt-1 text-[12px] font-semibold text-[#FDC1C9]">Ashley Niñofranco</p>
                    <p className="mt-2 text-[11px] leading-[1.7] text-white/60">
                      Coordination &amp; documentation
                    </p>
                  </div>
                </div>

                <p className="mt-7 border-t border-white/20 pt-5 text-center text-[11px] font-semibold uppercase tracking-[.12em] text-white/65">
                  Four roles. One connected PIN &amp; TELL experience.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#FFFDFC] px-5 py-24 sm:px-8 sm:py-28 lg:px-12">
          <div className="pta-section-enter mx-auto flex max-w-[1180px] flex-col items-start justify-between gap-10 border-b border-[#E9D9DE] pb-12 lg:flex-row lg:items-end">
            <div>
              <p className="pta-label text-[#A92F56]"><span className="pta-line" /> WATCH OUR STORY</p>
              <h2 className="mt-6 max-w-[680px] text-[clamp(2.8rem,5vw,5rem)] font-black leading-[1.07] tracking-[-.075em]">See PIN &amp; TELL <span className="pta-serif text-[#A92F56]">in motion.</span></h2>
              <p className="mt-5 max-w-[590px] text-[14px] leading-8 text-[#76646C]">Watch our audiovisual presentation to see the app, its features, and the idea behind our project.</p>
            </div>
            <Link href="/#avp" className="pta-link inline-flex shrink-0 items-center gap-3 rounded-full bg-[#A92F56] px-7 py-4 text-[12px] font-black text-white hover:bg-[#7D2744]">
              <Play size={17} fill="currentColor" /> Watch the AVP <ArrowUpRight size={17} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-[#351723] px-5 pb-8 pt-16 text-white sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1180px]">
          <div className="flex flex-col justify-between gap-10 border-b border-white/15 pb-14 md:flex-row md:items-start">
            <div><Link href="/" className="inline-flex" aria-label="PIN & TELL public homepage"><Wordmark light /></Link><p className="mt-5 max-w-[260px] text-[12px] leading-7 text-white/55">Find more than a destination.<br />Every place has a story.</p></div>
            <nav aria-label="Footer navigation" className="grid grid-cols-2 gap-x-12 gap-y-5 sm:grid-cols-3 sm:gap-x-16">
              <div className="flex flex-col items-start gap-3"><p className="mb-1 text-[10px] font-bold uppercase tracking-[.2em] text-[#FDC1C9]">Explore</p><Link className="pta-footer-link text-[12px] text-white/65" href="/#discover">Discover</Link><Link className="pta-footer-link text-[12px] text-white/65" href="/#journeys">The journey</Link><Link className="pta-footer-link text-[12px] text-white/65" href="/#avp">Our AVP</Link></div>
              <div className="flex flex-col items-start gap-3"><p className="mb-1 text-[10px] font-bold uppercase tracking-[.2em] text-[#FDC1C9]">PIN &amp; TELL</p><span className="text-[12px] font-bold text-white">The team</span><Link className="pta-footer-link text-[12px] text-white/65" href="/#how-it-works">Get started</Link><Link className="pta-footer-link text-[12px] text-white/65" href="/#download">Download</Link></div>
              <div className="flex flex-col items-start gap-3"><p className="mb-1 text-[10px] font-bold uppercase tracking-[.2em] text-[#FDC1C9]">Legal</p><Link className="pta-footer-link text-[12px] text-white/65" href="/privacy-policy">Privacy Policy</Link><Link className="pta-footer-link text-[12px] text-white/65" href="/terms-and-conditions">Terms &amp; Conditions</Link></div>
            </nav>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-7 text-[10px] text-white/40"><span>© {new Date().getFullYear()} PIN &amp; TELL</span><span>Designed for the journey, and the people along the way.</span></div>
        </div>
      </footer>
    </div>
  );
}
