import "server-only";

type TurnstileResponse = {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
  "error-codes"?: string[];
};

export type TurnstileResult = {
  success: boolean;
  reason?: string;
};

const VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/*
 * Official Cloudflare TEST secret keys.
 *
 * These values are public testing credentials,
 * not production secrets.
 */
const TEST_SECRETS = new Set([
  "1x0000000000000000000000000000000AA",
  "2x0000000000000000000000000000000AA",
  "3x0000000000000000000000000000000AA",
]);

function isVercelProduction(): boolean {
  return process.env.VERCEL_ENV === "production";
}

function isVercelPreview(): boolean {
  return process.env.VERCEL_ENV === "preview";
}

function getAllowedHostnames(): string[] {
  const manuallyConfigured =
    (
      process.env.TURNSTILE_ALLOWED_HOSTNAMES ??
      ""
    )
      .split(",")
      .map((hostname) =>
        hostname
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean);

  /*
   * Vercel System Environment Variables.
   *
   * These allow the exact same source code to
   * work when deployed to Vercel.
   */
  const vercelHostnames = [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ]
    .map((hostname) =>
      hostname
        ?.trim()
        .toLowerCase(),
    )
    .filter(
      (
        hostname,
      ): hostname is string =>
        Boolean(hostname),
    );

  return [
    ...new Set([
      ...manuallyConfigured,
      ...vercelHostnames,
    ]),
  ];
}

function testCredentialsAllowed(): boolean {
  /*
   * Local development:
   * allow official Cloudflare testing keys.
   */
  if (!process.env.VERCEL_ENV) {
    return true;
  }

  /*
   * Vercel Preview:
   * allow official testing keys so random
   * preview domains don't require production
   * Turnstile configuration.
   */
  if (isVercelPreview()) {
    return true;
  }

  /*
   * Vercel Production:
   * production MUST use real Turnstile keys.
   */
  return false;
}

export async function verifyTurnstile(
  token: string,
  ipAddress: string | null,
): Promise<TurnstileResult> {
  const secret =
    process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    console.error(
      "[TURNSTILE] TURNSTILE_SECRET_KEY is missing.",
    );

    return {
      success: false,
      reason: "missing-secret",
    };
  }

  const usingTestCredentials =
    TEST_SECRETS.has(secret);

  /*
   * Prevent test credentials from ever being
   * accepted on the real Vercel Production
   * deployment.
   */
  if (
    usingTestCredentials &&
    !testCredentialsAllowed()
  ) {
    console.error(
      "[TURNSTILE] Test credentials were used in production.",
    );

    return {
      success: false,
      reason: "test-key-production",
    };
  }

  if (
    !token ||
    token.trim() === ""
  ) {
    console.warn(
      "[TURNSTILE] No Turnstile token received.",
    );

    return {
      success: false,
      reason: "missing-token",
    };
  }

  if (token.length > 2048) {
    console.warn(
      "[TURNSTILE] Turnstile token exceeded maximum length.",
    );

    return {
      success: false,
      reason: "invalid-token-length",
    };
  }

  const body =
    new URLSearchParams();

  body.set(
    "secret",
    secret,
  );

  body.set(
    "response",
    token,
  );

  if (ipAddress) {
    body.set(
      "remoteip",
      ipAddress,
    );
  }

  let response: Response;

  try {
    response =
      await fetch(
        VERIFY_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },

          body,

          cache: "no-store",

          signal:
            AbortSignal.timeout(
              10_000,
            ),
        },
      );
  } catch (error) {
    console.error(
      "[TURNSTILE] Siteverify request failed:",
      error,
    );

    return {
      success: false,
      reason: "verification-unavailable",
    };
  }

  if (!response.ok) {
    console.error(
      `[TURNSTILE] Siteverify returned HTTP ${response.status}.`,
    );

    return {
      success: false,
      reason:
        `siteverify-http-${response.status}`,
    };
  }

  let result:
    TurnstileResponse;

  try {
    result =
      (await response.json()) as
        TurnstileResponse;
  } catch (error) {
    console.error(
      "[TURNSTILE] Invalid Siteverify response:",
      error,
    );

    return {
      success: false,
      reason: "invalid-siteverify-response",
    };
  }

  if (!result.success) {
    const reason =
      result[
        "error-codes"
      ]?.join(",") ||
      "verification-failed";

    /*
     * Safe diagnostic logging:
     *
     * We intentionally DO NOT log:
     * - submitted Turnstile token
     * - Turnstile secret
     * - passwords
     * - session tokens
     */
    console.warn(
      "[TURNSTILE] Validation rejected:",
      {
        reason,
        hostname:
          result.hostname ??
          null,
        action:
          result.action ??
          null,
      },
    );

    return {
      success: false,
      reason,
    };
  }

  /*
   * Cloudflare's official test keys return
   * testing values such as action = "test".
   *
   * Do not apply production hostname/action
   * validation to dummy credentials.
   */
  if (usingTestCredentials) {
    return {
      success: true,
    };
  }

  /*
   * REAL Turnstile credentials:
   * require our expected action.
   */
  if (
    result.action !==
    "admin_login"
  ) {
    console.warn(
      "[TURNSTILE] Action mismatch:",
      {
        received:
          result.action ??
          null,
      },
    );

    return {
      success: false,
      reason: "action-mismatch",
    };
  }

  const allowedHostnames =
    getAllowedHostnames();

  /*
   * Production fails closed if hostname
   * verification hasn't been configured.
   */
  if (
    isVercelProduction() &&
    allowedHostnames.length === 0
  ) {
    console.error(
      "[TURNSTILE] No allowed production hostnames configured.",
    );

    return {
      success: false,
      reason:
        "hostname-config-missing",
    };
  }

  if (
    allowedHostnames.length > 0
  ) {
    const receivedHostname =
      result.hostname
        ?.trim()
        .toLowerCase();

    if (
      !receivedHostname ||
      !allowedHostnames.includes(
        receivedHostname,
      )
    ) {
      console.warn(
        "[TURNSTILE] Hostname mismatch:",
        {
          received:
            receivedHostname ??
            null,

          allowed:
            allowedHostnames,
        },
      );

      return {
        success: false,
        reason: "hostname-mismatch",
      };
    }
  }

  return {
    success: true,
  };
}