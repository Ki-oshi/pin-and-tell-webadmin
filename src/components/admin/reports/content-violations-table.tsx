"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AlertTriangle,
  Ban,
  Clock3,
  Eye,
  Search,
  ShieldAlert,
  User,
  Users,
  X,
} from "lucide-react";

import type {
  ContentViolationRow,
  ContentViolationSeverity,
} from "@/lib/admin/content-violations";

type ContentViolationsTableProps = {
  rows:
    ContentViolationRow[];

  stats: {
    violators:
      number;

    activeStrikes:
      number;

    suspended:
      number;

    needsReview:
      number;
  };

  activeWindowDays:
    number;

  hasErrors:
    boolean;
};

type ViolationFilter =
  | "all"
  | "review"
  | "suspended";

/* =========================================================
   FORMATTERS
========================================================= */

function formatNumber(
  value:
    number,
) {
  return new Intl.NumberFormat(
    "en-US",
  ).format(
    value,
  );
}

function formatDateTime(
  value:
    string | null,
) {
  if (
    !value
  ) {
    return "—";
  }

  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      month:
        "short",

      day:
        "numeric",

      year:
        "numeric",

      hour:
        "numeric",

      minute:
        "2-digit",

      timeZone:
        "Asia/Manila",
    },
  ).format(
    date,
  );
}

function personName(
  row:
    ContentViolationRow,
) {
  return (
    row.profile.full_name
      ?.trim() ||
    row.profile.username
      ?.trim() ||
    "Unknown user"
  );
}

function normalizeText(
  value:
    string | null | undefined,
) {
  return (
    value ??
    ""
  )
    .trim()
    .toLowerCase();
}

function formatLabel(
  value:
    string,
) {
  return value
    .replace(
      /_/g,
      " ",
    )
    .replace(
      /\b\w/g,
      (
        character,
      ) =>
        character.toUpperCase(),
    );
}

/* =========================================================
   SEVERITY
========================================================= */

function severityLabel(
  severity:
    ContentViolationSeverity,
) {
  switch (
    severity
  ) {
    case 5:
      return "Severity 5";

    case 4:
      return "Severity 4";

    case 3:
      return "Severity 3";

    case 2:
      return "Severity 2";

    default:
      return "Severity 1";
  }
}

function SeverityBadge({
  severity,
}: {
  severity:
    ContentViolationSeverity;
}) {
  const styles:
    Record<
      ContentViolationSeverity,
      string
    > = {
    1:
      "border-slate-200 bg-slate-50 text-slate-600",

    2:
      "border-blue-200 bg-blue-50 text-blue-700",

    3:
      "border-amber-200 bg-amber-50 text-amber-700",

    4:
      "border-orange-200 bg-orange-50 text-orange-700",

    5:
      "border-red-200 bg-red-50 text-red-700",
  };

  return (
    <span
      className={`
        inline-flex
        border
        px-2
        py-1
        text-[11px]
        font-semibold
        uppercase
        tracking-[0.05em]
        ${styles[severity]}
      `}
    >
      {severityLabel(
        severity,
      )}
    </span>
  );
}

/* =========================================================
   ACCOUNT STATUS
========================================================= */

function AccountStatusBadge({
  status,
}: {
  status:
    string;
}) {
  const normalized =
    normalizeText(
      status,
    );

  let style =
    "border-slate-200 bg-slate-50 text-slate-600";

  if (
    normalized ===
    "active"
  ) {
    style =
      "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    normalized ===
    "suspended"
  ) {
    style =
      "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (
    normalized ===
    "banned"
  ) {
    style =
      "border-red-200 bg-red-50 text-red-700";
  }

  return (
    <span
      className={`
        inline-flex
        border
        px-2
        py-1
        text-[11px]
        font-semibold
        uppercase
        tracking-[0.05em]
        ${style}
      `}
    >
      {formatLabel(
        status ||
          "unknown",
      )}
    </span>
  );
}

/* =========================================================
   ENFORCEMENT
========================================================= */

function EnforcementBadge({
  row,
}: {
  row:
    ContentViolationRow;
}) {
  if (
    row.review_required
  ) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700 rounded-full"
      >
        <ShieldAlert
          size={11}
        />

        {row.enforcement}
      </span>
    );
  }

  if (
    row.active_ban
  ) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 rounded-full"
      >
        <Ban
          size={11}
        />

        {row.enforcement}
      </span>
    );
  }

  return (
    <span
      className="inline-flex border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 rounded-full"
    >
      {row.enforcement}
    </span>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function ContentViolationsTable({
  rows,
  stats,
  activeWindowDays,
  hasErrors,
}: ContentViolationsTableProps) {
  const violationDialogRef = useRef<HTMLElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [
    query,
    setQuery,
  ] =
    useState(
      "",
    );

  const [
    filter,
    setFilter,
  ] =
    useState<
      ViolationFilter
    >(
      "all",
    );

  const [
    selectedUserId,
    setSelectedUserId,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const selectedRow =
    useMemo(
      () =>
        selectedUserId
          ? rows.find(
              (
                row,
              ) =>
                row.user_id ===
                selectedUserId,
            ) ??
            null
          : null,
      [
        rows,
        selectedUserId,
      ],
    );

  const filteredRows =
    useMemo(
      () => {
        const cleaned =
          query
            .trim()
            .toLowerCase();

        return rows.filter(
          (
            row,
          ) => {
            if (
              filter ===
                "review" &&
              !row.review_required
            ) {
              return false;
            }

            if (
              filter ===
                "suspended" &&
              row.account_status !==
                "suspended" &&
              !row.active_ban
            ) {
              return false;
            }

            if (
              !cleaned
            ) {
              return true;
            }

            const searchable = [
              row.user_id,
              row.profile.username,
              row.profile.full_name,
              row.account_status,
              row.enforcement,
              ...row.categories,
            ]
              .filter(
                Boolean,
              )
              .join(
                " ",
              )
              .toLowerCase();

            return searchable.includes(
              cleaned,
            );
          },
        );
      },
      [
        rows,
        query,
        filter,
      ],
    );

  useEffect(() => {
    if (!selectedUserId) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() => violationDialogRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      restoreFocusRef.current?.focus();
    };
  }, [selectedUserId]);

  /* =======================================================
     MODAL BODY LOCK
  ======================================================= */

  useEffect(() => {
    if (
      !selectedRow
    ) {
      return;
    }

    const previous =
      document.body.style
        .overflow;

    document.body.style
      .overflow =
      "hidden";

    function handleKeyDown(
      event:
        KeyboardEvent,
    ) {
      if (event.key === "Tab" && violationDialogRef.current) {
        const elements = Array.from(violationDialogRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        )).filter((element) => element.getClientRects().length > 0);
        if (elements.length > 0) {
          const first = elements[0];
          const last = elements[elements.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      }
      if (
        event.key ===
        "Escape"
      ) {
        setSelectedUserId(
          null,
        );
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style
        .overflow =
        previous;

      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    selectedRow,
  ]);

  const summaryCards = [
    {
      label:
        "Violators",

      value:
        stats.violators,

      description:
        `Users with active violations in the last ${activeWindowDays} days`,

      icon:
        Users,

      style:
        "bg-[#A92F56]/[0.08] text-[#A92F56]",
    },

    {
      label:
        "Active Strikes",

      value:
        stats.activeStrikes,

      description:
        "Recorded moderation violations",

      icon:
        AlertTriangle,

      style:
        "bg-amber-50 text-amber-600",
    },

    {
      label:
        "Suspended",

      value:
        stats.suspended,

      description:
        "Users currently under restriction",

      icon:
        Ban,

      style:
        "bg-red-50 text-red-600",
    },

    {
      label:
        "Needs Review",

      value:
        stats.needsReview,

      description:
        "Cases requiring administrator attention",

      icon:
        ShieldAlert,

      style:
        "bg-blue-50 text-blue-600",
    },
  ];

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-950/[0.03]">
        {/* =========================
            HEADER
        ========================== */}

        <div
          className="border-b border-slate-100 px-5 py-5 sm:px-6"
        >
          <div
            className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"
          >
            <div>
              <div
                className="flex items-center gap-2"
              >
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#A92F56]/[0.08] text-[#A92F56]"
                >
                  <ShieldAlert
                    size={16}
                    strokeWidth={
                      1.9
                    }
                  />
                </div>

                <div>
                  <h2
                    className="text-sm font-bold text-slate-950"
                  >
                    Content
                    Violations
                  </h2>

                  <p
                    className="mt-0.5 text-[11px] text-slate-400"
                  >
                    Automated
                    moderation
                    activity
                  </p>
                </div>
              </div>

              <p
                className="mt-3 max-w-[720px] text-xs leading-5 text-slate-500"
              >
                Review users
                whose submitted
                content triggered
                PIN & TELL&apos;s
                automated
                moderation rules.
                Active strikes are
                calculated using a{" "}
                {
                  activeWindowDays
                }
                -day enforcement
                window.
              </p>
            </div>

            <div
              className="border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500"
            >
              <span
                className="font-semibold text-slate-700"
              >
                Moderation source:
              </span>{" "}
              System-generated
              violation logs
            </div>
          </div>
        </div>

        {/* =========================
            LOAD ERROR
        ========================== */}

        {hasErrors && (
          <div
            className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-xs text-amber-800"
          >
            Some automated
            moderation data could
            not be loaded. The
            information below may
            be incomplete.
          </div>
        )}

        {/* =========================
            SUMMARY
        ========================== */}

        <div
          className="grid gap-3 border-b border-slate-100 bg-slate-50/40 p-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {summaryCards.map(
            (
              card,
            ) => {
              const Icon =
                card.icon;

              return (
                <div
                  key={
                    card.label
                  }
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/[0.02]"
                >
                  <div
                    className="flex items-start justify-between gap-3"
                  >
                    <div>
                      <p
                        className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400"
                      >
                        {
                          card.label
                        }
                      </p>

                      <p
                        className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950"
                      >
                        {formatNumber(
                          card.value,
                        )}
                      </p>

                      <p
                        className="mt-1 max-w-[190px] text-[11px] leading-4 text-slate-400"
                      >
                        {
                          card.description
                        }
                      </p>
                    </div>

                    <div
                      className={`
                        flex
                        h-8
                        w-8
                        shrink-0
                        items-center
                        justify-center
                        ${card.style}
                      `}
                    >
                      <Icon
                        size={14}
                      />
                    </div>
                  </div>
                </div>
              );
            },
          )}
        </div>

        {/* =========================
            TOOLBAR
        ========================== */}

        <div
          className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between sm:px-5"
        >
          <div
            className="relative w-full lg:max-w-[360px]"
          >
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={
                query
              }
              onChange={(
                event,
              ) =>
                setQuery(
                  event
                    .target
                    .value,
                )
              }
              aria-label="Search content violations"
              placeholder="Search user, category or status..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#CC3A67] focus:ring-2 focus:ring-[#FDC1C9]/30 focus-visible:ring-2 focus-visible:ring-[#A92F56]/20"
            />

            {query && (
              <button
                type="button"
                onClick={() =>
                  setQuery(
                    "",
                  )
                }
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center text-slate-400 hover:text-slate-700"
                aria-label="Clear violation search"
              >
                <X
                  size={14}
                />
              </button>
            )}
          </div>

          <select
            aria-label="Filter violation history"
            value={
              filter
            }
            onChange={(
              event,
            ) =>
              setFilter(
                event
                  .target
                  .value as
                  ViolationFilter,
              )
            }
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none hover:border-slate-300 focus:border-[#CC3A67] rounded-xl focus-visible:ring-2 focus-visible:ring-[#A92F56]/20"
          >
            <option
              value="all"
            >
              All violators
            </option>

            <option
              value="review"
            >
              Needs review
            </option>

            <option
              value="suspended"
            >
              Suspended
            </option>
          </select>
        </div>

        {/* =========================
            TABLE
        ========================== */}

        {filteredRows.length >
        0 ? (
          <>
            <div className="grid gap-3 p-3 md:hidden sm:p-4">
              {filteredRows.map((row) => (
                <article key={row.user_id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-900">{personName(row)}</p>
                      <p className="mt-1 truncate text-[11px] text-slate-500">{row.profile.username ? `@${row.profile.username}` : row.user_id}</p>
                    </div>
                    <SeverityBadge severity={row.max_severity} />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <AccountStatusBadge status={row.account_status} />
                    <EnforcementBadge row={row} />
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <p className="text-[11px] text-slate-500"><strong className="text-slate-900">{row.active_strikes}</strong> active strikes</p>
                    <button type="button" onClick={() => setSelectedUserId(row.user_id)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#A92F56]/20 bg-[#A92F56]/[0.06] px-3 py-2 text-xs font-bold text-[#A92F56]"><Eye size={13} />View history</button>
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
            <table
              className="w-full min-w-[1050px] border-collapse text-left"
            >
              <thead>
                <tr
                  className="border-b border-slate-100 bg-slate-50/80"
                >
                  {[
                    "User",
                    "Active Strikes",
                    "Severity",
                    "Last Violation",
                    "Account",
                    "Enforcement",
                    "",
                  ].map(
                    (
                      heading,
                    ) => (
                      <th
                        key={
                          heading ||
                          "action"
                        }
                        className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 first:pl-5 last:pr-5"
                      >
                        {
                          heading
                        }
                      </th>
                    ),
                  )}
                </tr>
              </thead>

              <tbody>
                {filteredRows.map(
                  (
                    row,
                  ) => (
                    <tr
                      key={
                        row.user_id
                      }
                      className="border-b border-slate-100 transition-colors last:border-b-0 hover:bg-[#FDF5F7]/55"
                    >
                      {/* USER */}

                      <td
                        className="px-5 py-3.5"
                      >
                        <div
                          className="flex items-center gap-3"
                        >
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A92F56]/[0.08] text-[#A92F56]"
                          >
                            <User
                              size={15}
                            />
                          </div>

                          <div
                            className="min-w-0"
                          >
                            <p
                              className="max-w-[180px] truncate text-xs font-semibold text-slate-900"
                            >
                              {personName(
                                row,
                              )}
                            </p>

                            <p
                              className="mt-0.5 max-w-[180px] truncate text-[11px] text-slate-400"
                            >
                              {row.profile
                                .username
                                ? `@${row.profile.username}`
                                : row.user_id}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* STRIKES */}

                      <td
                        className="px-4 py-3.5"
                      >
                        <div
                          className="flex items-center gap-2"
                        >
                          <span
                            className="text-sm font-semibold text-slate-900"
                          >
                            {
                              row.active_strikes
                            }
                          </span>

                          {row.active_strikes >=
                            5 && (
                            <AlertTriangle
                              size={13}
                              className="text-amber-500"
                            />
                          )}
                        </div>
                      </td>

                      {/* SEVERITY */}

                      <td
                        className="px-4 py-3.5"
                      >
                        <SeverityBadge
                          severity={
                            row.max_severity
                          }
                        />
                      </td>

                      {/* LAST VIOLATION */}

                      <td
                        className="px-4 py-3.5 text-[11px] text-slate-500"
                      >
                        {formatDateTime(
                          row.latest_violation_at,
                        )}
                      </td>

                      {/* ACCOUNT */}

                      <td
                        className="px-4 py-3.5"
                      >
                        <AccountStatusBadge
                          status={
                            row.account_status
                          }
                        />
                      </td>

                      {/* ENFORCEMENT */}

                      <td
                        className="px-4 py-3.5"
                      >
                        <EnforcementBadge
                          row={
                            row
                          }
                        />
                      </td>

                      {/* ACTION */}

                      <td
                        className="px-5 py-3.5 text-right"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedUserId(
                              row.user_id,
                            )
                          }
                          className="inline-flex h-8 items-center gap-1.5 border border-slate-200 px-2.5 text-[11px] font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 rounded-lg"
                        >
                          <Eye
                            size={13}
                          />

                          View
                        </button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
            </div>
          </>
        ) : (
          <div
            className="flex min-h-[250px] flex-col items-center justify-center px-6 text-center"
          >
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"
            >
              <ShieldAlert
                size={18}
              />
            </div>

            <p
              className="mt-4 text-sm font-semibold text-slate-700"
            >
              No content
              violations found
            </p>

            <p
              className="mt-1 max-w-[420px] text-xs text-slate-400"
            >
              {rows.length ===
              0
                ? `No automated moderation violations were recorded within the last ${activeWindowDays} days.`
                : "Try changing the search or filter."}
            </p>
          </div>
        )}

        {/* =========================
            FOOTER
        ========================== */}

        <div
          className="flex items-center justify-between gap-4 border-t border-slate-200 px-5 py-3"
        >
          <p
            className="text-[11px] text-slate-400"
          >
            Showing{" "}
            {
              filteredRows.length
            }{" "}
            of{" "}
            {
              rows.length
            }{" "}
            violators
          </p>

          <p
            className="text-[11px] text-slate-400"
          >
            Active window:{" "}
            <span
              className="font-semibold text-slate-600"
            >
              {
                activeWindowDays
              }{" "}
              days
            </span>
          </p>
        </div>
      </section>

      {/* ===================================================
          VIOLATION DETAILS DRAWER
      =================================================== */}

      {selectedRow && (
        <>
          <button
            type="button"
            aria-label="Close violation history"
            onClick={() =>
              setSelectedUserId(
                null,
              )
            }
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-[3px]"
          />

          <aside
            ref={violationDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="violation-detail-heading"
            tabIndex={-1}
            className="fixed left-1/2 top-1/2 z-50 flex max-h-[94vh] w-[calc(100%-24px)] max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-2xl outline-none sm:max-h-[90vh] sm:w-[calc(100%-48px)]"
          >
            {/* DRAWER HEADER */}

            <div
              className="flex min-h-[74px] shrink-0 items-center justify-between border-b border-slate-100 bg-white px-5 sm:px-7"
            >
              <div>
                <div
                  className="flex items-center gap-2"
                >
                  <p
                    id="violation-detail-heading" className="text-base font-bold tracking-tight text-slate-950"
                  >
                    Content
                    Violation
                    History
                  </p>

                  {selectedRow.review_required && (
                    <span
                      className="border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-700 rounded-full"
                    >
                      Review Required
                    </span>
                  )}
                </div>

                <p
                  className="mt-1 text-[11px] text-slate-400"
                >
                  Automated
                  moderation
                  record
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedUserId(
                    null,
                  )
                }
                className="flex h-8 w-8 items-center justify-center border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
              >
                <X
                  size={15}
                />
              </button>
            </div>

            {/* DRAWER BODY */}

            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
            >
              {/* USER */}

              <div
                className="border-b border-slate-100 px-5 py-5 sm:px-7"
              >
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400"
                >
                  User
                </p>

                <div
                  className="mt-4 flex items-start justify-between gap-4"
                >
                  <div
                    className="flex min-w-0 items-center gap-3"
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#A92F56]/[0.08] text-[#A92F56]"
                    >
                      <User
                        size={16}
                      />
                    </div>

                    <div
                      className="min-w-0"
                    >
                      <p
                        className="truncate text-sm font-semibold text-slate-900"
                      >
                        {personName(
                          selectedRow,
                        )}
                      </p>

                      <p
                        className="mt-0.5 truncate text-[11px] text-slate-400"
                      >
                        {selectedRow.profile
                          .username
                          ? `@${selectedRow.profile.username}`
                          : selectedRow.user_id}
                      </p>
                    </div>
                  </div>

                  <AccountStatusBadge
                    status={
                      selectedRow.account_status
                    }
                  />
                </div>

                <div
                  className="mt-4 grid gap-2 sm:grid-cols-2"
                >
                  <Link
                    href={`/admin/users?q=${encodeURIComponent(
                      selectedRow.user_id,
                    )}`}
                    className="inline-flex h-9 items-center justify-center gap-2 border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                  >
                    <User
                      size={13}
                    />

                    View User
                  </Link>

                  {selectedRow.open_review_count >
                    0 && (
                    <Link
                      href="/admin/reports?status=pending"
                      className="inline-flex h-9 items-center justify-center gap-2 border border-[#FDC1C9] bg-[#FDC1C9]/15 px-3 text-[11px] font-semibold text-[#A92F56] transition hover:bg-[#FDC1C9]/25"
                    >
                      <ShieldAlert
                        size={13}
                      />

                      Open Review Queue
                    </Link>
                  )}
                </div>
              </div>

              {/* MODERATION SUMMARY */}

              <div
                className="border-b border-slate-100 px-5 py-5 sm:px-7"
              >
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400"
                >
                  Moderation
                  Summary
                </p>

                <div
                  className="mt-4 grid grid-cols-2 gap-3"
                >
                  <SummaryItem
                    label="Active strikes"
                    value={String(
                      selectedRow.active_strikes,
                    )}
                  />

                  <SummaryItem
                    label="Max severity"
                    value={severityLabel(
                      selectedRow.max_severity,
                    )}
                  />

                  <SummaryItem
                    label="Related reports"
                    value={String(
                      selectedRow.related_report_count,
                    )}
                  />

                  <SummaryItem
                    label="Open reviews"
                    value={String(
                      selectedRow.open_review_count,
                    )}
                  />
                </div>

                <div
                  className="mt-3 border border-slate-200 p-3 rounded-xl"
                >
                  <p
                    className="text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                  >
                    Current
                    enforcement
                  </p>

                  <div
                    className="mt-2"
                  >
                    <EnforcementBadge
                      row={
                        selectedRow
                      }
                    />
                  </div>
                </div>

                <div
                  className="mt-3"
                >
                  <p
                    className="text-[11px] text-slate-400"
                  >
                    Detected
                    categories
                  </p>

                  <div
                    className="mt-2 flex flex-wrap gap-1.5"
                  >
                    {selectedRow.categories
                      .length >
                    0 ? (
                      selectedRow.categories.map(
                        (
                          category,
                        ) => (
                          <span
                            key={
                              category
                            }
                            className="border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 rounded-full"
                          >
                            {formatLabel(
                              category,
                            )}
                          </span>
                        ),
                      )
                    ) : (
                      <span
                        className="text-[11px] text-slate-400"
                      >
                        No category
                        metadata
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ACTIVE BAN */}

              {selectedRow.active_ban && (
                <div
                  className="border-b border-slate-100 px-5 py-5 sm:px-7"
                >
                  <div
                    className="flex items-center gap-2"
                  >
                    <Ban
                      size={14}
                      className="text-red-600"
                    />

                    <p
                      className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400"
                    >
                      Active
                      Restriction
                    </p>
                  </div>

                  <div
                    className="mt-4 border border-red-200 bg-red-50/50 p-4"
                  >
                    <div
                      className="grid gap-4 sm:grid-cols-2"
                    >
                      <SummaryItem
                        label="Ban type"
                        value={formatLabel(
                          selectedRow.active_ban
                            .ban_type,
                        )}
                      />

                      <SummaryItem
                        label="Duration"
                        value={
                          selectedRow.active_ban
                            .duration_value
                            ? `${selectedRow.active_ban.duration_value} ${selectedRow.active_ban.duration_type}`
                            : formatLabel(
                                selectedRow.active_ban
                                  .duration_type,
                              )
                        }
                      />

                      <SummaryItem
                        label="Started"
                        value={formatDateTime(
                          selectedRow.active_ban
                            .starts_at,
                        )}
                      />

                      <SummaryItem
                        label="Expires"
                        value={formatDateTime(
                          selectedRow.active_ban
                            .expires_at,
                        )}
                      />
                    </div>

                    <div
                      className="mt-4"
                    >
                      <p
                        className="text-[11px] font-semibold uppercase tracking-wide text-red-500"
                      >
                        Reason
                      </p>

                      <p
                        className="mt-1 text-xs leading-5 text-red-800"
                      >
                        {
                          selectedRow.active_ban
                            .reason
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* VIOLATION TIMELINE */}

              <div
                className="px-5 py-5 sm:px-7"
              >
                <div
                  className="flex items-center justify-between gap-4"
                >
                  <div>
                    <p
                      className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400"
                    >
                      Violation
                      History
                    </p>

                    <p
                      className="mt-1 text-[11px] text-slate-400"
                    >
                      Most recent
                      incidents within
                      the active
                      enforcement
                      window
                    </p>
                  </div>

                  <span
                    className="text-[11px] font-semibold text-slate-500"
                  >
                    {
                      selectedRow.history
                        .length
                    }{" "}
                    shown
                  </span>
                </div>

                <div
                  className="mt-4 space-y-3"
                >
                  {selectedRow.history.map(
                    (
                      violation,
                      index,
                    ) => (
                      <div
                        key={
                          violation.id
                        }
                        className="border border-slate-200 p-4"
                      >
                        <div
                          className="flex items-start justify-between gap-4"
                        >
                          <div
                            className="flex items-start gap-3"
                          >
                            <div
                              className="flex h-8 w-8 shrink-0 items-center justify-center bg-slate-100 text-slate-500"
                            >
                              <span
                                className="text-[11px] font-semibold"
                              >
                                #
                                {
                                  selectedRow.active_strikes -
                                  index
                                }
                              </span>
                            </div>

                            <div>
                              <SeverityBadge
                                severity={
                                  violation.severity
                                }
                              />

                              <div
                                className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400"
                              >
                                <Clock3
                                  size={11}
                                />

                                {formatDateTime(
                                  violation.created_at,
                                )}
                              </div>
                            </div>
                          </div>

                          <span
                            className="text-[11px] text-slate-300"
                          >
                            Log #
                            {
                              violation.id
                            }
                          </span>
                        </div>

                        {violation.categories
                          .length >
                          0 && (
                          <div
                            className="mt-3 flex flex-wrap gap-1.5"
                          >
                            {violation.categories.map(
                              (
                                category,
                              ) => (
                                <span
                                  key={`${violation.id}-${category}`}
                                  className="border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600 rounded-full"
                                >
                                  {formatLabel(
                                    category,
                                  )}
                                </span>
                              ),
                            )}
                          </div>
                        )}

                        {violation.fields
                          .length >
                          0 && (
                          <p
                            className="mt-3 text-[11px] text-slate-400"
                          >
                            Detected in:{" "}
                            <span
                              className="font-medium text-slate-600"
                            >
                              {violation.fields
                                .map(
                                  formatLabel,
                                )
                                .join(
                                  ", ",
                                )}
                            </span>
                          </p>
                        )}
                      </div>
                    ),
                  )}
                </div>

                {selectedRow.history
                  .length ===
                  0 && (
                  <div
                    className="mt-4 border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500"
                  >
                    No violation
                    history is
                    available for
                    this user.
                  </div>
                )}
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  );
}

/* =========================================================
   SUMMARY ITEM
========================================================= */

function SummaryItem({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div
      className="border border-slate-200 p-3 rounded-xl"
    >
      <p
        className="text-[11px] font-semibold uppercase tracking-wide text-slate-400"
      >
        {label}
      </p>

      <p
        className="mt-1.5 truncate text-xs font-semibold text-slate-800"
      >
        {value}
      </p>
    </div>
  );
}