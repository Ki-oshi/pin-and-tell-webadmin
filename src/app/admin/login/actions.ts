"use server";

import {
  redirect,
} from "next/navigation";

import {
  z,
} from "zod";

import {
  getSupabaseAdmin,
} from "@/lib/supabase/admin";

import {
  createAdminSession,
} from "@/lib/auth/session";

import {
  verifyAdminPassword,
} from "@/lib/auth/password";

import {
  getRequestMetadata,
} from "@/lib/auth/request";

import {
  logSecurityEvent,
} from "@/lib/auth/log";

import {
  verifyTurnstile,
} from "@/lib/auth/turnstile";

import {
  checkLoginRateLimit,
} from "@/lib/auth/rate-limit";

import type {
  AdminWithPassword,
} from "@/lib/auth/types";

export type LoginState = {
  error:
    | string
    | null;

  resetTurnstile:
    number;
};

const schema =
  z.object({
    email:
      z.string()
        .trim()
        .email(
          "Enter a valid email address.",
        )
        .max(254)
        .transform(
          (value) =>
            value.toLowerCase(),
        ),

    password:
      z.string()
        .min(
          1,
          "Enter your password.",
        )
        .max(
          256,
          "Invalid login information.",
        ),

    remember:
      z.boolean(),

    turnstile:
      z.string()
        .min(
          1,
          "Complete the security verification.",
        )
        .max(
          2048,
          "Security verification failed.",
        ),
  });

async function waitForMinimumDuration(
  startedAt: number,
  minimumMilliseconds =
    550,
): Promise<void> {
  const elapsed =
    Date.now() -
    startedAt;

  const remaining =
    minimumMilliseconds -
    elapsed;

  if (remaining > 0) {
    await new Promise<void>(
      (resolve) =>
        setTimeout(
          resolve,
          remaining,
        ),
    );
  }
}

function failure(
  previousState:
    LoginState,
  message: string,
): LoginState {
  return {
    error:
      message,

    resetTurnstile:
      previousState
        .resetTurnstile +
      1,
  };
}

export async function loginAction(
  previousState:
    LoginState,
  formData:
    FormData,
): Promise<LoginState> {
  const startedAt =
    Date.now();

  const parsed =
    schema.safeParse({
      email:
        formData.get(
          "email",
        ),

      password:
        formData.get(
          "password",
        ),

      remember:
        formData.get(
          "remember",
        ) === "on",

      turnstile:
        formData.get(
          "cf-turnstile-response",
        ),
    });

  if (!parsed.success) {
    await waitForMinimumDuration(
      startedAt,
    );

    return failure(
      previousState,
      parsed.error
        .issues[0]
        ?.message ??
        "Unable to sign in.",
    );
  }

  const {
    email,
    password,
    remember,
    turnstile,
  } = parsed.data;

  const metadata =
    await getRequestMetadata();

  /*
   * Layer 1:
   * application rate limiting.
   */
  const rateLimit =
    await checkLoginRateLimit(
      email,
      metadata.ipAddress,
    );

  if (!rateLimit.allowed) {
    await logSecurityEvent({
      actionType:
        "admin_login_rate_limited",

      description:
        `Administrator login was rate limited (${rateLimit.reason}).`,

      actorType:
        "system",

      targetTable:
        "admins",

      targetId:
        email,

      ipAddress:
        metadata.ipAddress,

      userAgent:
        metadata.userAgent,
    });

    await waitForMinimumDuration(
      startedAt,
    );

    return failure(
      previousState,
      rateLimit.reason ===
        "unavailable"
        ? "Security verification is temporarily unavailable."
        : "Too many sign-in attempts. Please try again later.",
    );
  }

  /*
   * Layer 2:
   * Cloudflare Turnstile.
   */
  const turnstileResult =
    await verifyTurnstile(
      turnstile,
      metadata.ipAddress,
    );

  if (
    !turnstileResult.success
  ) {
    await logSecurityEvent({
      actionType:
        "admin_turnstile_failed",

      description:
        `Administrator login security verification failed: ${
          turnstileResult.reason ??
          "unknown"
        }.`,

      actorType:
        "system",

      targetTable:
        "admins",

      targetId:
        email,

      ipAddress:
        metadata.ipAddress,

      userAgent:
        metadata.userAgent,
    });

    await waitForMinimumDuration(
      startedAt,
    );

    return failure(
      previousState,
      "Security verification failed. Please try again.",
    );
  }

  const supabase =
    getSupabaseAdmin();

  const {
    data,
    error,
  } = await supabase
    .from("admins")
    .select(
      `
        id,
        email,
        password,
        full_name,
        role,
        status,
        is_online,
        last_seen
      `,
    )
    .eq(
      "email",
      email,
    )
    .maybeSingle();

  if (error) {
    console.error(
      "[AUTH] Administrator lookup failed:",
      error,
    );

    await logSecurityEvent({
      actionType:
        "admin_login_error",

      description:
        "Administrator lookup failed during login.",

      actorType:
        "system",

      targetTable:
        "admins",

      targetId:
        email,

      ipAddress:
        metadata.ipAddress,

      userAgent:
        metadata.userAgent,
    });

    await waitForMinimumDuration(
      startedAt,
    );

    return failure(
      previousState,
      "Unable to sign in right now. Please try again.",
    );
  }

  const admin =
    data as
      | AdminWithPassword
      | null;

  /*
   * Keep the public response generic so
   * attackers cannot enumerate admin emails.
   */
  if (!admin) {
    await logSecurityEvent({
      actionType:
        "admin_login_failed",

      description:
        "Invalid administrator credentials.",

      actorType:
        "system",

      targetTable:
        "admins",

      targetId:
        email,

      ipAddress:
        metadata.ipAddress,

      userAgent:
        metadata.userAgent,
    });

    await waitForMinimumDuration(
      startedAt,
    );

    return failure(
      previousState,
      "Invalid email or password.",
    );
  }

  if (
    admin.status !==
    "active"
  ) {
    await logSecurityEvent({
      actionType:
        "admin_login_blocked",

      description:
        `Inactive administrator attempted to sign in: ${admin.email}`,

      actorType:
        "admin",

      adminId:
        admin.id,

      targetTable:
        "admins",

      targetId:
        admin.id,

      ipAddress:
        metadata.ipAddress,

      userAgent:
        metadata.userAgent,
    });

    await waitForMinimumDuration(
      startedAt,
    );

    /*
     * Generic externally;
     * detailed internally.
     */
    return failure(
      previousState,
      "Invalid email or password.",
    );
  }

  const validPassword =
    await verifyAdminPassword(
      password,
      admin.password,
    );

  if (!validPassword) {
    await logSecurityEvent({
      actionType:
        "admin_login_failed",

      description:
        `Invalid password submitted for administrator: ${admin.email}`,

      actorType:
        "admin",

      adminId:
        admin.id,

      targetTable:
        "admins",

      /*
       * Email is intentionally used here
       * for the credential-rate limiter.
       */
      targetId:
        email,

      ipAddress:
        metadata.ipAddress,

      userAgent:
        metadata.userAgent,
    });

    await waitForMinimumDuration(
      startedAt,
    );

    return failure(
      previousState,
      "Invalid email or password.",
    );
  }

  let session:
    Awaited<
      ReturnType<
        typeof createAdminSession
      >
    >;

  try {
    session =
      await createAdminSession(
        admin.id,
        remember,
        metadata,
      );
  } catch (sessionError) {
    console.error(
      "[AUTH] Session creation error:",
      sessionError,
    );

    await logSecurityEvent({
      actionType:
        "admin_session_creation_failed",

      description:
        `Unable to establish session for administrator: ${admin.email}`,

      actorType:
        "admin",

      adminId:
        admin.id,

      targetTable:
        "admins",

      targetId:
        admin.id,

      ipAddress:
        metadata.ipAddress,

      userAgent:
        metadata.userAgent,
    });

    return failure(
      previousState,
      "Unable to establish a secure session. Please try again.",
    );
  }

  await logSecurityEvent({
    actionType:
      "admin_session_created",

    description:
      `Secure administrator session created for: ${admin.email}`,

    actorType:
      "admin",

    adminId:
      admin.id,

    targetTable:
      "admin_sessions",

    targetId:
      session.sessionId,

    ipAddress:
      metadata.ipAddress,

    userAgent:
      metadata.userAgent,
  });

  await logSecurityEvent({
    actionType:
      "admin_login",

    description:
      `Administrator logged in: ${admin.email}`,

    actorType:
      "admin",

    adminId:
      admin.id,

    targetTable:
      "admins",

    targetId:
      admin.id,

    ipAddress:
      metadata.ipAddress,

    userAgent:
      metadata.userAgent,
  });

  redirect(
    "/admin",
  );
}