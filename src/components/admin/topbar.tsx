"use client";

import {
  Bell,
  ChevronDown,
  Menu,
  Search,
} from "lucide-react";

import { usePathname } from "next/navigation";

import { logoutAction } from "@/app/admin/(protected)/actions";

type AdminInfo = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
};

type TopbarProps = {
  admin: AdminInfo;
  onMenuClick: () => void;
};

const titles: Record<
  string,
  {
    title: string;
    description: string;
  }
> = {
  "/admin": {
    title: "Dashboard",
    description:
      "Platform overview and administrative activity.",
  },

  "/admin/users": {
    title: "Users",
    description:
      "Manage registered PIN&TELL accounts.",
  },

  "/admin/pins": {
    title: "Pins",
    description:
      "Review community pins and location-based content.",
  },

  "/admin/reports": {
    title: "Reports",
    description:
      "Review reports and moderation cases.",
  },

  "/admin/bans": {
    title: "Ban Management",
    description:
      "Manage active and historical account restrictions.",
  },

  "/admin/trips": {
    title: "Trips",
    description:
      "Review recorded trips and eco-driving activity.",
  },

  "/admin/vehicles": {
    title: "Vehicles",
    description:
      "Review registered user vehicles.",
  },

  "/admin/fuel-logs": {
    title: "Fuel Logs",
    description:
      "Monitor recorded fuel usage and efficiency.",
  },

  "/admin/logs": {
    title: "Activity Logs",
    description:
      "Audit administrative and platform activity.",
  },

  "/admin/settings": {
    title: "Platform Settings",
    description:
      "Manage system-level PIN&TELL configuration.",
  },
};

function getPageInfo(
  pathname: string,
) {
  if (titles[pathname]) {
    return titles[pathname];
  }

  const matchingPath =
    Object.keys(titles)
      .filter(
        (route) =>
          route !==
            "/admin" &&
          pathname.startsWith(
            `${route}/`,
          ),
      )
      .sort(
        (a, b) =>
          b.length -
          a.length,
      )[0];

  return matchingPath
    ? titles[matchingPath]
    : {
        title:
          "Administration",
        description:
          "PIN&TELL management console.",
      };
}

export default function Topbar({
  admin,
  onMenuClick,
}: TopbarProps) {
  const pathname =
    usePathname();

  const page =
    getPageInfo(
      pathname,
    );

  const displayName =
    admin.full_name?.trim() ||
    admin.email;

  const initials =
    displayName
      .split(/\s+/)
      .map(
        (part) =>
          part[0],
      )
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <header
      className="
        sticky top-0 z-30
        border-b
        border-slate-200
        bg-white/95
        backdrop-blur
      "
    >
      <div
        className="
          flex min-h-[72px]
          items-center
          gap-4
          px-4
          sm:px-6
          xl:px-8
        "
      >
        <button
          type="button"
          onClick={
            onMenuClick
          }
          className="
            flex h-10 w-10
            shrink-0
            items-center
            justify-center
            rounded-lg
            border
            border-slate-200
            text-slate-600
            transition
            hover:bg-slate-50
            hover:text-slate-950
            lg:hidden
          "
          aria-label="Open navigation"
        >
          <Menu
            size={19}
          />
        </button>

        <div className="min-w-0 flex-1">
          <h1
            className="
              truncate
              text-[18px]
              font-semibold
              tracking-[-0.02em]
              text-slate-950
            "
          >
            {page.title}
          </h1>

          <p
            className="
              mt-0.5
              hidden
              truncate
              text-xs
              text-slate-500
              sm:block
            "
          >
            {
              page.description
            }
          </p>
        </div>

        <div
          className="
            flex
            items-center
            gap-2
          "
        >
          {/* Search */}
          <button
            type="button"
            className="
              hidden h-10
              items-center
              gap-2
              rounded-lg
              border
              border-slate-200
              bg-white
              px-3
              text-xs
              font-medium
              text-slate-500
              transition
              hover:border-slate-300
              hover:text-slate-800
              md:flex
            "
          >
            <Search
              size={16}
            />

            Search

            <kbd
              className="
                ml-3
                rounded
                border
                border-slate-200
                bg-slate-50
                px-1.5
                py-0.5
                text-[10px]
                font-medium
                text-slate-400
              "
            >
              /
            </kbd>
          </button>

          {/* Notifications */}
          <button
            type="button"
            className="
              relative
              flex h-10 w-10
              items-center
              justify-center
              rounded-lg
              border
              border-slate-200
              bg-white
              text-slate-500
              transition
              hover:bg-slate-50
              hover:text-slate-900
            "
            aria-label="Notifications"
          >
            <Bell
              size={17}
            />

            <span
              className="
                absolute
                right-[9px]
                top-[8px]
                h-1.5
                w-1.5
                rounded-full
                bg-[#CC3A67]
                ring-2
                ring-white
              "
            />
          </button>

          {/* Admin */}
          <details
            className="
              group
              relative
            "
          >
            <summary
              className="
                flex
                cursor-pointer
                list-none
                items-center
                gap-2.5
                rounded-lg
                border
                border-transparent
                px-1.5
                py-1
                transition
                hover:border-slate-200
                hover:bg-slate-50
                [&::-webkit-details-marker]:hidden
              "
            >
              <div
                className="
                  flex h-9 w-9
                  items-center
                  justify-center
                  rounded-lg
                  bg-[#72213A]
                  text-xs
                  font-semibold
                  text-white
                "
              >
                {initials}
              </div>

              <div
                className="
                  hidden
                  max-w-[140px]
                  text-left
                  xl:block
                "
              >
                <p
                  className="
                    truncate
                    text-xs
                    font-semibold
                    text-slate-800
                  "
                >
                  {
                    displayName
                  }
                </p>

                <p
                  className="
                    mt-0.5
                    truncate
                    text-[10px]
                    font-medium
                    uppercase
                    tracking-wide
                    text-slate-400
                  "
                >
                  {admin.role}
                </p>
              </div>

              <ChevronDown
                size={14}
                className="
                  hidden
                  text-slate-400
                  transition-transform
                  group-open:rotate-180
                  xl:block
                "
              />
            </summary>

            <div
              className="
                absolute
                right-0
                mt-2
                w-64
                overflow-hidden
                rounded-xl
                border
                border-slate-200
                bg-white
                shadow-xl
                shadow-slate-900/10
              "
            >
              <div
                className="
                  border-b
                  border-slate-100
                  px-4
                  py-3.5
                "
              >
                <p
                  className="
                    truncate
                    text-sm
                    font-semibold
                    text-slate-900
                  "
                >
                  {
                    displayName
                  }
                </p>

                <p
                  className="
                    mt-1
                    truncate
                    text-xs
                    text-slate-500
                  "
                >
                  {admin.email}
                </p>
              </div>

              <form
                action={
                  logoutAction
                }
                className="p-2"
              >
                <button
                  type="submit"
                  className="
                    flex w-full
                    items-center
                    rounded-lg
                    px-3
                    py-2.5
                    text-left
                    text-sm
                    font-medium
                    text-red-600
                    transition
                    hover:bg-red-50
                  "
                >
                  Log out
                </button>
              </form>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}