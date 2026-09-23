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

const updateReportSchema =
  z.object({
    reportId:
      z.coerce
        .number()
        .int()
        .positive(),

    status:
      z.enum([
        "reviewing",
        "resolved",
        "dismissed",
      ]),
  });

type ModerationStatus =
  | "pending"
  | "reviewing"
  | "resolved"
  | "dismissed"
  | "suspended"
  | "outdated";

type NextStatus =
  | "reviewing"
  | "resolved"
  | "dismissed";

export type ReportActionResult =
  | {
      success: true;
      message: string;
    }
  | {
      success: false;
      message: string;
    };

function canTransition(
  currentStatus:
    ModerationStatus,
  nextStatus:
    NextStatus,
): boolean {
  if (
    currentStatus ===
    "pending"
  ) {
    return [
      "reviewing",
      "resolved",
      "dismissed",
    ].includes(
      nextStatus,
    );
  }

  if (
    currentStatus ===
    "reviewing"
  ) {
    return [
      "resolved",
      "dismissed",
    ].includes(
      nextStatus,
    );
  }

  return false;
}

function statusLabel(
  status: string,
) {
  return status
    .replace(
      /_/g,
      " ",
    )
    .replace(
      /\b\w/g,
      (
        letter,
      ) =>
        letter.toUpperCase(),
    );
}

export async function updateReportStatusAction(
  reportId: number,
  status:
    NextStatus,
): Promise<ReportActionResult> {
  const parsed =
    updateReportSchema.safeParse(
      {
        reportId,
        status,
      },
    );

  if (
    !parsed.success
  ) {
    return {
      success: false,

      message:
        "Invalid report action.",
    };
  }

  const admin =
    await requireAdmin();

  const supabase =
    getSupabaseAdmin();

  const {
    data: report,
    error: readError,
  } =
    await supabase
      .from("reports")
      .select(`
        id,
        status,
        type,
        reason,
        reported_user_id,
        pin_id,
        comment_id,
        chat_id
      `)
      .eq(
        "id",
        parsed.data
          .reportId,
      )
      .maybeSingle();

  if (
    readError
  ) {
    console.error(
      "[ADMIN REPORTS] Failed to read report:",
      readError,
    );

    return {
      success: false,

      message:
        "Unable to load this report.",
    };
  }

  if (!report) {
    return {
      success: false,

      message:
        "Report could not be found.",
    };
  }

  const currentStatus =
    report.status as
      ModerationStatus;

  const nextStatus =
    parsed.data
      .status;

  if (
    currentStatus ===
    nextStatus
  ) {
    return {
      success: true,

      message:
        "No changes were required.",
    };
  }

  if (
    !canTransition(
      currentStatus,
      nextStatus,
    )
  ) {
    return {
      success: false,

      message:
        `This report cannot be changed from ${statusLabel(
          currentStatus,
        )} to ${statusLabel(
          nextStatus,
        )}.`,
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
      .from("reports")
      .update({
        status:
          nextStatus,

        reviewed_by:
          admin.id,

        reviewed_at:
          now,
      })
      .eq(
        "id",
        report.id,
      );

  if (
    updateError
  ) {
    console.error(
      "[ADMIN REPORTS] Status update failed:",
      updateError,
    );

    return {
      success: false,

      message:
        "Unable to update this report.",
    };
  }

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
          "admin_report_status_changed",

        description:
          `Administrator changed report #${report.id} from ${currentStatus} to ${nextStatus}.`,

        target_table:
          "reports",

        target_id:
          String(
            report.id,
          ),

        created_at:
          now,
      });

  if (
    logError
  ) {
    console.error(
      "[ADMIN REPORTS] Failed to write audit log:",
      logError,
    );
  }

  /*
   * Reports affects several
   * administrative views.
   */
  revalidatePath(
    "/admin/reports",
  );

  revalidatePath(
    "/admin/pins",
  );

  revalidatePath(
    "/admin",
  );

  return {
    success: true,

    message:
      nextStatus ===
      "reviewing"
        ? "Report marked as under review."
        : nextStatus ===
            "resolved"
          ? "Report resolved successfully."
          : "Report dismissed successfully.",
  };
}