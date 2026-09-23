import type {
  ReactNode,
} from "react";

import {
  requireAdmin,
} from "@/lib/auth/session";

import {
  getAdminTopbarData,
} from "@/lib/admin/topbar";

import AdminShell from "@/components/admin/admin-shell";

type ProtectedAdminLayoutProps = {
  children: ReactNode;
};

export default async function ProtectedAdminLayout({
  children,
}: ProtectedAdminLayoutProps) {
  const admin =
    await requireAdmin();

  const topbarData =
    await getAdminTopbarData();

  return (
    <AdminShell
      admin={{
        id: admin.id,
        email: admin.email,
        full_name: admin.full_name,
        role: admin.role,
      }}
      topbarData={topbarData}
    >
      {children}
    </AdminShell>
  );
}