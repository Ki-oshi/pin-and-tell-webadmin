"use server";

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

const statusSchema =
  z.object({
    userId:
      z.string().uuid(),

    status:
      z.enum([
        "active",
        "suspended",
      ]),
  });

export type UpdateUserStatusResult =
  | {
      success: true;
      message: string;
    }
  | {
      success: false;
      message: string;
    };

export async function updateUserStatusAction(
  userId: string,
  status:
    | "active"
    | "suspended",
): Promise<UpdateUserStatusResult> {
  const parsed =
    statusSchema.safeParse({
      userId,
      status,
    });

  if (
    !parsed.success
  ) {
    return {
      success: false,
      message:
        "Invalid user or status.",
    };
  }

  const admin =
    await requireAdmin();

  const supabase =
    getSupabaseAdmin();

  const {
    data: targetUser,
    error: readError,
  } =
    await supabase
      .from("profiles")
      .select(
        `
          id,
          username,
          full_name,
          status
        `,
      )
      .eq(
        "id",
        parsed.data
          .userId,
      )
      .maybeSingle();

  if (
    readError
  ) {
    console.error(
      "[ADMIN USERS] Failed to read user before status update:",
      readError,
    );

    return {
      success: false,
      message:
        "Unable to update this user.",
    };
  }

  if (
    !targetUser
  ) {
    return {
      success: false,
      message:
        "User could not be found.",
    };
  }

  if (
    targetUser.status ===
    "banned"
  ) {
    return {
      success: false,
      message:
        "Banned accounts must be managed through Ban Management.",
    };
  }

  if (
    targetUser.status ===
    parsed.data.status
  ) {
    return {
      success: true,
      message:
        "No changes were required.",
    };
  }

  const now =
    new Date()
      .toISOString();

  const {
    error: updateError,
  } =
    await supabase
      .from("profiles")
      .update({
        status:
          parsed.data
            .status,

        updated_at:
          now,
      })
      .eq(
        "id",
        parsed.data
          .userId,
      );

  if (
    updateError
  ) {
    console.error(
      "[ADMIN USERS] User status update failed:",
      updateError,
    );

    return {
      success: false,
      message:
        "Unable to update this user.",
    };
  }

  const displayName =
    targetUser
      .full_name?.trim() ||
    targetUser
      .username?.trim() ||
    targetUser.id;

  const {
    error: logError,
  } =
    await supabase
      .from("logs")
      .insert({
        user_id:
          admin.id,

        actor_type:
          "admin",

        action_type:
          "admin_user_status_changed",

        description:
          `Administrator changed ${displayName} from ${targetUser.status} to ${parsed.data.status}.`,

        target_table:
          "profiles",

        target_id:
          targetUser.id,

        created_at:
          now,
      });

  if (
    logError
  ) {
    console.error(
      "[ADMIN USERS] Failed to write audit log:",
      logError,
    );
  }

  revalidatePath(
    "/admin/users",
  );

  revalidatePath(
    "/admin",
  );

  return {
    success: true,

    message:
      parsed.data
        .status ===
      "suspended"
        ? "User suspended successfully."
        : "User reactivated successfully.",
  };
}