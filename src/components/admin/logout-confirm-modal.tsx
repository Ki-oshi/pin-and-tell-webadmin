"use client";

import {
  useEffect,
} from "react";

import {
  LogOut,
  X,
} from "lucide-react";

type Props = {
  open:
    boolean;

  pending?:
    boolean;

  onClose:
    () => void;

  onConfirm:
    () => void;
};

export default function LogoutConfirmModal({
  open,
  pending = false,
  onClose,
  onConfirm,
}: Props) {
  useEffect(() => {
    if (
      !open
    ) {
      return;
    }

    function handleKeyDown(
      event:
        KeyboardEvent,
    ) {
      if (
        event.key ===
        "Escape" &&
        !pending
      ) {
        onClose();
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    open,
    pending,
    onClose,
  ]);

  if (
    !open
  ) {
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
        p-4
      "
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close logout confirmation"
        disabled={
          pending
        }
        onClick={
          onClose
        }
        className="
          absolute
          inset-0
          cursor-default
          bg-slate-950/40
          backdrop-blur-[2px]
          disabled:cursor-default
        "
      />

      {/* Modal */}
      <div
        className="
          relative
          z-10
          w-full
          max-w-[420px]
          border
          border-slate-200
          bg-white
          shadow-2xl
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
            py-4
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
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                bg-[#A92F56]/[0.08]
                text-[#A92F56]
              "
            >
              <LogOut
                size={16}
              />
            </div>

            <div>
              <h2
                id="logout-modal-title"
                className="
                  text-sm
                  font-semibold
                  text-slate-950
                "
              >
                Log out of PIN &amp; TELL?
              </h2>

              <p
                className="
                  mt-1
                  text-[10px]
                  leading-5
                  text-slate-500
                "
              >
                Your current administrator
                session will be ended.
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close"
            disabled={
              pending
            }
            onClick={
              onClose
            }
            className="
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              text-slate-400
              transition
              hover:bg-slate-100
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
            className="
              text-xs
              leading-5
              text-slate-600
            "
          >
            Are you sure you want to log
            out? You will need to enter
            your administrator credentials
            again to access the dashboard.
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
            bg-slate-50/70
            px-5
            py-4
          "
        >
          <button
            type="button"
            disabled={
              pending
            }
            onClick={
              onClose
            }
            className="
              h-9
              border
              border-slate-200
              bg-white
              px-4
              text-[11px]
              font-semibold
              text-slate-600
              transition
              hover:bg-slate-50
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={
              pending
            }
            onClick={
              onConfirm
            }
            className="
              inline-flex
              h-9
              items-center
              gap-2
              bg-[#A92F56]
              px-4
              text-[11px]
              font-semibold
              text-white
              transition
              hover:bg-[#8f2748]
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            <LogOut
              size={13}
            />

            {pending
              ? "Logging out..."
              : "Log Out"}
          </button>
        </div>
      </div>
    </div>
  );
}