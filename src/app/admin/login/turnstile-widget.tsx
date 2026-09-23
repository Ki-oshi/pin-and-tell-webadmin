"use client";

import Script from "next/script";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  AlertCircle,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

/* =========================================================
   TURNSTILE API TYPES
========================================================= */

type TurnstileApi = {
  render: (
    element:
      HTMLElement,

    options: {
      sitekey:
        string;

      action:
        string;

      theme:
        "light"
        | "dark"
        | "auto";

      size?:
        "normal"
        | "compact"
        | "flexible";

      appearance?:
        "always"
        | "execute"
        | "interaction-only";

      retry?:
        "auto"
        | "never";

      "retry-interval"?:
        number;

      "refresh-expired"?:
        "auto"
        | "manual"
        | "never";

      "refresh-timeout"?:
        "auto"
        | "manual"
        | "never";

      "response-field"?:
        boolean;

      callback:
        (
          token:
            string,
        ) => void;

      "expired-callback":
        () => void;

      "timeout-callback":
        () => void;

      "error-callback":
        (
          errorCode:
            string,
        ) => void;

      "unsupported-callback"?:
        () => void;
    },
  ) => string;

  reset: (
    widgetId:
      string,
  ) => void;

  remove: (
    widgetId:
      string,
  ) => void;
};

declare global {
  interface Window {
    turnstile?:
      TurnstileApi;
  }
}

/* =========================================================
   COMPONENT TYPES
========================================================= */

type TurnstileWidgetProps = {
  siteKey:
    string;

  resetKey:
    number;

  onVerifiedChange:
    (
      verified:
        boolean,
    ) => void;
};

type WidgetState =
  | "loading"
  | "verifying"
  | "verified"
  | "error"
  | "expired"
  | "timeout"
  | "unsupported";

/* =========================================================
   ERROR MESSAGE
========================================================= */

function getErrorMessage(
  errorCode:
    string,
): string {
  if (
    errorCode.startsWith(
      "110100",
    ) ||
    errorCode.startsWith(
      "110110",
    ) ||
    errorCode.startsWith(
      "400020",
    )
  ) {
    return "The security widget is using an invalid site key.";
  }

  if (
    errorCode.startsWith(
      "110200",
    )
  ) {
    return "This website hostname is not authorized by the security widget.";
  }

  if (
    errorCode.startsWith(
      "110600",
    ) ||
    errorCode.startsWith(
      "110620",
    )
  ) {
    return "The security verification timed out.";
  }

  if (
    errorCode.startsWith(
      "200100",
    )
  ) {
    return "Your device clock or cached challenge may be preventing verification.";
  }

  if (
    errorCode.startsWith(
      "200500",
    )
  ) {
    return "The Cloudflare security frame could not load. Check your connection or browser extensions.";
  }

  if (
    errorCode.startsWith(
      "300",
    ) ||
    errorCode.startsWith(
      "600",
    )
  ) {
    return "Cloudflare could not complete the security challenge. Please retry or use another browser/network.";
  }

  return "Security verification could not be completed.";
}

/* =========================================================
   COMPONENT
========================================================= */

export default function TurnstileWidget({
  siteKey,
  resetKey,
  onVerifiedChange,
}: TurnstileWidgetProps) {
  const containerRef =
    useRef<HTMLDivElement>(
      null,
    );

  const widgetIdRef =
    useRef<
      string | null
    >(
      null,
    );

  const [
    token,
    setToken,
  ] =
    useState("");

  const [
    widgetState,
    setWidgetState,
  ] =
    useState<WidgetState>(
      "loading",
    );

  const [
    errorCode,
    setErrorCode,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    scriptFailed,
    setScriptFailed,
  ] =
    useState(
      false,
    );

  /* =======================================================
     CLEAR VERIFICATION
  ======================================================= */

  const clearVerification =
    useCallback(() => {
      setToken(
        "",
      );

      onVerifiedChange(
        false,
      );
    }, [
      onVerifiedChange,
    ]);

  /* =======================================================
     RENDER TURNSTILE
  ======================================================= */

  const renderWidget =
    useCallback(() => {
      if (
        !siteKey ||
        !containerRef.current ||
        !window.turnstile ||
        widgetIdRef.current
      ) {
        return;
      }

      setScriptFailed(
        false,
      );

      setErrorCode(
        null,
      );

      setWidgetState(
        "verifying",
      );

      widgetIdRef.current =
        window.turnstile.render(
          containerRef.current,
          {
            sitekey:
              siteKey,

            action:
              "admin_login",

            theme:
              "light",

            size:
              "flexible",

            appearance:
              "always",

            /*
             * IMPORTANT:
             *
             * Cloudflare defaults to
             * automatic retries.
             *
             * We disable that here so a
             * persistent production error
             * does not create an endless
             * verify -> fail -> retry loop.
             */
            retry:
              "never",

            /*
             * Once a successful token
             * expires, Cloudflare can
             * obtain a fresh one.
             */
            "refresh-expired":
              "auto",

            /*
             * Interactive timeout should
             * be handled by our own retry
             * button instead of silently
             * starting another loop.
             */
            "refresh-timeout":
              "never",

            /*
             * We manage the response
             * field ourselves below.
             *
             * This also prevents two
             * cf-turnstile-response
             * fields from being placed
             * in the login form.
             */
            "response-field":
              false,

            callback:
              (
                newToken,
              ) => {
                setToken(
                  newToken,
                );

                setErrorCode(
                  null,
                );

                setWidgetState(
                  "verified",
                );

                onVerifiedChange(
                  true,
                );
              },

            "expired-callback":
              () => {
                clearVerification();

                setErrorCode(
                  null,
                );

                setWidgetState(
                  "expired",
                );
              },

            "timeout-callback":
              () => {
                clearVerification();

                setErrorCode(
                  null,
                );

                setWidgetState(
                  "timeout",
                );
              },

            "unsupported-callback":
              () => {
                clearVerification();

                setErrorCode(
                  null,
                );

                setWidgetState(
                  "unsupported",
                );
              },

            "error-callback":
              (
                code,
              ) => {
                clearVerification();

                setErrorCode(
                  String(
                    code,
                  ),
                );

                setWidgetState(
                  "error",
                );

                /*
                 * Keep this console log.
                 *
                 * On Vercel this gives us
                 * the exact Cloudflare
                 * client-side error code
                 * instead of hiding it.
                 */
                console.error(
                  "[TURNSTILE] Challenge failed:",
                  code,
                );
              },
          },
        );
    }, [
      siteKey,
      onVerifiedChange,
      clearVerification,
    ]);

  /* =======================================================
     HANDLE SERVER-REQUESTED RESET
  ======================================================= */

  useEffect(() => {
    if (
      resetKey ===
        0 ||
      !widgetIdRef.current ||
      !window.turnstile
    ) {
      return;
    }

    clearVerification();

    setErrorCode(
      null,
    );

    setWidgetState(
      "verifying",
    );

    window.turnstile.reset(
      widgetIdRef.current,
    );
  }, [
    resetKey,
    clearVerification,
  ]);

  /* =======================================================
     RENDER IF SCRIPT ALREADY EXISTS
  ======================================================= */

  useEffect(() => {
    if (
      window.turnstile
    ) {
      renderWidget();
    }
  }, [
    renderWidget,
  ]);

  /* =======================================================
     CLEANUP
  ======================================================= */

  useEffect(() => {
    return () => {
      if (
        widgetIdRef.current &&
        window.turnstile
      ) {
        window.turnstile.remove(
          widgetIdRef.current,
        );

        widgetIdRef.current =
          null;
      }
    };
  }, []);

  /* =======================================================
     MANUAL RETRY
  ======================================================= */

  function retryVerification() {
    if (
      !widgetIdRef.current ||
      !window.turnstile
    ) {
      /*
       * If the script itself failed,
       * reloading is the safest retry.
       */
      window.location.reload();

      return;
    }

    clearVerification();

    setErrorCode(
      null,
    );

    setWidgetState(
      "verifying",
    );

    window.turnstile.reset(
      widgetIdRef.current,
    );
  }

  /* =======================================================
     MISSING SITE KEY
  ======================================================= */

  if (
    !siteKey
  ) {
    return (
      <div
        className="
          flex
          items-start
          gap-3
          rounded-xl
          border
          border-red-200
          bg-red-50
          px-4
          py-3.5
          text-sm
          text-red-700
        "
      >
        <AlertCircle
          size={
            17
          }
          className="
            mt-0.5
            shrink-0
          "
        />

        <div>
          <p
            className="
              font-semibold
            "
          >
            Security verification
            unavailable
          </p>

          <p
            className="
              mt-1
              text-xs
              leading-5
              text-red-600
            "
          >
            The Turnstile site key
            is not configured.
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  const hasFailure =
    scriptFailed ||
    widgetState ===
      "error" ||
    widgetState ===
      "timeout" ||
    widgetState ===
      "unsupported";

  return (
    <>
      <Script
        id="cloudflare-turnstile"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => {
          setScriptFailed(
            false,
          );

          renderWidget();
        }}
        onError={() => {
          clearVerification();

          setScriptFailed(
            true,
          );

          setWidgetState(
            "error",
          );

          console.error(
            "[TURNSTILE] Cloudflare script failed to load.",
          );
        }}
      />

      <div
        className="
          w-full
        "
      >
        <div
          className="
            relative
            flex
            min-h-[65px]
            w-full
            items-center
            justify-center
          "
        >
          <div
            ref={
              containerRef
            }
            className="
              w-full
            "
          />
        </div>

        {/* =========================
            SUCCESS STATUS
        ========================== */}

        {widgetState ===
          "verified" && (
          <div
            className="
              mt-2
              flex
              items-center
              justify-center
              gap-1.5
              text-[10px]
              font-medium
              text-emerald-600
            "
          >
            <ShieldCheck
              size={
                12
              }
            />

            Security verification
            complete
          </div>
        )}

        {/* =========================
            LOADING STATUS
        ========================== */}

        {(
          widgetState ===
            "loading" ||
          widgetState ===
            "verifying"
        ) &&
          !hasFailure && (
            <div
              className="
                mt-2
                flex
                items-center
                justify-center
                gap-1.5
                text-[10px]
                text-slate-400
              "
            >
              <Loader2
                size={
                  11
                }
                className="
                  animate-spin
                "
              />

              Security verification
              in progress
            </div>
          )}

        {/* =========================
            ERROR STATUS
        ========================== */}

        {hasFailure && (
          <div
            className="
              mt-3
              rounded-xl
              border
              border-red-200
              bg-red-50
              p-3
            "
          >
            <div
              className="
                flex
                items-start
                gap-2.5
              "
            >
              <AlertCircle
                size={
                  15
                }
                className="
                  mt-0.5
                  shrink-0
                  text-red-600
                "
              />

              <div
                className="
                  min-w-0
                  flex-1
                "
              >
                <p
                  className="
                    text-xs
                    font-semibold
                    text-red-700
                  "
                >
                  Security check
                  failed
                </p>

                <p
                  className="
                    mt-1
                    text-[10px]
                    leading-5
                    text-red-600
                  "
                >
                  {scriptFailed
                    ? "Cloudflare Turnstile could not be loaded."
                    : widgetState ===
                        "unsupported"
                      ? "This browser is not supported by the security verification."
                      : widgetState ===
                          "timeout"
                        ? "The security verification timed out."
                        : getErrorMessage(
                            errorCode ??
                              "",
                          )}
                </p>

                {errorCode && (
                  <p
                    className="
                      mt-1
                      font-mono
                      text-[9px]
                      text-red-400
                    "
                  >
                    Cloudflare code:{" "}
                    {
                      errorCode
                    }
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={
                retryVerification
              }
              className="
                mt-3
                inline-flex
                h-8
                items-center
                gap-1.5
                rounded-lg
                border
                border-red-200
                bg-white
                px-3
                text-[10px]
                font-semibold
                text-red-700
                transition
                hover:bg-red-100
              "
            >
              <RefreshCw
                size={
                  12
                }
              />

              Retry security check
            </button>
          </div>
        )}
      </div>

      {/* =========================
          FORM TOKEN
      ========================== */}

      <input
        type="hidden"
        name="cf-turnstile-response"
        value={
          token
        }
        readOnly
      />
    </>
  );
}