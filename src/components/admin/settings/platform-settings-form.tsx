"use client";

import {
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  FileText,
  KeyRound,
  Laptop,
  Loader2,
  LockKeyhole,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  changeAdminPasswordAction,
  revokeAllAdminSessionsAction,
  savePolicySettingAction,
  updateAdminAccountAction,
} from "@/app/admin/(protected)/settings/actions";

import RichTextEditor from "@/components/admin/settings/rich-text-editor";

import type {
  AdminPolicySetting,
  AdminSettingsAccount,
} from "@/lib/admin/platform-settings";

/* =========================================================
   TYPES
========================================================= */

type Props = {
  account:
    AdminSettingsAccount;

  policies:
    AdminPolicySetting[];

  activeSessions:
    number;
};

type Notice =
  | {
      type:
        "success";

      message:
        string;
    }
  | {
      type:
        "error";

      message:
        string;
    }
  | null;

type AccountBaseline = {
  fullName:
    string;

  email:
    string;
};

/* =========================================================
   HELPERS
========================================================= */

function formatDateTime(
  value:
    string | null,
): string {
  if (
    !value
  ) {
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

function formatRole(
  value:
    string,
): string {
  return value
    .replace(
      /[_-]+/g,
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

function formatSettingTitle(
  value:
    string,
): string {
  return value
    .replace(
      /[._-]+/g,
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

function buildPolicyValues(
  policies:
    AdminPolicySetting[],
): Record<
  string,
  string
> {
  const values:
    Record<
      string,
      string
    > = {};

  for (
    const policy of
    policies
  ) {
    values[
      policy.key
    ] =
      policy.value ??
      "";
  }

  return values;
}

function normalizeSettingType(
  value:
    string,
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /[\s-]+/g,
      "_",
    );
}

function isBooleanSetting(
  policy:
    AdminPolicySetting,
): boolean {
  return [
    "boolean",
    "bool",
    "toggle",
    "switch",
  ].includes(
    normalizeSettingType(
      policy.type,
    ),
  );
}

function isNumberSetting(
  policy:
    AdminPolicySetting,
): boolean {
  return [
    "number",
    "numeric",
    "integer",
    "int",
    "float",
    "double",
    "decimal",
  ].includes(
    normalizeSettingType(
      policy.type,
    ),
  );
}

function parseBoolean(
  value:
    string,
): boolean {
  return [
    "1",
    "true",
    "yes",
    "on",
    "enabled",
  ].includes(
    value
      .trim()
      .toLowerCase(),
  );
}

function serializeBoolean(
  enabled:
    boolean,
  originalValue:
    string,
): string {
  const normalized =
    originalValue
      .trim()
      .toLowerCase();

  if (
    normalized ===
      "1" ||
    normalized ===
      "0"
  ) {
    return enabled
      ? "1"
      : "0";
  }

  if (
    normalized ===
      "yes" ||
    normalized ===
      "no"
  ) {
    return enabled
      ? "yes"
      : "no";
  }

  if (
    normalized ===
      "enabled" ||
    normalized ===
      "disabled"
  ) {
    return enabled
      ? "enabled"
      : "disabled";
  }

  if (
    normalized ===
      "on" ||
    normalized ===
      "off"
  ) {
    return enabled
      ? "on"
      : "off";
  }

  return enabled
    ? "true"
    : "false";
}

function scrollToSection(
  id:
    string,
) {
  document
    .getElementById(
      id,
    )
    ?.scrollIntoView({
      behavior:
        "smooth",

      block:
        "start",
    });
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function PlatformSettingsForm({
  account,
  policies,
  activeSessions,
}: Props) {
  const router =
    useRouter();

  /* =======================================================
     ACCOUNT
  ======================================================= */

  const [
    accountBaseline,
    setAccountBaseline,
  ] =
    useState<AccountBaseline>({
      fullName:
        account.full_name ??
        "",

      email:
        account.email,
    });

  const [
    fullName,
    setFullName,
  ] =
    useState(
      account.full_name ??
      "",
    );

  const [
    email,
    setEmail,
  ] =
    useState(
      account.email,
    );

  const [
    accountPassword,
    setAccountPassword,
  ] =
    useState("");

  const [
    accountNotice,
    setAccountNotice,
  ] =
    useState<Notice>(
      null,
    );

  const [
    accountPending,
    startAccountTransition,
  ] =
    useTransition();

  const accountChanged =
    fullName.trim() !==
      accountBaseline.fullName ||
    email
      .trim()
      .toLowerCase() !==
      accountBaseline.email
        .trim()
        .toLowerCase();

  /* =======================================================
     PASSWORD
  ======================================================= */

  const [
    currentPassword,
    setCurrentPassword,
  ] =
    useState("");

  const [
    newPassword,
    setNewPassword,
  ] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] =
    useState("");

  const [
    passwordNotice,
    setPasswordNotice,
  ] =
    useState<Notice>(
      null,
    );

  const [
    passwordPending,
    startPasswordTransition,
  ] =
    useTransition();

  /* =======================================================
     SESSIONS
  ======================================================= */

  const [
    sessionPassword,
    setSessionPassword,
  ] =
    useState("");

  const [
    sessionNotice,
    setSessionNotice,
  ] =
    useState<Notice>(
      null,
    );

  const [
    sessionPending,
    startSessionTransition,
  ] =
    useTransition();

  /* =======================================================
     POLICIES
  ======================================================= */

  const initialPolicyValues =
    useMemo(
      () =>
        buildPolicyValues(
          policies,
        ),
      [
        policies,
      ],
    );

  const [
    policyValues,
    setPolicyValues,
  ] =
    useState<
      Record<
        string,
        string
      >
    >(
      () => ({
        ...initialPolicyValues,
      }),
    );

  const [
    policyBaseline,
    setPolicyBaseline,
  ] =
    useState<
      Record<
        string,
        string
      >
    >(
      () => ({
        ...initialPolicyValues,
      }),
    );

  const [
    policyNotice,
    setPolicyNotice,
  ] =
    useState<Notice>(
      null,
    );

  const [
    policyPending,
    startPolicyTransition,
  ] =
    useTransition();

  const changedPolicyKeys =
    useMemo(
      () =>
        policies
          .map(
            (
              policy,
            ) =>
              policy.key,
          )
          .filter(
            (
              key,
            ) =>
              (
                policyValues[
                  key
                ] ??
                ""
              ) !==
              (
                policyBaseline[
                  key
                ] ??
                ""
              ),
          ),
      [
        policies,
        policyValues,
        policyBaseline,
      ],
    );

  const changedPolicySet =
    useMemo(
      () =>
        new Set(
          changedPolicyKeys,
        ),
      [
        changedPolicyKeys,
      ],
    );

  /* =======================================================
     ACCOUNT ACTION
  ======================================================= */

  function saveAccount() {
    if (
      !accountChanged ||
      accountPending
    ) {
      return;
    }

    setAccountNotice(
      null,
    );

    if (
      !accountPassword
    ) {
      setAccountNotice({
        type:
          "error",

        message:
          "Enter your current password to authenticate these changes.",
      });

      return;
    }

    startAccountTransition(
      async () => {
        const result =
          await updateAdminAccountAction({
            fullName:
              fullName.trim(),

            email:
              email.trim(),

            currentPassword:
              accountPassword,
          });

        if (
          !result.success
        ) {
          setAccountNotice({
            type:
              "error",

            message:
              result.message,
          });

          if (
            result.field ===
            "currentPassword"
          ) {
            setAccountPassword(
              "",
            );
          }

          return;
        }

        setAccountPassword(
          "",
        );

        if (
          result.account
        ) {
          const nextBaseline: AccountBaseline = {
            fullName:
              result.account
                .full_name ??
              "",

            email:
              result.account
                .email,
          };

          setFullName(
            nextBaseline.fullName,
          );

          setEmail(
            nextBaseline.email,
          );

          setAccountBaseline(
            nextBaseline,
          );
        }

        setAccountNotice({
          type:
            "success",

          message:
            result.message,
        });

        if (
          result.requiresReauth
        ) {
          router.replace(
            "/admin/login",
          );

          router.refresh();

          return;
        }

        router.refresh();
      },
    );
  }

  function resetAccount() {
    setFullName(
      accountBaseline.fullName,
    );

    setEmail(
      accountBaseline.email,
    );

    setAccountPassword(
      "",
    );

    setAccountNotice(
      null,
    );
  }

  /* =======================================================
     PASSWORD ACTION
  ======================================================= */

  function changePassword() {
    setPasswordNotice(
      null,
    );

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      setPasswordNotice({
        type:
          "error",

        message:
          "Complete all password fields before continuing.",
      });

      return;
    }

    startPasswordTransition(
      async () => {
        const result =
          await changeAdminPasswordAction({
            currentPassword,

            newPassword,

            confirmPassword,
          });

        if (
          !result.success
        ) {
          setPasswordNotice({
            type:
              "error",

            message:
              result.message,
          });

          return;
        }

        setCurrentPassword(
          "",
        );

        setNewPassword(
          "",
        );

        setConfirmPassword(
          "",
        );

        setPasswordNotice({
          type:
            "success",

          message:
            result.message,
        });

        if (
          result.requiresReauth
        ) {
          router.replace(
            "/admin/login",
          );

          router.refresh();

          return;
        }

        router.refresh();
      },
    );
  }

  /* =======================================================
     SESSION ACTION
  ======================================================= */

  function revokeSessions() {
    setSessionNotice(
      null,
    );

    if (
      !sessionPassword
    ) {
      setSessionNotice({
        type:
          "error",

        message:
          "Enter your current password before signing out administrator sessions.",
      });

      return;
    }

    startSessionTransition(
      async () => {
        const result =
          await revokeAllAdminSessionsAction({
            currentPassword:
              sessionPassword,
          });

        if (
          !result.success
        ) {
          setSessionNotice({
            type:
              "error",

            message:
              result.message,
          });

          setSessionPassword(
            "",
          );

          return;
        }

        setSessionPassword(
          "",
        );

        router.replace(
          "/admin/login",
        );

        router.refresh();
      },
    );
  }

  /* =======================================================
     POLICY ACTIONS
  ======================================================= */

  function updatePolicy(
    key:
      string,
    value:
      string,
  ) {
    setPolicyValues(
      (
        current,
      ) => ({
        ...current,

        [key]:
          value,
      }),
    );

    setPolicyNotice(
      null,
    );
  }

  function resetPolicies() {
    setPolicyValues({
      ...policyBaseline,
    });

    setPolicyNotice(
      null,
    );
  }

  function savePolicies() {
    if (
      changedPolicyKeys.length ===
        0 ||
      policyPending
    ) {
      return;
    }

    setPolicyNotice(
      null,
    );

    const keysToSave = [
      ...changedPolicyKeys,
    ];

    startPolicyTransition(
      async () => {
        const successful:
          string[] = [];

        const failures:
          string[] = [];

        for (
          const key of
          keysToSave
        ) {
          const result =
            await savePolicySettingAction({
              key,

              value:
                policyValues[
                  key
                ] ??
                "",
            });

          if (
            result.success
          ) {
            successful.push(
              key,
            );
          } else {
            failures.push(
              `${formatSettingTitle(
                key,
              )}: ${result.message}`,
            );
          }
        }

        if (
          successful.length >
          0
        ) {
          setPolicyBaseline(
            (
              current,
            ) => {
              const next = {
                ...current,
              };

              for (
                const key of
                successful
              ) {
                next[
                  key
                ] =
                  policyValues[
                    key
                  ] ??
                  "";
              }

              return next;
            },
          );
        }

        if (
          failures.length >
          0
        ) {
          setPolicyNotice({
            type:
              "error",

            message:
              successful.length >
              0
                ? `${successful.length} policy ${
                    successful.length ===
                    1
                      ? "was"
                      : "policies were"
                  } saved, but ${failures.length} failed. ${failures.join(
                    " ",
                  )}`
                : failures.join(
                    " ",
                  ),
          });
        } else {
          setPolicyNotice({
            type:
              "success",

            message:
              successful.length ===
              1
                ? "Policy saved successfully."
                : `${successful.length} policies saved successfully.`,
          });
        }

        router.refresh();
      },
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      className="
        grid
        gap-5
        xl:grid-cols-[220px_minmax(0,1fr)]
      "
    >
      {/* =========================
          LEFT NAVIGATION
      ========================== */}

      <aside
        className="
          xl:sticky
          xl:top-[88px]
          xl:self-start
        "
      >
        <div
          className="
            border
            border-slate-200
            bg-white
            p-2
          "
        >
          <NavigationButton
            icon={
              UserRound
            }
            title="Admin Account"
            description="Profile and login email"
            onClick={() =>
              scrollToSection(
                "settings-account",
              )
            }
          />

          <NavigationButton
            icon={
              ShieldCheck
            }
            title="Security"
            description="Password and sessions"
            onClick={() =>
              scrollToSection(
                "settings-security",
              )
            }
          />

          <NavigationButton
            icon={
              FileText
            }
            title="Policies"
            description={
              policies.length ===
              1
                ? "1 policy"
                : `${policies.length} policies`
            }
            onClick={() =>
              scrollToSection(
                "settings-policies",
              )
            }
          />
        </div>
      </aside>

      {/* =========================
          CONTENT
      ========================== */}

      <div
        className="
          min-w-0
          space-y-5
        "
      >
        {/* =========================
            ACCOUNT
        ========================== */}

        <section
          id="settings-account"
          className="
            scroll-mt-[88px]
            border
            border-slate-200
            bg-white
          "
        >
          <SectionHeader
            icon={
              UserRound
            }
            title="Admin Account"
            description="Manage your administrator profile and login email."
          />

          <div
            className="
              p-5
            "
          >
            <NoticeBox
              notice={
                accountNotice
              }
            />

            <div
              className="
                grid
                gap-5
                xl:grid-cols-[minmax(0,1fr)_280px]
              "
            >
              <div>
                <div
                  className="
                    grid
                    gap-4
                    md:grid-cols-2
                  "
                >
                  <Field>
                    <FieldLabel>
                      Full Name
                    </FieldLabel>

                    <div
                      className="
                        relative
                      "
                    >
                      <UserRound
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
                        type="text"
                        value={
                          fullName
                        }
                        disabled={
                          accountPending
                        }
                        maxLength={
                          100
                        }
                        autoComplete="name"
                        onChange={(
                          event,
                        ) => {
                          setFullName(
                            event
                              .target
                              .value,
                          );

                          setAccountNotice(
                            null,
                          );
                        }}
                        className="
                          h-10
                          w-full
                          border
                          border-slate-200
                          bg-white
                          pl-9
                          pr-3
                          text-xs
                          text-slate-800
                          outline-none
                          transition
                          hover:border-slate-300
                          focus:border-[#CC3A67]
                          focus:ring-2
                          focus:ring-[#FDC1C9]/30
                          disabled:bg-slate-50
                        "
                      />
                    </div>
                  </Field>

                  <Field>
                    <FieldLabel>
                      Email Address
                    </FieldLabel>

                    <div
                      className="
                        relative
                      "
                    >
                      <Mail
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
                        type="email"
                        value={
                          email
                        }
                        disabled={
                          accountPending
                        }
                        autoComplete="email"
                        onChange={(
                          event,
                        ) => {
                          setEmail(
                            event
                              .target
                              .value,
                          );

                          setAccountNotice(
                            null,
                          );
                        }}
                        className="
                          h-10
                          w-full
                          border
                          border-slate-200
                          bg-white
                          pl-9
                          pr-3
                          text-xs
                          text-slate-800
                          outline-none
                          transition
                          hover:border-slate-300
                          focus:border-[#CC3A67]
                          focus:ring-2
                          focus:ring-[#FDC1C9]/30
                          disabled:bg-slate-50
                        "
                      />
                    </div>

                    <p
                      className="
                        mt-1.5
                        text-[10px]
                        leading-4
                        text-slate-400
                      "
                    >
                      Changing your email
                      signs out all active
                      administrator
                      sessions.
                    </p>
                  </Field>
                </div>

                <div
                  className="
                    mt-4
                    max-w-lg
                  "
                >
                  <Field>
                    <FieldLabel>
                      Current Password
                    </FieldLabel>

                    <PasswordInput
                      value={
                        accountPassword
                      }
                      disabled={
                        accountPending
                      }
                      placeholder="Authenticate account changes"
                      autoComplete="current-password"
                      onChange={(
                        value,
                      ) => {
                        setAccountPassword(
                          value,
                        );

                        setAccountNotice(
                          null,
                        );
                      }}
                    />
                  </Field>
                </div>

                <div
                  className="
                    mt-5
                    flex
                    flex-wrap
                    gap-2
                  "
                >
                  <PrimaryButton
                    disabled={
                      !accountChanged ||
                      accountPending
                    }
                    loading={
                      accountPending
                    }
                    loadingText="Saving..."
                    onClick={
                      saveAccount
                    }
                  >
                    <Save
                      size={13}
                    />

                    Save Account
                  </PrimaryButton>

                  <SecondaryButton
                    disabled={
                      !accountChanged ||
                      accountPending
                    }
                    onClick={
                      resetAccount
                    }
                  >
                    Reset
                  </SecondaryButton>
                </div>
              </div>

              <div
                className="
                  border
                  border-slate-200
                  bg-slate-50/60
                  p-4
                "
              >
                <p
                  className="
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.1em]
                    text-slate-400
                  "
                >
                  Account Information
                </p>

                <MetadataRow
                  label="Role"
                  value={
                    formatRole(
                      account.role,
                    )
                  }
                />

                <MetadataRow
                  label="Status"
                  value={
                    formatRole(
                      account.status,
                    )
                  }
                />

                <MetadataRow
                  label="Created"
                  value={
                    formatDateTime(
                      account.created_at,
                    )
                  }
                />

                <MetadataRow
                  label="Last Seen"
                  value={
                    formatDateTime(
                      account.last_seen,
                    )
                  }
                />

                <MetadataRow
                  label="Admin ID"
                  value={
                    account.id
                  }
                  mono
                />
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            SECURITY
        ========================== */}

        <section
          id="settings-security"
          className="
            scroll-mt-[88px]
            border
            border-slate-200
            bg-white
          "
        >
          <SectionHeader
            icon={
              ShieldCheck
            }
            title="Security"
            description="Change your password and manage authenticated administrator sessions."
          />

          <div
            className="
              border-b
              border-slate-100
              p-5
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
                  bg-slate-100
                  text-slate-600
                "
              >
                <KeyRound
                  size={16}
                />
              </div>

              <div>
                <h3
                  className="
                    text-xs
                    font-semibold
                    text-slate-900
                  "
                >
                  Change Password
                </h3>

                <p
                  className="
                    mt-1
                    text-[10px]
                    leading-5
                    text-slate-500
                  "
                >
                  Changing your password
                  signs out every active
                  administrator session.
                </p>
              </div>
            </div>

            <div
              className="
                mt-5
                max-w-2xl
              "
            >
              <NoticeBox
                notice={
                  passwordNotice
                }
              />

              <div
                className="
                  grid
                  gap-4
                  md:grid-cols-2
                "
              >
                <div
                  className="
                    md:col-span-2
                  "
                >
                  <Field>
                    <FieldLabel>
                      Current Password
                    </FieldLabel>

                    <PasswordInput
                      value={
                        currentPassword
                      }
                      disabled={
                        passwordPending
                      }
                      placeholder="Current password"
                      autoComplete="current-password"
                      onChange={(
                        value,
                      ) => {
                        setCurrentPassword(
                          value,
                        );

                        setPasswordNotice(
                          null,
                        );
                      }}
                    />
                  </Field>
                </div>

                <Field>
                  <FieldLabel>
                    New Password
                  </FieldLabel>

                  <PasswordInput
                    value={
                      newPassword
                    }
                    disabled={
                      passwordPending
                    }
                    placeholder="At least 12 characters"
                    autoComplete="new-password"
                    onChange={(
                      value,
                    ) => {
                      setNewPassword(
                        value,
                      );

                      setPasswordNotice(
                        null,
                      );
                    }}
                  />
                </Field>

                <Field>
                  <FieldLabel>
                    Confirm Password
                  </FieldLabel>

                  <PasswordInput
                    value={
                      confirmPassword
                    }
                    disabled={
                      passwordPending
                    }
                    placeholder="Repeat new password"
                    autoComplete="new-password"
                    onChange={(
                      value,
                    ) => {
                      setConfirmPassword(
                        value,
                      );

                      setPasswordNotice(
                        null,
                      );
                    }}
                  />
                </Field>
              </div>

              <div
                className="
                  mt-4
                  flex
                  items-start
                  gap-2
                  border
                  border-amber-200
                  bg-amber-50
                  px-3
                  py-2.5
                  text-[10px]
                  leading-5
                  text-amber-800
                "
              >
                <LockKeyhole
                  size={14}
                  className="
                    mt-0.5
                    shrink-0
                  "
                />

                Passwords must contain
                at least 12 characters
                and must differ from
                your current password.
              </div>

              <div
                className="
                  mt-4
                "
              >
                <PrimaryButton
                  disabled={
                    passwordPending
                  }
                  loading={
                    passwordPending
                  }
                  loadingText="Updating..."
                  onClick={
                    changePassword
                  }
                  dark
                >
                  <KeyRound
                    size={13}
                  />

                  Change Password
                </PrimaryButton>
              </div>
            </div>
          </div>

          {/* =========================
              SESSIONS
          ========================== */}

          <div
            className="
              p-5
            "
          >
            <div
              className="
                flex
                flex-col
                gap-4
                lg:flex-row
                lg:items-start
                lg:justify-between
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
                    bg-slate-100
                    text-slate-600
                  "
                >
                  <Laptop
                    size={16}
                  />
                </div>

                <div>
                  <h3
                    className="
                      text-xs
                      font-semibold
                      text-slate-900
                    "
                  >
                    Administrator Sessions
                  </h3>

                  <p
                    className="
                      mt-1
                      max-w-xl
                      text-[10px]
                      leading-5
                      text-slate-500
                    "
                  >
                    End all active admin
                    sessions if this
                    account was left
                    signed in somewhere
                    else.
                  </p>
                </div>
              </div>

              <div
                className="
                  min-w-[140px]
                  border
                  border-slate-200
                  bg-slate-50
                  px-4
                  py-3
                "
              >
                <p
                  className="
                    text-[9px]
                    font-bold
                    uppercase
                    tracking-[0.08em]
                    text-slate-400
                  "
                >
                  Active Sessions
                </p>

                <p
                  className="
                    mt-1
                    text-xl
                    font-semibold
                    text-slate-900
                  "
                >
                  {
                    activeSessions
                  }
                </p>
              </div>
            </div>

            <div
              className="
                mt-5
                max-w-xl
              "
            >
              <NoticeBox
                notice={
                  sessionNotice
                }
              />

              <Field>
                <FieldLabel>
                  Current Password
                </FieldLabel>

                <PasswordInput
                  value={
                    sessionPassword
                  }
                  disabled={
                    sessionPending
                  }
                  placeholder="Authenticate session revocation"
                  autoComplete="current-password"
                  onChange={(
                    value,
                  ) => {
                    setSessionPassword(
                      value,
                    );

                    setSessionNotice(
                      null,
                    );
                  }}
                />
              </Field>

              <button
                type="button"
                disabled={
                  sessionPending
                }
                onClick={
                  revokeSessions
                }
                className="
                  mt-4
                  inline-flex
                  h-9
                  items-center
                  gap-2
                  border
                  border-red-200
                  bg-red-50
                  px-4
                  text-[11px]
                  font-semibold
                  text-red-700
                  transition
                  hover:bg-red-100
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {sessionPending ? (
                  <>
                    <Loader2
                      size={13}
                      className="
                        animate-spin
                      "
                    />

                    Signing Out...
                  </>
                ) : (
                  <>
                    <ShieldCheck
                      size={13}
                    />

                    Sign Out All Sessions
                  </>
                )}
              </button>

              <p
                className="
                  mt-2
                  text-[9px]
                  text-slate-400
                "
              >
                This includes your
                current session.
              </p>
            </div>
          </div>
        </section>

        {/* =========================
            POLICIES
        ========================== */}

        <section
          id="settings-policies"
          className="
            scroll-mt-[88px]
            border
            border-slate-200
            bg-white
          "
        >
          <SectionHeader
            icon={
              FileText
            }
            title="Policies"
            description="Edit the policies displayed inside PIN & TELL"
          />

          {policies.length ===
          0 ? (
            <div
              className="
                px-5
                py-14
                text-center
              "
            >
              <div
                className="
                  mx-auto
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  bg-slate-100
                  text-slate-400
                "
              >
                <FileText
                  size={17}
                />
              </div>

              <p
                className="
                  mt-3
                  text-xs
                  font-semibold
                  text-slate-700
                "
              >
                No editable policies
              </p>

              <p
                className="
                  mt-1
                  text-[10px]
                  text-slate-400
                "
              >
                No matching policy
                records currently exist
                in the database.
              </p>
            </div>
          ) : (
            <>
              <div
                className="
                  space-y-5
                  p-5
                "
              >
                <NoticeBox
                  notice={
                    policyNotice
                  }
                />

                {policies.map(
                  (
                    policy,
                  ) => (
                    <PolicyEditor
                      key={
                        policy.key
                      }
                      policy={
                        policy
                      }
                      value={
                        policyValues[
                          policy.key
                        ] ??
                        ""
                      }
                      originalValue={
                        policyBaseline[
                          policy.key
                        ] ??
                        ""
                      }
                      changed={
                        changedPolicySet.has(
                          policy.key,
                        )
                      }
                      disabled={
                        policyPending
                      }
                      onChange={(
                        value,
                      ) =>
                        updatePolicy(
                          policy.key,
                          value,
                        )
                      }
                    />
                  ),
                )}
              </div>

              <div
                className="
                  flex
                  flex-col
                  gap-3
                  border-t
                  border-slate-200
                  bg-slate-50/70
                  px-5
                  py-4
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                "
              >
                <div>
                  <p
                    className="
                      text-[11px]
                      font-semibold
                      text-slate-700
                    "
                  >
                    {changedPolicyKeys
                      .length ===
                    0
                      ? "All policy changes saved"
                      : `${changedPolicyKeys.length} unsaved ${
                          changedPolicyKeys
                            .length ===
                          1
                            ? "change"
                            : "changes"
                        }`}
                  </p>

                  <p
                    className="
                      mt-0.5
                      text-[9px]
                      text-slate-400
                    "
                  >
                    Formatted content is
                    saved to the
                    existing policy
                    record.
                  </p>
                </div>

                <div
                  className="
                    flex
                    gap-2
                  "
                >
                  <SecondaryButton
                    disabled={
                      changedPolicyKeys
                        .length ===
                        0 ||
                      policyPending
                    }
                    onClick={
                      resetPolicies
                    }
                  >
                    Reset
                  </SecondaryButton>

                  <PrimaryButton
                    disabled={
                      changedPolicyKeys
                        .length ===
                        0 ||
                      policyPending
                    }
                    loading={
                      policyPending
                    }
                    loadingText="Saving..."
                    onClick={
                      savePolicies
                    }
                  >
                    <Save
                      size={13}
                    />

                    Save Policies
                  </PrimaryButton>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/* =========================================================
   POLICY EDITOR
========================================================= */

function PolicyEditor({
  policy,
  value,
  originalValue,
  changed,
  disabled,
  onChange,
}: {
  policy:
    AdminPolicySetting;

  value:
    string;

  originalValue:
    string;

  changed:
    boolean;

  disabled:
    boolean;

  onChange:
    (
      value:
        string,
    ) => void;
}) {
  return (
    <article
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
          border-slate-100
          px-4
          py-4
          sm:flex-row
          sm:items-start
          sm:justify-between
        "
      >
        <div>
          <div
            className="
              flex
              flex-wrap
              items-center
              gap-2
            "
          >
            <h3
              className="
                text-xs
                font-semibold
                text-slate-900
              "
            >
              {formatSettingTitle(
                policy.key,
              )}
            </h3>

            {changed && (
              <span
                className="
                  border
                  border-amber-200
                  bg-amber-50
                  px-1.5
                  py-0.5
                  text-[8px]
                  font-bold
                  uppercase
                  tracking-[0.06em]
                  text-amber-700
                "
              >
                Unsaved
              </span>
            )}
          </div>

          {policy.description && (
            <p
              className="
                mt-1
                max-w-3xl
                text-[10px]
                leading-5
                text-slate-500
              "
            >
              {
                policy.description
              }
            </p>
          )}
        </div>

        <div
          className="
            shrink-0
            text-left
            sm:text-right
          "
        >
          <p
            className="
              text-[9px]
              font-medium
              text-slate-400
            "
          >
            {
              policy.grp
            }
          </p>

          <p
            className="
              mt-1
              text-[9px]
              text-slate-400
            "
          >
            Updated{" "}
            {formatDateTime(
              policy.updated_at,
            )}
          </p>
        </div>
      </div>

      <div
        className="
          p-4
        "
      >
        {isBooleanSetting(
          policy,
        ) ? (
          <BooleanPolicyControl
            value={
              value
            }
            originalValue={
              originalValue
            }
            disabled={
              disabled
            }
            onChange={
              onChange
            }
          />
        ) : isNumberSetting(
            policy,
          ) ? (
          <input
            type="number"
            value={
              value
            }
            disabled={
              disabled
            }
            onChange={(
              event,
            ) =>
              onChange(
                event
                  .target
                  .value,
              )
            }
            className="
              h-10
              w-full
              max-w-md
              border
              border-slate-200
              bg-white
              px-3
              text-xs
              outline-none
              transition
              focus:border-[#CC3A67]
              focus:ring-2
              focus:ring-[#FDC1C9]/30
            "
          />
        ) : (
          <RichTextEditor
            value={
              value
            }
            disabled={
              disabled
            }
            onChange={
              onChange
            }
          />
        )}

        <div
          className="
            mt-3
            flex
            flex-wrap
            gap-x-4
            gap-y-1
            text-[9px]
            text-slate-400
          "
        >
          <span>
            Key:{" "}
            <code
              className="
                font-mono
                text-slate-500
              "
            >
              {
                policy.key
              }
            </code>
          </span>

          <span>
            Type:{" "}
            {
              policy.type
            }
          </span>
        </div>
      </div>
    </article>
  );
}

/* =========================================================
   BOOLEAN POLICY CONTROL
========================================================= */

function BooleanPolicyControl({
  value,
  originalValue,
  disabled,
  onChange,
}: {
  value:
    string;

  originalValue:
    string;

  disabled:
    boolean;

  onChange:
    (
      value:
        string,
    ) => void;
}) {
  const enabled =
    parseBoolean(
      value,
    );

  return (
    <div
      className="
        flex
        max-w-md
        items-center
        justify-between
        gap-4
        border
        border-slate-200
        bg-slate-50
        px-4
        py-3
      "
    >
      <div>
        <p
          className="
            text-xs
            font-semibold
            text-slate-700
          "
        >
          {enabled
            ? "Enabled"
            : "Disabled"}
        </p>

        <p
          className="
            mt-0.5
            text-[9px]
            text-slate-400
          "
        >
          Toggle this policy setting.
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={
          enabled
        }
        disabled={
          disabled
        }
        onClick={() =>
          onChange(
            serializeBoolean(
              !enabled,
              originalValue ||
                value,
            ),
          )
        }
        className={`
          relative
          h-6
          w-11
          shrink-0
          rounded-full
          transition
          focus:outline-none
          focus:ring-2
          focus:ring-[#FDC1C9]
          focus:ring-offset-2
          disabled:cursor-not-allowed
          disabled:opacity-50
          ${
            enabled
              ? "bg-[#A92F56]"
              : "bg-slate-300"
          }
        `}
      >
        <span
          className={`
            absolute
            top-0.5
            h-5
            w-5
            rounded-full
            bg-white
            shadow-sm
            transition
            ${
              enabled
                ? "left-[22px]"
                : "left-0.5"
            }
          `}
        />
      </button>
    </div>
  );
}

/* =========================================================
   NAVIGATION
========================================================= */

function NavigationButton({
  icon:
    Icon,
  title,
  description,
  onClick,
}: {
  icon:
    typeof UserRound;

  title:
    string;

  description:
    string;

  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className="
        group
        flex
        w-full
        items-center
        gap-3
        px-3
        py-3
        text-left
        transition
        hover:bg-slate-50
      "
    >
      <div
        className="
          flex
          h-8
          w-8
          shrink-0
          items-center
          justify-center
          bg-slate-100
          text-slate-500
          transition
          group-hover:bg-[#FDC1C9]/25
          group-hover:text-[#A92F56]
        "
      >
        <Icon
          size={14}
        />
      </div>

      <div
        className="
          min-w-0
        "
      >
        <p
          className="
            text-[11px]
            font-semibold
            text-slate-700
          "
        >
          {title}
        </p>

        <p
          className="
            mt-0.5
            truncate
            text-[9px]
            text-slate-400
          "
        >
          {description}
        </p>
      </div>
    </button>
  );
}

/* =========================================================
   SECTION HEADER
========================================================= */

function SectionHeader({
  icon:
    Icon,
  title,
  description,
}: {
  icon:
    typeof UserRound;

  title:
    string;

  description:
    string;
}) {
  return (
    <div
      className="
        flex
        items-start
        justify-between
        gap-4
        border-b
        border-slate-200
        px-5
        py-4
      "
    >
      <div>
        <h2
          className="
            text-sm
            font-semibold
            text-slate-950
          "
        >
          {title}
        </h2>

        <p
          className="
            mt-1
            max-w-2xl
            text-[10px]
            leading-5
            text-slate-500
          "
        >
          {description}
        </p>
      </div>

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
        <Icon
          size={16}
        />
      </div>
    </div>
  );
}

/* =========================================================
   COMMON UI
========================================================= */

function Field({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <div>
      {children}
    </div>
  );
}

function FieldLabel({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <label
      className="
        mb-2
        block
        text-[10px]
        font-bold
        uppercase
        tracking-[0.08em]
        text-slate-400
      "
    >
      {children}
    </label>
  );
}

function PasswordInput({
  value,
  disabled,
  placeholder,
  autoComplete,
  onChange,
}: {
  value:
    string;

  disabled:
    boolean;

  placeholder:
    string;

  autoComplete:
    string;

  onChange:
    (
      value:
        string,
    ) => void;
}) {
  return (
    <div
      className="
        relative
      "
    >
      <LockKeyhole
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
        type="password"
        value={
          value
        }
        disabled={
          disabled
        }
        placeholder={
          placeholder
        }
        autoComplete={
          autoComplete
        }
        onChange={(
          event,
        ) =>
          onChange(
            event
              .target
              .value,
          )
        }
        className="
          h-10
          w-full
          border
          border-slate-200
          bg-white
          pl-9
          pr-3
          text-xs
          text-slate-800
          outline-none
          transition
          placeholder:text-slate-400
          hover:border-slate-300
          focus:border-[#CC3A67]
          focus:ring-2
          focus:ring-[#FDC1C9]/30
          disabled:bg-slate-50
        "
      />
    </div>
  );
}

function NoticeBox({
  notice,
}: {
  notice:
    Notice;
}) {
  if (
    !notice
  ) {
    return null;
  }

  return (
    <div
      className={`
        mb-4
        flex
        items-start
        gap-2.5
        border
        px-3
        py-2.5
        ${
          notice.type ===
          "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-red-200 bg-red-50 text-red-700"
        }
      `}
    >
      {notice.type ===
      "success" ? (
        <CheckCircle2
          size={14}
          className="
            mt-0.5
            shrink-0
          "
        />
      ) : (
        <AlertCircle
          size={14}
          className="
            mt-0.5
            shrink-0
          "
        />
      )}

      <p
        className="
          text-[10px]
          leading-5
        "
      >
        {
          notice.message
        }
      </p>
    </div>
  );
}

function MetadataRow({
  label,
  value,
  mono = false,
}: {
  label:
    string;

  value:
    string;

  mono?:
    boolean;
}) {
  return (
    <div
      className="
        mt-3
        border-t
        border-slate-200
        pt-3
      "
    >
      <p
        className="
          text-[9px]
          font-semibold
          uppercase
          tracking-[0.06em]
          text-slate-400
        "
      >
        {label}
      </p>

      <p
        className={`
          mt-1
          break-all
          font-medium
          text-slate-700
          ${
            mono
              ? "font-mono text-[9px]"
              : "text-[11px]"
          }
        `}
      >
        {value}
      </p>
    </div>
  );
}

function PrimaryButton({
  children,
  disabled,
  loading,
  loadingText,
  dark = false,
  onClick,
}: {
  children:
    React.ReactNode;

  disabled:
    boolean;

  loading:
    boolean;

  loadingText:
    string;

  dark?:
    boolean;

  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      disabled={
        disabled
      }
      onClick={
        onClick
      }
      className={`
        inline-flex
        h-9
        items-center
        gap-2
        px-4
        text-[11px]
        font-semibold
        text-white
        transition
        disabled:cursor-not-allowed
        disabled:opacity-50
        ${
          dark
            ? "bg-[#72213A] hover:bg-[#5f1930]"
            : "bg-[#A92F56] hover:bg-[#8f2748]"
        }
      `}
    >
      {loading ? (
        <>
          <Loader2
            size={13}
            className="
              animate-spin
            "
          />

          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}

function SecondaryButton({
  children,
  disabled,
  onClick,
}: {
  children:
    React.ReactNode;

  disabled:
    boolean;

  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      disabled={
        disabled
      }
      onClick={
        onClick
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
      {children}
    </button>
  );
}