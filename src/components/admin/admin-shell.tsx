"use client";

import {
  useState,
} from "react";

import NextTopLoader from "nextjs-toploader";

import type {
  AdminTopbarData,
} from "@/lib/admin/topbar";

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

  topbarData:
    AdminTopbarData;

  children:
    React.ReactNode;
};

export default function AdminShell({
  admin,
  topbarData,
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
      <NextTopLoader
        color="#CC3A67"
        initialPosition={0.08}
        crawl
        crawlSpeed={180}
        height={2}
        speed={220}
        easing="ease"
        showSpinner={false}
        shadow={false}
        zIndex={9999}
        showAtBottom={false}
      />

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
          topbarData={
            topbarData
          }
          onMenuClick={() =>
            setSidebarOpen(
              true,
            )
          }
        />

        <main
          className="
            min-h-[calc(100vh-68px)]
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