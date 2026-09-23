import "server-only";

type TurnstileResponse = {
  success: boolean;

  challenge_ts?: string;

  hostname?: string;

  action?: string;

  "error-codes"?: string[];
};

export type TurnstileResult = {
  success: boolean;
  reason?: string;
};

const VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const TEST_SECRETS = new Set([
  "1x0000000000000000000000000000000AA",
  "2x0000000000000000000000000000000AA",
  "3x0000000000000000000000000000000AA",
]);

function getAllowedHostnames(): string[] {
  return (
    process.env
      .TURNSTILE_ALLOWED_HOSTNAMES ??
    ""
  )
    .split(",")
    .map(
      (hostname) =>
        hostname
          .trim()
          .toLowerCase(),
    )
    .filter(Boolean);
}

export async function verifyTurnstile(
  token: string,
  ipAddress: string | null,
): Promise<TurnstileResult> {
  const secret =
    process.env
      .TURNSTILE_SECRET_KEY;

  if (!secret) {
    console.error(
      "[TURNSTILE] Secret key is not configured.",
    );

    return {
      success: false,
      reason:
        "missing-secret",
    };
  }

  /*
   * Prevent accidentally deploying
   * Cloudflare's testing secret.
   */
  if (
    process.env.NODE_ENV ===
      "production" &&
    TEST_SECRETS.has(secret)
  ) {
    console.error(
      "[TURNSTILE] Test credentials cannot be used in production.",
    );

    return {
      success: false,
      reason:
        "test-key-production",
    };
  }

  if (
    !token ||
    token.length > 2048
  ) {
    return {
      success: false,
      reason:
        "invalid-token",
    };
  }

  const body =
    new URLSearchParams({
      secret,
      response: token,
    });

  if (ipAddress) {
    body.set(
      "remoteip",
      ipAddress,
    );
  }

  try {
    const response =
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
              8000,
            ),
        },
      );

    if (!response.ok) {
      return {
        success: false,
        reason:
          `http-${response.status}`,
      };
    }

    const result =
      (await response.json()) as
        TurnstileResponse;

    if (!result.success) {
      return {
        success: false,

        reason:
          result[
            "error-codes"
          ]?.join(",") ||
          "verification-failed",
      };
    }

    /*
     * Cloudflare's development test keys
     * return test values, so action/hostname
     * validation is only enforced against
     * real credentials.
     */
    const usingTestCredentials =
      TEST_SECRETS.has(secret);

    if (
      !usingTestCredentials &&
      result.action !==
        "admin_login"
    ) {
      return {
        success: false,
        reason:
          "action-mismatch",
      };
    }

    const allowedHostnames =
      getAllowedHostnames();

    /*
     * Production fails closed if no allowed
     * Turnstile hostname has been configured.
     */
    if (
      process.env.NODE_ENV ===
        "production" &&
      allowedHostnames.length ===
        0
    ) {
      console.error(
        "[TURNSTILE] TURNSTILE_ALLOWED_HOSTNAMES is missing.",
      );

      return {
        success: false,
        reason:
          "hostname-config-missing",
      };
    }

    if (
      !usingTestCredentials &&
      allowedHostnames.length >
        0
    ) {
      const hostname =
        result.hostname
          ?.toLowerCase();

      if (
        !hostname ||
        !allowedHostnames.includes(
          hostname,
        )
      ) {
        return {
          success: false,
          reason:
            "hostname-mismatch",
        };
      }
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error(
      "[TURNSTILE]",
      error,
    );

    return {
      success: false,
      reason:
        "verification-unavailable",
    };
  }
}