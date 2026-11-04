"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, Loader2, LogOut, ShieldAlert, X } from "lucide-react";

type Props = {
  open: boolean;
  pending?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function LogoutConfirmModal({
  open,
  pending = false,
  onClose,
  onConfirm,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Keep keyboard focus inside the dialog, lock background scrolling,
  // and return focus to the trigger after the modal is dismissed.
  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const frame = window.requestAnimationFrame(() => {
      cancelRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);

  // While signing out, focus the dialog itself because the action
  // buttons are disabled to prevent duplicate requests.
  useEffect(() => {
    if (open && pending) dialogRef.current?.focus();
  }, [open, pending]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!pending) onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>(
        "button:not(:disabled)",
      );
      if (!buttons?.length) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !dialogRef.current?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialogRef.current?.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, pending, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 sm:p-6"
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close logout confirmation"
        disabled={pending}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-[3px] disabled:cursor-default"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-modal-title"
        aria-describedby="logout-modal-description"
        aria-busy={pending}
        tabIndex={-1}
        className="relative z-10 my-auto w-full max-w-[440px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_28px_80px_-22px_rgba(15,23,42,0.35)] outline-none"
      >
        <div className="relative border-b border-slate-100 bg-gradient-to-br from-[#FFF2F6] via-white to-white px-5 pb-5 pt-6 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#F8D5DF] bg-white text-[#A92F56] shadow-sm">
              <LogOut size={21} strokeWidth={1.9} />
            </div>
            <button
              type="button"
              aria-label="Close logout confirmation"
              disabled={pending}
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CC3A67]/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <X size={18} />
            </button>
          </div>

          <h2
            id="logout-modal-title"
            className="mt-4 text-lg font-bold tracking-[-0.025em] text-slate-950"
          >
            Log out of PIN &amp; TELL?
          </h2>
          <p
            id="logout-modal-description"
            className="mt-2 text-[12px] leading-6 text-slate-500"
          >
            You&apos;re about to end your current administrator session.
            You&apos;ll need to sign in again to access the dashboard.
          </p>
        </div>

        <div className="px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-3.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
              <ShieldAlert size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800">Your account stays secure</p>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                Logging out ends this session. Your account and saved settings
                won&apos;t be deleted.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            ref={cancelRef}
            type="button"
            disabled={pending}
            onClick={onClose}
            className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CC3A67]/40 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            Stay signed in
          </button>

          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#A92F56] px-5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#8F2748] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CC3A67]/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {pending ? (
              <Loader2 size={15} className="animate-spin" aria-hidden="true" />
            ) : (
              <LogOut size={15} aria-hidden="true" />
            )}
            <span>{pending ? "Logging out..." : "Yes, log out"}</span>
            {!pending && <ArrowRight size={14} aria-hidden="true" />}
          </button>
        </div>

        <span className="sr-only" role="status" aria-live="polite">
          {pending ? "Signing out, please wait." : ""}
        </span>
      </div>
    </div>
  );
}
