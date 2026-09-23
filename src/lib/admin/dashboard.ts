import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type DashboardReport = {
  id: number;
  type: string;
  reason: string;
  status: string;
  reported_user_id: string | null;
  pin_id: number | null;
  comment_id: number | null;
  created_at: string | null;
};

export type DashboardLog = {
  id: number;
  action_type: string;
  description: string;
  actor_type: string | null;
  target_table: string | null;
  created_at: string | null;
};

export type DashboardData = {
  metrics: {
    totalUsers: number | null;
    activeUsers7d: number | null;
    totalPins: number | null;
    totalTrips: number | null;
    totalVehicles: number | null;
    pendingReports: number | null;
    reviewingReports: number | null;
    activeBans: number | null;
    suspendedUsers: number | null;
  };

  recentReports: DashboardReport[];
  recentLogs: DashboardLog[];

  hasErrors: boolean;
};

type CountQueryResult = {
  count: number | null;
  error: unknown;
};

function safeCount(
  result: CountQueryResult,
): number | null {
  if (result.error) {
    return null;
  }

  return result.count ?? 0;
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = getSupabaseAdmin();

  const now = new Date();

  const sevenDaysAgo = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const nowIso = now.toISOString();

  const [
    totalUsersResult,
    activeUsersResult,
    totalPinsResult,
    totalTripsResult,
    totalVehiclesResult,
    pendingReportsResult,
    reviewingReportsResult,
    activeBansResult,
    suspendedUsersResult,
    recentReportsResult,
    recentLogsResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("profiles")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "active")
      .gte("last_seen", sevenDaysAgo),

    supabase
      .from("pins")
      .select("id", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("trips")
      .select("id", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("user_vehicles")
      .select("id", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("reports")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "pending"),

    supabase
      .from("reports")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "reviewing"),

    supabase
      .from("user_bans")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "active")
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`),

    supabase
      .from("profiles")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "suspended"),

    supabase
      .from("reports")
      .select(`
        id,
        type,
        reason,
        status,
        reported_user_id,
        pin_id,
        comment_id,
        created_at
      `)
      .order("created_at", {
        ascending: false,
      })
      .limit(6),

    supabase
      .from("logs")
      .select(`
        id,
        action_type,
        description,
        actor_type,
        target_table,
        created_at
      `)
      .order("created_at", {
        ascending: false,
      })
      .limit(8),
  ]);

  const errors = [
    totalUsersResult.error,
    activeUsersResult.error,
    totalPinsResult.error,
    totalTripsResult.error,
    totalVehiclesResult.error,
    pendingReportsResult.error,
    reviewingReportsResult.error,
    activeBansResult.error,
    suspendedUsersResult.error,
    recentReportsResult.error,
    recentLogsResult.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    console.error(
      "[ADMIN DASHBOARD] One or more dashboard queries failed:",
      errors,
    );
  }

  return {
    metrics: {
      totalUsers:
        safeCount(totalUsersResult),

      activeUsers7d:
        safeCount(activeUsersResult),

      totalPins:
        safeCount(totalPinsResult),

      totalTrips:
        safeCount(totalTripsResult),

      totalVehicles:
        safeCount(totalVehiclesResult),

      pendingReports:
        safeCount(pendingReportsResult),

      reviewingReports:
        safeCount(reviewingReportsResult),

      activeBans:
        safeCount(activeBansResult),

      suspendedUsers:
        safeCount(suspendedUsersResult),
    },

    recentReports:
      (recentReportsResult.data ??
        []) as DashboardReport[],

    recentLogs:
      (recentLogsResult.data ??
        []) as DashboardLog[],

    hasErrors:
      errors.length > 0,
  };
}