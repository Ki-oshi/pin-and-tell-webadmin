"use server";

import {
  isIP,
} from "node:net";

import {
  revalidatePath,
} from "next/cache";

import {
  z,
} from "zod";

import {
  requireAdmin,
} from "@/lib/auth/session";

import {
  getSupabaseAdmin,
} from "@/lib/supabase/admin";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const searchSchema =
  z.string()
    .trim()
    .min(2)
    .max(80);

const createBanSchema =
  z.object({
    userId:
      z.string().uuid(),

    reportId:
      z.number()
        .int()
        .positive()
        .nullable(),

    banType:
      z.enum([
        "temporary_ban",
        "permanent_ban",
        "temporary_ip_ban",
      ]),

    durationType:
      z.enum([
        "hours",
        "days",
        "weeks",
        "months",
        "permanent",
      ]),

    durationValue:
      z.number()
        .int()
        .positive()
        .max(3650)
        .nullable(),

    ipAddress:
      z.string()
        .trim()
        .max(64)
        .nullable(),

    reason:
      z.string()
        .trim()
        .min(4)
        .max(1000),
  });

export type BanUserSearchResult = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  status: string | null;
};

export type BanActionResult =
  | {
      success: true;
      message: string;
    }
  | {
      success: false;
      message: string;
    };

function addDuration(
  date: Date,
  type:
    | "hours"
    | "days"
    | "weeks"
    | "months",
  value: number,
): Date {
  const result =
    new Date(date);

  if (type === "hours") {
    result.setUTCHours(
      result.getUTCHours() +
        value,
    );
  }

  if (type === "days") {
    result.setUTCDate(
      result.getUTCDate() +
        value,
    );
  }

  if (type === "weeks") {
    result.setUTCDate(
      result.getUTCDate() +
        value * 7,
    );
  }

  if (type === "months") {
    result.setUTCMonth(
      result.getUTCMonth() +
        value,
    );
  }

  return result;
}

async function refreshUserProfileStatus(
  userId: string,
) {
  const supabase =
    getSupabaseAdmin();

  const now =
    new Date()
      .toISOString();

  const {
    data: activeBans,
    error,
  } =
    await supabase
      .from("user_bans")
      .select(`
        id,
        ban_type,
        expires_at
      `)
      .eq(
        "user_id",
        userId,
      )
      .eq(
        "status",
        "active",
      );

  if (error) {
    throw error;
  }

  const effective =
    (activeBans ?? [])
      .filter((ban) => {
        if (
          !ban.expires_at
        ) {
          return true;
        }

        return (
          new Date(
            ban.expires_at,
          ).getTime() >
          Date.now()
        );
      });

  let profileStatus:
    | "active"
    | "suspended"
    | "banned" =
    "active";

  if (
    effective.some(
      (ban) =>
        ban.ban_type ===
        "permanent_ban",
    )
  ) {
    profileStatus =
      "banned";
  } else if (
    effective.length > 0
  ) {
    profileStatus =
      "suspended";
  }

  const {
    error:
      profileError,
  } =
    await supabase
      .from("profiles")
      .update({
        status:
          profileStatus,

        updated_at:
          now,
      })
      .eq(
        "id",
        userId,
      );

  if (profileError) {
    throw profileError;
  }
}

export async function searchBanUsersAction(
  query: string,
): Promise<BanUserSearchResult[]> {
  await requireAdmin();

  const parsed =
    searchSchema.safeParse(
      query,
    );

  if (!parsed.success) {
    return [];
  }

  const supabase =
    getSupabaseAdmin();

  const value =
    parsed.data
      .replace(
        /[%*(),"']/g,
        " ",
      );

  let request =
    supabase
      .from("profiles")
      .select(`
        id,
        username,
        full_name,
        avatar_url,
        status
      `)
      .limit(8);

  if (
    UUID_REGEX.test(
      value,
    )
  ) {
    request =
      request.eq(
        "id",
        value,
      );
  } else {
    request =
      request.or(
        [
          `username.ilike.%${value}%`,
          `full_name.ilike.%${value}%`,
          `phone_number.ilike.%${value}%`,
        ].join(","),
      );
  }

  const {
    data,
    error,
  } = await request;

  if (error) {
    console.error(
      "[ADMIN BANS] User search failed:",
      error,
    );

    return [];
  }

  return (
    data ?? []
  ) as BanUserSearchResult[];
}

export async function createBanAction(
  input: {
    userId: string;
    reportId: number | null;

    banType:
      | "temporary_ban"
      | "permanent_ban"
      | "temporary_ip_ban";

    durationType:
      | "hours"
      | "days"
      | "weeks"
      | "months"
      | "permanent";

    durationValue:
      number | null;

    ipAddress:
      string | null;

    reason:
      string;
  },
): Promise<BanActionResult> {
  const parsed =
    createBanSchema.safeParse(
      input,
    );

  if (!parsed.success) {
    return {
      success: false,
      message:
        "Please check the ban details and try again.",
    };
  }

  const values =
    parsed.data;

  if (
    values.banType ===
      "permanent_ban" &&
    values.durationType !==
      "permanent"
  ) {
    return {
      success: false,
      message:
        "Permanent bans must use a permanent duration.",
    };
  }

  if (
    values.banType !==
      "permanent_ban" &&
    values.durationType ===
      "permanent"
  ) {
    return {
      success: false,
      message:
        "Temporary bans require a duration.",
    };
  }

  if (
    values.durationType !==
      "permanent" &&
    !values.durationValue
  ) {
    return {
      success: false,
      message:
        "A duration value is required.",
    };
  }

  if (
    values.banType ===
    "temporary_ip_ban"
  ) {
    if (
      !values.ipAddress ||
      isIP(
        values.ipAddress,
      ) === 0
    ) {
      return {
        success: false,
        message:
          "Enter a valid IPv4 or IPv6 address for an IP ban.",
      };
    }
  }

  const admin =
    await requireAdmin();

  const supabase =
    getSupabaseAdmin();

  const now =
    new Date();

  const nowIso =
    now.toISOString();

  const {
    data: user,
    error: userError,
  } =
    await supabase
      .from("profiles")
      .select(`
        id,
        username,
        full_name,
        avatar_url,
        status
      `)
      .eq(
        "id",
        values.userId,
      )
      .maybeSingle();

  if (
    userError ||
    !user
  ) {
    return {
      success: false,
      message:
        "The selected user could not be found.",
    };
  }

  const {
    data:
      existingBans,
    error:
      existingError,
  } =
    await supabase
      .from("user_bans")
      .select(`
        id,
        expires_at
      `)
      .eq(
        "user_id",
        values.userId,
      )
      .eq(
        "status",
        "active",
      );

  if (existingError) {
    console.error(
      "[ADMIN BANS] Failed to check existing bans:",
      existingError,
    );

    return {
      success: false,
      message:
        "Unable to verify the user's current ban status.",
    };
  }

  const hasActiveBan =
    (
      existingBans ?? []
    ).some((ban) => {
      if (
        !ban.expires_at
      ) {
        return true;
      }

      return (
        new Date(
          ban.expires_at,
        ).getTime() >
        Date.now()
      );
    });

  if (hasActiveBan) {
    return {
      success: false,
      message:
        "This user already has an active ban.",
    };
  }

  if (
  values.reportId
) {
  const {
    data: report,
    error: reportError,
  } =
    await supabase
      .from("reports")
      .select(`
        id,
        reported_user_id
      `)
      .eq(
        "id",
        values.reportId,
      )
      .maybeSingle();

  if (
    reportError ||
    !report
  ) {
    return {
      success: false,

      message:
        "The source report could not be found.",
    };
  }

  /*
   * A report-linked ban must always
   * belong to the user identified as
   * reported_user_id in that report.
   *
   * This protects the moderation
   * history from mismatched records.
   */
  if (
    report.reported_user_id !==
    values.userId
  ) {
    return {
      success: false,

      message:
        "The selected user does not match the reported user for this report.",
    };
  }
}

  let expiresAt:
    string | null =
    null;

  if (
    values.durationType !==
      "permanent"
  ) {
    expiresAt =
      addDuration(
        now,
        values.durationType,
        values.durationValue!,
      ).toISOString();
  }

  const {
    data: newBan,
    error:
      insertError,
  } =
    await supabase
      .from("user_bans")
      .insert({
        user_id:
          values.userId,

        report_id:
          values.reportId,

        admin_id:
          admin.id,

        ban_type:
          values.banType,

        duration_type:
          values.durationType,

        duration_value:
          values.durationType ===
          "permanent"
            ? null
            : values.durationValue,

        ip_address:
          values.banType ===
          "temporary_ip_ban"
            ? values.ipAddress
            : null,

        reason:
          values.reason,

        status:
          "active",

        reputation_deducted:
          false,

        starts_at:
          nowIso,

        expires_at:
          expiresAt,

        revoked_at:
          null,

        created_at:
          nowIso,

        updated_at:
          nowIso,
      })
      .select("id")
      .single();

  if (
    insertError ||
    !newBan
  ) {
    console.error(
      "[ADMIN BANS] Ban creation failed:",
      insertError,
    );

    return {
      success: false,
      message:
        "Unable to create this ban.",
    };
  }

  const profileStatus =
    values.banType ===
    "permanent_ban"
      ? "banned"
      : "suspended";

  const {
    error:
      profileError,
  } =
    await supabase
      .from("profiles")
      .update({
        status:
          profileStatus,

        updated_at:
          nowIso,
      })
      .eq(
        "id",
        values.userId,
      );

  if (profileError) {
    /*
     * Compensating rollback so a ban
     * is not created while the profile
     * remains unrestricted.
     */
    await supabase
      .from("user_bans")
      .delete()
      .eq(
        "id",
        newBan.id,
      );

    console.error(
      "[ADMIN BANS] Profile status update failed:",
      profileError,
    );

    return {
      success: false,
      message:
        "The account could not be restricted. No ban was kept.",
    };
  }

  const displayName =
    user.full_name?.trim() ||
    user.username?.trim() ||
    user.id;

  const {
    error:
      logError,
  } =
    await supabase
      .from("logs")
      .insert({
        user_id:
          admin.id,

        actor_type:
          "admin",

        action_type:
          "admin_user_banned",

        description:
          `Administrator created ${values.banType} for ${displayName}. Reason: ${values.reason}`,

        target_table:
          "user_bans",

        target_id:
          String(
            newBan.id,
          ),

        created_at:
          nowIso,
      });

  if (logError) {
    console.error(
      "[ADMIN BANS] Audit log failed:",
      logError,
    );
  }

  revalidatePath(
    "/admin/bans",
  );

  revalidatePath(
    "/admin/users",
  );

  revalidatePath(
    "/admin/reports",
  );

  revalidatePath(
    "/admin",
  );

  return {
    success: true,
    message:
      "Ban created successfully.",
  };
}

export async function revokeBanAction(
  banId: number,
): Promise<BanActionResult> {
  const parsed =
    z.number()
      .int()
      .positive()
      .safeParse(
        banId,
      );

  if (!parsed.success) {
    return {
      success: false,
      message:
        "Invalid ban.",
    };
  }

  const admin =
    await requireAdmin();

  const supabase =
    getSupabaseAdmin();

  const {
    data: ban,
    error: readError,
  } =
    await supabase
      .from("user_bans")
      .select(`
        id,
        user_id,
        status,
        ban_type,
        reason
      `)
      .eq(
        "id",
        parsed.data,
      )
      .maybeSingle();

  if (
    readError ||
    !ban
  ) {
    return {
      success: false,
      message:
        "Ban could not be found.",
    };
  }

  if (
    ban.status !==
    "active"
  ) {
    return {
      success: false,
      message:
        "Only active bans can be revoked.",
    };
  }

  const now =
    new Date()
      .toISOString();

  const {
    error:
      updateError,
  } =
    await supabase
      .from("user_bans")
      .update({
        status:
          "revoked",

        revoked_at:
          now,

        updated_at:
          now,
      })
      .eq(
        "id",
        ban.id,
      );

  if (updateError) {
    return {
      success: false,
      message:
        "Unable to revoke this ban.",
    };
  }

  try {
    await refreshUserProfileStatus(
      ban.user_id,
    );
  } catch (error) {
    /*
     * Roll the ban back if profile
     * state cannot be synchronized.
     */
    await supabase
      .from("user_bans")
      .update({
        status:
          "active",

        revoked_at:
          null,

        updated_at:
          now,
      })
      .eq(
        "id",
        ban.id,
      );

    console.error(
      "[ADMIN BANS] Profile synchronization failed:",
      error,
    );

    return {
      success: false,
      message:
        "The account state could not be synchronized, so the ban was not revoked.",
    };
  }

  await supabase
    .from("logs")
    .insert({
      user_id:
        admin.id,

      actor_type:
        "admin",

      action_type:
        "admin_ban_revoked",

      description:
        `Administrator revoked ban #${ban.id}.`,

      target_table:
        "user_bans",

      target_id:
        String(
          ban.id,
        ),

      created_at:
        now,
    });

  revalidatePath(
    "/admin/bans",
  );

  revalidatePath(
    "/admin/users",
  );

  revalidatePath(
    "/admin",
  );

  return {
    success: true,
    message:
      "Ban revoked successfully.",
  };
}

export async function syncExpiredBansAction(): Promise<BanActionResult> {
  const admin =
    await requireAdmin();

  const supabase =
    getSupabaseAdmin();

  const now =
    new Date()
      .toISOString();

  const {
    data: elapsed,
    error,
  } =
    await supabase
      .from("user_bans")
      .select(`
        id,
        user_id
      `)
      .eq(
        "status",
        "active",
      )
      .not(
        "expires_at",
        "is",
        null,
      )
      .lte(
        "expires_at",
        now,
      );

  if (error) {
    return {
      success: false,
      message:
        "Unable to check expired bans.",
    };
  }

  if (
    !elapsed ||
    elapsed.length === 0
  ) {
    return {
      success: true,
      message:
        "There are no elapsed bans to synchronize.",
    };
  }

  const ids =
    elapsed.map(
      (ban) =>
        ban.id,
    );

  const {
    error:
      updateError,
  } =
    await supabase
      .from("user_bans")
      .update({
        status:
          "expired",

        updated_at:
          now,
      })
      .in(
        "id",
        ids,
      );

  if (updateError) {
    return {
      success: false,
      message:
        "Unable to update expired bans.",
    };
  }

  const userIds = [
    ...new Set(
      elapsed.map(
        (ban) =>
          ban.user_id,
      ),
    ),
  ];

  for (
    const userId of
    userIds
  ) {
    try {
      await refreshUserProfileStatus(
        userId,
      );
    } catch (syncError) {
      console.error(
        `[ADMIN BANS] Failed to synchronize ${userId}:`,
        syncError,
      );
    }
  }

  await supabase
    .from("logs")
    .insert({
      user_id:
        admin.id,

      actor_type:
        "admin",

      action_type:
        "admin_bans_expired_sync",

      description:
        `Administrator synchronized ${ids.length} elapsed ban(s).`,

      target_table:
        "user_bans",

      target_id:
        null,

      created_at:
        now,
    });

  revalidatePath(
    "/admin/bans",
  );

  revalidatePath(
    "/admin/users",
  );

  revalidatePath(
    "/admin",
  );

  return {
    success: true,

    message:
      `${ids.length} expired ban${ids.length === 1 ? "" : "s"} synchronized.`,
  };
}