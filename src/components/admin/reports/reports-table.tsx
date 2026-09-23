"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Download,
  Eye,
  Flag,
  MapPin,
  MessageCircle,
  MessagesSquare,
  Search,
  User,
  X,
  XCircle,
} from "lucide-react";

import {
  useSearchParams,
} from "next/navigation";

import {
  useRouter,
} from "nextjs-toploader/app";

import ActionConfirmModal, {
  type ConfirmationVariant,
} from "@/components/admin/action-confirm-modal";

import {
  updateReportStatusAction,
} from "@/app/admin/(protected)/reports/actions";

import type {
  AdminReportRow,
  ReportStatus,
} from "@/lib/admin/reports";

type ReportsTableProps = {
  reports:
    AdminReportRow[];

  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };

  initialQuery:
    string;

  initialStatus:
    string;

  initialType:
    string;

  initialPin:
    string;
};

type ReportModerationAction =
  | "reviewing"
  | "resolved"
  | "dismissed";

type PendingReportAction = {
  status:
    ReportModerationAction;

  title: string;

  description:
    string;

  confirmLabel:
    string;

  variant:
    ConfirmationVariant;
};

function formatLabel(
  value: string,
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

function formatDateTime(
  value:
    | string
    | null,
) {
  if (!value) {
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
  ).format(date);
}

function formatDate(
  value:
    | string
    | null,
) {
  if (!value) {
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

      timeZone:
        "Asia/Manila",
    },
  ).format(date);
}

function personName(
  user:
    | {
        username:
          string | null;

        full_name:
          string | null;
      }
    | null,
) {
  return (
    user?.full_name
      ?.trim() ||
    user?.username
      ?.trim() ||
    "Unknown user"
  );
}

function reportTargetLabel(
  report:
    AdminReportRow,
) {
  if (
    report.target.type ===
    "pin"
  ) {
    return (
      report.target
        .title ||
      `Pin #${report.target.id}`
    );
  }

  if (
    report.target.type ===
    "comment"
  ) {
    return `Comment #${report.target.id}`;
  }

  if (
    report.target.type ===
    "chat"
  ) {
    return `Chat #${report.target.id}`;
  }

  if (
    report.target.type ===
    "user"
  ) {
    return personName(
      report.reported_user,
    );
  }

  return "Unknown target";
}

function StatusBadge({
  status,
}: {
  status:
    ReportStatus;
}) {
  const styles:
    Record<
      ReportStatus,
      string
    > = {
    pending:
      "border-amber-200 bg-amber-50 text-amber-700",

    reviewing:
      "border-blue-200 bg-blue-50 text-blue-700",

    resolved:
      "border-emerald-200 bg-emerald-50 text-emerald-700",

    dismissed:
      "border-slate-200 bg-slate-50 text-slate-600",

    suspended:
      "border-red-200 bg-red-50 text-red-700",

    outdated:
      "border-slate-200 bg-slate-50 text-slate-500",
  };

  return (
    <span
      className={`
        inline-flex
        border
        px-2
        py-1
        text-[10px]
        font-semibold
        uppercase
        tracking-[0.05em]
        ${styles[status]}
      `}
    >
      {status ===
      "reviewing"
        ? "Under Review"
        : formatLabel(
            status,
          )}
    </span>
  );
}

function TargetIcon({
  type,
}: {
  type:
    AdminReportRow[
      "target"
    ]["type"];
}) {
  if (
    type === "pin"
  ) {
    return (
      <MapPin
        size={14}
      />
    );
  }

  if (
    type ===
    "comment"
  ) {
    return (
      <MessageCircle
        size={14}
      />
    );
  }

  if (
    type === "chat"
  ) {
    return (
      <MessagesSquare
        size={14}
      />
    );
  }

  return (
    <User
      size={14}
    />
  );
}

function escapeCsv(
  value:
    | string
    | number
    | null
    | undefined,
) {
  const text =
    String(
      value ?? "",
    );

  return `"${text.replace(
    /"/g,
    '""',
  )}"`;
}

export default function ReportsTable({
  reports,
  pagination,
  initialQuery,
  initialStatus,
  initialType,
  initialPin,
}: ReportsTableProps) {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const currentParams =
    searchParams.toString();

  const [
    query,
    setQuery,
  ] = useState(
    initialQuery,
  );

  const [
    selectedReport,
    setSelectedReport,
  ] =
    useState<
      AdminReportRow | null
    >(null);

  const [
    pendingAction,
    setPendingAction,
  ] =
    useState<
      PendingReportAction | null
    >(null);

  const [
    actionMessage,
    setActionMessage,
  ] =
    useState<{
      type:
        | "success"
        | "error";

      text:
        string;
    } | null>(
      null,
    );

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  useEffect(() => {
    setQuery(
      initialQuery,
    );
  }, [
    initialQuery,
  ]);

  /*
   * Keep an opened drawer synchronized
   * after router.refresh() returns
   * updated server data.
   */
  useEffect(() => {
    if (
      !selectedReport
    ) {
      return;
    }

    const updatedReport =
      reports.find(
        (report) =>
          report.id ===
          selectedReport.id,
      );

    if (
      updatedReport &&
      updatedReport !==
        selectedReport
    ) {
      setSelectedReport(
        updatedReport,
      );
    }
  }, [
    reports,
    selectedReport,
  ]);

  useEffect(() => {
    const timeout =
      window.setTimeout(
        () => {
          const params =
            new URLSearchParams(
              currentParams,
            );

          const cleaned =
            query.trim();

          if (
            cleaned
          ) {
            params.set(
              "q",
              cleaned,
            );
          } else {
            params.delete(
              "q",
            );
          }

          params.delete(
            "page",
          );

          const next =
            params.toString();

          if (
            next !==
            currentParams
          ) {
            router.replace(
              next
                ? `/admin/reports?${next}`
                : "/admin/reports",
            );
          }
        },
        350,
      );

    return () =>
      window.clearTimeout(
        timeout,
      );
  }, [
    query,
    currentParams,
    router,
  ]);

  useEffect(() => {
    if (
      !selectedReport
    ) {
      return;
    }

    const previous =
      document.body
        .style
        .overflow;

    document.body.style
      .overflow =
      "hidden";

    function handleKeyDown(
      event:
        KeyboardEvent,
    ) {
      /*
       * The confirmation modal owns
       * Escape while it is open.
       */
      if (
        pendingAction
      ) {
        return;
      }

      if (
        event.key ===
        "Escape"
      ) {
        setSelectedReport(
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
    selectedReport,
    pendingAction,
  ]);

  const showingText =
    useMemo(() => {
      if (
        pagination.total ===
        0
      ) {
        return "0 reports";
      }

      const start =
        (
          pagination.page -
          1
        ) *
          pagination.pageSize +
        1;

      const end =
        Math.min(
          pagination.page *
            pagination.pageSize,
          pagination.total,
        );

      return `${start}–${end} of ${pagination.total}`;
    }, [
      pagination,
    ]);

  function updateFilter(
    key: string,
    value: string,
    defaultValue:
      string,
  ) {
    const params =
      new URLSearchParams(
        currentParams,
      );

    if (
      value ===
      defaultValue
    ) {
      params.delete(
        key,
      );
    } else {
      params.set(
        key,
        value,
      );
    }

    params.delete(
      "page",
    );

    const next =
      params.toString();

    router.replace(
      next
        ? `/admin/reports?${next}`
        : "/admin/reports",
    );
  }

  function clearPinFilter() {
    const params =
      new URLSearchParams(
        currentParams,
      );

    params.delete(
      "pin",
    );

    params.delete(
      "page",
    );

    const next =
      params.toString();

    router.replace(
      next
        ? `/admin/reports?${next}`
        : "/admin/reports",
    );
  }

  function pageUrl(
    page: number,
  ) {
    const params =
      new URLSearchParams(
        currentParams,
      );

    params.set(
      "page",
      String(page),
    );

    return `/admin/reports?${params.toString()}`;
  }

  function exportCurrentPage() {
    if (
      reports.length ===
      0
    ) {
      return;
    }

    const rows = [
      [
        "Report ID",
        "Type",
        "Target",
        "Reporter",
        "Reported User",
        "Reason",
        "Details",
        "Status",
        "Assigned Admin",
        "Created",
        "Reviewed",
      ],

      ...reports.map(
        (
          report,
        ) => [
          report.id,

          report.type,

          reportTargetLabel(
            report,
          ),

          personName(
            report.reporter,
          ),

          report.reported_user
            ? personName(
                report.reported_user,
              )
            : "",

          report.reason,

          report.details ??
            "",

          report.status,

          report.assigned_admin
            ?.full_name ||
            report.assigned_admin
              ?.email ||
            "",

          report.created_at ??
            "",

          report.reviewed_at ??
            "",
        ],
      ),
    ];

    const csv =
      rows
        .map(
          (row) =>
            row
              .map(
                escapeCsv,
              )
              .join(","),
        )
        .join("\r\n");

    const blob =
      new Blob(
        [
          "\uFEFF",
          csv,
        ],
        {
          type:
            "text/csv;charset=utf-8",
        },
      );

    const url =
      URL.createObjectURL(
        blob,
      );

    const anchor =
      document.createElement(
        "a",
      );

    anchor.href =
      url;

    anchor.download =
      `pin-tell-reports-page-${pagination.page}.csv`;

    document.body.appendChild(
      anchor,
    );

    anchor.click();

    anchor.remove();

    URL.revokeObjectURL(
      url,
    );
  }

  function requestReportAction(
    status:
      ReportModerationAction,
  ) {
    if (
      !selectedReport
    ) {
      return;
    }

    /*
     * Only an active moderation
     * case may change state.
     */
    if (
      selectedReport.status !==
        "pending" &&
      selectedReport.status !==
        "reviewing"
    ) {
      setActionMessage({
        type:
          "error",

        text:
          "This report has already been closed and cannot be changed from this screen.",
      });

      return;
    }

    if (
      status ===
      "reviewing"
    ) {
      if (
        selectedReport.status !==
        "pending"
      ) {
        return;
      }

      setPendingAction({
        status:
          "reviewing",

        title:
          "Mark report as under review?",

        description:
          `Report #${selectedReport.id} will be assigned to you and marked as actively under review. Other administrators will be able to see that this moderation case is currently being investigated.`,

        confirmLabel:
          "Mark Under Review",

        variant:
          "review",
      });

      return;
    }

    if (
      status ===
      "resolved"
    ) {
      setPendingAction({
        status:
          "resolved",

        title:
          "Resolve this report?",

        description:
          `Report #${selectedReport.id} will be marked as resolved and removed from the active moderation queue. Use this when the reported content or behavior has been reviewed and the case is complete.`,

        confirmLabel:
          "Resolve Report",

        variant:
          "success",
      });

      return;
    }

    setPendingAction({
      status:
        "dismissed",

      title:
        "Dismiss this report?",

      description:
        `Report #${selectedReport.id} will be dismissed and removed from the active moderation queue. Use this when the report does not require further administrative action.`,

      confirmLabel:
        "Dismiss Report",

      variant:
        "warning",
    });
  }

  function confirmReportAction() {
    if (
      !selectedReport ||
      !pendingAction
    ) {
      return;
    }

    const action =
      pendingAction;

    setActionMessage(
      null,
    );

    startTransition(
      async () => {
        const result =
          await updateReportStatusAction(
            selectedReport.id,
            action.status,
          );

        if (
          !result.success
        ) {
          setPendingAction(
            null,
          );

          setActionMessage({
            type:
              "error",

            text:
              result.message,
          });

          return;
        }

        setSelectedReport(
          (
            current,
          ) =>
            current
              ? {
                  ...current,

                  status:
                    action.status,

                  reviewed_at:
                    new Date()
                      .toISOString(),
                }
              : null,
        );

        setPendingAction(
          null,
        );

        setActionMessage({
          type:
            "success",

          text:
            result.message,
        });

        router.refresh();
      },
    );
  }

  const reportIsOpen =
    selectedReport
      ? selectedReport.status ===
          "pending" ||
        selectedReport.status ===
          "reviewing"
      : false;

  const canMarkReviewing =
    selectedReport?.status ===
    "pending";

  const canCloseReport =
    reportIsOpen;

  return (
    <>
      <section
        className="
          border
          border-slate-200
          bg-white
        "
      >
        {/* Toolbar */}
        <div
          className="
            flex
            flex-col
            gap-3
            border-b
            border-slate-200
            p-4
            xl:flex-row
            xl:items-center
            xl:justify-between
          "
        >
          <div
            className="
              relative
              w-full
              xl:max-w-[360px]
            "
          >
            <Search
              size={15}
              className="
                pointer-events-none
                absolute
                left-3
                top-1/2
                -translate-y-1/2
                text-slate-400
              "
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
              placeholder="Search report ID, reason or details..."
              className="
                h-10
                w-full
                border
                border-slate-200
                bg-white
                pl-9
                pr-9
                text-xs
                text-slate-800
                outline-none
                transition
                placeholder:text-slate-400
                hover:border-slate-300
                focus:border-[#CC3A67]
                focus:ring-2
                focus:ring-[#FDC1C9]/30
              "
            />

            {query && (
              <button
                type="button"
                onClick={() =>
                  setQuery(
                    "",
                  )
                }
                className="
                  absolute
                  right-2
                  top-1/2
                  flex
                  h-7
                  w-7
                  -translate-y-1/2
                  items-center
                  justify-center
                  text-slate-400
                  hover:text-slate-700
                "
                aria-label="Clear search"
              >
                <X
                  size={14}
                />
              </button>
            )}
          </div>

          <div
            className="
              flex
              flex-wrap
              items-center
              gap-2
            "
          >
            <select
              value={
                initialStatus
              }
              onChange={(
                event,
              ) =>
                updateFilter(
                  "status",
                  event
                    .target
                    .value,
                  "all",
                )
              }
              className="
                h-10
                border
                border-slate-200
                bg-white
                px-3
                text-xs
                font-medium
                text-slate-600
                outline-none
                hover:border-slate-300
                focus:border-[#CC3A67]
              "
            >
              <option value="all">
                All statuses
              </option>

              <option value="pending">
                Pending
              </option>

              <option value="reviewing">
                Under Review
              </option>

              <option value="resolved">
                Resolved
              </option>

              <option value="dismissed">
                Dismissed
              </option>

              <option value="suspended">
                Suspended
              </option>

              <option value="outdated">
                Outdated
              </option>
            </select>

            <select
              value={
                initialType
              }
              onChange={(
                event,
              ) =>
                updateFilter(
                  "type",
                  event
                    .target
                    .value,
                  "all",
                )
              }
              className="
                h-10
                border
                border-slate-200
                bg-white
                px-3
                text-xs
                font-medium
                text-slate-600
                outline-none
                hover:border-slate-300
                focus:border-[#CC3A67]
              "
            >
              <option value="all">
                All types
              </option>

              <option value="spam">
                Spam
              </option>

              <option value="harassment">
                Harassment
              </option>

              <option value="inappropriate">
                Inappropriate
              </option>

              <option value="copyright">
                Copyright
              </option>

              <option value="misinformation">
                Misinformation
              </option>

              <option value="other">
                Other
              </option>
            </select>

            <button
              type="button"
              onClick={
                exportCurrentPage
              }
              disabled={
                reports.length ===
                0
              }
              className="
                inline-flex
                h-10
                items-center
                gap-2
                border
                border-slate-200
                bg-white
                px-3
                text-xs
                font-medium
                text-slate-600
                transition
                hover:border-slate-300
                hover:bg-slate-50
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              <Download
                size={14}
              />

              Export page
            </button>
          </div>
        </div>

        {/* Pin filter */}
        {initialPin && (
          <div
            className="
              flex
              items-center
              justify-between
              gap-4
              border-b
              border-[#FDC1C9]
              bg-[#FDC1C9]/15
              px-4
              py-2.5
            "
          >
            <div
              className="
                flex
                items-center
                gap-2
              "
            >
              <MapPin
                size={14}
                className="
                  text-[#A92F56]
                "
              />

              <p
                className="
                  text-xs
                  text-slate-600
                "
              >
                Showing reports
                associated with
                Pin #
                {initialPin}
              </p>
            </div>

            <button
              type="button"
              onClick={
                clearPinFilter
              }
              className="
                text-[10px]
                font-semibold
                text-[#A92F56]
                hover:text-[#72213A]
              "
            >
              Clear filter
            </button>
          </div>
        )}

        {/* Table */}
        {reports.length >
        0 ? (
          <div
            className="
              overflow-x-auto
            "
          >
            <table
              className="
                w-full
                min-w-[1150px]
                border-collapse
                text-left
              "
            >
              <thead>
                <tr
                  className="
                    border-b
                    border-slate-100
                    bg-slate-50/70
                  "
                >
                  {[
                    "Report",
                    "Type",
                    "Target",
                    "Reported By",
                    "Reason",
                    "Assigned Admin",
                    "Status",
                    "Date",
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
                        className="
                          px-4
                          py-3
                          text-[10px]
                          font-semibold
                          uppercase
                          tracking-[0.08em]
                          text-slate-400
                          first:pl-5
                          last:pr-5
                        "
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
                {reports.map(
                  (
                    report,
                  ) => (
                    <tr
                      key={
                        report.id
                      }
                      className="
                        border-b
                        border-slate-100
                        transition-colors
                        last:border-b-0
                        hover:bg-slate-50/60
                      "
                    >
                      <td
                        className="
                          px-5
                          py-3.5
                        "
                      >
                        <div
                          className="
                            flex
                            items-center
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
                            <Flag
                              size={15}
                            />
                          </div>

                          <div>
                            <p
                              className="
                                text-xs
                                font-semibold
                                text-slate-900
                              "
                            >
                              Report #
                              {
                                report.id
                              }
                            </p>

                            <p
                              className="
                                mt-0.5
                                text-[10px]
                                text-slate-400
                              "
                            >
                              {
                                report.target.type
                              }
                            </p>
                          </div>
                        </div>
                      </td>

                      <td
                        className="
                          px-4
                          py-3.5
                          text-xs
                          text-slate-600
                        "
                      >
                        {formatLabel(
                          report.type,
                        )}
                      </td>

                      <td
                        className="
                          px-4
                          py-3.5
                        "
                      >
                        <div
                          className="
                            flex
                            max-w-[180px]
                            items-center
                            gap-2
                          "
                        >
                          <TargetIcon
                            type={
                              report
                                .target
                                .type
                            }
                          />

                          <span
                            className="
                              truncate
                              text-xs
                              text-slate-600
                            "
                          >
                            {reportTargetLabel(
                              report,
                            )}
                          </span>
                        </div>
                      </td>

                      <td
                        className="
                          px-4
                          py-3.5
                        "
                      >
                        <p
                          className="
                            max-w-[150px]
                            truncate
                            text-xs
                            font-medium
                            text-slate-700
                          "
                        >
                          {personName(
                            report.reporter,
                          )}
                        </p>

                        {report.reporter
                          ?.username && (
                          <p
                            className="
                              mt-0.5
                              text-[9px]
                              text-slate-400
                            "
                          >
                            @
                            {
                              report
                                .reporter
                                .username
                            }
                          </p>
                        )}
                      </td>

                      <td
                        className="
                          px-4
                          py-3.5
                        "
                      >
                        <p
                          className="
                            max-w-[210px]
                            truncate
                            text-xs
                            text-slate-600
                          "
                        >
                          {
                            report.reason
                          }
                        </p>
                      </td>

                      <td
                        className="
                          px-4
                          py-3.5
                          text-[11px]
                          text-slate-500
                        "
                      >
                        {report.assigned_admin
                          ? report
                              .assigned_admin
                              .full_name ||
                            report
                              .assigned_admin
                              .email
                          : "Unassigned"}
                      </td>

                      <td
                        className="
                          px-4
                          py-3.5
                        "
                      >
                        <StatusBadge
                          status={
                            report.status
                          }
                        />
                      </td>

                      <td
                        className="
                          px-4
                          py-3.5
                          text-[11px]
                          text-slate-500
                        "
                      >
                        {formatDate(
                          report.created_at,
                        )}
                      </td>

                      <td
                        className="
                          px-5
                          py-3.5
                          text-right
                        "
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReport(
                              report,
                            );

                            setActionMessage(
                              null,
                            );

                            setPendingAction(
                              null,
                            );
                          }}
                          className="
                            inline-flex
                            h-8
                            items-center
                            gap-1.5
                            border
                            border-slate-200
                            px-2.5
                            text-[11px]
                            font-medium
                            text-slate-600
                            transition
                            hover:border-slate-300
                            hover:bg-slate-50
                            hover:text-slate-900
                          "
                        >
                          <Eye
                            size={13}
                          />

                          Review
                        </button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            className="
              flex
              min-h-[320px]
              flex-col
              items-center
              justify-center
              px-6
              text-center
            "
          >
            <div
              className="
                flex
                h-11
                w-11
                items-center
                justify-center
                bg-slate-100
                text-slate-400
              "
            >
              <Flag
                size={18}
              />
            </div>

            <p
              className="
                mt-4
                text-sm
                font-semibold
                text-slate-700
              "
            >
              No reports found
            </p>

            <p
              className="
                mt-1
                text-xs
                text-slate-400
              "
            >
              Try changing the
              search or filters.
            </p>
          </div>
        )}

        {/* Pagination */}
        <div
          className="
            flex
            items-center
            justify-between
            border-t
            border-slate-200
            px-4
            py-3
            sm:px-5
          "
        >
          <p
            className="
              text-[11px]
              text-slate-400
            "
          >
            {showingText}
          </p>

          <div
            className="
              flex
              items-center
              gap-2
            "
          >
            {pagination.page >
            1 ? (
              <Link
                href={pageUrl(
                  pagination.page -
                    1,
                )}
                className="
                  border
                  border-slate-200
                  px-3
                  py-1.5
                  text-[11px]
                  font-medium
                  text-slate-600
                  hover:bg-slate-50
                "
              >
                Previous
              </Link>
            ) : (
              <span
                className="
                  border
                  border-slate-100
                  px-3
                  py-1.5
                  text-[11px]
                  text-slate-300
                "
              >
                Previous
              </span>
            )}

            <span
              className="
                px-2
                text-[11px]
                font-medium
                text-slate-500
              "
            >
              {
                pagination.page
              }
              {" / "}
              {
                pagination.pageCount
              }
            </span>

            {pagination.page <
            pagination.pageCount ? (
              <Link
                href={pageUrl(
                  pagination.page +
                    1,
                )}
                className="
                  border
                  border-slate-200
                  px-3
                  py-1.5
                  text-[11px]
                  font-medium
                  text-slate-600
                  hover:bg-slate-50
                "
              >
                Next
              </Link>
            ) : (
              <span
                className="
                  border
                  border-slate-100
                  px-3
                  py-1.5
                  text-[11px]
                  text-slate-300
                "
              >
                Next
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Review drawer */}
      {selectedReport && (
        <>
          <button
            type="button"
            aria-label="Close report details"
            onClick={() => {
              if (
                !pendingAction &&
                !isPending
              ) {
                setSelectedReport(
                  null,
                );
              }
            }}
            className="
              fixed
              inset-0
              z-40
              bg-slate-950/20
              backdrop-blur-[1px]
            "
          />

          <aside
            className="
              fixed
              bottom-0
              right-0
              top-0
              z-50
              flex
              w-full
              max-w-[500px]
              flex-col
              border-l
              border-slate-200
              bg-white
              shadow-2xl
              shadow-slate-950/10
            "
          >
            {/* Drawer header */}
            <div
              className="
                flex
                h-[68px]
                shrink-0
                items-center
                justify-between
                border-b
                border-slate-200
                px-5
              "
            >
              <div>
                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >
                  <p
                    className="
                      text-sm
                      font-semibold
                      text-slate-950
                    "
                  >
                    Report #
                    {
                      selectedReport.id
                    }
                  </p>

                  <StatusBadge
                    status={
                      selectedReport.status
                    }
                  />
                </div>

                <p
                  className="
                    mt-1
                    text-[10px]
                    text-slate-400
                  "
                >
                  Moderation review
                </p>
              </div>

              <button
                type="button"
                disabled={
                  Boolean(
                    pendingAction,
                  ) ||
                  isPending
                }
                onClick={() =>
                  setSelectedReport(
                    null,
                  )
                }
                className="
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  border
                  border-slate-200
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

            <div
              className="
                flex-1
                overflow-y-auto
              "
            >
              {/* Report info */}
              <div
                className="
                  border-b
                  border-slate-100
                  px-5
                  py-5
                "
              >
                <p
                  className="
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.12em]
                    text-slate-400
                  "
                >
                  Report
                </p>

                <div
                  className="
                    mt-4
                    grid
                    grid-cols-2
                    gap-4
                  "
                >
                  <div>
                    <p
                      className="
                        text-[10px]
                        text-slate-400
                      "
                    >
                      Type
                    </p>

                    <p
                      className="
                        mt-1
                        text-xs
                        font-medium
                        text-slate-700
                      "
                    >
                      {formatLabel(
                        selectedReport.type,
                      )}
                    </p>
                  </div>

                  <div>
                    <p
                      className="
                        text-[10px]
                        text-slate-400
                      "
                    >
                      Submitted
                    </p>

                    <p
                      className="
                        mt-1
                        text-xs
                        font-medium
                        text-slate-700
                      "
                    >
                      {formatDateTime(
                        selectedReport.created_at,
                      )}
                    </p>
                  </div>
                </div>

                <div
                  className="
                    mt-5
                  "
                >
                  <p
                    className="
                      text-[10px]
                      text-slate-400
                    "
                  >
                    Reason
                  </p>

                  <p
                    className="
                      mt-1
                      text-sm
                      font-semibold
                      text-slate-900
                    "
                  >
                    {
                      selectedReport.reason
                    }
                  </p>
                </div>

                <div
                  className="
                    mt-4
                  "
                >
                  <p
                    className="
                      text-[10px]
                      text-slate-400
                    "
                  >
                    Additional details
                  </p>

                  <p
                    className="
                      mt-1
                      whitespace-pre-wrap
                      text-xs
                      leading-6
                      text-slate-600
                    "
                  >
                    {selectedReport.details ||
                      "No additional details were provided."}
                  </p>
                </div>
              </div>

              {/* Target */}
              <div
                className="
                  border-b
                  border-slate-100
                  px-5
                  py-5
                "
              >
                <p
                  className="
                    mb-4
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.12em]
                    text-slate-400
                  "
                >
                  Reported content
                </p>

                <div
                  className="
                    border
                    border-slate-200
                    bg-slate-50/50
                  "
                >
                  {selectedReport
                    .target
                    .photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={
                        selectedReport
                          .target
                          .photo_url
                      }
                      alt=""
                      className="
                        h-40
                        w-full
                        border-b
                        border-slate-200
                        object-cover
                      "
                    />
                  )}

                  <div
                    className="
                      p-4
                    "
                  >
                    <div
                      className="
                        flex
                        items-center
                        gap-2
                      "
                    >
                      <TargetIcon
                        type={
                          selectedReport
                            .target
                            .type
                        }
                      />

                      <span
                        className="
                          text-[10px]
                          font-semibold
                          uppercase
                          tracking-wide
                          text-slate-400
                        "
                      >
                        {
                          selectedReport
                            .target
                            .type
                        }
                      </span>
                    </div>

                    <p
                      className="
                        mt-3
                        text-sm
                        font-semibold
                        text-slate-900
                      "
                    >
                      {reportTargetLabel(
                        selectedReport,
                      )}
                    </p>

                    {selectedReport
                      .target
                      .content && (
                      <p
                        className="
                          mt-2
                          whitespace-pre-wrap
                          text-xs
                          leading-5
                          text-slate-600
                        "
                      >
                        {
                          selectedReport
                            .target
                            .content
                        }
                      </p>
                    )}

                    {selectedReport
                      .target
                      .type ===
                      "pin" &&
                      selectedReport
                        .pin_id && (
                        <Link
                          href={`/admin/pins?q=${selectedReport.pin_id}`}
                          className="
                            mt-4
                            inline-flex
                            text-[10px]
                            font-semibold
                            text-[#A92F56]
                            hover:text-[#72213A]
                          "
                        >
                          View in Pins
                        </Link>
                      )}
                  </div>
                </div>
              </div>

              {/* People */}
              <div
                className="
                  border-b
                  border-slate-100
                  px-5
                  py-5
                "
              >
                <p
                  className="
                    mb-4
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.12em]
                    text-slate-400
                  "
                >
                  People involved
                </p>

                <div
                  className="
                    grid
                    gap-3
                    sm:grid-cols-2
                  "
                >
                  <div
                    className="
                      border
                      border-slate-200
                      p-3
                    "
                  >
                    <p
                      className="
                        text-[9px]
                        font-semibold
                        uppercase
                        tracking-wide
                        text-slate-400
                      "
                    >
                      Reported by
                    </p>

                    <p
                      className="
                        mt-2
                        truncate
                        text-xs
                        font-semibold
                        text-slate-800
                      "
                    >
                      {personName(
                        selectedReport.reporter,
                      )}
                    </p>

                    {selectedReport
                      .reporter_id && (
                      <Link
                        href={`/admin/users?q=${encodeURIComponent(
                          selectedReport.reporter_id,
                        )}`}
                        className="
                          mt-2
                          inline-block
                          text-[10px]
                          font-semibold
                          text-[#A92F56]
                        "
                      >
                        View user
                      </Link>
                    )}
                  </div>

                  <div
                    className="
                      border
                      border-slate-200
                      p-3
                    "
                  >
                    <p
                      className="
                        text-[9px]
                        font-semibold
                        uppercase
                        tracking-wide
                        text-slate-400
                      "
                    >
                      Reported user
                    </p>

                    <p
                      className="
                        mt-2
                        truncate
                        text-xs
                        font-semibold
                        text-slate-800
                      "
                    >
                      {selectedReport.reported_user
                        ? personName(
                            selectedReport.reported_user,
                          )
                        : "Not specified"}
                    </p>

                    {selectedReport
                      .reported_user_id && (
                      <Link
                        href={`/admin/users?q=${encodeURIComponent(
                          selectedReport.reported_user_id,
                        )}`}
                        className="
                          mt-2
                          inline-block
                          text-[10px]
                          font-semibold
                          text-[#A92F56]
                        "
                      >
                        View user
                      </Link>
                    )}
                  </div>
                </div>

                {selectedReport
                  .reported_user_id && (
                  <div
                    className="
                      mt-3
                      flex
                      items-center
                      justify-between
                      border
                      border-slate-200
                      px-3
                      py-2.5
                    "
                  >
                    <span
                      className="
                        text-xs
                        text-slate-500
                      "
                    >
                      Reports involving
                      this user
                    </span>

                    <span
                      className="
                        text-xs
                        font-semibold
                        text-slate-900
                      "
                    >
                      {
                        selectedReport.previous_reports_count
                      }
                    </span>
                  </div>
                )}
              </div>

              {/* Review metadata */}
              <div
                className="
                  border-b
                  border-slate-100
                  px-5
                  py-5
                "
              >
                <p
                  className="
                    mb-4
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.12em]
                    text-slate-400
                  "
                >
                  Review
                </p>

                <div
                  className="
                    space-y-3
                  "
                >
                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      gap-4
                    "
                  >
                    <span
                      className="
                        text-xs
                        text-slate-500
                      "
                    >
                      Assigned admin
                    </span>

                    <span
                      className="
                        max-w-[230px]
                        truncate
                        text-xs
                        font-medium
                        text-slate-700
                      "
                    >
                      {selectedReport.assigned_admin
                        ?.full_name ||
                        selectedReport.assigned_admin
                          ?.email ||
                        "Unassigned"}
                    </span>
                  </div>

                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      gap-4
                    "
                  >
                    <span
                      className="
                        text-xs
                        text-slate-500
                      "
                    >
                      Last reviewed
                    </span>

                    <span
                      className="
                        text-xs
                        font-medium
                        text-slate-700
                      "
                    >
                      {formatDateTime(
                        selectedReport.reviewed_at,
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div
                className="
                  px-5
                  py-5
                "
              >
                <p
                  className="
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.12em]
                    text-slate-400
                  "
                >
                  Moderation action
                </p>

                <p
                  className="
                    mt-2
                    text-xs
                    leading-5
                    text-slate-500
                  "
                >
                  Update the report
                  workflow after
                  reviewing the
                  submitted information
                  and reported content.
                </p>

                {actionMessage && (
                  <div
                    className={`
                      mt-4
                      border
                      px-3
                      py-2.5
                      text-xs
                      ${
                        actionMessage.type ===
                        "success"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-red-200 bg-red-50 text-red-700"
                      }
                    `}
                  >
                    {
                      actionMessage.text
                    }
                  </div>
                )}

                <div
                  className="
                    mt-4
                    grid
                    gap-2
                    sm:grid-cols-3
                  "
                >
                  <button
                    type="button"
                    disabled={
                      isPending ||
                      !canMarkReviewing
                    }
                    onClick={() =>
                      requestReportAction(
                        "reviewing",
                      )
                    }
                    className="
                      inline-flex
                      h-10
                      items-center
                      justify-center
                      gap-2
                      border
                      border-blue-200
                      bg-blue-50
                      px-3
                      text-[11px]
                      font-semibold
                      text-blue-700
                      transition
                      hover:bg-blue-100
                      disabled:cursor-not-allowed
                      disabled:opacity-40
                    "
                  >
                    <CircleDot
                      size={13}
                    />

                    Under Review
                  </button>

                  <button
                    type="button"
                    disabled={
                      isPending ||
                      !canCloseReport
                    }
                    onClick={() =>
                      requestReportAction(
                        "resolved",
                      )
                    }
                    className="
                      inline-flex
                      h-10
                      items-center
                      justify-center
                      gap-2
                      border
                      border-emerald-200
                      bg-emerald-50
                      px-3
                      text-[11px]
                      font-semibold
                      text-emerald-700
                      transition
                      hover:bg-emerald-100
                      disabled:cursor-not-allowed
                      disabled:opacity-40
                    "
                  >
                    <CheckCircle2
                      size={13}
                    />

                    Resolve
                  </button>

                  <button
                    type="button"
                    disabled={
                      isPending ||
                      !canCloseReport
                    }
                    onClick={() =>
                      requestReportAction(
                        "dismissed",
                      )
                    }
                    className="
                      inline-flex
                      h-10
                      items-center
                      justify-center
                      gap-2
                      border
                      border-slate-200
                      bg-white
                      px-3
                      text-[11px]
                      font-semibold
                      text-slate-600
                      transition
                      hover:bg-slate-50
                      disabled:cursor-not-allowed
                      disabled:opacity-40
                    "
                  >
                    <XCircle
                      size={13}
                    />

                    Dismiss
                  </button>
                </div>

                {!reportIsOpen && (
                  <div
                    className="
                      mt-4
                      flex
                      gap-3
                      border
                      border-slate-200
                      bg-slate-50
                      p-3
                    "
                  >
                    <CheckCircle2
                      size={15}
                      className="
                        mt-0.5
                        shrink-0
                        text-slate-500
                      "
                    />

                    <p
                      className="
                        text-[10px]
                        leading-5
                        text-slate-600
                      "
                    >
                      This moderation
                      case is closed.
                      No additional
                      report status
                      actions are
                      available.
                    </p>
                  </div>
                )}

                <div
                  className="
                    mt-4
                    flex
                    gap-3
                    border
                    border-amber-200
                    bg-amber-50
                    p-3
                  "
                >
                  <AlertTriangle
                    size={15}
                    className="
                      mt-0.5
                      shrink-0
                      text-amber-600
                    "
                  />

                  <p
                    className="
                      text-[10px]
                      leading-5
                      text-amber-700
                    "
                  >
                    Account suspension,
                    bans and destructive
                    content removal are
                    handled through
                    their dedicated
                    moderation controls
                    so enforcement
                    records remain
                    consistent.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Custom confirmation modal */}
      <ActionConfirmModal
        open={
          pendingAction !==
          null
        }
        title={
          pendingAction
            ?.title ??
          ""
        }
        description={
          pendingAction
            ?.description ??
          ""
        }
        confirmLabel={
          pendingAction
            ?.confirmLabel ??
          "Confirm"
        }
        variant={
          pendingAction
            ?.variant ??
          "warning"
        }
        loading={
          isPending
        }
        onClose={() => {
          if (
            !isPending
          ) {
            setPendingAction(
              null,
            );
          }
        }}
        onConfirm={
          confirmReportAction
        }
      />
    </>
  );
}