import type {
  ReactNode,
} from "react";

import {
  requireAdmin,
} from "@/lib/auth/session";

import AdminShell from "@/components/admin/admin-shell";

type ProtectedAdminLayoutProps = {
  children: ReactNode;
};

export default async function ProtectedAdminLayout({
  children,
}: ProtectedAdminLayoutProps) {
  const admin =
    await requireAdmin();

  return (
    <AdminShell
      admin={{
        id:
          admin.id,

        email:
          admin.email,

        full_name:
          admin.full_name,

        role:
          admin.role,
      }}
    >
      {children}
    </AdminShell>
  );
}