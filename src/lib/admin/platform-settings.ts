import "server-only";

import {
  requireAdmin,
} from "@/lib/auth/session";

import {
  getSupabaseAdmin,
} from "@/lib/supabase/admin";

export type AdminSettingsAccount = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  is_online: boolean | null;
  last_seen: string | null;
};

export type AdminPolicySetting = {
  id: number;
  key: string;
  value: string | null;
  type: string;
  grp: string;
  description: string | null;
  updated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type AdminSettingsPageData = {
  account: AdminSettingsAccount;
  policies: AdminPolicySetting[];
  activeSessions: number;
};

type RawPlatformSetting = {
  id: number | string;
  key: string;
  value: string | null;
  type: string;
  grp: string | null;
  description: string | null;
  updated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

/* =========================================================
   POLICY FILTERING
========================================================= */

function normalizePolicyIdentifier(
  value:
    string | null,
): string {
  return (
    value ??
    ""
  )
    .trim()
    .toLowerCase()
    .replace(
      /[\s.-]+/g,
      "_",
    )
    .replace(
      /_+/g,
      "_",
    );
}

/*
 * TERMS OF SERVICE
 *
 * PIN & TELL uses "Terms and Conditions"
 * as the authoritative terms document.
 *
 * Any old Terms of Service record remains
 * in platform_settings for compatibility /
 * historical purposes, but is intentionally
 * hidden from the admin policy editor.
 */
function isTermsOfServiceIdentifier(
  value:
    string,
): boolean {
  const normalized =
    normalizePolicyIdentifier(
      value,
    );

  return (
    normalized ===
      "terms_of_service" ||
    normalized ===
      "term_of_service" ||
    normalized ===
      "terms_service" ||
    normalized ===
      "tos" ||
    normalized.startsWith(
      "terms_of_service_",
    ) ||
    normalized.endsWith(
      "_terms_of_service",
    )
  );
}

/*
 * These policy records are intentionally
 * excluded from the admin settings UI:
 *
 * - Cookie Policy
 * - GDPR-related settings
 * - Terms of Service
 *
 * Their database rows are NOT deleted.
 *
 * Terms and Conditions remains visible
 * and is the authoritative terms document.
 */
function isExcludedPolicy(
  setting:
    RawPlatformSetting,
): boolean {
  const key =
    normalizePolicyIdentifier(
      setting.key,
    );

  const group =
    normalizePolicyIdentifier(
      setting.grp,
    );

  const combined =
    `${key} ${group}`;

  if (
    combined.includes(
      "cookie",
    )
  ) {
    return true;
  }

  if (
    combined.includes(
      "gdpr",
    )
  ) {
    return true;
  }

  /*
   * Prefer checking the actual setting
   * key for Terms of Service so that
   * generic legal groups do not cause
   * Terms and Conditions to disappear.
   */
  if (
    isTermsOfServiceIdentifier(
      setting.key,
    )
  ) {
    return true;
  }

  return false;
}

function isPolicySetting(
  setting:
    RawPlatformSetting,
): boolean {
  if (
    isExcludedPolicy(
      setting,
    )
  ) {
    return false;
  }

  const key =
    normalizePolicyIdentifier(
      setting.key,
    );

  const group =
    normalizePolicyIdentifier(
      setting.grp,
    );

  const policyTerms = [
    "policy",
    "policies",
    "privacy",
    "terms",
    "legal",
    "agreement",
    "consent",
    "guideline",
    "community_guideline",
  ];

  return policyTerms.some(
    (
      term,
    ) =>
      key.includes(
        term,
      ) ||
      group.includes(
        term,
      ),
  );
}

function comparePolicies(
  a:
    AdminPolicySetting,
  b:
    AdminPolicySetting,
): number {
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

/* =========================================================
   PAGE DATA
========================================================= */

export async function getAdminSettingsPageData(): Promise<AdminSettingsPageData> {
  const currentAdmin =
    await requireAdmin();

  const supabase =
    getSupabaseAdmin();

  /* =======================================================
     ADMIN ACCOUNT
  ======================================================= */

  const {
    data:
      accountData,

    error:
      accountError,
  } =
    await supabase
      .from(
        "admins",
      )
      .select(`
        id,
        email,
        full_name,
        role,
        status,
        created_at,
        updated_at,
        is_online,
        last_seen
      `)
      .eq(
        "id",
        currentAdmin.id,
      )
      .single();

  if (
    accountError ||
    !accountData
  ) {
    console.error(
      "[ADMIN SETTINGS] Failed to load admin account:",
      accountError,
    );

    throw new Error(
      "Unable to load the administrator account.",
    );
  }

  /* =======================================================
     POLICY SETTINGS
  ======================================================= */

  const {
    data:
      settingsData,

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
      "[ADMIN SETTINGS] Failed to load policy settings:",
      settingsError,
    );
  }

  const rawSettings =
    (
      settingsData ??
      []
    ) as RawPlatformSetting[];

  /*
   * Only actual policy/legal records are
   * exposed here.
   *
   * The following remain hidden without
   * deleting their database rows:
   *
   * - Cookie-related records
   * - GDPR-related records
   * - Legacy Terms of Service
   *
   * Terms and Conditions remains visible.
   */
  const policies:
    AdminPolicySetting[] =
    rawSettings
      .filter(
        isPolicySetting,
      )
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
            (
              setting.grp ??
              "Policies"
            ).trim() ||
            "Policies",

          description:
            setting.description,

          updated_by:
            setting.updated_by,

          created_at:
            setting.created_at,

          updated_at:
            setting.updated_at,
        }),
      )
      .sort(
        comparePolicies,
      );

  /* =======================================================
     ACTIVE ADMIN SESSIONS
  ======================================================= */

  const now =
    new Date()
      .toISOString();

  const {
    count:
      activeSessions,

    error:
      sessionError,
  } =
    await supabase
      .from(
        "admin_sessions",
      )
      .select(
        "id",
        {
          count:
            "exact",

          head:
            true,
        },
      )
      .eq(
        "admin_id",
        currentAdmin.id,
      )
      .gt(
        "expires_at",
        now,
      );

  if (
    sessionError
  ) {
    console.error(
      "[ADMIN SETTINGS] Failed to count active sessions:",
      sessionError,
    );
  }

  return {
    account: {
      id:
        accountData.id,

      email:
        accountData.email,

      full_name:
        accountData.full_name,

      role:
        accountData.role,

      status:
        accountData.status,

      created_at:
        accountData.created_at,

      updated_at:
        accountData.updated_at,

      is_online:
        accountData.is_online,

      last_seen:
        accountData.last_seen,
    },

    policies,

    activeSessions:
      activeSessions ??
      0,
  };
}