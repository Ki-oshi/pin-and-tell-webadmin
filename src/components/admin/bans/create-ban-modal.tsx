"use client";

import {
  useEffect,
  useState,
  useTransition,
} from "react";

import {
  Ban,
  Check,
  FileWarning,
  Loader2,
  Search,
  ShieldAlert,
  User,
  X,
} from "lucide-react";

import ActionConfirmModal from "@/components/admin/action-confirm-modal";

import {
  createBanAction,
  searchBanUsersAction,
  type BanUserSearchResult,
} from "@/app/admin/(protected)/bans/actions";

/*
 * Reports currently supplies the
 * reported user's core profile fields
 * without avatar_url.
 *
 * Manual search results use the full
 * BanUserSearchResult type.
 *
 * Keeping avatar_url optional at this
 * boundary allows both sources to use
 * the same modal safely.
 */
type BanInitialUser = {
  id: string;
  username: string | null;
  full_name: string | null;
  status: string | null;
  avatar_url?: string | null;
};

type CreateBanModalProps = {
  open: boolean;

  onClose: () => void;

  onSuccess: (
    message?: string,
  ) => void;

  initialUser?:
    BanInitialUser | null;

  sourceReportId?:
    number | null;
};

type CreateBanModalContentProps = {
  onClose: () => void;

  onSuccess: (
    message?: string,
  ) => void;

  initialUser:
    BanInitialUser | null;

  sourceReportId:
    number | null;
};

type BanType =
  | "temporary_ban"
  | "permanent_ban"
  | "temporary_ip_ban";

type DurationType =
  | "hours"
  | "days"
  | "weeks"
  | "months"
  | "permanent";

function userDisplayName(
  user:
    BanUserSearchResult | null,
) {
  if (!user) {
    return "";
  }

  return (
    user.full_name?.trim() ||
    user.username?.trim() ||
    "Unnamed User"
  );
}

function userSubtitle(
  user:
    BanUserSearchResult,
) {
  if (
    user.username
  ) {
    return `@${user.username}`;
  }

  return user.id;
}

function formatStatus(
  status:
    string | null,
) {
  if (!status) {
    return "Active";
  }

  return status
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

export default function CreateBanModal({
  open,
  onClose,
  onSuccess,
  initialUser = null,
  sourceReportId = null,
}: CreateBanModalProps) {
  if (!open) {
    return null;
  }

  return (
    <CreateBanModalContent
      key={`${sourceReportId ?? "manual"}:${initialUser?.id ?? "none"}`}
      onClose={
        onClose
      }
      onSuccess={
        onSuccess
      }
      initialUser={
        initialUser
      }
      sourceReportId={
        sourceReportId
      }
    />
  );
}

function CreateBanModalContent({
  onClose,
  onSuccess,
  initialUser,
  sourceReportId,
}: CreateBanModalContentProps) {
  /*
   * Normalize the looser initial-user
   * shape into the complete search
   * result shape used internally.
   */
  const normalizedInitialUser:
    BanUserSearchResult | null =
    initialUser
      ? {
          id:
            initialUser.id,

          username:
            initialUser.username,

          full_name:
            initialUser.full_name,

          status:
            initialUser.status,

          avatar_url:
            initialUser.avatar_url ??
            null,
        }
      : null;

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    users,
    setUsers,
  ] =
    useState<
      BanUserSearchResult[]
    >([]);

  const [
    selectedUser,
    setSelectedUser,
  ] =
    useState<
      BanUserSearchResult | null
    >(
      normalizedInitialUser,
    );

  const originalReportedUserId =
    normalizedInitialUser?.id ??
    null;

  const [
    banType,
    setBanType,
  ] =
    useState<BanType>(
      "temporary_ban",
    );

  const [
    durationType,
    setDurationType,
  ] =
    useState<DurationType>(
      "days",
    );

  const [
    durationValue,
    setDurationValue,
  ] =
    useState(
      "7",
    );

  const [
    ipAddress,
    setIpAddress,
  ] =
    useState("");

  const [
    reason,
    setReason,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    confirmOpen,
    setConfirmOpen,
  ] =
    useState(false);

  const [
    searching,
    startSearchTransition,
  ] =
    useTransition();

  const [
    submitting,
    startSubmitTransition,
  ] =
    useTransition();

  /*
   * Manual user search.
   *
   * No synchronous setState calls are
   * performed directly in this effect.
   */
  useEffect(() => {
    const normalized =
      search.trim();

    if (
      selectedUser ||
      normalized.length <
        2
    ) {
      return;
    }

    let cancelled =
      false;

    const timeout =
      window.setTimeout(
        () => {
          startSearchTransition(
            async () => {
              const result =
                await searchBanUsersAction(
                  normalized,
                );

              if (
                cancelled
              ) {
                return;
              }

              setUsers(
                result,
              );
            },
          );
        },
        300,
      );

    return () => {
      cancelled =
        true;

      window.clearTimeout(
        timeout,
      );
    };
  }, [
    search,
    selectedUser,
  ]);

  /*
   * Link the Report ID only while
   * the selected user is still the
   * person originally reported.
   */
  const linkedReportId =
    sourceReportId &&
    originalReportedUserId &&
    selectedUser?.id ===
      originalReportedUserId
      ? sourceReportId
      : null;

  const reportWasDetached =
    Boolean(
      sourceReportId &&
        originalReportedUserId &&
        selectedUser &&
        selectedUser.id !==
          originalReportedUserId,
    );

  const displayName =
    userDisplayName(
      selectedUser,
    );

  function handleSearchChange(
    value: string,
  ) {
    setSearch(
      value,
    );

    setError(
      null,
    );

    if (
      value.trim().length <
      2
    ) {
      setUsers(
        [],
      );
    }
  }

  function selectUser(
    user:
      BanUserSearchResult,
  ) {
    setSelectedUser(
      user,
    );

    setSearch(
      "",
    );

    setUsers(
      [],
    );

    setError(
      null,
    );
  }

  function changeUser() {
    setSelectedUser(
      null,
    );

    setSearch(
      "",
    );

    setUsers(
      [],
    );

    setError(
      null,
    );
  }

  function changeBanType(
    value:
      BanType,
  ) {
    setBanType(
      value,
    );

    setError(
      null,
    );

    if (
      value ===
      "permanent_ban"
    ) {
      setDurationType(
        "permanent",
      );

      setDurationValue(
        "",
      );

      setIpAddress(
        "",
      );

      return;
    }

    if (
      durationType ===
      "permanent"
    ) {
      setDurationType(
        "days",
      );

      setDurationValue(
        "7",
      );
    }

    if (
      value !==
      "temporary_ip_ban"
    ) {
      setIpAddress(
        "",
      );
    }
  }

  function closeModal() {
    if (
      submitting
    ) {
      return;
    }

    setConfirmOpen(
      false,
    );

    onClose();
  }

  function requestCreateBan() {
    setError(
      null,
    );

    if (
      !selectedUser
    ) {
      setError(
        "Select a user before creating a ban.",
      );

      return;
    }

    if (
      reason.trim().length <
      4
    ) {
      setError(
        "Enter a clear reason for this restriction.",
      );

      return;
    }

    if (
      banType !==
        "permanent_ban" &&
      (
        !durationValue ||
        !Number.isFinite(
          Number(
            durationValue,
          ),
        ) ||
        Number(
          durationValue,
        ) < 1
      )
    ) {
      setError(
        "Enter a valid ban duration.",
      );

      return;
    }

    if (
      banType ===
        "temporary_ip_ban" &&
      !ipAddress.trim()
    ) {
      setError(
        "An IP address is required for a temporary IP ban.",
      );

      return;
    }

    setConfirmOpen(
      true,
    );
  }

  function confirmCreateBan() {
    if (
      !selectedUser
    ) {
      return;
    }

    startSubmitTransition(
      async () => {
        const result =
          await createBanAction({
            userId:
              selectedUser.id,

            reportId:
              linkedReportId,

            banType,

            durationType,

            durationValue:
              durationType ===
              "permanent"
                ? null
                : Number(
                    durationValue,
                  ),

            ipAddress:
              banType ===
              "temporary_ip_ban"
                ? ipAddress.trim() ||
                  null
                : null,

            reason:
              reason.trim(),
          });

        if (
          !result.success
        ) {
          setConfirmOpen(
            false,
          );

          setError(
            result.message,
          );

          return;
        }

        setConfirmOpen(
          false,
        );

        onSuccess(
          result.message,
        );

        onClose();
      },
    );
  }

  return (
    <>
      <div
        className="
          fixed
          inset-0
          z-[80]
          flex
          items-center
          justify-center
          overflow-y-auto
          bg-slate-950/30
          px-4
          py-8
          backdrop-blur-[2px]
        "
      >
        <button
          type="button"
          aria-label="Close ban modal"
          disabled={
            submitting
          }
          onClick={
            closeModal
          }
          className="
            absolute
            inset-0
          "
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-ban-title"
          className="
            relative
            z-10
            w-full
            max-w-[560px]
            border
            border-slate-200
            bg-white
            shadow-2xl
            shadow-slate-950/15
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
              border-slate-200
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
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  bg-[#A92F56]/10
                  text-[#A92F56]
                "
              >
                <Ban
                  size={18}
                />
              </div>

              <div>
                <h2
                  id="create-ban-title"
                  className="
                    text-sm
                    font-semibold
                    text-slate-950
                  "
                >
                  Create Ban
                </h2>

                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-500
                  "
                >
                  Restrict a
                  PIN&amp;TELL
                  account.
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-label="Close"
              disabled={
                submitting
              }
              onClick={
                closeModal
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
              max-h-[72vh]
              overflow-y-auto
              px-5
              py-5
            "
          >
            {/* Error */}
            {error && (
              <div
                className="
                  mb-5
                  flex
                  items-start
                  gap-3
                  border
                  border-red-200
                  bg-red-50
                  px-3
                  py-3
                  text-red-700
                "
              >
                <ShieldAlert
                  size={15}
                  className="
                    mt-0.5
                    shrink-0
                  "
                />

                <p
                  className="
                    text-[11px]
                    leading-5
                  "
                >
                  {error}
                </p>
              </div>
            )}

            {/* Source report */}
            {sourceReportId && (
              <div
                className="
                  mb-5
                  flex
                  items-start
                  gap-3
                  border
                  border-[#FDC1C9]
                  bg-[#FDC1C9]/15
                  p-3
                "
              >
                <FileWarning
                  size={15}
                  className="
                    mt-0.5
                    shrink-0
                    text-[#A92F56]
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
                      font-bold
                      uppercase
                      tracking-[0.08em]
                      text-[#A92F56]
                    "
                  >
                    Source Report
                  </p>

                  <p
                    className="
                      mt-1
                      text-xs
                      font-semibold
                      text-slate-800
                    "
                  >
                    Report #
                    {
                      sourceReportId
                    }
                  </p>

                  <p
                    className="
                      mt-1
                      text-[10px]
                      leading-5
                      text-slate-500
                    "
                  >
                    The report will be
                    linked automatically
                    while the originally
                    reported user remains
                    selected.
                  </p>
                </div>
              </div>
            )}

            {/* User */}
            <div>
              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-3
                "
              >
                <label
                  className="
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.1em]
                    text-slate-400
                  "
                >
                  User
                </label>

                {sourceReportId &&
                  selectedUser?.id ===
                    originalReportedUserId && (
                    <span
                      className="
                        text-[9px]
                        font-medium
                        text-[#A92F56]
                      "
                    >
                      Reported user
                    </span>
                  )}
              </div>

              {!selectedUser ? (
                <div
                  className="
                    relative
                    mt-2
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
                      search
                    }
                    autoFocus
                    onChange={(
                      event,
                    ) =>
                      handleSearchChange(
                        event.target.value,
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

                  {searching && (
                    <Loader2
                      size={14}
                      className="
                        absolute
                        right-3
                        top-3
                        animate-spin
                        text-slate-400
                      "
                    />
                  )}

                  {search.trim()
                    .length >=
                    2 &&
                    !searching &&
                    users.length ===
                      0 && (
                      <div
                        className="
                          absolute
                          left-0
                          right-0
                          top-[44px]
                          z-20
                          border
                          border-slate-200
                          bg-white
                          px-3
                          py-4
                          text-center
                          text-[10px]
                          text-slate-400
                          shadow-lg
                        "
                      >
                        No matching users
                        found.
                      </div>
                    )}

                  {users.length >
                    0 && (
                    <div
                      className="
                        absolute
                        left-0
                        right-0
                        top-[44px]
                        z-20
                        max-h-[220px]
                        overflow-y-auto
                        border
                        border-slate-200
                        bg-white
                        shadow-lg
                      "
                    >
                      {users.map(
                        (
                          user,
                        ) => (
                          <button
                            key={
                              user.id
                            }
                            type="button"
                            onClick={() =>
                              selectUser(
                                user,
                              )
                            }
                            className="
                              flex
                              w-full
                              items-center
                              gap-3
                              border-b
                              border-slate-100
                              px-3
                              py-3
                              text-left
                              transition
                              last:border-b-0
                              hover:bg-slate-50
                            "
                          >
                            {user.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={
                                  user.avatar_url
                                }
                                alt=""
                                referrerPolicy="no-referrer"
                                className="
                                  h-8
                                  w-8
                                  shrink-0
                                  rounded-full
                                  object-cover
                                "
                              />
                            ) : (
                              <div
                                className="
                                  flex
                                  h-8
                                  w-8
                                  shrink-0
                                  items-center
                                  justify-center
                                  rounded-full
                                  bg-[#72213A]/10
                                  text-[#72213A]
                                "
                              >
                                <User
                                  size={14}
                                />
                              </div>
                            )}

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
                                {userDisplayName(
                                  user,
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
                                {userSubtitle(
                                  user,
                                )}
                              </p>
                            </div>

                            <span
                              className="
                                shrink-0
                                text-[9px]
                                font-semibold
                                uppercase
                                text-slate-400
                              "
                            >
                              {formatStatus(
                                user.status,
                              )}
                            </span>
                          </button>
                        ),
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="
                    mt-2
                    flex
                    items-center
                    gap-3
                    border
                    border-slate-200
                    bg-slate-50/70
                    p-3
                  "
                >
                  {selectedUser.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={
                        selectedUser.avatar_url
                      }
                      alt=""
                      referrerPolicy="no-referrer"
                      className="
                        h-9
                        w-9
                        shrink-0
                        rounded-full
                        object-cover
                      "
                    />
                  ) : (
                    <div
                      className="
                        flex
                        h-9
                        w-9
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        bg-[#72213A]/10
                        text-[#72213A]
                      "
                    >
                      <User
                        size={15}
                      />
                    </div>
                  )}

                  <div
                    className="
                      min-w-0
                      flex-1
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
                          truncate
                          text-xs
                          font-semibold
                          text-slate-900
                        "
                      >
                        {
                          displayName
                        }
                      </p>

                      {sourceReportId &&
                        selectedUser.id ===
                          originalReportedUserId && (
                          <span
                            className="
                              shrink-0
                              bg-[#A92F56]/10
                              px-1.5
                              py-0.5
                              text-[9px]
                              font-semibold
                              text-[#A92F56]
                            "
                          >
                            Reported user
                          </span>
                        )}
                    </div>

                    <p
                      className="
                        mt-0.5
                        truncate
                        text-[10px]
                        text-slate-400
                      "
                    >
                      {userSubtitle(
                        selectedUser,
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={
                      submitting
                    }
                    onClick={
                      changeUser
                    }
                    className="
                      shrink-0
                      text-[10px]
                      font-semibold
                      text-[#A92F56]
                      hover:text-[#72213A]
                      disabled:opacity-40
                    "
                  >
                    Change User
                  </button>
                </div>
              )}

              {linkedReportId && (
                <div
                  className="
                    mt-2
                    flex
                    items-center
                    gap-2
                    border
                    border-emerald-200
                    bg-emerald-50
                    px-3
                    py-2
                    text-[10px]
                    text-emerald-700
                  "
                >
                  <Check
                    size={12}
                    className="
                      shrink-0
                    "
                  />

                  <span>
                    This ban will be
                    linked to Report #
                    {
                      linkedReportId
                    }.
                  </span>
                </div>
              )}

              {reportWasDetached && (
                <div
                  className="
                    mt-2
                    border
                    border-amber-200
                    bg-amber-50
                    px-3
                    py-2
                    text-[10px]
                    leading-5
                    text-amber-700
                  "
                >
                  You selected a user
                  different from the
                  person reported in
                  Report #
                  {
                    sourceReportId
                  }.
                  The ban can still be
                  created, but it will
                  not be linked to that
                  report.
                </div>
              )}
            </div>

            {/* Ban details */}
            <div
              className="
                mt-5
                grid
                gap-4
                sm:grid-cols-2
              "
            >
              <div>
                <label
                  htmlFor="ban-type"
                  className="
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.1em]
                    text-slate-400
                  "
                >
                  Ban Type
                </label>

                <select
                  id="ban-type"
                  value={
                    banType
                  }
                  onChange={(
                    event,
                  ) =>
                    changeBanType(
                      event.target
                        .value as BanType,
                    )
                  }
                  className="
                    mt-2
                    h-10
                    w-full
                    border
                    border-slate-200
                    bg-white
                    px-3
                    text-xs
                    text-slate-700
                    outline-none
                    transition
                    hover:border-slate-300
                    focus:border-[#CC3A67]
                    focus:ring-2
                    focus:ring-[#FDC1C9]/30
                  "
                >
                  <option value="temporary_ban">
                    Temporary Ban
                  </option>

                  <option value="permanent_ban">
                    Permanent Ban
                  </option>

                  <option value="temporary_ip_ban">
                    Temporary IP Ban
                  </option>
                </select>
              </div>

              <div>
                <label
                  className="
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.1em]
                    text-slate-400
                  "
                >
                  Duration
                </label>

                {banType ===
                "permanent_ban" ? (
                  <div
                    className="
                      mt-2
                      flex
                      h-10
                      items-center
                      border
                      border-slate-200
                      bg-slate-50
                      px-3
                      text-xs
                      font-medium
                      text-slate-600
                    "
                  >
                    Permanent
                  </div>
                ) : (
                  <div
                    className="
                      mt-2
                      flex
                    "
                  >
                    <input
                      aria-label="Ban duration value"
                      type="number"
                      min="1"
                      max="3650"
                      value={
                        durationValue
                      }
                      onChange={(
                        event,
                      ) => {
                        setDurationValue(
                          event.target.value,
                        );

                        setError(
                          null,
                        );
                      }}
                      className="
                        h-10
                        min-w-0
                        flex-1
                        border
                        border-r-0
                        border-slate-200
                        px-3
                        text-xs
                        text-slate-700
                        outline-none
                        focus:border-[#CC3A67]
                      "
                    />

                    <select
                      aria-label="Ban duration type"
                      value={
                        durationType
                      }
                      onChange={(
                        event,
                      ) => {
                        setDurationType(
                          event.target
                            .value as DurationType,
                        );

                        setError(
                          null,
                        );
                      }}
                      className="
                        h-10
                        border
                        border-slate-200
                        bg-white
                        px-3
                        text-xs
                        text-slate-600
                        outline-none
                        focus:border-[#CC3A67]
                      "
                    >
                      <option value="hours">
                        Hours
                      </option>

                      <option value="days">
                        Days
                      </option>

                      <option value="weeks">
                        Weeks
                      </option>

                      <option value="months">
                        Months
                      </option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {banType ===
              "temporary_ip_ban" && (
              <div
                className="
                  mt-4
                "
              >
                <label
                  htmlFor="ban-ip-address"
                  className="
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.1em]
                    text-slate-400
                  "
                >
                  IP Address
                </label>

                <input
                  id="ban-ip-address"
                  value={
                    ipAddress
                  }
                  onChange={(
                    event,
                  ) => {
                    setIpAddress(
                      event.target.value,
                    );

                    setError(
                      null,
                    );
                  }}
                  placeholder="IPv4 or IPv6 address"
                  className="
                    mt-2
                    h-10
                    w-full
                    border
                    border-slate-200
                    px-3
                    font-mono
                    text-xs
                    text-slate-700
                    outline-none
                    transition
                    placeholder:text-slate-400
                    hover:border-slate-300
                    focus:border-[#CC3A67]
                    focus:ring-2
                    focus:ring-[#FDC1C9]/30
                  "
                />
              </div>
            )}

            <div
              className="
                mt-4
              "
            >
              <label
                htmlFor="ban-reason"
                className="
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-[0.1em]
                  text-slate-400
                "
              >
                Reason
              </label>

              <textarea
                id="ban-reason"
                value={
                  reason
                }
                onChange={(
                  event,
                ) => {
                  setReason(
                    event.target.value,
                  );

                  setError(
                    null,
                  );
                }}
                maxLength={
                  1000
                }
                rows={
                  4
                }
                placeholder="Explain why this account is being restricted..."
                className="
                  mt-2
                  w-full
                  resize-none
                  border
                  border-slate-200
                  px-3
                  py-3
                  text-xs
                  leading-5
                  text-slate-700
                  outline-none
                  transition
                  placeholder:text-slate-400
                  hover:border-slate-300
                  focus:border-[#CC3A67]
                  focus:ring-2
                  focus:ring-[#FDC1C9]/30
                "
              />

              <div
                className="
                  mt-1
                  flex
                  justify-end
                "
              >
                <span
                  className="
                    text-[9px]
                    text-slate-400
                  "
                >
                  {
                    reason.length
                  }
                  /1000
                </span>
              </div>
            </div>

            <div
              className="
                mt-5
                flex
                gap-3
                border
                border-amber-200
                bg-amber-50
                p-3
              "
            >
              <ShieldAlert
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
                Temporary bans suspend
                the account. Permanent
                bans mark the account
                as banned. The
                restriction and the
                administrator who
                created it are recorded
                in the enforcement
                history.
              </p>
            </div>
          </div>

          {/* Footer */}
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
              disabled={
                submitting
              }
              onClick={
                closeModal
              }
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
                hover:bg-slate-50
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={
                submitting
              }
              onClick={
                requestCreateBan
              }
              className="
                inline-flex
                h-9
                items-center
                justify-center
                gap-2
                bg-[#72213A]
                px-4
                text-xs
                font-semibold
                text-white
                transition
                hover:bg-[#5f1930]
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {submitting ? (
                <>
                  <Loader2
                    size={13}
                    className="
                      animate-spin
                    "
                  />

                  Processing...
                </>
              ) : (
                <>
                  <Ban
                    size={13}
                  />

                  Review Ban
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <ActionConfirmModal
        open={
          confirmOpen
        }
        title="Apply this ban?"
        description={
          selectedUser
            ? linkedReportId
              ? `${displayName} will be restricted and the enforcement record will automatically be linked to Report #${linkedReportId}.`
              : `${displayName} will be restricted according to the selected ban type and duration.`
            : ""
        }
        confirmLabel="Apply Ban"
        variant="danger"
        loading={
          submitting
        }
        onClose={() => {
          if (
            submitting
          ) {
            return;
          }

          setConfirmOpen(
            false,
          );
        }}
        onConfirm={
          confirmCreateBan
        }
      />
    </>
  );
}