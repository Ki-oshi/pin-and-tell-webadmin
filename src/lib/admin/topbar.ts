import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type AdminTopbarReport = {
  id: number;
  type: string;
  reason: string;
  status: string;
  created_at: string | null;
};

export type AdminTopbarData = {
  attentionCount: number;
  recentReports: AdminTopbarReport[];
};

export async function getAdminTopbarData(): Promise<AdminTopbarData> {
  const supabase = getSupabaseAdmin();

  const [
    countResult,
    reportsResult,
  ] = await Promise.all([
    supabase
      .from("reports")
      .select("id", {
        count: "exact",
        head: true,
      })
      .in("status", [
        "pending",
        "reviewing",
      ]),

    supabase
      .from("reports")
      .select(`
        id,
        type,
        reason,
        status,
        created_at
      `)
      .in("status", [
        "pending",
        "reviewing",
      ])
      .order("created_at", {
        ascending: false,
      })
      .limit(5),
  ]);

  if (countResult.error) {
    console.error(
      "[ADMIN TOPBAR] Failed to load notification count:",
      countResult.error,
    );
  }

  if (reportsResult.error) {
    console.error(
      "[ADMIN TOPBAR] Failed to load recent reports:",
      reportsResult.error,
    );
  }

  return {
    attentionCount:
      countResult.error
        ? 0
        : countResult.count ?? 0,

    recentReports:
      reportsResult.error
        ? []
        : (reportsResult.data ?? []) as AdminTopbarReport[],
  };
}