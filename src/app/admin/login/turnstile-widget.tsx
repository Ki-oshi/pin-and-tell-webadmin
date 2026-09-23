"use client";

import Script from "next/script";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type TurnstileApi = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      theme: "light";
      callback: (
        token: string,
      ) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;

  reset: (
    widgetId: string,
  ) => void;

  remove: (
    widgetId: string,
  ) => void;
};

declare global {
  interface Window {
    turnstile?:
      TurnstileApi;
  }
}

type TurnstileWidgetProps = {
  siteKey: string;

  resetKey: number;

  onVerifiedChange: (
    verified: boolean,
  ) => void;
};

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
    useRef<string | null>(
      null,
    );

  const [
    token,
    setToken,
  ] = useState("");

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

            callback:
              (
                newToken,
              ) => {
                setToken(
                  newToken,
                );

                onVerifiedChange(
                  true,
                );
              },

            "expired-callback":
              () => {
                setToken("");

                onVerifiedChange(
                  false,
                );
              },

            "error-callback":
              () => {
                setToken("");

                onVerifiedChange(
                  false,
                );
              },
          },
        );
    }, [
      siteKey,
      onVerifiedChange,
    ]);

  useEffect(() => {
    if (
      resetKey === 0 ||
      !widgetIdRef.current ||
      !window.turnstile
    ) {
      return;
    }

    setToken("");

    onVerifiedChange(
      false,
    );

    window.turnstile.reset(
      widgetIdRef.current,
    );
  }, [
    resetKey,
    onVerifiedChange,
  ]);

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

  if (!siteKey) {
    return (
      <div
        className="
          rounded-xl
          border border-red-200
          bg-red-50
          px-4 py-3
          text-sm text-red-700
        "
      >
        Security verification
        is not configured.
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={
          renderWidget
        }
      />

      <div
        className="
          flex min-h-[65px]
          w-full
          items-center
          justify-center
          overflow-hidden
        "
      >
        <div
          ref={
            containerRef
          }
        />
      </div>

      <input
        type="hidden"
        name="cf-turnstile-response"
        value={token}
        readOnly
      />
    </>
  );
}