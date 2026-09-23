"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Ban,
  CarFront,
  ClipboardList,
  Fuel,
  Gauge,
  LayoutDashboard,
  MapPin,
  ScrollText,
  Settings,
  Users,
  X,
} from "lucide-react";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

type NavigationItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
  }>;
};

type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

const navigation: NavigationGroup[] = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Management",
    items: [
      {
        label: "Users",
        href: "/admin/users",
        icon: Users,
      },
      {
        label: "Pins",
        href: "/admin/pins",
        icon: MapPin,
      },
      {
        label: "Reports",
        href: "/admin/reports",
        icon: ClipboardList,
      },
      {
        label: "Ban Management",
        href: "/admin/bans",
        icon: Ban,
      },
    ],
  },
  {
    label: "Mobility",
    items: [
      {
        label: "Trips",
        href: "/admin/trips",
        icon: Gauge,
      },
      {
        label: "Vehicles",
        href: "/admin/vehicles",
        icon: CarFront,
      },
      {
        label: "Fuel Logs",
        href: "/admin/fuel-logs",
        icon: Fuel,
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "Activity Logs",
        href: "/admin/activity-logs",
        icon: ScrollText,
      },
      {
        label: "Settings",
        href: "/admin/settings",
        icon: Settings,
      },
    ],
  },
];

function isActiveRoute(
  pathname: string,
  href: string,
) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return (
    pathname === href ||
    pathname.startsWith(`${href}/`)
  );
}

export default function Sidebar({
  open,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile backdrop */}
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
        className={`
          fixed inset-0 z-40
          bg-slate-950/25
          backdrop-blur-[1px]
          transition-opacity
          lg:hidden
          ${
            open
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          }
        `}
      />

      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex w-[260px]
          flex-col
          border-r border-slate-200
          bg-white
          transition-transform
          duration-200
          ease-out
          lg:translate-x-0
          ${
            open
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >
        {/* Brand */}
        <div
          className="
            flex h-[72px]
            items-center
            justify-between
            border-b
            border-slate-200
            px-5
          "
        >
          <Link
            href="/admin"
            onClick={onClose}
            className="
              flex
              min-w-0
              items-center
              gap-3
            "
          >
            <div
              className="
                flex h-10 w-10
                shrink-0
                items-center
                justify-center
                overflow-hidden
                rounded-lg
                border
                border-slate-200
                bg-white
              "
            >
              <Image
                src="/images/pin-tell-logo.png"
                alt="PIN & TELL"
                width={40}
                height={40}
                priority
                className="
                  h-full
                  w-full
                  object-contain
                  p-1
                "
              />
            </div>

            <div className="min-w-0">
              <p
                className="
                  truncate
                  text-[15px]
                  font-bold
                  tracking-[-0.01em]
                  text-slate-950
                "
              >
                PIN & TELL
              </p>

              <p
                className="
                  truncate
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.16em]
                  text-slate-400
                "
              >
                Administration
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="
              flex h-9 w-9
              items-center
              justify-center
              rounded-lg
              text-slate-400
              transition
              hover:bg-slate-100
              hover:text-slate-700
              lg:hidden
            "
          >
            <X size={19} />
          </button>
        </div>

        {/* Navigation */}
        <nav
          className="
            flex-1
            overflow-y-auto
            px-3
            py-5
          "
        >
          <div className="space-y-7">
            {navigation.map(
              (group) => (
                <div
                  key={group.label}
                >
                  <p
                    className="
                      mb-2
                      px-3
                      text-[10px]
                      font-bold
                      uppercase
                      tracking-[0.14em]
                      text-slate-400
                    "
                  >
                    {group.label}
                  </p>

                  <div className="space-y-1">
                    {group.items.map(
                      (item) => {
                        const Icon =
                          item.icon;

                        const active =
                          isActiveRoute(
                            pathname,
                            item.href,
                          );

                        return (
                          <Link
                            key={
                              item.href
                            }
                            href={
                              item.href
                            }
                            onClick={
                              onClose
                            }
                            className={`
                              relative
                              flex h-10
                              items-center
                              gap-3
                              rounded-lg
                              px-3
                              text-[13px]
                              font-medium
                              transition-colors
                              ${
                                active
                                  ? "bg-[#A92F56]/[0.08] text-[#A92F56]"
                                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                              }
                            `}
                          >
                            {active && (
                              <span
                                className="
                                  absolute
                                  bottom-2
                                  left-0
                                  top-2
                                  w-[3px]
                                  rounded-r-full
                                  bg-[#CC3A67]
                                "
                              />
                            )}

                            <Icon
                              size={18}
                              strokeWidth={
                                active
                                  ? 2.2
                                  : 1.8
                              }
                              className="shrink-0"
                            />

                            <span>
                              {
                                item.label
                              }
                            </span>
                          </Link>
                        );
                      },
                    )}
                  </div>
                </div>
              ),
            )}
          </div>
        </nav>

        {/* Bottom */}
        <div
          className="
            border-t
            border-slate-200
            px-5
            py-4
          "
        >
          <p
            className="
              text-[11px]
              leading-5
              text-slate-400
            "
          >
            PIN & TELL Web Administration
          </p>
        </div>
      </aside>
    </>
  );
}