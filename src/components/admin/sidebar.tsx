"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Ban,
  CarFront,
  ChevronRight,
  ClipboardList,
  Fuel,
  Gauge,
  LayoutDashboard,
  MapPin,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

const navigation: NavigationGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "Management",
    items: [
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Pins", href: "/admin/pins", icon: MapPin },
      {
        label: "Photo Reviews",
        href: "/admin/pin-image-reviews",
        icon: ShieldCheck,
      },
      { label: "Reports", href: "/admin/reports", icon: ClipboardList },
      { label: "Ban Management", href: "/admin/bans", icon: Ban },
    ],
  },
  {
    label: "Mobility",
    items: [
      { label: "Trips", href: "/admin/trips", icon: Gauge },
      { label: "Vehicles", href: "/admin/vehicles", icon: CarFront },
      { label: "Fuel Logs", href: "/admin/fuel-logs", icon: Fuel },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Activity Logs", href: "/admin/activity-logs", icon: ScrollText },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

function isActiveRoute(pathname: string, href: string): boolean {
  return href === "/admin"
    ? pathname === "/admin"
    : pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  // Avoid scrolling the page behind the mobile navigation.
  useEffect(() => {
    if (!open) return;

    const mobileViewport = window.matchMedia("(max-width: 1023px)");
    const previousOverflow = document.body.style.overflow;
    function updateScrollLock() {
      document.body.style.overflow = mobileViewport.matches ? "hidden" : previousOverflow;
    }
    function onEscape(event: KeyboardEvent) {
      if (mobileViewport.matches && event.key === "Escape") onClose();
    }

    updateScrollLock();
    mobileViewport.addEventListener("change", updateScrollLock);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      mobileViewport.removeEventListener("change", updateScrollLock);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open, onClose]);

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation"
        aria-hidden={!open}
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[2px] transition-opacity duration-200 lg:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        aria-label="Admin sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-slate-200/80 bg-white shadow-[8px_0_36px_-28px_rgba(15,23,42,0.35)] transition-transform duration-200 ease-out lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand / logo */}
        <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-slate-100 px-4">
          <Link
            href="/admin"
            onClick={onClose}
            aria-label="PIN & TELL Dashboard"
            className="group flex min-w-0 items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#CC3A67]/35"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#F2D5DE] bg-[#FFF6F8] shadow-sm">
              <Image
                src="/images/pin-tell-logo.png"
                alt=""
                width={40}
                height={40}
                priority
                className="h-full w-full object-contain p-1"
              />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-extrabold leading-5 tracking-[-0.035em] text-[#72213A] group-hover:text-[#A92F56]">
                PIN &amp; TELL
              </span>
              <span className="block truncate text-[9px] font-semibold uppercase tracking-[0.19em] text-slate-400">
                Admin workspace
              </span>
            </span>
          </Link>
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Main navigation */}
        <nav aria-label="Primary navigation" className="min-h-0 flex-1 overflow-y-auto px-3 py-5 [scrollbar-width:thin]">
          <div className="space-y-6">
            {navigation.map((group) => (
              <section key={group.label} aria-label={group.label}>
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActiveRoute(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        aria-current={active ? "page" : undefined}
                        className={`group relative flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-[12px] font-medium outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[#CC3A67]/35 ${
                          active
                            ? "bg-[#A92F56]/[0.09] font-semibold text-[#9F294F]"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                        }`}
                      >
                        {active && (
                          <span aria-hidden="true" className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-[#CC3A67]" />
                        )}
                        <Icon
                          size={17}
                          strokeWidth={active ? 2.2 : 1.8}
                          className={`shrink-0 ${active ? "text-[#A92F56]" : "text-slate-400 group-hover:text-[#A92F56]"}`}
                        />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {active && <ChevronRight size={13} strokeWidth={2.5} className="shrink-0 text-[#A92F56]" />}
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </nav>

        {/* Consistent admin footer */}
        <div className="shrink-0 border-t border-slate-100 bg-slate-50/50 p-3">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#A92F56]/10 text-[#A92F56]">
              <ShieldCheck size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold text-slate-800">Admin Console</span>
              <span className="block text-[10px] text-slate-400">PIN &amp; TELL Platform</span>
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
