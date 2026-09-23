"use client";

import {
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  AlertCircle,
  Check,
  ChevronRight,
  CircleDot,
  Loader2,
  RotateCcw,
  Save,
  Settings2,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  savePlatformSettingAction,
} from "@/app/admin/(protected)/settings/actions";

import type {
  PlatformSettingGroup,
  PlatformSettingRow,
} from "@/lib/admin/platform-settings";

type Props = {
  groups:
    PlatformSettingGroup[];
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

type ControlKind =
  | "boolean"
  | "number"
  | "textarea"
  | "password"
  | "email"
  | "url"
  | "text";

function buildValueMap(
  groups:
    PlatformSettingGroup[],
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
    const group of
    groups
  ) {
    for (
      const setting of
      group.settings
    ) {
      values[
        setting.key
      ] =
        setting.value ??
        "";
    }
  }

  return values;
}

function normalizeType(
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

function getControlKind(
  setting:
    PlatformSettingRow,
): ControlKind {
  const type =
    normalizeType(
      setting.type,
    );

  if (
    [
      "boolean",
      "bool",
      "toggle",
      "switch",
    ].includes(
      type,
    )
  ) {
    return "boolean";
  }

  if (
    [
      "number",
      "numeric",
      "integer",
      "int",
      "float",
      "double",
      "decimal",
    ].includes(
      type,
    )
  ) {
    return "number";
  }

  if (
    [
      "textarea",
      "text_area",
      "multiline",
      "longtext",
      "long_text",
      "json",
    ].includes(
      type,
    )
  ) {
    return "textarea";
  }

  if (
    [
      "password",
      "secret",
    ].includes(
      type,
    )
  ) {
    return "password";
  }

  if (
    type ===
    "email"
  ) {
    return "email";
  }

  if (
    type ===
    "url"
  ) {
    return "url";
  }

  return "text";
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
  previousValue:
    string,
): string {
  const previous =
    previousValue
      .trim()
      .toLowerCase();

  /*
   * Preserve the existing database
   * representation where possible.
   *
   * Examples:
   * 1 / 0
   * yes / no
   * enabled / disabled
   * true / false
   */
  if (
    [
      "1",
      "0",
    ].includes(
      previous,
    )
  ) {
    return enabled
      ? "1"
      : "0";
  }

  if (
    [
      "yes",
      "no",
    ].includes(
      previous,
    )
  ) {
    return enabled
      ? "yes"
      : "no";
  }

  if (
    [
      "enabled",
      "disabled",
    ].includes(
      previous,
    )
  ) {
    return enabled
      ? "enabled"
      : "disabled";
  }

  if (
    [
      "on",
      "off",
    ].includes(
      previous,
    )
  ) {
    return enabled
      ? "on"
      : "off";
  }

  return enabled
    ? "true"
    : "false";
}

function formatSettingTitle(
  key:
    string,
): string {
  return key
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

function formatGroupTitle(
  group:
    string,
): string {
  return group
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

function groupId(
  group:
    string,
): string {
  return `settings-${group
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    )}`;
}

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

function adminName(
  setting:
    PlatformSettingRow,
): string {
  if (
    !setting.updated_admin
  ) {
    return "Not recorded";
  }

  return (
    setting.updated_admin
      .full_name
      ?.trim() ||
    setting.updated_admin
      .email
  );
}

export default function PlatformSettingsForm({
  groups,
}: Props) {
  const router =
    useRouter();

  const initialValues =
    useMemo(
      () =>
        buildValueMap(
          groups,
        ),
      [
        groups,
      ],
    );

  const [
    values,
    setValues,
  ] =
    useState<
      Record<
        string,
        string
      >
    >(
      () => ({
        ...initialValues,
      }),
    );

  const [
    baselineValues,
    setBaselineValues,
  ] =
    useState<
      Record<
        string,
        string
      >
    >(
      () => ({
        ...initialValues,
      }),
    );

  const [
    notice,
    setNotice,
  ] =
    useState<Notice>(
      null,
    );

  const [
    saving,
    startSaving,
  ] =
    useTransition();

  const changedKeys =
    useMemo(
      () =>
        Object.keys(
          values,
        ).filter(
          (
            key,
          ) =>
            values[
              key
            ] !==
            (
              baselineValues[
                key
              ] ??
              ""
            ),
        ),
      [
        values,
        baselineValues,
      ],
    );

  const changedKeySet =
    useMemo(
      () =>
        new Set(
          changedKeys,
        ),
      [
        changedKeys,
      ],
    );

  const hasChanges =
    changedKeys.length >
    0;

  function setValue(
    key:
      string,
    value:
      string,
  ) {
    setValues(
      (
        current,
      ) => ({
        ...current,

        [key]:
          value,
      }),
    );

    setNotice(
      null,
    );
  }

  function resetChanges() {
    setValues({
      ...baselineValues,
    });

    setNotice(
      null,
    );
  }

  function scrollToGroup(
    group:
      string,
  ) {
    const element =
      document.getElementById(
        groupId(
          group,
        ),
      );

    element?.scrollIntoView({
      behavior:
        "smooth",

      block:
        "start",
    });
  }

  function saveChanges() {
    if (
      !hasChanges ||
      saving
    ) {
      return;
    }

    setNotice(
      null,
    );

    const keysToSave = [
      ...changedKeys,
    ];

    startSaving(
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
            await savePlatformSettingAction({
              key,

              value:
                values[
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

        /*
         * Only update the local baseline
         * for settings that actually
         * saved successfully.
         */
        if (
          successful.length >
          0
        ) {
          setBaselineValues(
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
                  values[
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
          setNotice({
            type:
              "error",

            message:
              successful.length >
              0
                ? `${successful.length} setting${successful.length === 1 ? "" : "s"} saved, but ${failures.length} failed. ${failures.join(" ")}`
                : failures.join(
                    " ",
                  ),
          });
        } else {
          setNotice({
            type:
              "success",

            message:
              `${successful.length} setting${successful.length === 1 ? "" : "s"} saved successfully.`,
          });
        }

        /*
         * Refresh server-provided
         * metadata such as updated_at
         * and updated_admin.
         */
        router.refresh();
      },
    );
  }

  if (
    groups.length ===
    0
  ) {
    return (
      <div
        className="
          border
          border-slate-200
          bg-white
          px-6
          py-16
          text-center
        "
      >
        <div
          className="
            mx-auto
            flex
            h-11
            w-11
            items-center
            justify-center
            bg-slate-100
            text-slate-400
          "
        >
          <Settings2
            size={19}
          />
        </div>

        <p
          className="
            mt-4
            text-sm
            font-semibold
            text-slate-800
          "
        >
          No platform settings
        </p>

        <p
          className="
            mx-auto
            mt-1
            max-w-md
            text-xs
            leading-5
            text-slate-400
          "
        >
          No configuration rows
          currently exist in the
          platform_settings table.
        </p>
      </div>
    );
  }

  return (
    <div
      className="
        grid
        gap-5
        xl:grid-cols-[230px_minmax(0,1fr)]
      "
    >
      {/* =========================
          SETTINGS NAVIGATION
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
          "
        >
          <div
            className="
              border-b
              border-slate-100
              px-4
              py-4
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
              Settings
            </p>

            <p
              className="
                mt-1
                text-xs
                text-slate-500
              "
            >
              {groups.length} configuration
              {groups.length ===
              1
                ? " group"
                : " groups"}
            </p>
          </div>

          <nav
            className="
              p-2
            "
          >
            {groups.map(
              (
                group,
              ) => (
                <button
                  key={
                    group.name
                  }
                  type="button"
                  onClick={() =>
                    scrollToGroup(
                      group.name,
                    )
                  }
                  className="
                    group
                    flex
                    w-full
                    items-center
                    gap-3
                    px-3
                    py-2.5
                    text-left
                    transition
                    hover:bg-slate-50
                  "
                >
                  <div
                    className="
                      flex
                      h-7
                      w-7
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
                    <CircleDot
                      size={12}
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
                        truncate
                        text-[11px]
                        font-semibold
                        text-slate-700
                      "
                    >
                      {formatGroupTitle(
                        group.name,
                      )}
                    </p>

                    <p
                      className="
                        mt-0.5
                        text-[9px]
                        text-slate-400
                      "
                    >
                      {
                        group
                          .settings
                          .length
                      }{" "}
                      setting
                      {group.settings
                        .length ===
                      1
                        ? ""
                        : "s"}
                    </p>
                  </div>

                  <ChevronRight
                    size={13}
                    className="
                      shrink-0
                      text-slate-300
                      transition
                      group-hover:translate-x-0.5
                      group-hover:text-slate-500
                    "
                  />
                </button>
              ),
            )}
          </nav>
        </div>
      </aside>

      {/* =========================
          SETTINGS CONTENT
      ========================== */}
      <div
        className="
          min-w-0
          space-y-5
        "
      >
        {/* Notice */}
        {notice && (
          <div
            className={`
              flex
              items-start
              gap-3
              border
              px-4
              py-3
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
              <Check
                size={15}
                className="
                  mt-0.5
                  shrink-0
                "
              />
            ) : (
              <AlertCircle
                size={15}
                className="
                  mt-0.5
                  shrink-0
                "
              />
            )}

            <p
              className="
                text-[11px]
                leading-5
              "
            >
              {
                notice.message
              }
            </p>
          </div>
        )}

        {groups.map(
          (
            group,
          ) => (
            <section
              key={
                group.name
              }
              id={groupId(
                group.name,
              )}
              className="
                scroll-mt-[88px]
                border
                border-slate-200
                bg-white
              "
            >
              {/* Group header */}
              <div
                className="
                  flex
                  items-center
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
                    {formatGroupTitle(
                      group.name,
                    )}
                  </h2>

                  <p
                    className="
                      mt-1
                      text-[10px]
                      text-slate-400
                    "
                  >
                    {
                      group
                        .settings
                        .length
                    }{" "}
                    configuration
                    {group.settings
                      .length ===
                    1
                      ? ""
                      : "s"}
                  </p>
                </div>

                <div
                  className="
                    flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    bg-[#A92F56]/[0.08]
                    text-[#A92F56]
                  "
                >
                  <Settings2
                    size={14}
                  />
                </div>
              </div>

              {/* Settings */}
              <div>
                {group.settings.map(
                  (
                    setting,
                    index,
                  ) => (
                    <SettingControl
                      key={
                        setting.key
                      }
                      setting={
                        setting
                      }
                      value={
                        values[
                          setting.key
                        ] ??
                        ""
                      }
                      originalValue={
                        baselineValues[
                          setting.key
                        ] ??
                        ""
                      }
                      changed={
                        changedKeySet.has(
                          setting.key,
                        )
                      }
                      disabled={
                        saving
                      }
                      last={
                        index ===
                        group.settings
                          .length -
                          1
                      }
                      onChange={(
                        value,
                      ) =>
                        setValue(
                          setting.key,
                          value,
                        )
                      }
                    />
                  ),
                )}
              </div>
            </section>
          ),
        )}

        {/* Bottom spacing for sticky bar */}
        <div
          className="
            h-16
          "
        />
      </div>

      {/* =========================
          STICKY SAVE BAR
      ========================== */}
      <div
        className="
          fixed
          bottom-0
          left-0
          right-0
          z-30
          border-t
          border-slate-200
          bg-white/95
          shadow-[0_-8px_24px_rgba(15,23,42,0.05)]
          backdrop-blur
          lg:left-[260px]
        "
      >
        <div
          className="
            mx-auto
            flex
            min-h-[66px]
            max-w-[1600px]
            items-center
            justify-between
            gap-4
            px-4
            sm:px-6
            xl:px-8
          "
        >
          <div
            className="
              min-w-0
            "
          >
            {hasChanges ? (
              <>
                <p
                  className="
                    text-xs
                    font-semibold
                    text-slate-800
                  "
                >
                  {changedKeys.length} unsaved
                  {changedKeys.length ===
                  1
                    ? " change"
                    : " changes"}
                </p>

                <p
                  className="
                    mt-0.5
                    truncate
                    text-[10px]
                    text-slate-400
                  "
                >
                  Review your changes before
                  applying them.
                </p>
              </>
            ) : (
              <>
                <p
                  className="
                    flex
                    items-center
                    gap-1.5
                    text-xs
                    font-semibold
                    text-slate-700
                  "
                >
                  <Check
                    size={13}
                    className="
                      text-emerald-600
                    "
                  />

                  All changes saved
                </p>

                <p
                  className="
                    mt-0.5
                    text-[10px]
                    text-slate-400
                  "
                >
                  Platform configuration is
                  up to date.
                </p>
              </>
            )}
          </div>

          <div
            className="
              flex
              shrink-0
              items-center
              gap-2
            "
          >
            <button
              type="button"
              disabled={
                !hasChanges ||
                saving
              }
              onClick={
                resetChanges
              }
              className="
                inline-flex
                h-9
                items-center
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
              <RotateCcw
                size={13}
              />

              Reset
            </button>

            <button
              type="button"
              disabled={
                !hasChanges ||
                saving
              }
              onClick={
                saveChanges
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
              {saving ? (
                <>
                  <Loader2
                    size={13}
                    className="
                      animate-spin
                    "
                  />

                  Saving...
                </>
              ) : (
                <>
                  <Save
                    size={13}
                  />

                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingControl({
  setting,
  value,
  originalValue,
  changed,
  disabled,
  last,
  onChange,
}: {
  setting:
    PlatformSettingRow;

  value:
    string;

  originalValue:
    string;

  changed:
    boolean;

  disabled:
    boolean;

  last:
    boolean;

  onChange:
    (
      value:
        string,
    ) => void;
}) {
  const control =
    getControlKind(
      setting,
    );

  return (
    <div
      className={`
        grid
        gap-4
        px-5
        py-5
        lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)]
        lg:items-start
        ${
          last
            ? ""
            : "border-b border-slate-100"
        }
      `}
    >
      {/* Information */}
      <div
        className="
          min-w-0
          pr-0
          lg:pr-6
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
          <h3
            className="
              text-xs
              font-semibold
              text-slate-800
            "
          >
            {formatSettingTitle(
              setting.key,
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

        {setting.description ? (
          <p
            className="
              mt-1.5
              max-w-2xl
              text-[11px]
              leading-5
              text-slate-500
            "
          >
            {
              setting.description
            }
          </p>
        ) : (
          <p
            className="
              mt-1.5
              text-[11px]
              text-slate-400
            "
          >
            No description provided.
          </p>
        )}

        <div
          className="
            mt-3
            flex
            flex-wrap
            items-center
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
                setting.key
              }
            </code>
          </span>

          <span>
            Type:{" "}
            <span
              className="
                font-medium
                text-slate-500
              "
            >
              {
                setting.type
              }
            </span>
          </span>
        </div>

        <div
          className="
            mt-2
            flex
            flex-wrap
            gap-x-4
            gap-y-1
            text-[9px]
            text-slate-400
          "
        >
          <span>
            Last updated:{" "}
            <span
              className="
                text-slate-500
              "
            >
              {formatDateTime(
                setting.updated_at,
              )}
            </span>
          </span>

          <span>
            By:{" "}
            <span
              className="
                text-slate-500
              "
            >
              {adminName(
                setting,
              )}
            </span>
          </span>
        </div>
      </div>

      {/* Control */}
      <div
        className="
          min-w-0
        "
      >
        {control ===
          "boolean" && (
          <BooleanControl
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
        )}

        {control ===
          "number" && (
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
              border
              border-slate-200
              bg-white
              px-3
              text-xs
              text-slate-800
              outline-none
              transition
              hover:border-slate-300
              focus:border-[#CC3A67]
              focus:ring-2
              focus:ring-[#FDC1C9]/30
              disabled:cursor-not-allowed
              disabled:bg-slate-50
              disabled:text-slate-400
            "
          />
        )}

        {control ===
          "textarea" && (
          <textarea
            value={
              value
            }
            disabled={
              disabled
            }
            rows={
              5
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
              w-full
              resize-y
              border
              border-slate-200
              bg-white
              px-3
              py-2.5
              text-xs
              leading-5
              text-slate-800
              outline-none
              transition
              hover:border-slate-300
              focus:border-[#CC3A67]
              focus:ring-2
              focus:ring-[#FDC1C9]/30
              disabled:cursor-not-allowed
              disabled:bg-slate-50
              disabled:text-slate-400
            "
          />
        )}

        {control ===
          "password" && (
          <input
            type="password"
            value={
              value
            }
            disabled={
              disabled
            }
            autoComplete="off"
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
              px-3
              text-xs
              text-slate-800
              outline-none
              transition
              hover:border-slate-300
              focus:border-[#CC3A67]
              focus:ring-2
              focus:ring-[#FDC1C9]/30
              disabled:cursor-not-allowed
              disabled:bg-slate-50
              disabled:text-slate-400
            "
          />
        )}

        {control ===
          "email" && (
          <input
            type="email"
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
              border
              border-slate-200
              bg-white
              px-3
              text-xs
              text-slate-800
              outline-none
              transition
              hover:border-slate-300
              focus:border-[#CC3A67]
              focus:ring-2
              focus:ring-[#FDC1C9]/30
              disabled:cursor-not-allowed
              disabled:bg-slate-50
              disabled:text-slate-400
            "
          />
        )}

        {control ===
          "url" && (
          <input
            type="url"
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
              border
              border-slate-200
              bg-white
              px-3
              text-xs
              text-slate-800
              outline-none
              transition
              hover:border-slate-300
              focus:border-[#CC3A67]
              focus:ring-2
              focus:ring-[#FDC1C9]/30
              disabled:cursor-not-allowed
              disabled:bg-slate-50
              disabled:text-slate-400
            "
          />
        )}

        {control ===
          "text" && (
          <input
            type="text"
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
              border
              border-slate-200
              bg-white
              px-3
              text-xs
              text-slate-800
              outline-none
              transition
              hover:border-slate-300
              focus:border-[#CC3A67]
              focus:ring-2
              focus:ring-[#FDC1C9]/30
              disabled:cursor-not-allowed
              disabled:bg-slate-50
              disabled:text-slate-400
            "
          />
        )}
      </div>
    </div>
  );
}

function BooleanControl({
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
        items-center
        justify-between
        gap-4
        border
        border-slate-200
        bg-slate-50/50
        px-3
        py-2.5
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
          Click the switch to change
          this setting.
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