"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  Bot,
  Clock3,
  Download,
  Eye,
  FileText,
  Globe2,
  Laptop,
  Search,
  ShieldCheck,
  Table2,
  User,
  Users,
  X,
} from "lucide-react";

import {
  useSearchParams,
} from "next/navigation";

import {
  useRouter,
} from "nextjs-toploader/app";

import type {
  AdminActivityLogRow,
  ActivityActor,
} from "@/lib/admin/activity-logs";

type Props = {
  logs:
    AdminActivityLogRow[];

  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };

  initialQuery:
    string;

  initialActor:
    string;

  initialPeriod:
    string;

  initialSort:
    string;
};

function formatLabel(
  value:
    string | null,
) {
  if (
    !value
  ) {
    return "—";
  }

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

      second:
        "2-digit",

      timeZone:
        "Asia/Manila",
    },
  ).format(
    date,
  );
}

function formatTableDate(
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

function initials(
  value: string,
) {
  return (
    value
      .split(
        /\s+/,
      )
      .filter(
        Boolean,
      )
      .slice(
        0,
        2,
      )
      .map(
        (
          word,
        ) =>
          word[0]
            ?.toUpperCase(),
      )
      .join("") ||
    "U"
  );
}

function actorName(
  actor:
    ActivityActor,
  actorType:
    string | null,
) {
  if (
    actor?.kind ===
    "admin"
  ) {
    return (
      actor.full_name
        ?.trim() ||
      actor.email ||
      "Administrator"
    );
  }

  if (
    actor?.kind ===
    "user"
  ) {
    return (
      actor.full_name
        ?.trim() ||
      actor.username
        ?.trim() ||
      "User"
    );
  }

  if (
    actor?.kind ===
    "system" ||
    actorType ===
      "system"
  ) {
    return "System";
  }

  if (
    actorType ===
    "admin"
  ) {
    return "Administrator";
  }

  if (
    actorType ===
    "user"
  ) {
    return "User";
  }

  return "Unknown actor";
}

function actorSubtitle(
  actor:
    ActivityActor,
  userId:
    string | null,
) {
  if (
    actor?.kind ===
    "admin"
  ) {
    return actor.email;
  }

  if (
    actor?.kind ===
    "user"
  ) {
    if (
      actor.username
    ) {
      return `@${actor.username}`;
    }

    return actor.id;
  }

  if (
    actor?.kind ===
    "system"
  ) {
    return "Automated event";
  }

  return (
    userId ??
    "No actor ID"
  );
}

function shortId(
  value:
    string | null,
) {
  if (
    !value
  ) {
    return "—";
  }

  if (
    value.length <=
    20
  ) {
    return value;
  }

  return `${value.slice(
    0,
    8,
  )}…${value.slice(
    -6,
  )}`;
}

function targetLabel(
  log:
    AdminActivityLogRow,
) {
  if (
    !log.target_table
  ) {
    return "No target";
  }

  return formatLabel(
    log.target_table,
  );
}

function actorBadgeStyle(
  actorType:
    string | null,
) {
  if (
    actorType ===
    "admin"
  ) {
    return "border-[#FDC1C9] bg-[#FDC1C9]/20 text-[#A92F56]";
  }

  if (
    actorType ===
    "user"
  ) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (
    actorType ===
    "system"
  ) {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function targetHref(
  log:
    AdminActivityLogRow,
): string | null {
  if (
    !log.target_table ||
    !log.target_id
  ) {
    return null;
  }

  const target =
    encodeURIComponent(
      log.target_id,
    );

  switch (
    log.target_table
  ) {
    case "profiles":
      return `/admin/users?q=${target}`;

    case "pins":
      return `/admin/pins?q=${target}`;

    case "reports":
      return `/admin/reports?q=${target}`;

    case "user_bans":
      return `/admin/bans?q=${target}`;

    case "trips":
      return `/admin/trips?q=${target}`;

    case "user_vehicles":
      return `/admin/vehicles?q=${target}`;

    case "fuel_logs":
      return `/admin/fuel-logs?q=${target}`;

    default:
      return null;
  }
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
      value ??
      "",
    );

  return `"${text.replace(
    /"/g,
    '""',
  )}"`;
}

function ActorVisual({
  log,
  size = "sm",
}: {
  log:
    AdminActivityLogRow;

  size?:
    "sm" |
    "lg";
}) {
  const dimension =
    size ===
    "lg"
      ? "h-11 w-11"
      : "h-8 w-8";

  const iconSize =
    size ===
    "lg"
      ? 17
      : 13;

  const name =
    actorName(
      log.actor,
      log.actor_type,
    );

  if (
    log.actor?.kind ===
      "user" &&
    log.actor.avatar_url
  ) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={
          log.actor
            .avatar_url
        }
        alt=""
        className={`
          ${dimension}
          shrink-0
          rounded-full
          object-cover
        `}
      />
    );
  }

  if (
    log.actor_type ===
    "admin"
  ) {
    return (
      <div
        className={`
          ${dimension}
          flex
          shrink-0
          items-center
          justify-center
          rounded-full
          bg-[#A92F56]/10
          font-semibold
          text-[#A92F56]
        `}
      >
        <ShieldCheck
          size={
            iconSize
          }
        />
      </div>
    );
  }

  if (
    log.actor_type ===
    "system"
  ) {
    return (
      <div
        className={`
          ${dimension}
          flex
          shrink-0
          items-center
          justify-center
          rounded-full
          bg-violet-50
          text-violet-600
        `}
      >
        <Bot
          size={
            iconSize
          }
        />
      </div>
    );
  }

  return (
    <div
      className={`
        ${dimension}
        flex
        shrink-0
        items-center
        justify-center
        rounded-full
        bg-blue-50
        text-[9px]
        font-semibold
        text-blue-700
      `}
    >
      {log.actor_type ===
      "user"
        ? initials(
            name,
          )
        : (
          <User
            size={
              iconSize
            }
          />
        )}
    </div>
  );
}

export default function ActivityLogsTable({
  logs,
  pagination,
  initialQuery,
  initialActor,
  initialPeriod,
  initialSort,
}: Props) {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const currentParams =
    searchParams.toString();

  const [
    query,
    setQuery,
  ] =
    useState(
      initialQuery,
    );

  const [
    selectedLog,
    setSelectedLog,
  ] =
    useState<
      AdminActivityLogRow | null
    >(null);

  /*
   * Debounced search.
   *
   * The page gives this component
   * a URL-derived key, so local query
   * state is recreated when needed.
   */
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
                ? `/admin/activity-logs?${next}`
                : "/admin/activity-logs",
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

  /*
   * Drawer scroll lock / Escape.
   */
  useEffect(() => {
    if (
      !selectedLog
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
      if (
        event.key ===
        "Escape"
      ) {
        setSelectedLog(
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
    selectedLog,
  ]);

  const showing =
    useMemo(() => {
      if (
        pagination.total ===
        0
      ) {
        return "0 activity logs";
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
        ? `/admin/activity-logs?${next}`
        : "/admin/activity-logs",
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
      String(
        page,
      ),
    );

    return `/admin/activity-logs?${params.toString()}`;
  }

  function exportPage() {
    if (
      logs.length ===
      0
    ) {
      return;
    }

    const rows = [
      [
        "Log ID",
        "Actor Type",
        "Actor",
        "Actor ID",
        "Action Type",
        "Description",
        "Target Table",
        "Target ID",
        "IP Address",
        "User Agent",
        "Created At",
      ],

      ...logs.map(
        (
          log,
        ) => [
          log.id,

          log.actor_type,

          actorName(
            log.actor,
            log.actor_type,
          ),

          log.user_id,

          log.action_type,

          log.description,

          log.target_table,

          log.target_id,

          log.ip_address,

          log.user_agent,

          log.created_at,
        ],
      ),
    ];

    const csv =
      rows
        .map(
          (
            row,
          ) =>
            row
              .map(
                escapeCsv,
              )
              .join(","),
        )
        .join(
          "\r\n",
        );

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
      `pin-tell-activity-logs-page-${pagination.page}.csv`;

    document.body.appendChild(
      anchor,
    );

    anchor.click();

    anchor.remove();

    URL.revokeObjectURL(
      url,
    );
  }

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
              xl:max-w-[410px]
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
              placeholder="Search action, description, actor, target, IP or ID..."
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
                aria-label="Clear search"
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
            {/* Actor */}
            <select
              value={
                initialActor
              }
              onChange={(
                event,
              ) =>
                updateFilter(
                  "actor",
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
                All actors
              </option>

              <option value="admin">
                Administrators
              </option>

              <option value="user">
                Users
              </option>

              <option value="system">
                System
              </option>
            </select>

            {/* Period */}
            <select
              value={
                initialPeriod
              }
              onChange={(
                event,
              ) =>
                updateFilter(
                  "period",
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
                All time
              </option>

              <option value="24h">
                Last 24 hours
              </option>

              <option value="7d">
                Last 7 days
              </option>

              <option value="30d">
                Last 30 days
              </option>

              <option value="90d">
                Last 90 days
              </option>
            </select>

            {/* Sort */}
            <select
              value={
                initialSort
              }
              onChange={(
                event,
              ) =>
                updateFilter(
                  "sort",
                  event
                    .target
                    .value,
                  "newest",
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
              <option value="newest">
                Newest first
              </option>

              <option value="oldest">
                Oldest first
              </option>
            </select>

            <button
              type="button"
              disabled={
                logs.length ===
                0
              }
              onClick={
                exportPage
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
                hover:bg-slate-50
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              <Download
                size={14}
              />

              Export to CSV
            </button>
          </div>
        </div>

        {/* Table */}
        {logs.length >
        0 ? (
          <div
            className="
              overflow-x-auto
            "
          >
            <table
              className="
                w-full
                min-w-[1250px]
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
                    "Time",
                    "Actor",
                    "Type",
                    "Action",
                    "Description",
                    "Target",
                    "IP Address",
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
                {logs.map(
                  (
                    log,
                  ) => (
                    <tr
                      key={
                        log.id
                      }
                      className="
                        border-b
                        border-slate-100
                        last:border-b-0
                        hover:bg-slate-50/60
                      "
                    >
                      {/* Time */}
                      <td
                        className="
                          whitespace-nowrap
                          px-5
                          py-3.5
                          text-[11px]
                          text-slate-500
                        "
                      >
                        {formatTableDate(
                          log.created_at,
                        )}
                      </td>

                      {/* Actor */}
                      <td
                        className="
                          px-4
                          py-3.5
                        "
                      >
                        <div
                          className="
                            flex
                            items-center
                            gap-2.5
                          "
                        >
                          <ActorVisual
                            log={
                              log
                            }
                          />

                          <div
                            className="
                              min-w-0
                            "
                          >
                            <p
                              className="
                                max-w-[170px]
                                truncate
                                text-[11px]
                                font-semibold
                                text-slate-700
                              "
                            >
                              {actorName(
                                log.actor,
                                log.actor_type,
                              )}
                            </p>

                            <p
                              className="
                                mt-0.5
                                max-w-[170px]
                                truncate
                                text-[9px]
                                text-slate-400
                              "
                            >
                              {actorSubtitle(
                                log.actor,
                                log.user_id,
                              )}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Actor type */}
                      <td
                        className="
                          px-4
                          py-3.5
                        "
                      >
                        <span
                          className={`
                            inline-flex
                            border
                            px-2
                            py-1
                            text-[9px]
                            font-semibold
                            uppercase
                            tracking-[0.05em]
                            ${actorBadgeStyle(
                              log.actor_type,
                            )}
                          `}
                        >
                          {log.actor_type
                            ? formatLabel(
                                log.actor_type,
                              )
                            : "Unknown"}
                        </span>
                      </td>

                      {/* Action */}
                      <td
                        className="
                          px-4
                          py-3.5
                        "
                      >
                        <p
                          className="
                            max-w-[200px]
                            truncate
                            font-mono
                            text-[10px]
                            font-medium
                            text-slate-700
                          "
                        >
                          {
                            log.action_type
                          }
                        </p>
                      </td>

                      {/* Description */}
                      <td
                        className="
                          px-4
                          py-3.5
                        "
                      >
                        <p
                          className="
                            max-w-[300px]
                            truncate
                            text-[11px]
                            text-slate-600
                          "
                          title={
                            log.description
                          }
                        >
                          {
                            log.description
                          }
                        </p>
                      </td>

                      {/* Target */}
                      <td
                        className="
                          px-4
                          py-3.5
                        "
                      >
                        <p
                          className="
                            max-w-[145px]
                            truncate
                            text-[10px]
                            font-medium
                            text-slate-600
                          "
                        >
                          {targetLabel(
                            log,
                          )}
                        </p>

                        {log.target_id && (
                          <p
                            className="
                              mt-0.5
                              max-w-[145px]
                              truncate
                              font-mono
                              text-[9px]
                              text-slate-400
                            "
                            title={
                              log.target_id
                            }
                          >
                            {shortId(
                              log.target_id,
                            )}
                          </p>
                        )}
                      </td>

                      {/* IP */}
                      <td
                        className="
                          px-4
                          py-3.5
                        "
                      >
                        <span
                          className="
                            font-mono
                            text-[10px]
                            text-slate-500
                          "
                        >
                          {log.ip_address ||
                            "—"}
                        </span>
                      </td>

                      {/* View */}
                      <td
                        className="
                          px-5
                          py-3.5
                          text-right
                        "
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedLog(
                              log,
                            )
                          }
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

                          View
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
            <Activity
              size={25}
              className="
                text-slate-300
              "
            />

            <p
              className="
                mt-4
                text-sm
                font-semibold
                text-slate-700
              "
            >
              No activity logs found
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
            px-5
            py-3
          "
        >
          <p
            className="
              text-[11px]
              text-slate-400
            "
          >
            {showing}
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

      {/* ======================
          LOG DETAILS DRAWER
      ====================== */}
      {selectedLog && (
        <>
          <button
            type="button"
            aria-label="Close activity details"
            onClick={() =>
              setSelectedLog(
                null,
              )
            }
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
              max-w-[520px]
              flex-col
              border-l
              border-slate-200
              bg-white
              shadow-2xl
              shadow-slate-950/10
            "
          >
            {/* Header */}
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
              <div
                className="
                  min-w-0
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >
                  <Activity
                    size={15}
                    className="
                      text-[#A92F56]
                    "
                  />

                  <p
                    className="
                      text-sm
                      font-semibold
                      text-slate-950
                    "
                  >
                    Activity Log #
                    {
                      selectedLog.id
                    }
                  </p>
                </div>

                <p
                  className="
                    mt-1
                    text-[10px]
                    text-slate-400
                  "
                >
                  Audit event details
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedLog(
                    null,
                  )
                }
                className="
                  flex
                  h-8
                  w-8
                  shrink-0
                  items-center
                  justify-center
                  border
                  border-slate-200
                  text-slate-400
                  hover:bg-slate-50
                  hover:text-slate-700
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
              {/* Actor */}
              <div
                className="
                  border-b
                  border-slate-100
                  px-5
                  py-5
                "
              >
                <div
                  className="
                    mb-4
                    flex
                    items-center
                    justify-between
                    gap-3
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
                    Actor
                  </p>

                  <span
                    className={`
                      inline-flex
                      border
                      px-2
                      py-1
                      text-[9px]
                      font-semibold
                      uppercase
                      ${actorBadgeStyle(
                        selectedLog.actor_type,
                      )}
                    `}
                  >
                    {selectedLog.actor_type
                      ? formatLabel(
                          selectedLog.actor_type,
                        )
                      : "Unknown"}
                  </span>
                </div>

                <div
                  className="
                    flex
                    items-center
                    gap-3
                    border
                    border-slate-200
                    p-3
                  "
                >
                  <ActorVisual
                    log={
                      selectedLog
                    }
                    size="lg"
                  />

                  <div
                    className="
                      min-w-0
                      flex-1
                    "
                  >
                    <p
                      className="
                        truncate
                        text-xs
                        font-semibold
                        text-slate-800
                      "
                    >
                      {actorName(
                        selectedLog.actor,
                        selectedLog.actor_type,
                      )}
                    </p>

                    <p
                      className="
                        mt-0.5
                        truncate
                        text-[10px]
                        text-slate-400
                      "
                    >
                      {actorSubtitle(
                        selectedLog.actor,
                        selectedLog.user_id,
                      )}
                    </p>
                  </div>
                </div>

                {selectedLog.actor
                  ?.kind ===
                  "user" && (
                  <Link
                    href={`/admin/users?q=${encodeURIComponent(
                      selectedLog.actor.id,
                    )}`}
                    className="
                      mt-3
                      flex
                      h-9
                      items-center
                      justify-center
                      border
                      border-slate-200
                      text-[10px]
                      font-semibold
                      text-slate-600
                      hover:bg-slate-50
                    "
                  >
                    View User
                  </Link>
                )}

                {selectedLog.actor
                  ?.kind ===
                  "admin" && (
                  <div
                    className="
                      mt-3
                      grid
                      grid-cols-2
                      gap-3
                    "
                  >
                    <DetailCard
                      label="Role"
                      value={
                        selectedLog.actor.role
                      }
                    />

                    <DetailCard
                      label="Status"
                      value={
                        selectedLog.actor.status
                      }
                    />
                  </div>
                )}
              </div>

              {/* Event */}
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
                  Event
                </p>

                <div
                  className="
                    border
                    border-slate-200
                    bg-slate-50/50
                    p-4
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
                        bg-white
                        text-[#A92F56]
                      "
                    >
                      <FileText
                        size={15}
                      />
                    </div>

                    <div
                      className="
                        min-w-0
                        flex-1
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
                        Action Type
                      </p>

                      <p
                        className="
                          mt-1
                          break-all
                          font-mono
                          text-xs
                          font-semibold
                          text-slate-800
                        "
                      >
                        {
                          selectedLog.action_type
                        }
                      </p>
                    </div>
                  </div>

                  <div
                    className="
                      mt-4
                      border-t
                      border-slate-200
                      pt-4
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
                      Description
                    </p>

                    <p
                      className="
                        mt-2
                        whitespace-pre-wrap
                        break-words
                        text-xs
                        leading-6
                        text-slate-700
                      "
                    >
                      {
                        selectedLog.description
                      }
                    </p>
                  </div>
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
                  Target
                </p>

                {selectedLog.target_table ? (
                  <div
                    className="
                      border
                      border-slate-200
                      p-4
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
                          bg-slate-100
                          text-slate-500
                        "
                      >
                        <Table2
                          size={15}
                        />
                      </div>

                      <div
                        className="
                          min-w-0
                        "
                      >
                        <p
                          className="
                            text-xs
                            font-semibold
                            text-slate-800
                          "
                        >
                          {formatLabel(
                            selectedLog.target_table,
                          )}
                        </p>

                        <p
                          className="
                            mt-0.5
                            text-[9px]
                            text-slate-400
                          "
                        >
                          Database target
                        </p>
                      </div>
                    </div>

                    <div
                      className="
                        mt-4
                        border-t
                        border-slate-100
                        pt-4
                      "
                    >
                      <DetailRow
                        label="Table"
                        value={
                          selectedLog.target_table
                        }
                        mono
                      />

                      <div
                        className="
                          mt-3
                        "
                      >
                        <DetailRow
                          label="Target ID"
                          value={
                            selectedLog.target_id ||
                            "—"
                          }
                          mono
                        />
                      </div>
                    </div>

                    {targetHref(
                      selectedLog,
                    ) && (
                      <Link
                        href={
                          targetHref(
                            selectedLog,
                          ) as string
                        }
                        className="
                          mt-4
                          flex
                          h-9
                          items-center
                          justify-center
                          border
                          border-slate-200
                          text-[10px]
                          font-semibold
                          text-slate-600
                          hover:bg-slate-50
                        "
                      >
                        View Target
                      </Link>
                    )}
                  </div>
                ) : (
                  <div
                    className="
                      border
                      border-slate-200
                      bg-slate-50
                      px-4
                      py-4
                      text-xs
                      text-slate-500
                    "
                  >
                    No database target
                    was recorded for
                    this event.
                  </div>
                )}
              </div>

              {/* Request context */}
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
                  Request Context
                </p>

                <div
                  className="
                    space-y-3
                  "
                >
                  <div
                    className="
                      flex
                      gap-3
                      border
                      border-slate-200
                      p-3
                    "
                  >
                    <Globe2
                      size={15}
                      className="
                        mt-0.5
                        shrink-0
                        text-slate-400
                      "
                    />

                    <div
                      className="
                        min-w-0
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
                        IP Address
                      </p>

                      <p
                        className="
                          mt-1
                          break-all
                          font-mono
                          text-[11px]
                          text-slate-700
                        "
                      >
                        {selectedLog.ip_address ||
                          "Not recorded"}
                      </p>
                    </div>
                  </div>

                  <div
                    className="
                      flex
                      gap-3
                      border
                      border-slate-200
                      p-3
                    "
                  >
                    <Laptop
                      size={15}
                      className="
                        mt-0.5
                        shrink-0
                        text-slate-400
                      "
                    />

                    <div
                      className="
                        min-w-0
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
                        User Agent
                      </p>

                      <p
                        className="
                          mt-1
                          break-words
                          text-[10px]
                          leading-5
                          text-slate-600
                        "
                      >
                        {selectedLog.user_agent ||
                          "Not recorded"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div
                className="
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
                  Record Information
                </p>

                <div
                  className="
                    space-y-3
                  "
                >
                  <DetailRow
                    label="Log ID"
                    value={
                      String(
                        selectedLog.id,
                      )
                    }
                  />

                  <DetailRow
                    label="Actor Type"
                    value={
                      selectedLog.actor_type ||
                      "—"
                    }
                  />

                  <DetailRow
                    label="Actor ID"
                    value={
                      selectedLog.user_id ||
                      "—"
                    }
                    mono
                  />

                  <DetailRow
                    label="Created"
                    value={
                      formatDateTime(
                        selectedLog.created_at,
                      )
                    }
                  />
                </div>
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  );
}

function DetailCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className="
        border
        border-slate-200
        bg-slate-50/60
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
        {label}
      </p>

      <p
        className="
          mt-1
          truncate
          text-xs
          font-semibold
          text-slate-700
        "
      >
        {formatLabel(
          value,
        )}
      </p>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div
      className="
        flex
        items-start
        justify-between
        gap-5
      "
    >
      <span
        className="
          shrink-0
          text-xs
          text-slate-400
        "
      >
        {label}
      </span>

      <span
        className={`
          break-all
          text-right
          text-xs
          font-medium
          text-slate-700
          ${
            mono
              ? "font-mono text-[10px]"
              : ""
          }
        `}
      >
        {value}
      </span>
    </div>
  );
}