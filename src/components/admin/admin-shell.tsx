"use client";

import {
  useState,
} from "react";

import Sidebar from "./sidebar";
import Topbar from "./topbar";

type AdminInfo = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
};

type AdminShellProps = {
  admin: AdminInfo;
  children: React.ReactNode;
};

export default function AdminShell({
  admin,
  children,
}: AdminShellProps) {
  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

  return (
    <div
      className="
        min-h-screen
        bg-[#F7F8FA]
        text-slate-900
      "
    >
      <Sidebar
        open={
          sidebarOpen
        }
        onClose={() =>
          setSidebarOpen(
            false,
          )
        }
      />

      <div
        className="
          min-h-screen
          lg:pl-[260px]
        "
      >
        <Topbar
          admin={
            admin
          }
          onMenuClick={() =>
            setSidebarOpen(
              true,
            )
          }
        />

        <main
          className="
            min-h-[calc(100vh-72px)]
            px-4
            py-6
            sm:px-6
            xl:px-8
            xl:py-7
          "
        >
          <div
            className="
              mx-auto
              w-full
              max-w-[1600px]
            "
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}