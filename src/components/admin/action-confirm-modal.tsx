"use client";

import {
  useEffect,
  useRef,
} from "react";

import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Loader2,
  X,
  XCircle,
} from "lucide-react";

export type ConfirmationVariant =
  | "review"
  | "success"
  | "danger"
  | "warning";

type ActionConfirmModalProps = {
  open: boolean;

  title: string;
  description: string;

  confirmLabel: string;

  variant?: ConfirmationVariant;

  loading?: boolean;

  onConfirm: () => void;
  onClose: () => void;
};

const variants = {
  review: {
    icon: CircleDot,

    iconWrapper:
      "border-blue-200 bg-blue-50 text-blue-600",

    confirmButton:
      "bg-blue-600 text-white hover:bg-blue-700",

    eyebrow:
      "Review Action",
  },

  success: {
    icon: CheckCircle2,

    iconWrapper:
      "border-emerald-200 bg-emerald-50 text-emerald-600",

    confirmButton:
      "bg-emerald-600 text-white hover:bg-emerald-700",

    eyebrow:
      "Confirm Action",
  },

  danger: {
    icon: XCircle,

    iconWrapper:
      "border-red-200 bg-red-50 text-red-600",

    confirmButton:
      "bg-red-600 text-white hover:bg-red-700",

    eyebrow:
      "Confirm Action",
  },

  warning: {
    icon: AlertTriangle,

    iconWrapper:
      "border-amber-200 bg-amber-50 text-amber-600",

    confirmButton:
      "bg-amber-600 text-white hover:bg-amber-700",

    eyebrow:
      "Confirm Action",
  },
};

export default function ActionConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  variant = "warning",
  loading = false,
  onConfirm,
  onClose,
}: ActionConfirmModalProps) {
  const confirmButtonRef =
    useRef<HTMLButtonElement>(
      null,
    );

  const config =
    variants[variant];

  const Icon =
    config.icon;

  useEffect(() => {
    if (!open) {
      return;
    }

    requestAnimationFrame(
      () => {
        confirmButtonRef.current
          ?.focus();
      },
    );

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key !==
        "Escape"
      ) {
        return;
      }

      /*
       * Prevent the parent drawer's
       * Escape handler from also firing.
       */
      event.preventDefault();
      event.stopPropagation();

      if (!loading) {
        onClose();
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown,
      true,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
        true,
      );
    };
  }, [
    open,
    loading,
    onClose,
  ]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="
        fixed
        inset-0
        z-[100]
        flex
        items-center
        justify-center
        px-4
        py-8
      "
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-confirm-title"
      aria-describedby="action-confirm-description"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close confirmation"
        disabled={loading}
        onClick={onClose}
        className="
          absolute
          inset-0
          bg-slate-950/35
          backdrop-blur-[2px]
          disabled:cursor-not-allowed
        "
      />

      {/* Modal */}
      <div
        className="
          relative
          z-10
          w-full
          max-w-[430px]
          border
          border-slate-200
          bg-white
          shadow-2xl
          shadow-slate-950/20
        "
      >
        {/* Header */}
        <div
          className="
            flex
            items-start
            justify-between
            gap-4
            border-b
            border-slate-100
            px-5
            py-5
          "
        >
          <div
            className="
              flex
              items-start
              gap-3
            "
          >
            <div
              className={`
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                border
                ${config.iconWrapper}
              `}
            >
              <Icon
                size={18}
                strokeWidth={1.9}
              />
            </div>

            <div>
              <p
                className="
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-[0.12em]
                  text-slate-400
                "
              >
                {config.eyebrow}
              </p>

              <h2
                id="action-confirm-title"
                className="
                  mt-1
                  text-[15px]
                  font-semibold
                  tracking-[-0.01em]
                  text-slate-950
                "
              >
                {title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close confirmation"
            disabled={loading}
            onClick={onClose}
            className="
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              border
              border-slate-200
              bg-white
              text-slate-400
              transition
              hover:bg-slate-50
              hover:text-slate-700
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            <X
              size={15}
            />
          </button>
        </div>

        {/* Body */}
        <div
          className="
            px-5
            py-5
          "
        >
          <p
            id="action-confirm-description"
            className="
              text-xs
              leading-6
              text-slate-600
            "
          >
            {description}
          </p>
        </div>

        {/* Actions */}
        <div
          className="
            flex
            items-center
            justify-end
            gap-2
            border-t
            border-slate-100
            bg-slate-50/50
            px-5
            py-4
          "
        >
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="
              h-9
              border
              border-slate-200
              bg-white
              px-4
              text-xs
              font-semibold
              text-slate-600
              transition
              hover:border-slate-300
              hover:bg-slate-50
              hover:text-slate-900
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            Cancel
          </button>

          <button
            ref={
              confirmButtonRef
            }
            type="button"
            disabled={loading}
            onClick={
              onConfirm
            }
            className={`
              inline-flex
              h-9
              min-w-[120px]
              items-center
              justify-center
              gap-2
              px-4
              text-xs
              font-semibold
              transition
              focus:outline-none
              focus:ring-2
              focus:ring-offset-2
              disabled:cursor-not-allowed
              disabled:opacity-60
              ${config.confirmButton}
            `}
          >
            {loading && (
              <Loader2
                size={14}
                className="animate-spin"
              />
            )}

            {loading
              ? "Processing..."
              : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}