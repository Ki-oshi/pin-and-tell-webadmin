import "server-only";

import {
  getSupabaseAdmin,
} from "@/lib/supabase/admin";

export type PlatformSettingAdmin = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
};

export type PlatformSettingRow = {
  id: number;

  key: string;

  value: string | null;

  type: string;

  grp: string;

  description: string | null;

  updated_by: string | null;

  created_at: string | null;

  updated_at: string | null;

  updated_admin:
    PlatformSettingAdmin | null;
};

export type PlatformSettingGroup = {
  name: string;

  settings:
    PlatformSettingRow[];
};

export type PlatformSettingsPageData = {
  settings:
    PlatformSettingRow[];

  groups:
    PlatformSettingGroup[];

  stats: {
    total:
      number;

    groups:
      number;

    configured:
      number;

    lastUpdated:
      string | null;
  };

  hasErrors:
    boolean;
};

type RawPlatformSetting = {
  id:
    number | string;

  key:
    string;

  value:
    string | null;

  type:
    string;

  grp:
    string;

  description:
    string | null;

  updated_by:
    string | null;

  created_at:
    string | null;

  updated_at:
    string | null;
};

function normalizeGroup(
  value:
    string | null,
): string {
  const normalized =
    value?.trim();

  if (
    !normalized
  ) {
    return "General";
  }

  return normalized;
}

function compareSettings(
  a:
    PlatformSettingRow,
  b:
    PlatformSettingRow,
) {
  const groupCompare =
    a.grp.localeCompare(
      b.grp,
      undefined,
      {
        sensitivity:
          "base",
      },
    );

  if (
    groupCompare !==
    0
  ) {
    return groupCompare;
  }

  return a.key.localeCompare(
    b.key,
    undefined,
    {
      sensitivity:
        "base",
    },
  );
}

function getLastUpdated(
  settings:
    PlatformSettingRow[],
): string | null {
  let latest:
    string | null =
    null;

  let latestTime =
    Number.NEGATIVE_INFINITY;

  for (
    const setting of
    settings
  ) {
    if (
      !setting.updated_at
    ) {
      continue;
    }

    const time =
      new Date(
        setting.updated_at,
      ).getTime();

    if (
      !Number.isFinite(
        time,
      )
    ) {
      continue;
    }

    if (
      time >
      latestTime
    ) {
      latestTime =
        time;

      latest =
        setting.updated_at;
    }
  }

  return latest;
}

export async function getPlatformSettingsPageData(): Promise<PlatformSettingsPageData> {
  const supabase =
    getSupabaseAdmin();

  const errors:
    unknown[] = [];

  const {
    data:
      rawSettingsData,

    error:
      settingsError,
  } =
    await supabase
      .from(
        "platform_settings",
      )
      .select(`
        id,
        key,
        value,
        type,
        grp,
        description,
        updated_by,
        created_at,
        updated_at
      `)
      .order(
        "grp",
        {
          ascending:
            true,
        },
      )
      .order(
        "key",
        {
          ascending:
            true,
        },
      );

  if (
    settingsError
  ) {
    console.error(
      "[ADMIN SETTINGS] Failed to load platform settings:",
      settingsError,
    );

    errors.push(
      settingsError,
    );
  }

  const rawSettings =
    (
      rawSettingsData ??
      []
    ) as RawPlatformSetting[];

  /*
   * Load only the administrators
   * referenced by updated_by.
   *
   * This lets the settings page show
   * who last modified a setting without
   * changing the platform_settings
   * schema.
   */
  const adminIds = [
    ...new Set(
      rawSettings
        .map(
          (
            setting,
          ) =>
            setting.updated_by,
        )
        .filter(
          (
            value,
          ): value is string =>
            Boolean(
              value,
            ),
        ),
    ),
  ];

  const admins =
    new Map<
      string,
      PlatformSettingAdmin
    >();

  if (
    adminIds.length >
    0
  ) {
    const {
      data:
        adminData,

      error:
        adminError,
    } =
      await supabase
        .from(
          "admins",
        )
        .select(`
          id,
          email,
          full_name,
          role
        `)
        .in(
          "id",
          adminIds,
        );

    if (
      adminError
    ) {
      console.error(
        "[ADMIN SETTINGS] Failed to load setting administrators:",
        adminError,
      );

      errors.push(
        adminError,
      );
    } else {
      for (
        const admin of
        adminData ??
        []
      ) {
        admins.set(
          admin.id,
          {
            id:
              admin.id,

            email:
              admin.email,

            full_name:
              admin.full_name,

            role:
              admin.role,
          },
        );
      }
    }
  }

  const settings:
    PlatformSettingRow[] =
    rawSettings
      .map(
        (
          setting,
        ) => ({
          id:
            Number(
              setting.id,
            ),

          key:
            setting.key,

          value:
            setting.value,

          type:
            setting.type,

          grp:
            normalizeGroup(
              setting.grp,
            ),

          description:
            setting.description,

          updated_by:
            setting.updated_by,

          created_at:
            setting.created_at,

          updated_at:
            setting.updated_at,

          updated_admin:
            setting.updated_by
              ? admins.get(
                  setting.updated_by,
                ) ??
                null
              : null,
        }),
      )
      .sort(
        compareSettings,
      );

  /*
   * Group dynamically using whatever
   * grp values already exist in the
   * database.
   *
   * We deliberately do not hard-code
   * General, Security, Moderation, etc.
   * because platform_settings is the
   * authoritative configuration source.
   */
  const groupMap =
    new Map<
      string,
      PlatformSettingRow[]
    >();

  for (
    const setting of
    settings
  ) {
    const existing =
      groupMap.get(
        setting.grp,
      );

    if (
      existing
    ) {
      existing.push(
        setting,
      );

      continue;
    }

    groupMap.set(
      setting.grp,
      [
        setting,
      ],
    );
  }

  const groups:
    PlatformSettingGroup[] =
    Array.from(
      groupMap.entries(),
    ).map(
      ([
        name,
        groupSettings,
      ]) => ({
        name,

        settings:
          groupSettings,
      }),
    );

  const configured =
    settings.filter(
      (
        setting,
      ) =>
        setting.value !==
          null &&
        setting.value
          .trim()
          .length >
          0,
    ).length;

  return {
    settings,

    groups,

    stats: {
      total:
        settings.length,

      groups:
        groups.length,

      configured,

      lastUpdated:
        getLastUpdated(
          settings,
        ),
    },

    hasErrors:
      errors.length >
      0,
  };
}