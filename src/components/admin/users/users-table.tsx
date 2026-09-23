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
  Calendar,
  Check,
  Copy,
  Eye,
  MapPin,
  Phone,
  Search,
  Star,
  User,
  X,
} from "lucide-react";

import {
  useSearchParams,
} from "next/navigation";

import {
  useRouter,
} from "nextjs-toploader/app";

import {
  updateUserStatusAction,
} from "@/app/admin/(protected)/users/actions";

import type {
  AdminUserRow,
} from "@/lib/admin/users";

type UsersTableProps = {
  users:
    AdminUserRow[];

  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };

  initialQuery: string;
  initialStatus: string;
};

function displayName(
  user: AdminUserRow,
) {
  return (
    user.full_name
      ?.trim() ||
    user.username
      ?.trim() ||
    "Unnamed User"
  );
}

function initials(
  user: AdminUserRow,
) {
  return displayName(
    user,
  )
    .split(/\s+/)
    .map(
      (value) =>
        value[0],
    )
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(
  value: string | null,
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
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone:
        "Asia/Manila",
    },
  ).format(date);
}

function formatDateTime(
  value: string | null,
) {
  if (!value) {
    return "Never";
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
    return "Unknown";
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
  ).format(date);
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const styles =
    status === "active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status ===
          "suspended"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-red-200 bg-red-50 text-red-700";

  return (
    <span
      className={`
        inline-flex
        items-center
        border
        px-2
        py-1
        text-[10px]
        font-semibold
        uppercase
        tracking-[0.06em]
        ${styles}
      `}
    >
      {status}
    </span>
  );
}

export default function UsersTable({
  users,
  pagination,
  initialQuery,
  initialStatus,
}: UsersTableProps) {
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
    selectedUserId,
    setSelectedUserId,
  ] =
    useState<
      string | null
    >(null);

  const selectedUser =
    useMemo(
      () =>
        selectedUserId ===
        null
          ? null
          : users.find(
              (user) =>
                user.id ===
                selectedUserId,
            ) ?? null,
      [
        users,
        selectedUserId,
      ],
    );

  const [
    copied,
    setCopied,
  ] =
    useState(false);

  const [
    actionMessage,
    setActionMessage,
  ] =
    useState<{
      type:
        | "success"
        | "error";

      text: string;
    } | null>(
      null,
    );

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

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
                ? `/admin/users?${next}`
                : "/admin/users",
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
    router,
    currentParams,
  ]);

  useEffect(() => {
    if (
      !selectedUser
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

    function closeOnEscape(
      event: KeyboardEvent,
    ) {
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
      closeOnEscape,
    );

    return () => {
      document.body.style
        .overflow =
        previous;

      document.removeEventListener(
        "keydown",
        closeOnEscape,
      );
    };
  }, [
    selectedUser,
  ]);

  const showingText =
    useMemo(() => {
      if (
        pagination.total ===
        0
      ) {
        return "0 users";
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

  function updateStatusFilter(
    status: string,
  ) {
    const params =
      new URLSearchParams(
        currentParams,
      );

    if (
      status === "all"
    ) {
      params.delete(
        "status",
      );
    } else {
      params.set(
        "status",
        status,
      );
    }

    params.delete(
      "page",
    );

    router.replace(
      `/admin/users${
        params.toString()
          ? `?${params.toString()}`
          : ""
      }`,
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

    return `/admin/users?${params.toString()}`;
  }

  async function copyId() {
    if (
      !selectedUser
    ) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        selectedUser.id,
      );

      setCopied(
        true,
      );

      window.setTimeout(
        () =>
          setCopied(
            false,
          ),
        1500,
      );
    } catch {
      setCopied(
        false,
      );
    }
  }

  function changeUserStatus(
    status:
      | "active"
      | "suspended",
  ) {
    if (
      !selectedUser
    ) {
      return;
    }

    if (
      status ===
      "suspended"
    ) {
      const confirmed =
        window.confirm(
          `Suspend ${displayName(
            selectedUser,
          )}? They will remain suspended until an administrator reactivates the account.`,
        );

      if (
        !confirmed
      ) {
        return;
      }
    }

    setActionMessage(
      null,
    );

    startTransition(
      async () => {
        const result =
          await updateUserStatusAction(
            selectedUser.id,
            status,
          );

        if (
          !result.success
        ) {
          setActionMessage(
            {
              type:
                "error",

              text:
                result.message,
            },
          );

          return;
        }

        setActionMessage(
          {
            type:
              "success",

            text:
              result.message,
          },
        );

        router.refresh();
      },
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
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div
            className="
              relative
              w-full
              sm:max-w-[360px]
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
              placeholder="Search name, username, phone or user ID..."
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
              items-center
              gap-3
            "
          >
            <select
              value={
                initialStatus
              }
              onChange={(
                event,
              ) =>
                updateStatusFilter(
                  event
                    .target
                    .value,
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
                focus:ring-2
                focus:ring-[#FDC1C9]/30
              "
            >
              <option value="all">
                All statuses
              </option>

              <option value="active">
                Active
              </option>

              <option value="suspended">
                Suspended
              </option>

              <option value="banned">
                Banned
              </option>
            </select>

            <span
              className="
                hidden
                text-[11px]
                text-slate-400
                sm:block
              "
            >
              {showingText}
            </span>
          </div>
        </div>

        {/* Table */}
        {users.length >
        0 ? (
          <div
            className="
              overflow-x-auto
            "
          >
            <table
              className="
                w-full
                min-w-[950px]
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
                    "Status",
                    "Reputation",
                    "Rating",
                    "Pins",
                    "Last Seen",
                    "Joined",
                    "",
                  ].map(
                    (
                      heading,
                    ) => (
                      <th
                        key={
                          heading ||
                          "actions"
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
                {users.map(
                  (user) => (
                    <tr
                      key={
                        user.id
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
                              bg-[#72213A]/10
                              text-[10px]
                              font-bold
                              text-[#72213A]
                            "
                          >
                            {initials(
                              user,
                            )}
                          </div>

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
                              <p
                                className="
                                  max-w-[210px]
                                  truncate
                                  text-xs
                                  font-semibold
                                  text-slate-900
                                "
                              >
                                {displayName(
                                  user,
                                )}
                              </p>

                              {user.is_online && (
                                <span
                                  className="
                                    h-1.5
                                    w-1.5
                                    shrink-0
                                    rounded-full
                                    bg-emerald-500
                                  "
                                  title="Online"
                                />
                              )}
                            </div>

                            <p
                              className="
                                mt-0.5
                                max-w-[220px]
                                truncate
                                text-[10px]
                                text-slate-400
                              "
                            >
                              {user.username
                                ? `@${user.username}`
                                : user.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td
                        className="
                          px-4
                          py-3.5
                        "
                      >
                        <StatusBadge
                          status={
                            user.status
                          }
                        />
                      </td>

                      <td
                        className="
                          px-4
                          py-3.5
                          text-xs
                          font-medium
                          text-slate-700
                        "
                      >
                        {user.reputation_score ??
                          user.reputation ??
                          0}
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
                            items-center
                            gap-1
                            text-xs
                            text-slate-700
                          "
                        >
                          <Star
                            size={12}
                            className="
                              text-amber-500
                            "
                          />

                          {Number(
                            user.avg_rating ??
                              0,
                          ).toFixed(
                            1,
                          )}
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
                        {
                          user.pin_count
                        }
                      </td>

                      <td
                        className="
                          px-4
                          py-3.5
                          text-[11px]
                          text-slate-500
                        "
                      >
                        {user.is_online
                          ? "Online now"
                          : formatDateTime(
                              user.last_seen,
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
                        {formatDate(
                          user.created_at,
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
                            setSelectedUserId(
                              user.id,
                            );

                            setActionMessage(
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
              <User
                size={19}
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
              No users found
            </p>

            <p
              className="
                mt-1
                max-w-sm
                text-xs
                leading-5
                text-slate-400
              "
            >
              Try changing the
              search query or
              status filter.
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
                  cursor-not-allowed
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
                  cursor-not-allowed
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

      {/* USER DRAWER */}
      {selectedUser && (
        <>
          <button
            type="button"
            aria-label="Close user details"
            onClick={() =>
              setSelectedUserId(
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
              max-w-[430px]
              flex-col
              border-l
              border-slate-200
              bg-white
              shadow-2xl
              shadow-slate-950/10
            "
          >
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
                <p
                  className="
                    text-sm
                    font-semibold
                    text-slate-950
                  "
                >
                  User details
                </p>

                <p
                  className="
                    mt-0.5
                    text-[10px]
                    text-slate-400
                  "
                >
                  Account overview
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedUserId(
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
              {/* Identity */}
              <div
                className="
                  border-b
                  border-slate-100
                  px-5
                  py-6
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-4
                  "
                >
                  <div
                    className="
                      flex
                      h-14
                      w-14
                      shrink-0
                      items-center
                      justify-center
                      bg-[#72213A]
                      text-sm
                      font-semibold
                      text-white
                    "
                  >
                    {initials(
                      selectedUser,
                    )}
                  </div>

                  <div
                    className="
                      min-w-0
                      flex-1
                    "
                  >
                    <div
                      className="
                        flex
                        flex-wrap
                        items-center
                        gap-2
                      "
                    >
                      <p
                        className="
                          truncate
                          text-base
                          font-semibold
                          text-slate-950
                        "
                      >
                        {displayName(
                          selectedUser,
                        )}
                      </p>

                      <StatusBadge
                        status={
                          selectedUser.status
                        }
                      />
                    </div>

                    <p
                      className="
                        mt-1
                        truncate
                        text-xs
                        text-slate-400
                      "
                    >
                      {selectedUser.username
                        ? `@${selectedUser.username}`
                        : "No username"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Account */}
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
                  Account
                </p>

                <div
                  className="
                    space-y-4
                  "
                >
                  <div
                    className="
                      flex
                      items-start
                      gap-3
                    "
                  >
                    <User
                      size={15}
                      className="
                        mt-0.5
                        text-slate-400
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
                          text-[10px]
                          text-slate-400
                        "
                      >
                        User ID
                      </p>

                      <div
                        className="
                          mt-1
                          flex
                          items-center
                          gap-2
                        "
                      >
                        <p
                          className="
                            min-w-0
                            flex-1
                            truncate
                            font-mono
                            text-[10px]
                            text-slate-600
                          "
                        >
                          {
                            selectedUser.id
                          }
                        </p>

                        <button
                          type="button"
                          onClick={
                            copyId
                          }
                          className="
                            text-slate-400
                            hover:text-[#A92F56]
                          "
                        >
                          {copied ? (
                            <Check
                              size={13}
                            />
                          ) : (
                            <Copy
                              size={13}
                            />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div
                    className="
                      flex
                      items-start
                      gap-3
                    "
                  >
                    <Phone
                      size={15}
                      className="
                        mt-0.5
                        text-slate-400
                      "
                    />

                    <div>
                      <p
                        className="
                          text-[10px]
                          text-slate-400
                        "
                      >
                        Phone
                      </p>

                      <p
                        className="
                          mt-1
                          text-xs
                          text-slate-700
                        "
                      >
                        {selectedUser.phone_number ||
                          "Not provided"}
                      </p>
                    </div>
                  </div>

                  <div
                    className="
                      flex
                      items-start
                      gap-3
                    "
                  >
                    <MapPin
                      size={15}
                      className="
                        mt-0.5
                        text-slate-400
                      "
                    />

                    <div>
                      <p
                        className="
                          text-[10px]
                          text-slate-400
                        "
                      >
                        Specialization
                      </p>

                      <p
                        className="
                          mt-1
                          text-xs
                          text-slate-700
                        "
                      >
                        {selectedUser.specialization ||
                          "Community member"}
                      </p>
                    </div>
                  </div>

                  <div
                    className="
                      flex
                      items-start
                      gap-3
                    "
                  >
                    <Calendar
                      size={15}
                      className="
                        mt-0.5
                        text-slate-400
                      "
                    />

                    <div>
                      <p
                        className="
                          text-[10px]
                          text-slate-400
                        "
                      >
                        Joined
                      </p>

                      <p
                        className="
                          mt-1
                          text-xs
                          text-slate-700
                        "
                      >
                        {formatDateTime(
                          selectedUser.created_at,
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metrics */}
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
                  Activity
                </p>

                <div
                  className="
                    grid
                    grid-cols-3
                    border
                    border-slate-200
                  "
                >
                  <div
                    className="
                      border-r
                      border-slate-200
                      p-3
                    "
                  >
                    <p
                      className="
                        text-lg
                        font-semibold
                        text-slate-950
                      "
                    >
                      {
                        selectedUser.pin_count
                      }
                    </p>

                    <p
                      className="
                        mt-1
                        text-[10px]
                        text-slate-400
                      "
                    >
                      Pins
                    </p>
                  </div>

                  <div
                    className="
                      border-r
                      border-slate-200
                      p-3
                    "
                  >
                    <p
                      className="
                        text-lg
                        font-semibold
                        text-slate-950
                      "
                    >
                      {selectedUser.reputation_score ??
                        selectedUser.reputation ??
                        0}
                    </p>

                    <p
                      className="
                        mt-1
                        text-[10px]
                        text-slate-400
                      "
                    >
                      Reputation
                    </p>
                  </div>

                  <div
                    className="
                      p-3
                    "
                  >
                    <div
                      className="
                        flex
                        items-center
                        gap-1
                      "
                    >
                      <Star
                        size={12}
                        className="
                          text-amber-500
                        "
                      />

                      <p
                        className="
                          text-lg
                          font-semibold
                          text-slate-950
                        "
                      >
                        {Number(
                          selectedUser.avg_rating ??
                            0,
                        ).toFixed(
                          1,
                        )}
                      </p>
                    </div>

                    <p
                      className="
                        mt-1
                        text-[10px]
                        text-slate-400
                      "
                    >
                      Rating
                    </p>
                  </div>
                </div>

                <div
                  className="
                    mt-4
                    flex
                    items-center
                    justify-between
                  "
                >
                  <span
                    className="
                      text-xs
                      text-slate-500
                    "
                  >
                    Last seen
                  </span>

                  <span
                    className="
                      text-xs
                      font-medium
                      text-slate-700
                    "
                  >
                    {selectedUser.is_online
                      ? "Online now"
                      : formatDateTime(
                          selectedUser.last_seen,
                        )}
                  </span>
                </div>
              </div>

              {/* Status management */}
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
                  Account control
                </p>

                <p
                  className="
                    mt-2
                    text-xs
                    leading-5
                    text-slate-500
                  "
                >
                  Suspend access
                  without deleting
                  the user&apos;s
                  account or data.
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
                  "
                >
                  {selectedUser.status ===
                    "active" && (
                    <button
                      type="button"
                      disabled={
                        isPending
                      }
                      onClick={() =>
                        changeUserStatus(
                          "suspended",
                        )
                      }
                      className="
                        flex
                        h-10
                        w-full
                        items-center
                        justify-center
                        gap-2
                        border
                        border-amber-200
                        bg-amber-50
                        text-xs
                        font-semibold
                        text-amber-700
                        transition
                        hover:bg-amber-100
                        disabled:cursor-not-allowed
                        disabled:opacity-60
                      "
                    >
                      {isPending
                        ? "Updating..."
                        : "Suspend user"}
                    </button>
                  )}

                  {selectedUser.status ===
                    "suspended" && (
                    <button
                      type="button"
                      disabled={
                        isPending
                      }
                      onClick={() =>
                        changeUserStatus(
                          "active",
                        )
                      }
                      className="
                        flex
                        h-10
                        w-full
                        items-center
                        justify-center
                        gap-2
                        bg-[#72213A]
                        text-xs
                        font-semibold
                        text-white
                        transition
                        hover:bg-[#5f1930]
                        disabled:cursor-not-allowed
                        disabled:opacity-60
                      "
                    >
                      {isPending
                        ? "Updating..."
                        : "Reactivate user"}
                    </button>
                  )}

                  {selectedUser.status ===
                    "banned" && (
                    <div
                      className="
                        flex
                        gap-3
                        border
                        border-red-200
                        bg-red-50
                        p-3
                      "
                    >
                      <Ban
                        size={16}
                        className="
                          mt-0.5
                          shrink-0
                          text-red-600
                        "
                      />

                      <div>
                        <p
                          className="
                            text-xs
                            font-semibold
                            text-red-700
                          "
                        >
                          Banned account
                        </p>

                        <p
                          className="
                            mt-1
                            text-[11px]
                            leading-5
                            text-red-600
                          "
                        >
                          Ban state
                          should be
                          managed through
                          Ban Management
                          so its reason,
                          duration and
                          history remain
                          consistent.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  );
}