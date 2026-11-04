"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  Search,
  Settings,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { logoutAction } from "@/app/admin/(protected)/actions";
import LogoutConfirmModal from "@/components/admin/logout-confirm-modal";
import type { AdminTopbarData } from "@/lib/admin/topbar";

type AdminInfo = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
};

type TopbarProps = {
  admin: AdminInfo;
  topbarData: AdminTopbarData;
  onMenuClick: () => void;
};

type NavigationEntry = {
  title: string;
  description: string;
  href: string;
  keywords: string[];
};

// Deliberately exclude the restricted Photo Reviews page from global search.
// Its title is still resolved below when a permitted admin visits the page.
const navigation: NavigationEntry[] = [
  {
    title: "Dashboard",
    description: "Platform overview and administrative activity.",
    href: "/admin",
    keywords: ["dashboard", "overview", "home", "statistics"],
  },
  {
    title: "Users",
    description: "Manage registered PIN & TELL accounts.",
    href: "/admin/users",
    keywords: ["users", "profiles", "accounts", "members"],
  },
  {
    title: "Pins",
    description: "Review community pins and location content.",
    href: "/admin/pins",
    keywords: ["pins", "posts", "locations", "map"],
  },
  {
    title: "Reports",
    description: "Review reports and moderation cases.",
    href: "/admin/reports",
    keywords: ["reports", "moderation", "flagged", "review"],
  },
  {
    title: "Ban Management",
    description: "Manage account restrictions and bans.",
    href: "/admin/bans",
    keywords: ["bans", "blocked", "suspended", "restrictions"],
  },
  {
    title: "Trips",
    description: "Review mileage and eco-driving activity.",
    href: "/admin/trips",
    keywords: ["trips", "mileage", "eco", "driving"],
  },
  {
    title: "Vehicles",
    description: "Review registered user vehicles.",
    href: "/admin/vehicles",
    keywords: ["vehicles", "cars", "motorcycles"],
  },
  {
    title: "Fuel Logs",
    description: "Review fuel usage and efficiency.",
    href: "/admin/fuel-logs",
    keywords: ["fuel", "logs", "consumption", "efficiency"],
  },
  {
    title: "Activity Logs",
    description: "Review security and administrative activity.",
    href: "/admin/activity-logs",
    keywords: ["logs", "activity", "audit", "security"],
  },
  {
    title: "Settings",
    description: "Manage PIN & TELL system configuration.",
    href: "/admin/settings",
    keywords: ["settings", "configuration", "system", "platform"],
  },
];

type PageInfo = { title: string; description: string };
const pageTitles: Record<string, PageInfo> = Object.fromEntries(
  navigation.map(({ href, title, description }) => [href, { title, description }]),
);
pageTitles["/admin/pin-image-reviews"] = {
  title: "Photo Reviews",
  description: "Review AI image findings and manage photo approvals.",
};

function getPageInfo(pathname: string): PageInfo {
  const exact = pageTitles[pathname];
  if (exact) return exact;

  const match = Object.keys(pageTitles)
    .filter((route) => route !== "/admin" && pathname.startsWith(`${route}/`))
    .sort((a, b) => b.length - a.length)[0];

  return match
    ? pageTitles[match]
    : { title: "Administration", description: "PIN & TELL management console." };
}

function formatRelativeTime(value: string | null): string {
  if (!value) return "";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";

  const difference = Math.max(0, Date.now() - timestamp);
  if (difference < 60_000) return "Now";
  if (difference < 3_600_000) return `${Math.floor(difference / 60_000)}m`;
  if (difference < 86_400_000) return `${Math.floor(difference / 3_600_000)}h`;
  return `${Math.floor(difference / 86_400_000)}d`;
}

function formatLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function Topbar({ admin, topbarData, onMenuClick }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const page = getPageInfo(pathname);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutPending, startLogoutTransition] = useTransition();

  const searchRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  const displayName = admin.full_name?.trim() || admin.email;
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AD";

  const results = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return navigation.slice(0, 5);
    return navigation
      .filter((item) =>
        [item.title, item.description, ...item.keywords]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 6);
  }, [searchQuery]);

  function closeMenus() {
    setSearchOpen(false);
    setNotificationsOpen(false);
    setAccountOpen(false);
  }

  function navigateTo(href: string) {
    closeMenus();
    setSearchQuery("");
    router.push(href);
  }

  function openSearch() {
    setSearchOpen(true);
    setNotificationsOpen(false);
    setAccountOpen(false);
    window.requestAnimationFrame(() => {
      if (window.matchMedia("(min-width: 768px)").matches) {
        desktopInputRef.current?.focus();
      } else {
        mobileInputRef.current?.focus();
      }
    });
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSearchQuery("");
      setSearchOpen(false);
      setNotificationsOpen(false);
      setAccountOpen(false);
      setLogoutOpen(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setNotificationsOpen(false);
        setAccountOpen(false);
        return;
      }

      const shortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
      const slash = event.key === "/" && !event.ctrlKey && !event.metaKey;
      if (!shortcut && !slash) return;

      const target = event.target as HTMLElement | null;
      const editable = target?.isContentEditable ||
        ["input", "textarea", "select"].includes(target?.tagName.toLowerCase() ?? "");
      if (slash && editable) return;

      event.preventDefault();
      setSearchOpen(true);
      setNotificationsOpen(false);
      setAccountOpen(false);
      window.requestAnimationFrame(() => {
        if (window.matchMedia("(min-width: 768px)").matches) {
          desktopInputRef.current?.focus();
        } else {
          mobileInputRef.current?.focus();
        }
      });
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: PointerEvent) {
      const target = event.target as Node;
      if (searchRef.current && !searchRef.current.contains(target)) setSearchOpen(false);
      if (notificationRef.current && !notificationRef.current.contains(target)) setNotificationsOpen(false);
      if (accountRef.current && !accountRef.current.contains(target)) setAccountOpen(false);
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    return () => document.removeEventListener("pointerdown", handleOutsideClick);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 h-[68px] border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <div className="flex h-full items-center gap-3 px-4 sm:px-6 xl:px-7">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open navigation"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-[#F2C6D3] hover:bg-[#FFF6F8] hover:text-[#A92F56] lg:hidden"
          >
            <Menu size={19} />
          </button>

          {/* Page context */}
          <div className="min-w-0 flex-1">
            <div className="hidden items-center gap-1.5 text-[10px] font-medium text-slate-400 sm:flex">
              <span>Admin console</span>
              <ChevronRight size={11} />
              <span className="truncate text-[#A92F56]">{page.title}</span>
            </div>
            <h1 className="truncate text-[15px] font-bold tracking-[-0.02em] text-slate-950 sm:mt-0.5 sm:text-base">
              {page.title}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Global navigation search */}
            <div ref={searchRef} className="relative">
              <div className="relative hidden md:block">
                <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={desktopInputRef}
                  type="search"
                  aria-label="Search admin pages"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => {
                    setSearchOpen(true);
                    setNotificationsOpen(false);
                    setAccountOpen(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && results[0]) {
                      event.preventDefault();
                      navigateTo(results[0].href);
                    }
                  }}
                  placeholder="Search admin pages..."
                  className="h-10 w-[215px] rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-12 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#CC3A67] focus:bg-white focus:ring-2 focus:ring-[#FDC1C9]/35 xl:w-[270px]"
                />
                <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
                  /
                </kbd>
              </div>

              <button
                type="button"
                aria-label="Open page search"
                aria-expanded={searchOpen}
                aria-controls="admin-quick-search"
                onClick={() => (searchOpen ? setSearchOpen(false) : openSearch())}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-[#A92F56] md:hidden"
              >
                <Search size={18} />
              </button>

              {searchOpen && (
                <div
                  id="admin-quick-search"
                  className="fixed left-3 right-3 top-[76px] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.25)] md:absolute md:left-auto md:right-0 md:top-[48px] md:w-[390px]"
                >
                  <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2 md:hidden">
                    <Search size={16} className="text-slate-400" />
                    <input
                      ref={mobileInputRef}
                      type="search"
                      aria-label="Search admin pages"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && results[0]) navigateTo(results[0].href);
                      }}
                      placeholder="Search pages..."
                      className="h-10 min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                    />
                    <button type="button" aria-label="Close search" onClick={() => setSearchOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                      <X size={17} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      {searchQuery.trim() ? "Search results" : "Quick navigation"}
                    </span>
                    <span className="text-[10px] text-slate-400">{results.length} pages</span>
                  </div>
                  <div className="max-h-[330px] overflow-y-auto p-2">
                    {results.length > 0 ? (
                      results.map((result) => (
                        <button
                          key={result.href}
                          type="button"
                          onClick={() => navigateTo(result.href)}
                          className="group flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-[#FFF5F8]"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 group-hover:bg-[#A92F56]/10 group-hover:text-[#A92F56]">
                            <Search size={14} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-semibold text-slate-800 group-hover:text-[#A92F56]">{result.title}</span>
                            <span className="mt-0.5 block truncate text-[10px] text-slate-400">{result.description}</span>
                          </span>
                          <ChevronRight size={15} className="mt-2 shrink-0 text-slate-300 group-hover:text-[#A92F56]" />
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-9 text-center">
                        <Search size={20} className="mx-auto text-slate-300" />
                        <p className="mt-3 text-xs font-semibold text-slate-700">No pages found</p>
                        <p className="mt-1 text-[11px] text-slate-400">Try another page name or keyword.</p>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 text-[10px] text-slate-400">
                    Press Enter to open the first result · Esc to close
                  </div>
                </div>
              )}
            </div>

            {/* Moderation notifications */}
            <div ref={notificationRef} className="relative">
              <button
                type="button"
                aria-label="Moderation notifications"
                aria-expanded={notificationsOpen}
                aria-controls="admin-notifications"
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setSearchOpen(false);
                  setAccountOpen(false);
                }}
                className={`relative flex h-10 w-10 items-center justify-center rounded-xl border bg-white transition ${
                  notificationsOpen
                    ? "border-[#F2C6D3] bg-[#FFF5F8] text-[#A92F56]"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#A92F56]"
                }`}
              >
                <Bell size={18} />
                {topbarData.attentionCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-[#A92F56] px-1 text-[9px] font-extrabold text-white ring-2 ring-white">
                    {topbarData.attentionCount > 99 ? "99+" : topbarData.attentionCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div
                  id="admin-notifications"
                  className="fixed left-3 right-3 top-[76px] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.25)] sm:absolute sm:left-auto sm:right-0 sm:top-[48px] sm:w-[380px]"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
                    <div>
                      <p className="text-sm font-bold text-slate-900">Requires attention</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">Recent moderation reports</p>
                    </div>
                    <span className="rounded-lg bg-[#A92F56]/10 px-2.5 py-1 text-xs font-bold text-[#A92F56]">
                      {topbarData.attentionCount}
                    </span>
                  </div>

                  {topbarData.recentReports.length > 0 ? (
                    <div className="max-h-[370px] divide-y divide-slate-100 overflow-y-auto">
                      {topbarData.recentReports.map((report) => (
                        <Link
                          key={report.id}
                          href="/admin/reports"
                          onClick={() => setNotificationsOpen(false)}
                          className="group flex items-start gap-3 px-4 py-3.5 transition hover:bg-[#FFF8FA]"
                        >
                          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                            <AlertTriangle size={16} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-3">
                              <span className="truncate text-xs font-semibold text-slate-800">{formatLabel(report.type)}</span>
                              <span className="shrink-0 text-[10px] text-slate-400">{formatRelativeTime(report.created_at)}</span>
                            </span>
                            <span className="mt-1 block line-clamp-2 text-[11px] leading-5 text-slate-500">{report.reason}</span>
                            <span className="mt-2 inline-flex rounded-md bg-[#FFF0F4] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#A92F56]">
                              {formatLabel(report.status)}
                            </span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="px-5 py-10 text-center">
                      {topbarData.attentionCount === 0 ? (
                        <CheckCircle2 size={24} className="mx-auto text-emerald-500" />
                      ) : (
                        <Bell size={24} className="mx-auto text-slate-300" />
                      )}
                      <p className="mt-3 text-xs font-semibold text-slate-700">
                        {topbarData.attentionCount === 0 ? "All caught up" : "No recent reports to preview"}
                      </p>
                      <p className="mt-1 text-[11px] leading-5 text-slate-400">
                        {topbarData.attentionCount === 0
                          ? "There are no pending moderation alerts."
                          : "Open reports to see everything requiring attention."}
                      </p>
                    </div>
                  )}

                  <Link
                    href="/admin/reports"
                    onClick={() => setNotificationsOpen(false)}
                    className="flex h-11 items-center justify-center gap-2 border-t border-slate-100 bg-slate-50/70 text-xs font-semibold text-[#A92F56] transition hover:bg-[#FFF5F8]"
                  >
                    Open moderation queue <ChevronRight size={14} />
                  </Link>
                </div>
              )}
            </div>

            <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />

            {/* Account */}
            <div ref={accountRef} className="relative">
              <button
                type="button"
                aria-label="Open administrator menu"
                aria-expanded={accountOpen}
                aria-controls="admin-account-menu"
                onClick={() => {
                  setAccountOpen(!accountOpen);
                  setSearchOpen(false);
                  setNotificationsOpen(false);
                }}
                className="flex h-10 items-center gap-2 rounded-xl border border-transparent px-1.5 transition hover:border-slate-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CC3A67]/40"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#72213A] text-[10px] font-bold text-white ring-2 ring-[#F7E7EC]">
                  {initials}
                </span>
                <span className="hidden max-w-[145px] min-w-0 text-left xl:block">
                  <span className="block truncate text-[11px] font-semibold text-slate-800">{displayName}</span>
                  <span className="block truncate text-[9px] font-semibold uppercase tracking-[0.09em] text-slate-400">
                    {formatLabel(admin.role)}
                  </span>
                </span>
                <ChevronDown size={14} className={`hidden shrink-0 text-slate-400 transition-transform xl:block ${accountOpen ? "rotate-180" : ""}`} />
              </button>

              {accountOpen && (
                <div
                  id="admin-account-menu"
                  className="absolute right-0 top-[48px] z-50 w-[278px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.25)]"
                >
                  <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#72213A] text-sm font-bold text-white">
                        {initials}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-bold text-slate-900">{displayName}</span>
                        <span className="mt-0.5 block truncate text-[10px] text-slate-500">{admin.email}</span>
                      </span>
                    </div>
                    <span className="mt-3 inline-flex rounded-md bg-[#A92F56]/10 px-2 py-1 text-[10px] font-semibold text-[#A92F56]">
                      {formatLabel(admin.role)}
                    </span>
                  </div>
                  <div className="p-2">
                    <Link
                      href="/admin/activity-logs"
                      onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
                    >
                      <Activity size={16} /> Activity Logs
                    </Link>
                    <Link
                      href="/admin/settings"
                      onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
                    >
                      <Settings size={16} /> Settings
                    </Link>
                  </div>
                  <div className="border-t border-slate-100 p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAccountOpen(false);
                        setLogoutOpen(true);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      <LogOut size={16} /> Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <LogoutConfirmModal
        open={logoutOpen}
        pending={logoutPending}
        onClose={() => {
          if (!logoutPending) setLogoutOpen(false);
        }}
        onConfirm={() => {
          if (logoutPending) return;
          startLogoutTransition(async () => {
            await logoutAction();
          });
        }}
      />
    </>
  );
}
