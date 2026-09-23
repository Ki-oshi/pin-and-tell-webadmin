import "server-only";

import {
  createHash,
  randomBytes,
} from "node:crypto";

import {
  cookies,
  headers,
} from "next/headers";

import {
  redirect,
} from "next/navigation";

import {
  getSupabaseAdmin,
} from "@/lib/supabase/admin";

import type {
  Admin,
  RequestMetadata,
} from "@/lib/auth/types";

const NORMAL_SESSION_SECONDS =
  60 * 60;

const REMEMBER_SESSION_SECONDS =
  60 * 60 * 24 * 30;

const SESSION_COOKIE =
  process.env.NODE_ENV ===
  "production"
    ? "__Host-pin_tell_admin_session"
    : "pin_tell_admin_session";

function hashToken(
  token: string,
): string {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

function createToken(): string {
  /*
   * 48 random bytes = 384 bits.
   */
  return randomBytes(48)
    .toString("base64url");
}

function cleanUserAgent(
  value: string | null,
): string | null {
  if (!value) {
    return null;
  }

  return value
    .trim()
    .slice(0, 1000);
}

export async function createAdminSession(
  adminId: string,
  rememberMe: boolean,
  metadata: RequestMetadata,
): Promise<{
  sessionId: string;
  expiresAt: string;
}> {
  const supabase =
    getSupabaseAdmin();

  const now =
    new Date();

  /*
   * Safe cleanup is performed from the
   * login mutation instead of during page
   * rendering.
   */
  await supabase
    .from("admin_sessions")
    .delete()
    .eq(
      "admin_id",
      adminId,
    )
    .lte(
      "expires_at",
      now.toISOString(),
    );

  const rawToken =
    createToken();

  const tokenHash =
    hashToken(rawToken);

  const duration =
    rememberMe
      ? REMEMBER_SESSION_SECONDS
      : NORMAL_SESSION_SECONDS;

  const expires =
    new Date(
      now.getTime() +
        duration * 1000,
    );

  const {
    data: session,
    error,
  } = await supabase
    .from("admin_sessions")
    .insert({
      admin_id:
        adminId,

      token_hash:
        tokenHash,

      remember_me:
        rememberMe,

      ip_address:
        metadata.ipAddress,

      user_agent:
        metadata.userAgent,

      created_at:
        now.toISOString(),

      last_used_at:
        now.toISOString(),

      expires_at:
        expires.toISOString(),
    })
    .select("id")
    .single();

  if (
    error ||
    !session
  ) {
    console.error(
      "[AUTH] Unable to create session:",
      error,
    );

    throw new Error(
      "SESSION_CREATION_FAILED",
    );
  }

  const {
    error: presenceError,
  } = await supabase
    .from("admins")
    .update({
      is_online: true,

      last_seen:
        now.toISOString(),

      updated_at:
        now.toISOString(),
    })
    .eq(
      "id",
      adminId,
    );

  if (presenceError) {
    console.error(
      "[AUTH] Presence update failed:",
      presenceError,
    );
  }

  const cookieStore =
    await cookies();

  cookieStore.set(
    SESSION_COOKIE,
    rawToken,
    {
      httpOnly: true,

      secure:
        process.env.NODE_ENV ===
        "production",

      sameSite: "lax",

      path: "/",

      maxAge: duration,

      priority: "high",
    },
  );

  return {
    sessionId:
      session.id,

    expiresAt:
      expires.toISOString(),
  };
}

export async function getCurrentAdmin():
  Promise<Admin | null> {
  const cookieStore =
    await cookies();

  const rawToken =
    cookieStore.get(
      SESSION_COOKIE,
    )?.value;

  if (!rawToken) {
    return null;
  }

  /*
   * Never send the raw browser token
   * to Supabase.
   */
  const tokenHash =
    hashToken(rawToken);

  const supabase =
    getSupabaseAdmin();

  const {
    data: session,
    error: sessionError,
  } = await supabase
    .from("admin_sessions")
    .select(
      `
        id,
        admin_id,
        expires_at,
        user_agent
      `,
    )
    .eq(
      "token_hash",
      tokenHash,
    )
    .maybeSingle();

  if (
    sessionError ||
    !session
  ) {
    return null;
  }

  const expiresAt =
    new Date(
      session.expires_at,
    ).getTime();

  if (
    !Number.isFinite(
      expiresAt,
    ) ||
    expiresAt <= Date.now()
  ) {
    return null;
  }

  /*
   * Bind the administrator session to
   * the browser user-agent that created it.
   *
   * We deliberately do NOT strictly bind
   * IP addresses because legitimate users'
   * public IPs can change.
   */
  const headerStore =
    await headers();

  const currentUserAgent =
    cleanUserAgent(
      headerStore.get(
        "user-agent",
      ),
    );

  const storedUserAgent =
    cleanUserAgent(
      session.user_agent,
    );

  if (
    storedUserAgent &&
    currentUserAgent &&
    storedUserAgent !==
      currentUserAgent
  ) {
    return null;
  }

  const {
    data: admin,
    error: adminError,
  } = await supabase
    .from("admins")
    .select(
      `
        id,
        email,
        full_name,
        role,
        status,
        is_online,
        last_seen
      `,
    )
    .eq(
      "id",
      session.admin_id,
    )
    .maybeSingle();

  if (
    adminError ||
    !admin
  ) {
    return null;
  }

  /*
   * Administrator status is checked on
   * every protected request.
   *
   * Disabling the account therefore
   * immediately removes authorization.
   */
  if (
    admin.status !==
    "active"
  ) {
    return null;
  }

  return admin as Admin;
}

export async function requireAdmin():
  Promise<Admin> {
  const admin =
    await getCurrentAdmin();

  if (!admin) {
    redirect(
      "/admin/login",
    );
  }

  return admin;
}

export async function destroyAdminSession():
  Promise<{
    adminId: string | null;
    sessionId: string | null;
  }> {
  const cookieStore =
    await cookies();

  const rawToken =
    cookieStore.get(
      SESSION_COOKIE,
    )?.value;

  if (!rawToken) {
    cookieStore.delete(
      SESSION_COOKIE,
    );

    return {
      adminId: null,
      sessionId: null,
    };
  }

  const tokenHash =
    hashToken(rawToken);

  const supabase =
    getSupabaseAdmin();

  const {
    data: session,
  } = await supabase
    .from("admin_sessions")
    .select(
      "id, admin_id",
    )
    .eq(
      "token_hash",
      tokenHash,
    )
    .maybeSingle();

  const adminId =
    session?.admin_id ??
    null;

  const sessionId =
    session?.id ??
    null;

  if (sessionId) {
    const {
      error,
    } = await supabase
      .from("admin_sessions")
      .delete()
      .eq(
        "id",
        sessionId,
      );

    if (error) {
      console.error(
        "[AUTH] Session revocation failed:",
        error,
      );
    }
  }

  /*
   * Browser credential is removed
   * regardless of DB response.
   */
  cookieStore.delete(
    SESSION_COOKIE,
  );

  if (adminId) {
    const now =
      new Date().toISOString();

    /*
     * Only mark offline if no other
     * unexpired browser/device sessions
     * remain.
     */
    const {
      count,
      error: countError,
    } = await supabase
      .from("admin_sessions")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        },
      )
      .eq(
        "admin_id",
        adminId,
      )
      .gt(
        "expires_at",
        now,
      );

    if (
      !countError &&
      (count ?? 0) === 0
    ) {
      await supabase
        .from("admins")
        .update({
          is_online:
            false,

          last_seen:
            now,

          updated_at:
            now,
        })
        .eq(
          "id",
          adminId,
        );
    }
  }

  return {
    adminId,
    sessionId,
  };
}