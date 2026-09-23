import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

type ActorType =
  | "admin"
  | "user"
  | "system";

type SecurityLogOptions = {
  actionType: string;
  description: string;

  actorType?: ActorType;

  adminId?: string | null;

  targetTable?: string | null;

  targetId?: string | number | null;

  ipAddress?: string | null;

  userAgent?: string | null;
};

export async function logSecurityEvent({
  actionType,
  description,
  actorType = "admin",
  adminId = null,
  targetTable = null,
  targetId = null,
  ipAddress = null,
  userAgent = null,
}: SecurityLogOptions): Promise<void> {
  try {
    const supabase =
      getSupabaseAdmin();

    const {
      error,
    } = await supabase
      .from("logs")
      .insert({
        user_id:
          adminId,

        actor_type:
          actorType,

        action_type:
          actionType
            .trim()
            .toLowerCase(),

        description:
          description.slice(0, 2000),

        target_table:
          targetTable,

        target_id:
          targetId === null
            ? null
            : String(targetId),

        ip_address:
          ipAddress,

        user_agent:
          userAgent,
      });

    if (error) {
      console.error(
        "[PIN&TELL SECURITY LOG]",
        error,
      );
    }
  } catch (error) {
    /*
     * Logging failures must never expose
     * sensitive information to the browser.
     */
    console.error(
      "[PIN&TELL SECURITY LOG]",
      error,
    );
  }
}