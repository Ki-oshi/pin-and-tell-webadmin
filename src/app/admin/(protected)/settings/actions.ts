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

const saveSettingSchema =
  z.object({
    key:
      z.string()
        .trim()
        .min(
          1,
          "Setting key is required.",
        ),

    /*
     * platform_settings.value is a
     * nullable text column.
     *
     * The existing PHP implementation
     * stored submitted values as
     * strings, including an empty
     * string, so we preserve that
     * behavior here.
     */
    value:
      z.string(),
  });

export type SavePlatformSettingResult =
  | {
      success: true;

      message:
        string;

      setting: {
        id: number;

        key: string;

        value:
          string | null;

        updated_by:
          string | null;

        updated_at:
          string | null;
      };
    }
  | {
      success: false;

      message:
        string;
    };

/*
 * Writes a non-sensitive audit entry.
 *
 * Setting values are deliberately not
 * included in the description because
 * a platform setting could potentially
 * contain configuration that should not
 * be copied into the audit log.
 */
async function writeSettingAuditLog({
  adminId,
  settingId,
  settingKey,
}: {
  adminId: string;

  settingId:
    number;

  settingKey:
    string;
}) {
  const supabase =
    getSupabaseAdmin();

  const {
    error,
  } =
    await supabase
      .from(
        "logs",
      )
      .insert({
        user_id:
          adminId,

        actor_type:
          "admin",

        action_type:
          "platform_setting_updated",

        description:
          `Updated platform setting "${settingKey}".`,

        target_table:
          "platform_settings",

        target_id:
          String(
            settingId,
          ),

        /*
         * IP address and user agent are
         * left null here because this
         * server action does not receive
         * trusted request-context values.
         */
        ip_address:
          null,

        user_agent:
          null,

        created_at:
          new Date()
            .toISOString(),
      });

  if (
    error
  ) {
    /*
     * Do not undo a successfully saved
     * setting just because the audit-log
     * insert failed.
     *
     * The failure is still surfaced in
     * the server console.
     */
    console.error(
      "[ADMIN SETTINGS] Failed to write audit log:",
      error,
    );
  }
}

export async function savePlatformSettingAction(
  input: {
    key:
      string;

    value:
      string;
  },
): Promise<SavePlatformSettingResult> {
  const parsed =
    saveSettingSchema.safeParse(
      input,
    );

  if (
    !parsed.success
  ) {
    return {
      success:
        false,

      message:
        parsed.error
          .issues[0]
          ?.message ??
        "Invalid setting value.",
    };
  }

  const admin =
    await requireAdmin();

  const supabase =
    getSupabaseAdmin();

  const {
    key,
    value,
  } =
    parsed.data;

  /*
   * Verify that the key already exists.
   *
   * Platform Settings should manage
   * existing database configuration,
   * not silently create arbitrary keys.
   */
  const {
    data:
      existingSetting,

    error:
      existingError,
  } =
    await supabase
      .from(
        "platform_settings",
      )
      .select(`
        id,
        key,
        value,
        type,
        grp,
        description,
        updated_by,
        updated_at
      `)
      .eq(
        "key",
        key,
      )
      .maybeSingle();

  if (
    existingError
  ) {
    console.error(
      "[ADMIN SETTINGS] Failed to verify setting:",
      existingError,
    );

    return {
      success:
        false,

      message:
        "Unable to verify this platform setting.",
    };
  }

  if (
    !existingSetting
  ) {
    return {
      success:
        false,

      message:
        "This platform setting does not exist.",
    };
  }

  /*
   * Avoid unnecessary database writes
   * when the submitted value is already
   * identical to the stored value.
   */
  if (
    (
      existingSetting.value ??
      ""
    ) ===
    value
  ) {
    return {
      success:
        true,

      message:
        "No changes were necessary.",

      setting: {
        id:
          Number(
            existingSetting.id,
          ),

        key:
          existingSetting.key,

        value:
          existingSetting.value,

        updated_by:
          existingSetting.updated_by,

        updated_at:
          existingSetting.updated_at,
      },
    };
  }

  const now =
    new Date()
      .toISOString();

  const {
    data:
      updatedSetting,

    error:
      updateError,
  } =
    await supabase
      .from(
        "platform_settings",
      )
      .update({
        value,

        updated_by:
          admin.id,

        updated_at:
          now,
      })
      .eq(
        "id",
        existingSetting.id,
      )
      .select(`
        id,
        key,
        value,
        updated_by,
        updated_at
      `)
      .single();

  if (
    updateError ||
    !updatedSetting
  ) {
    console.error(
      "[ADMIN SETTINGS] Failed to update setting:",
      updateError,
    );

    return {
      success:
        false,

      message:
        "Unable to save this platform setting.",
    };
  }

  /*
   * Audit only after the database update
   * has succeeded.
   */
  await writeSettingAuditLog({
    adminId:
      admin.id,

    settingId:
      Number(
        updatedSetting.id,
      ),

    settingKey:
      updatedSetting.key,
  });

  /*
   * Refresh settings data on the next
   * server render.
   */
  revalidatePath(
    "/admin/settings",
  );

  return {
    success:
      true,

    message:
      "Platform setting saved successfully.",

    setting: {
      id:
        Number(
          updatedSetting.id,
        ),

      key:
        updatedSetting.key,

      value:
        updatedSetting.value,

      updated_by:
        updatedSetting.updated_by,

      updated_at:
        updatedSetting.updated_at,
    },
  };
}