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

/* =========================================================
   REPORT STATUS VALIDATION
========================================================= */

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

/* =========================================================
   PIN FLAG VALIDATION
========================================================= */

const flagPinSchema =
  z.object({
    pinId:
      z.coerce
        .number()
        .int()
        .positive(),

    type:
      z.enum([
        "spam",
        "harassment",
        "inappropriate",
        "copyright",
        "misinformation",
        "other",
      ]),

    reason:
      z
        .string()
        .trim()
        .min(
          3,
          "Please provide a reason for flagging this pin.",
        )
        .max(
          200,
          "Reason must be 200 characters or fewer.",
        ),

    details:
      z
        .string()
        .trim()
        .max(
          2000,
          "Additional details must be 2,000 characters or fewer.",
        )
        .optional()
        .default(""),
  });

/* =========================================================
   TYPES
========================================================= */

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

export type FlagPinInput = {
  pinId:
    number;

  type:
    | "spam"
    | "harassment"
    | "inappropriate"
    | "copyright"
    | "misinformation"
    | "other";

  reason:
    string;

  details?:
    string;
};

export type FlagPinActionResult =
  | {
      success: true;

      message:
        string;

      reportId:
        number;
    }
  | {
      success: false;

      message:
        string;
    };

/* =========================================================
   HELPERS
========================================================= */

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
  status:
    string,
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

/* =========================================================
   UPDATE REPORT STATUS
========================================================= */

export async function updateReportStatusAction(
  reportId:
    number,
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
      success:
        false,

      message:
        "Invalid report action.",
    };
  }

  const admin =
    await requireAdmin();

  const supabase =
    getSupabaseAdmin();

  const {
    data:
      report,

    error:
      readError,
  } =
    await supabase
      .from(
        "reports",
      )
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
      success:
        false,

      message:
        "Unable to load this report.",
    };
  }

  if (
    !report
  ) {
    return {
      success:
        false,

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
      success:
        true,

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
      success:
        false,

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
      .from(
        "reports",
      )
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
      success:
        false,

      message:
        "Unable to update this report.",
    };
  }

  const {
    error:
      logError,
  } =
    await supabase
      .from(
        "logs",
      )
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
   * Report status affects several
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
    success:
      true,

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

/* =========================================================
   FLAG PIN FOR REVIEW
========================================================= */

export async function flagPinForReviewAction(
  input:
    FlagPinInput,
): Promise<FlagPinActionResult> {
  /* =======================================================
     VALIDATE INPUT
  ======================================================= */

  const parsed =
    flagPinSchema.safeParse(
      input,
    );

  if (
    !parsed.success
  ) {
    const message =
      parsed.error
        .issues[0]
        ?.message ??
      "Invalid pin flag request.";

    return {
      success:
        false,

      message,
    };
  }

  const admin =
    await requireAdmin();

  const supabase =
    getSupabaseAdmin();

  const {
    pinId,
    type,
    reason,
    details,
  } =
    parsed.data;

  /* =======================================================
     LOAD PIN
  ======================================================= */

  const {
    data:
      pin,

    error:
      pinError,
  } =
    await supabase
      .from(
        "pins",
      )
      .select(`
        id,
        title,
        creator_id,
        category,
        subcategory
      `)
      .eq(
        "id",
        pinId,
      )
      .maybeSingle();

  if (
    pinError
  ) {
    console.error(
      "[ADMIN PINS] Failed to load pin before flagging:",
      pinError,
    );

    return {
      success:
        false,

      message:
        "Unable to load this pin.",
    };
  }

  if (
    !pin
  ) {
    return {
      success:
        false,

      message:
        "The pin could not be found.",
    };
  }

  /* =======================================================
     PREVENT DUPLICATE OPEN MODERATION CASES
  ======================================================= */

  /*
   * If the pin already has any pending or
   * actively reviewed report, creating
   * another administrator flag would only
   * duplicate the moderation case.
   *
   * The administrator should use the
   * existing report instead.
   */
  const {
    data:
      existingReports,

    error:
      existingReportError,
  } =
    await supabase
      .from(
        "reports",
      )
      .select(`
        id,
        status,
        type,
        reason
      `)
      .eq(
        "pin_id",
        pin.id,
      )
      .in(
        "status",
        [
          "pending",
          "reviewing",
        ],
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        },
      )
      .limit(
        1,
      );

  if (
    existingReportError
  ) {
    console.error(
      "[ADMIN PINS] Failed to check existing pin reports:",
      existingReportError,
    );

    return {
      success:
        false,

      message:
        "Unable to check whether this pin is already under review.",
    };
  }

  const existingReport =
    existingReports?.[0];

  if (
    existingReport
  ) {
    return {
      success:
        false,

      message:
        `This pin is already associated with open report #${existingReport.id}. Review the existing case instead of creating a duplicate.`,
    };
  }

  /* =======================================================
     CREATE REPORT
  ======================================================= */

  const now =
    new Date()
      .toISOString();

  const cleanedDetails =
    details.trim();

  const {
    data:
      createdReport,

    error:
      createError,
  } =
    await supabase
      .from(
        "reports",
      )
      .insert({
        /*
         * reporter_id is intentionally null.
         *
         * This is an administrator-created
         * moderation flag rather than a
         * report submitted by an app user.
         */
        reporter_id:
          null,

        reported_user_id:
          pin.creator_id ??
          null,

        pin_id:
          pin.id,

        comment_id:
          null,

        chat_id:
          null,

        type,

        reason,

        details:
          cleanedDetails ||
          null,

        status:
          "pending",

        reviewed_by:
          null,

        reviewed_at:
          null,

        created_at:
          now,
      })
      .select(
        "id",
      )
      .single();

  if (
    createError ||
    !createdReport
  ) {
    console.error(
      "[ADMIN PINS] Failed to flag pin:",
      createError,
    );

    return {
      success:
        false,

      message:
        "Unable to flag this pin for review.",
    };
  }

  const reportId =
    Number(
      createdReport.id,
    );

  /* =======================================================
     AUDIT LOG
  ======================================================= */

  const {
    error:
      logError,
  } =
    await supabase
      .from(
        "logs",
      )
      .insert({
        user_id:
          admin.id,

        actor_type:
          "admin",

        action_type:
          "admin_pin_flagged",

        description:
          [
            `Administrator flagged pin #${pin.id} for moderation.`,
            `Report #${reportId}.`,
            `Type=${type}.`,
            `Reason=${reason}.`,
          ].join(
            " ",
          ),

        target_table:
          "pins",

        target_id:
          String(
            pin.id,
          ),

        created_at:
          now,
      });

  if (
    logError
  ) {
    /*
     * The moderation case has already
     * been created successfully, so an
     * audit-log failure should not roll
     * back the report.
     */
    console.error(
      "[ADMIN PINS] Failed to write pin flag audit log:",
      logError,
    );
  }

  /* =======================================================
     REVALIDATION
  ======================================================= */

  /*
   * The newly-created report changes:
   *
   * - Pins open report count
   * - Reports queue
   * - Dashboard moderation statistics
   */
  revalidatePath(
    "/admin/pins",
  );

  revalidatePath(
    "/admin/reports",
  );

  revalidatePath(
    "/admin",
  );

  /* =======================================================
     RESULT
  ======================================================= */

  return {
    success:
      true,

    reportId,

    message:
      `Pin #${pin.id} was flagged successfully and added to the moderation queue as report #${reportId}.`,
  };
}