"use client";

import {
  useActionState,
  useCallback,
  useState,
} from "react";

import {
  useFormStatus,
} from "react-dom";

import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  ShieldCheck,
} from "lucide-react";

import {
  loginAction,
  type LoginState,
} from "./actions";

import TurnstileWidget from "./turnstile-widget";

const initialState:
  LoginState = {
    error: null,

    resetTurnstile: 0,
  };

function SubmitButton({
  turnstileVerified,
}: {
  turnstileVerified:
    boolean;
}) {
  const {
    pending,
  } = useFormStatus();

  const disabled =
    pending ||
    !turnstileVerified;

  return (
    <button
      type="submit"
      disabled={disabled}
      className="
        group
        flex
        h-12
        w-full
        items-center
        justify-center
        gap-2
        rounded-xl
        bg-[#A92F56]
        px-5
        text-sm
        font-semibold
        text-white
        shadow-sm
        shadow-[#A92F56]/20
        transition-all
        duration-200
        hover:bg-[#8F2749]
        hover:shadow-md
        hover:shadow-[#A92F56]/20
        focus:outline-none
        focus:ring-4
        focus:ring-[#FDC1C9]/50
        disabled:cursor-not-allowed
        disabled:opacity-50
        disabled:shadow-none
      "
    >
      {pending ? (
        <>
          <span
            className="
              h-4
              w-4
              animate-spin
              rounded-full
              border-2
              border-white/30
              border-t-white
            "
          />

          Signing in securely...
        </>
      ) : (
        <>
          Sign in to Admin

          <ArrowRight
            size={17}
            strokeWidth={
              2.2
            }
            className="
              transition-transform
              group-hover:translate-x-0.5
            "
          />
        </>
      )}
    </button>
  );
}

export default function LoginForm({
  siteKey,
}: {
  siteKey: string;
}) {
  const [
    state,
    formAction,
  ] = useActionState(
    loginAction,
    initialState,
  );

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    turnstileVerified,
    setTurnstileVerified,
  ] = useState(false);

  const handleVerifiedChange =
    useCallback(
      (
        verified:
          boolean,
      ) => {
        setTurnstileVerified(
          verified,
        );
      },
      [],
    );

  return (
    <form
      action={formAction}
      className="
        space-y-5
      "
    >
      {state.error && (
        <div
          role="alert"
          aria-live="polite"
          className="
            rounded-xl
            border
            border-red-200
            bg-red-50
            px-4
            py-3.5
            text-sm
            leading-5
            text-red-700
          "
        >
          {state.error}
        </div>
      )}

      <div
        className="
          space-y-2
        "
      >
        <label
          htmlFor="email"
          className="
            block
            text-sm
            font-medium
            text-slate-700
          "
        >
          Email address
        </label>

        <div
          className="
            relative
          "
        >
          <Mail
            aria-hidden="true"
            size={18}
            className="
              pointer-events-none
              absolute
              left-3.5
              top-1/2
              -translate-y-1/2
              text-slate-400
            "
          />

          <input
            id="email"
            name="email"
            type="email"
            maxLength={
              254
            }
            required
            autoComplete="email"
            spellCheck={
              false
            }
            placeholder="admin@example.com"
            className="
              h-12
              w-full
              rounded-xl
              border
              border-slate-200
              bg-white
              pl-11
              pr-4
              text-sm
              text-slate-900
              outline-none
              transition
              placeholder:text-slate-400
              hover:border-slate-300
              focus:border-[#CC3A67]
              focus:ring-4
              focus:ring-[#FDC1C9]/30
            "
          />
        </div>
      </div>

      <div
        className="
          space-y-2
        "
      >
        <label
          htmlFor="password"
          className="
            block
            text-sm
            font-medium
            text-slate-700
          "
        >
          Password
        </label>

        <div
          className="
            relative
          "
        >
          <KeyRound
            aria-hidden="true"
            size={18}
            className="
              pointer-events-none
              absolute
              left-3.5
              top-1/2
              -translate-y-1/2
              text-slate-400
            "
          />

          <input
            id="password"
            name="password"
            type={
              showPassword
                ? "text"
                : "password"
            }
            maxLength={
              256
            }
            required
            autoComplete="current-password"
            placeholder="Enter your password"
            className="
              h-12
              w-full
              rounded-xl
              border
              border-slate-200
              bg-white
              pl-11
              pr-12
              text-sm
              text-slate-900
              outline-none
              transition
              placeholder:text-slate-400
              hover:border-slate-300
              focus:border-[#CC3A67]
              focus:ring-4
              focus:ring-[#FDC1C9]/30
            "
          />

          <button
            type="button"
            aria-label={
              showPassword
                ? "Hide password"
                : "Show password"
            }
            onClick={() =>
              setShowPassword(
                (
                  current,
                ) =>
                  !current,
              )
            }
            className="
              absolute
              right-3
              top-1/2
              flex
              h-8
              w-8
              -translate-y-1/2
              items-center
              justify-center
              rounded-lg
              text-slate-400
              transition
              hover:bg-slate-100
              hover:text-slate-700
              focus:outline-none
              focus:ring-2
              focus:ring-[#FDC1C9]
            "
          >
            {showPassword ? (
              <EyeOff
                size={
                  18
                }
              />
            ) : (
              <Eye
                size={
                  18
                }
              />
            )}
          </button>
        </div>
      </div>

      <label
        className="
          flex
          cursor-pointer
          items-start
          gap-3
          rounded-xl
          border
          border-slate-200
          bg-slate-50/70
          p-3.5
        "
      >
        <input
          name="remember"
          type="checkbox"
          className="
            mt-0.5
            h-4
            w-4
            shrink-0
            accent-[#A92F56]
          "
        />

        <span>
          <span
            className="
              block
              text-sm
              font-medium
              text-slate-700
            "
          >
            Keep me signed
            in
          </span>

          <span
            className="
              mt-0.5
              block
              text-xs
              leading-4
              text-slate-500
            "
          >
          </span>
        </span>
      </label>

      <div
        className="
          rounded-xl
          border
          border-slate-200
          bg-white
          p-3
        "
      >
        <TurnstileWidget
          siteKey={
            siteKey
          }
          resetKey={
            state.resetTurnstile
          }
          onVerifiedChange={
            handleVerifiedChange
          }
        />
      </div>

      <SubmitButton
        turnstileVerified={
          turnstileVerified
        }
      />

      <div
        className="
          flex
          items-center
          justify-center
          gap-2
          pt-1
          text-xs
          text-slate-400
        "
      >
        <ShieldCheck
          size={14}
        />

        Protected access
        for authorized
        administrators
        only
      </div>
    </form>
  );
}