import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

const WINDOW_MINUTES = 15;

const EMAIL_FAILURE_LIMIT = 5;
const IP_FAILURE_LIMIT = 10;

type RateLimitResult = {
  allowed: boolean;
  reason:
    | "ok"
    | "email"
    | "ip"
    | "unavailable";
};

export async function checkLoginRateLimit(
  email: string,
  ipAddress: string | null,
): Promise<RateLimitResult> {
  const supabase =
    getSupabaseAdmin();

  const cutoff =
    new Date(
      Date.now() -
        WINDOW_MINUTES *
          60 *
          1000,
    ).toISOString();

  /*
   * Email limit only counts actual
   * credential failures.
   *
   * That prevents somebody from simply
   * spamming invalid Turnstile responses
   * to lock out a known admin email.
   */
  const {
    count: emailFailures,
    error: emailError,
  } = await supabase
    .from("logs")
    .select(
      "id",
      {
        count: "exact",
        head: true,
      },
    )
    .eq(
      "action_type",
      "admin_login_failed",
    )
    .eq(
      "target_table",
      "admins",
    )
    .eq(
      "target_id",
      email,
    )
    .gte(
      "created_at",
      cutoff,
    );

  if (emailError) {
    console.error(
      "[AUTH RATE LIMIT]",
      emailError,
    );

    return {
      allowed: false,
      reason: "unavailable",
    };
  }

  if (
    (emailFailures ?? 0) >=
    EMAIL_FAILURE_LIMIT
  ) {
    return {
      allowed: false,
      reason: "email",
    };
  }

  if (ipAddress) {
    const {
      count: ipFailures,
      error: ipError,
    } = await supabase
      .from("logs")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        },
      )
      .in(
        "action_type",
        [
          "admin_login_failed",
          "admin_turnstile_failed",
        ],
      )
      .eq(
        "ip_address",
        ipAddress,
      )
      .gte(
        "created_at",
        cutoff,
      );

    if (ipError) {
      console.error(
        "[AUTH RATE LIMIT]",
        ipError,
      );

      return {
        allowed: false,
        reason: "unavailable",
      };
    }

    if (
      (ipFailures ?? 0) >=
      IP_FAILURE_LIMIT
    ) {
      return {
        allowed: false,
        reason: "ip",
      };
    }
  }

  return {
    allowed: true,
    reason: "ok",
  };
}