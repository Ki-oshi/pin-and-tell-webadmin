"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  Ban,
  Clock3,
  Eye,
  RefreshCw,
  Search,
  ShieldAlert,
  User,
  X,
} from "lucide-react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import ActionConfirmModal from "@/components/admin/action-confirm-modal";

import CreateBanModal from "./create-ban-modal";

import {
  revokeBanAction,
  syncExpiredBansAction,
} from "@/app/admin/(protected)/bans/actions";

import type {
  AdminBanRow,
  BanStatus,
} from "@/lib/admin/bans";

type Props = {
  bans: AdminBanRow[];

  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };

  initialQuery: string;
  initialStatus: string;
  initialType: string;
};

function label(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

function personName(
  ban: AdminBanRow,
) {
  return (
    ban.user?.full_name?.trim() ||
    ban.user?.username?.trim() ||
    ban.user_id
  );
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone:
        "Asia/Manila",
    },
  ).format(
    new Date(value),
  );
}

function durationLabel(
  ban: AdminBanRow,
) {
  if (
    ban.duration_type ===
    "permanent"
  ) {
    return "Permanent";
  }

  return `${ban.duration_value ?? "—"} ${label(
    ban.duration_type,
  )}`;
}

function StatusBadge({
  status,
}: {
  status: BanStatus;
}) {
  const styles = {
    active:
      "border-red-200 bg-red-50 text-red-700",

    expired:
      "border-slate-200 bg-slate-50 text-slate-600",

    revoked:
      "border-amber-200 bg-amber-50 text-amber-700",
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
        tracking-wide
        ${styles[status]}
      `}
    >
      {label(status)}
    </span>
  );
}

export default function BansTable({
  bans,
  pagination,
  initialQuery,
  initialStatus,
  initialType,
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
  ] = useState(
    initialQuery,
  );

  const [
    selectedBanId,
    setSelectedBanId,
  ] =
    useState<
      number | null
    >(null);

  const selectedBan =
    useMemo(
      () =>
        selectedBanId ===
        null
          ? null
          : bans.find(
              (ban) =>
                ban.id ===
                selectedBanId,
            ) ?? null,
      [
        bans,
        selectedBanId,
      ],
    );

  const [
    createOpen,
    setCreateOpen,
  ] = useState(false);

  const [
    revokeOpen,
    setRevokeOpen,
  ] = useState(false);

  const [
    syncOpen,
    setSyncOpen,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] =
    useState<{
      type:
        | "success"
        | "error";
      text: string;
    } | null>(null);

  const [
    pending,
    startTransition,
  ] = useTransition();

  useEffect(() => {
    const frame =
      window.requestAnimationFrame(
        () => {
          setQuery(
            initialQuery,
          );
        },
      );

    return () =>
      window.cancelAnimationFrame(
        frame,
      );
  }, [
    initialQuery,
  ]);

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          const params =
            new URLSearchParams(
              currentParams,
            );

          const value =
            query.trim();

          if (value) {
            params.set(
              "q",
              value,
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
                ? `/admin/bans?${next}`
                : "/admin/bans",
            );
          }
        },
        350,
      );

    return () =>
      window.clearTimeout(
        timer,
      );
  }, [
    query,
    currentParams,
    router,
  ]);

  const showing =
    useMemo(() => {
      if (
        pagination.total === 0
      ) {
        return "0 bans";
      }

      const start =
        (pagination.page - 1) *
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
    defaultValue: string,
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
        ? `/admin/bans?${next}`
        : "/admin/bans",
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

    return `/admin/bans?${params.toString()}`;
  }

  function confirmRevoke() {
    if (!selectedBan) {
      return;
    }

    startTransition(
      async () => {
        const result =
          await revokeBanAction(
            selectedBan.id,
          );

        setRevokeOpen(
          false,
        );

        setMessage({
          type:
            result.success
              ? "success"
              : "error",

          text:
            result.message,
        });

        if (
          result.success
        ) {
          router.refresh();
        }
      },
    );
  }

  function confirmSync() {
    startTransition(
      async () => {
        const result =
          await syncExpiredBansAction();

        setSyncOpen(
          false,
        );

        setMessage({
          type:
            result.success
              ? "success"
              : "error",

          text:
            result.message,
        });

        if (
          result.success
        ) {
          router.refresh();
        }
      },
    );
  }

  return (
    <>
      {message && (
        <div
          className={`
            mb-4
            border
            px-4
            py-3
            text-xs
            ${
              message.type ===
              "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }
          `}
        >
          {message.text}
        </div>
      )}

      <section
        className="
          border
          border-slate-200
          bg-white
        "
      >
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
                absolute
                left-3
                top-1/2
                -translate-y-1/2
                text-slate-400
              "
            />

            <input
              value={query}
              onChange={(
                event,
              ) =>
                setQuery(
                  event.target
                    .value,
                )
              }
              placeholder="Search ban ID, user, user ID or reason..."
              className="
                h-10
                w-full
                border
                border-slate-200
                pl-9
                pr-9
                text-xs
                outline-none
                focus:border-[#CC3A67]
              "
            />

            {query && (
              <button
                type="button"
                onClick={() =>
                  setQuery("")
                }
                className="
                  absolute
                  right-2
                  top-1/2
                  -translate-y-1/2
                  text-slate-400
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
                  event.target
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
                text-slate-600
              "
            >
              <option value="all">
                All statuses
              </option>
              <option value="active">
                Active
              </option>
              <option value="expired">
                Expired
              </option>
              <option value="revoked">
                Revoked
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
                  event.target
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
                text-slate-600
              "
            >
              <option value="all">
                All types
              </option>
              <option value="temporary_ban">
                Temporary
              </option>
              <option value="permanent_ban">
                Permanent
              </option>
              <option value="temporary_ip_ban">
                IP Ban
              </option>
            </select>

            <button
              type="button"
              onClick={() =>
                setSyncOpen(
                  true,
                )
              }
              className="
                inline-flex
                h-10
                items-center
                gap-2
                border
                border-slate-200
                px-3
                text-xs
                font-medium
                text-slate-600
                hover:bg-slate-50
              "
            >
              <RefreshCw
                size={14}
              />

              Sync Expired
            </button>

            <button
              type="button"
              onClick={() =>
                setCreateOpen(
                  true,
                )
              }
              className="
                inline-flex
                h-10
                items-center
                gap-2
                bg-[#72213A]
                px-4
                text-xs
                font-semibold
                text-white
                hover:bg-[#5f1930]
              "
            >
              <Ban
                size={14}
              />

              Create Ban
            </button>
          </div>
        </div>

        {bans.length > 0 ? (
          <div
            className="
              overflow-x-auto
            "
          >
            <table
              className="
                w-full
                min-w-[1100px]
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
                    "User",
                    "Ban Type",
                    "Duration",
                    "Reason",
                    "Administrator",
                    "Status",
                    "Started",
                    "Expires",
                    "",
                  ].map(
                    (heading) => (
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
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>

              <tbody>
                {bans.map(
                  (ban) => (
                    <tr
                      key={ban.id}
                      className="
                        border-b
                        border-slate-100
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
                              items-center
                              justify-center
                              bg-[#72213A]/10
                              text-[#72213A]
                            "
                          >
                            <User
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
                                max-w-[170px]
                                truncate
                                text-xs
                                font-semibold
                                text-slate-800
                              "
                            >
                              {personName(
                                ban,
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
                              {ban.user
                                ?.username
                                ? `@${ban.user.username}`
                                : ban.user_id}
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
                        {label(
                          ban.ban_type,
                        )}
                      </td>

                      <td
                        className="
                          px-4
                          py-3.5
                          text-xs
                          text-slate-600
                        "
                      >
                        {durationLabel(
                          ban,
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
                            max-w-[220px]
                            truncate
                            text-xs
                            text-slate-600
                          "
                        >
                          {ban.reason}
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
                        {ban.admin
                          ?.full_name ||
                          ban.admin
                            ?.email ||
                          "Unknown"}
                      </td>

                      <td
                        className="
                          px-4
                          py-3.5
                        "
                      >
                        <StatusBadge
                          status={
                            ban.effective_status
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
                          ban.starts_at,
                        )}
                      </td>

                      <td
                        className="
                          px-4
                          py-3.5
                          text-[11px]
                          text-slate-500
                        "
                      >
                        {ban.expires_at
                          ? formatDate(
                              ban.expires_at,
                            )
                          : "Never"}
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
                            setSelectedBanId(
                              ban.id,
                            );
                            setMessage(
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
                            hover:bg-slate-50
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
            "
          >
            <Ban
              size={24}
              className="
                text-slate-300
              "
            />

            <p
              className="
                mt-3
                text-sm
                font-semibold
                text-slate-700
              "
            >
              No bans found
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
          <span
            className="
              text-[11px]
              text-slate-400
            "
          >
            {showing}
          </span>

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
                text-[11px]
                text-slate-500
              "
            >
              {pagination.page}
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

      {selectedBan && (
        <>
          <button
            type="button"
            onClick={() =>
              setSelectedBanId(
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
              max-w-[460px]
              flex-col
              border-l
              border-slate-200
              bg-white
              shadow-2xl
            "
          >
            <div
              className="
                flex
                h-[68px]
                items-center
                justify-between
                border-b
                border-slate-200
                px-5
              "
            >
              <div>
                <p
                  className="
                    text-sm
                    font-semibold
                    text-slate-950
                  "
                >
                  Ban #
                  {
                    selectedBan.id
                  }
                </p>

                <p
                  className="
                    mt-1
                    text-[10px]
                    text-slate-400
                  "
                >
                  Enforcement record
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedBanId(
                    null,
                  )
                }
              >
                <X
                  size={16}
                />
              </button>
            </div>

            <div
              className="
                flex-1
                overflow-y-auto
                px-5
                py-5
              "
            >
              <div
                className="
                  flex
                  items-center
                  justify-between
                "
              >
                <div>
                  <p
                    className="
                      text-base
                      font-semibold
                      text-slate-950
                    "
                  >
                    {personName(
                      selectedBan,
                    )}
                  </p>

                  <p
                    className="
                      mt-1
                      text-[10px]
                      text-slate-400
                    "
                  >
                    {
                      selectedBan.user_id
                    }
                  </p>
                </div>

                <StatusBadge
                  status={
                    selectedBan.effective_status
                  }
                />
              </div>

              <div
                className="
                  mt-6
                  space-y-4
                  border-t
                  border-slate-100
                  pt-5
                "
              >
                {[
                  [
                    "Ban Type",
                    label(
                      selectedBan.ban_type,
                    ),
                  ],
                  [
                    "Duration",
                    durationLabel(
                      selectedBan,
                    ),
                  ],
                  [
                    "Started",
                    formatDate(
                      selectedBan.starts_at,
                    ),
                  ],
                  [
                    "Expires",
                    selectedBan.expires_at
                      ? formatDate(
                          selectedBan.expires_at,
                        )
                      : "Never",
                  ],
                  [
                    "Revoked",
                    selectedBan.revoked_at
                      ? formatDate(
                          selectedBan.revoked_at,
                        )
                      : "—",
                  ],
                  [
                    "Administrator",
                    selectedBan.admin
                      ?.full_name ||
                      selectedBan.admin
                        ?.email ||
                      "Unknown",
                  ],
                ].map(
                  ([
                    title,
                    value,
                  ]) => (
                    <div
                      key={
                        title
                      }
                      className="
                        flex
                        justify-between
                        gap-4
                      "
                    >
                      <span
                        className="
                          text-xs
                          text-slate-400
                        "
                      >
                        {title}
                      </span>

                      <span
                        className="
                          text-right
                          text-xs
                          font-medium
                          text-slate-700
                        "
                      >
                        {value}
                      </span>
                    </div>
                  ),
                )}
              </div>

              {selectedBan.ip_address && (
                <div
                  className="
                    mt-5
                    border-t
                    border-slate-100
                    pt-5
                  "
                >
                  <p
                    className="
                      text-[10px]
                      font-bold
                      uppercase
                      tracking-wide
                      text-slate-400
                    "
                  >
                    IP Address
                  </p>

                  <p
                    className="
                      mt-2
                      font-mono
                      text-xs
                      text-slate-700
                    "
                  >
                    {
                      selectedBan.ip_address
                    }
                  </p>
                </div>
              )}

              <div
                className="
                  mt-5
                  border-t
                  border-slate-100
                  pt-5
                "
              >
                <p
                  className="
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-wide
                    text-slate-400
                  "
                >
                  Reason
                </p>

                <p
                  className="
                    mt-2
                    whitespace-pre-wrap
                    text-xs
                    leading-6
                    text-slate-600
                  "
                >
                  {
                    selectedBan.reason
                  }
                </p>
              </div>

              {selectedBan.report && (
                <div
                  className="
                    mt-5
                    border-t
                    border-slate-100
                    pt-5
                  "
                >
                  <p
                    className="
                      text-[10px]
                      font-bold
                      uppercase
                      tracking-wide
                      text-slate-400
                    "
                  >
                    Related Report
                  </p>

                  <Link
                    href={`/admin/reports?q=${selectedBan.report.id}`}
                    className="
                      mt-2
                      block
                      border
                      border-slate-200
                      p-3
                      hover:bg-slate-50
                    "
                  >
                    <p
                      className="
                        text-xs
                        font-semibold
                        text-slate-800
                      "
                    >
                      Report #
                      {
                        selectedBan.report.id
                      }
                    </p>

                    <p
                      className="
                        mt-1
                        text-[10px]
                        text-slate-400
                      "
                    >
                      {
                        selectedBan.report.reason
                      }
                    </p>
                  </Link>
                </div>
              )}

              <Link
                href={`/admin/users?q=${encodeURIComponent(
                  selectedBan.user_id,
                )}`}
                className="
                  mt-5
                  flex
                  h-10
                  items-center
                  justify-center
                  border
                  border-slate-200
                  text-xs
                  font-semibold
                  text-slate-600
                  hover:bg-slate-50
                "
              >
                View User
              </Link>

              {selectedBan.effective_status ===
                "active" && (
                <button
                  type="button"
                  onClick={() =>
                    setRevokeOpen(
                      true,
                    )
                  }
                  className="
                    mt-2
                    flex
                    h-10
                    w-full
                    items-center
                    justify-center
                    gap-2
                    border
                    border-red-200
                    bg-red-50
                    text-xs
                    font-semibold
                    text-red-700
                    hover:bg-red-100
                  "
                >
                  <ShieldAlert
                    size={14}
                  />

                  Revoke Ban
                </button>
              )}

              {selectedBan.effective_status ===
                "expired" && (
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
                  <Clock3
                    size={15}
                    className="
                      text-slate-400
                    "
                  />

                  <p
                    className="
                      text-[10px]
                      leading-5
                      text-slate-500
                    "
                  >
                    This temporary
                    restriction has
                    elapsed. Use Sync
                    Expired if the
                    database record has
                    not yet been marked
                    expired.
                  </p>
                </div>
              )}
            </div>
          </aside>
        </>
      )}

      <CreateBanModal
        open={
          createOpen
        }
        onClose={() =>
          setCreateOpen(
            false,
          )
        }
        onSuccess={() => {
          setMessage({
            type:
              "success",
            text:
              "Ban created successfully.",
          });

          router.refresh();
        }}
      />

      <ActionConfirmModal
        open={revokeOpen}
        title="Revoke this ban?"
        description={
          selectedBan
            ? `Ban #${selectedBan.id} will be revoked. The user's account status will be recalculated based on any other active restrictions.`
            : ""
        }
        confirmLabel="Revoke Ban"
        variant="danger"
        loading={pending}
        onClose={() => {
          if (!pending) {
            setRevokeOpen(
              false,
            );
          }
        }}
        onConfirm={
          confirmRevoke
        }
      />

      <ActionConfirmModal
        open={syncOpen}
        title="Synchronize expired bans?"
        description="Temporary bans whose expiration time has passed will be marked expired, and affected user account statuses will be recalculated."
        confirmLabel="Sync Expired"
        variant="warning"
        loading={pending}
        onClose={() => {
          if (!pending) {
            setSyncOpen(
              false,
            );
          }
        }}
        onConfirm={
          confirmSync
        }
      />
    </>
  );
}