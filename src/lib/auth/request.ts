import "server-only";

import { headers } from "next/headers";

import type { RequestMetadata } from "@/lib/auth/types";

function cleanHeader(
  value: string | null,
  maxLength: number,
): string | null {
  if (!value) {
    return null;
  }

  const cleaned = value.trim();

  if (!cleaned) {
    return null;
  }

  return cleaned.slice(0, maxLength);
}

export async function getRequestMetadata(): Promise<RequestMetadata> {
  const headerStore = await headers();

  const cloudflareIp =
    cleanHeader(
      headerStore.get("cf-connecting-ip"),
      64,
    );

  const forwardedFor =
    headerStore.get("x-forwarded-for");

  const forwardedIp =
    forwardedFor
      ?.split(",")[0]
      ?.trim()
      ?.slice(0, 64) || null;

  const realIp =
    cleanHeader(
      headerStore.get("x-real-ip"),
      64,
    );

  const ipAddress =
    cloudflareIp ||
    forwardedIp ||
    realIp ||
    null;

  const userAgent =
    cleanHeader(
      headerStore.get("user-agent"),
      1000,
    );

  return {
    ipAddress,
    userAgent,
  };
}