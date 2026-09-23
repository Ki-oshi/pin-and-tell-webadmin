"use server";

import {
  redirect,
} from "next/navigation";

import {
  destroyAdminSession,
  getCurrentAdmin,
} from "@/lib/auth/session";

import {
  getRequestMetadata,
} from "@/lib/auth/request";

import {
  logSecurityEvent,
} from "@/lib/auth/log";

export async function logoutAction():
  Promise<void> {
  /*
   * Authorization is checked again inside
   * the mutation itself.
   *
   * Never rely solely on the page/layout.
   */
  const admin =
    await getCurrentAdmin();

  const metadata =
    await getRequestMetadata();

  const {
    adminId,
    sessionId,
  } =
    await destroyAdminSession();

  if (
    admin &&
    adminId
  ) {
    if (sessionId) {
      await logSecurityEvent({
        actionType:
          "admin_session_revoked",

        description:
          `Administrator session revoked during logout: ${admin.email}`,

        actorType:
          "admin",

        adminId,

        targetTable:
          "admin_sessions",

        targetId:
          sessionId,

        ipAddress:
          metadata.ipAddress,

        userAgent:
          metadata.userAgent,
      });
    }

    await logSecurityEvent({
      actionType:
        "admin_logout",

      description:
        `Administrator logged out: ${admin.email}`,

      actorType:
        "admin",

      adminId,

      targetTable:
        "admins",

      targetId:
        adminId,

      ipAddress:
        metadata.ipAddress,

      userAgent:
        metadata.userAgent,
    });
  }

  redirect(
    "/admin/login",
  );
}