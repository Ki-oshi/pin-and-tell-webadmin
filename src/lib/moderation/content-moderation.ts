/*
 * ============================================================
 * PIN & TELL
 * Automated Content Moderation
 * ============================================================
 *
 * Purpose:
 * - Detect prohibited language before content is published.
 * - Support English and Filipino profanity / abusive language.
 * - Detect basic attempts to evade moderation.
 * - Classify violations by severity.
 * - Escalate serious content for administrator review.
 *
 * IMPORTANT:
 * This file only evaluates content.
 *
 * It does NOT:
 * - write database records
 * - create bans
 * - modify profiles
 * - create reports
 *
 * Enforcement is handled separately.
 * ============================================================
 */

/* ============================================================
   TYPES
============================================================ */

export type ModerationCategory =
  | "profanity"
  | "harassment"
  | "threat";

export type ModerationSeverity =
  | 1
  | 2
  | 3
  | 4
  | 5;

export type ModeratedField =
  | "title"
  | "description";

type ModerationRule = {
  id: string;

  term: string;

  category:
    ModerationCategory;

  severity:
    ModerationSeverity;

  requiresAdminReview?:
    boolean;
};

export type ModerationMatch = {
  ruleId:
    string;

  field:
    ModeratedField;

  category:
    ModerationCategory;

  severity:
    ModerationSeverity;

  /*
   * A masked representation is returned
   * instead of exposing the full detected
   * term in logs or administrative events.
   */
  maskedTerm:
    string;
};

export type ModerationResult = {
  allowed:
    boolean;

  blocked:
    boolean;

  requiresAdminReview:
    boolean;

  maxSeverity:
    ModerationSeverity | 0;

  matches:
    ModerationMatch[];

  userMessage:
    string | null;
};

export type PinContentInput = {
  title:
    string;

  description?:
    string | null;
};

/* ============================================================
   MODERATION RULES
============================================================ */

/*
 * Keep this list intentionally conservative.
 *
 * Do not put every slang word imaginable here.
 * False positives are worse than occasionally
 * missing borderline language.
 *
 * Rules can be expanded later without changing
 * the database.
 */

const MODERATION_RULES:
  ModerationRule[] = [
    /* ========================================================
       ENGLISH — GENERAL PROFANITY
    ======================================================== */

    {
      id: "en_profanity_001",
      term: "fuck",
      category:
        "profanity",
      severity: 1,
    },

    {
      id: "en_profanity_002",
      term: "fucking",
      category:
        "profanity",
      severity: 1,
    },

    {
      id: "en_profanity_003",
      term: "fucker",
      category:
        "profanity",
      severity: 1,
    },

    {
      id: "en_profanity_004",
      term: "motherfucker",
      category:
        "profanity",
      severity: 2,
    },

    {
      id: "en_profanity_005",
      term: "shit",
      category:
        "profanity",
      severity: 1,
    },

    {
      id: "en_profanity_006",
      term: "bullshit",
      category:
        "profanity",
      severity: 1,
    },

    {
      id: "en_profanity_007",
      term: "bitch",
      category:
        "harassment",
      severity: 2,
    },

    {
      id: "en_profanity_008",
      term: "asshole",
      category:
        "harassment",
      severity: 2,
    },

    {
      id: "en_profanity_009",
      term: "dickhead",
      category:
        "harassment",
      severity: 2,
    },

    {
      id: "en_profanity_010",
      term: "piss off",
      category:
        "profanity",
      severity: 1,
    },

    /* ========================================================
       FILIPINO — GENERAL PROFANITY
    ======================================================== */

    {
      id: "fil_profanity_001",
      term: "puta",
      category:
        "profanity",
      severity: 1,
    },

    {
      id: "fil_profanity_002",
      term: "putang ina",
      category:
        "profanity",
      severity: 2,
    },

    {
      id: "fil_profanity_003",
      term: "putangina",
      category:
        "profanity",
      severity: 2,
    },

    {
      id: "fil_profanity_004",
      term: "tangina",
      category:
        "profanity",
      severity: 2,
    },

    {
      id: "fil_profanity_005",
      term: "tang ina",
      category:
        "profanity",
      severity: 2,
    },

    {
      id: "fil_profanity_006",
      term: "gago",
      category:
        "harassment",
      severity: 2,
    },

    {
      id: "fil_profanity_007",
      term: "gaga",
      category:
        "harassment",
      severity: 2,
    },

    {
      id: "fil_profanity_008",
      term: "tanga",
      category:
        "harassment",
      severity: 2,
    },

    {
      id: "fil_profanity_009",
      term: "bobo",
      category:
        "harassment",
      severity: 2,
    },

    {
      id: "fil_profanity_010",
      term: "ulol",
      category:
        "harassment",
      severity: 2,
    },

    {
      id: "fil_profanity_011",
      term: "pakshet",
      category:
        "profanity",
      severity: 1,
    },

    /* ========================================================
       SERIOUS HARASSMENT
    ======================================================== */

    {
      id: "harassment_001",
      term: "kill yourself",
      category:
        "harassment",
      severity: 5,
      requiresAdminReview:
        true,
    },

    {
      id: "harassment_002",
      term: "go kill yourself",
      category:
        "harassment",
      severity: 5,
      requiresAdminReview:
        true,
    },

    {
      id: "harassment_003",
      term: "hope you die",
      category:
        "harassment",
      severity: 5,
      requiresAdminReview:
        true,
    },

    {
      id: "harassment_004",
      term: "you should die",
      category:
        "harassment",
      severity: 5,
      requiresAdminReview:
        true,
    },

    /* ========================================================
       THREATS
    ======================================================== */

    {
      id: "threat_001",
      term: "i will kill you",
      category:
        "threat",
      severity: 5,
      requiresAdminReview:
        true,
    },

    {
      id: "threat_002",
      term: "i'll kill you",
      category:
        "threat",
      severity: 5,
      requiresAdminReview:
        true,
    },

    {
      id: "threat_003",
      term: "i will hurt you",
      category:
        "threat",
      severity: 5,
      requiresAdminReview:
        true,
    },

    {
      id: "threat_004",
      term: "i'm going to kill you",
      category:
        "threat",
      severity: 5,
      requiresAdminReview:
        true,
    },
  ];

/* ============================================================
   CHARACTER NORMALIZATION
============================================================ */

/*
 * Common substitutions used to evade
 * word filters.
 *
 * Example:
 *
 * pvt@ -> pvta
 * sh1t -> shit
 * f0ck -> fock
 */

const CHARACTER_REPLACEMENTS:
  Record<
    string,
    string
  > = {
    "0": "o",
    "1": "i",
    "!": "i",
    "3": "e",
    "4": "a",
    "@": "a",
    "5": "s",
    "$": "s",
    "7": "t",
  };

/* ============================================================
   ZERO-WIDTH / INVISIBLE CHARACTERS
============================================================ */

const ZERO_WIDTH_REGEX =
  /[\u200B-\u200D\u2060\uFEFF]/g;

/* ============================================================
   NORMALIZE CONTENT
============================================================ */

export function normalizeModerationText(
  value:
    string,
): string {
  let text =
    value
      .normalize(
        "NFKD",
      )
      .toLowerCase()
      .replace(
        ZERO_WIDTH_REGEX,
        "",
      );

  /*
   * Remove Unicode combining marks.
   *
   * Example:
   *
   * á -> a
   * é -> e
   */
  text =
    text.replace(
      /\p{M}/gu,
      "",
    );

  /*
   * Convert common leetspeak
   * substitutions.
   */
  text =
    Array.from(
      text,
    )
      .map(
        (
          character,
        ) =>
          CHARACTER_REPLACEMENTS[
            character
          ] ??
          character,
      )
      .join("");

  /*
   * Convert punctuation to spaces.
   *
   * Examples:
   *
   * putang.ina
   * putang-ina
   * putang_ina
   *
   * all become:
   *
   * putang ina
   */
  text =
    text.replace(
      /[^\p{L}\p{N}]+/gu,
      " ",
    );

  /*
   * Collapse excessive repeated
   * characters.
   *
   * Example:
   *
   * gagoooooo
   * becomes
   * gago
   *
   * Two repeated characters remain
   * intact because legitimate words
   * may contain double letters.
   */
  text =
    text
      .split(
        /\s+/,
      )
      .map(
        (
          token,
        ) =>
          token.replace(
            /(.)\1{2,}/g,
            "$1",
          ),
      )
      .join(
        " ",
      );

  return text
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

/* ============================================================
   MASK MATCHED TERM
============================================================ */

function maskTerm(
  value:
    string,
): string {
  const normalized =
    normalizeModerationText(
      value,
    );

  if (
    !normalized
  ) {
    return "***";
  }

  return normalized
    .split(" ")
    .map(
      (
        word,
      ) => {
        if (
          word.length <=
          2
        ) {
          return "*".repeat(
            word.length,
          );
        }

        return `${word[0]}${"*".repeat(
          Math.max(
            word.length -
              2,
            1,
          ),
        )}${word[
          word.length -
            1
        ]}`;
      },
    )
    .join(" ");
}

/* ============================================================
   BUILD CONTENT TOKENS
============================================================ */

function getTokens(
  normalizedText:
    string,
): string[] {
  if (
    !normalizedText
  ) {
    return [];
  }

  return normalizedText
    .split(
      /\s+/,
    )
    .filter(
      Boolean,
    );
}

/* ============================================================
   GENERATE SEPARATED-LETTER CANDIDATES
============================================================ */

/*
 * Detects evasions such as:
 *
 * p u t a
 * g.a.g.o
 * f u c k
 *
 * after normalization.
 *
 * We only join runs consisting entirely
 * of single-character tokens.
 *
 * This helps avoid joining normal
 * sentences together.
 */

function getSeparatedLetterCandidates(
  tokens:
    string[],
): string[] {
  const candidates =
    new Set<string>();

  let current:
    string[] = [];

  function flush() {
    if (
      current.length >=
        3 &&
      current.length <=
        16
    ) {
      candidates.add(
        current.join(""),
      );
    }

    current =
      [];
  }

  for (
    const token of
    tokens
  ) {
    if (
      token.length ===
      1
    ) {
      current.push(
        token,
      );

      if (
        current.length >
        16
      ) {
        flush();
      }

      continue;
    }

    flush();
  }

  flush();

  return [
    ...candidates,
  ];
}

/* ============================================================
   RULE MATCHING
============================================================ */

function matchesRule(
  normalizedText:
    string,

  normalizedRule:
    string,
): boolean {
  if (
    !normalizedText ||
    !normalizedRule
  ) {
    return false;
  }

  const textTokens =
    getTokens(
      normalizedText,
    );

  const ruleTokens =
    getTokens(
      normalizedRule,
    );

  /*
   * Single word:
   * require an exact token match.
   *
   * This prevents:
   *
   * "ass"
   *
   * from matching:
   *
   * "class"
   * "grass"
   * "passage"
   */
  if (
    ruleTokens.length ===
    1
  ) {
    const ruleWord =
      ruleTokens[0];

    if (
      textTokens.includes(
        ruleWord,
      )
    ) {
      return true;
    }

    /*
     * Also check separated-letter
     * evasions.
     */
    const separatedCandidates =
      getSeparatedLetterCandidates(
        textTokens,
      );

    return separatedCandidates.includes(
      ruleWord,
    );
  }

  /*
   * Phrase:
   *
   * Padding with spaces prevents
   * partial-word matching.
   */
  const paddedText =
    ` ${normalizedText} `;

  const paddedRule =
    ` ${normalizedRule} `;

  return paddedText.includes(
    paddedRule,
  );
}

/* ============================================================
   MODERATE SINGLE FIELD
============================================================ */

function moderateField(
  field:
    ModeratedField,

  value:
    string,
): ModerationMatch[] {
  const normalized =
    normalizeModerationText(
      value,
    );

  if (
    !normalized
  ) {
    return [];
  }

  const matches:
    ModerationMatch[] = [];

  const detectedRuleIds =
    new Set<string>();

  for (
    const rule of
    MODERATION_RULES
  ) {
    const normalizedRule =
      normalizeModerationText(
        rule.term,
      );

    if (
      !matchesRule(
        normalized,
        normalizedRule,
      )
    ) {
      continue;
    }

    /*
     * Prevent duplicate matches if
     * normalization causes two checks
     * to detect the same rule.
     */
    if (
      detectedRuleIds.has(
        rule.id,
      )
    ) {
      continue;
    }

    detectedRuleIds.add(
      rule.id,
    );

    matches.push({
      ruleId:
        rule.id,

      field,

      category:
        rule.category,

      severity:
        rule.severity,

      maskedTerm:
        maskTerm(
          rule.term,
        ),
    });
  }

  return matches;
}

/* ============================================================
   ADMIN REVIEW CHECK
============================================================ */

function ruleRequiresAdminReview(
  ruleId:
    string,
): boolean {
  const rule =
    MODERATION_RULES.find(
      (
        current,
      ) =>
        current.id ===
        ruleId,
    );

  return Boolean(
    rule
      ?.requiresAdminReview,
  );
}

/* ============================================================
   MAX SEVERITY
============================================================ */

function getMaxSeverity(
  matches:
    ModerationMatch[],
): ModerationSeverity | 0 {
  if (
    matches.length ===
    0
  ) {
    return 0;
  }

  return matches.reduce<
    ModerationSeverity
  >(
    (
      highest,
      match,
    ) =>
      match.severity >
      highest
        ? match.severity
        : highest,

    1,
  );
}

/* ============================================================
   USER MESSAGE
============================================================ */

function buildUserMessage(
  matches:
    ModerationMatch[],
  requiresAdminReview:
    boolean,
): string | null {
  if (
    matches.length ===
    0
  ) {
    return null;
  }

  if (
    requiresAdminReview
  ) {
    return (
      "This content could not be published because it may violate " +
      "PIN & TELL's Community Conduct rules. The content may require " +
      "administrative review."
    );
  }

  const titleAffected =
    matches.some(
      (
        match,
      ) =>
        match.field ===
        "title",
    );

  const descriptionAffected =
    matches.some(
      (
        match,
      ) =>
        match.field ===
        "description",
    );

  let affectedField =
    "content";

  if (
    titleAffected &&
    descriptionAffected
  ) {
    affectedField =
      "title and description";
  } else if (
    titleAffected
  ) {
    affectedField =
      "title";
  } else if (
    descriptionAffected
  ) {
    affectedField =
      "description";
  }

  return (
    `Your ${affectedField} contains language that may violate ` +
    "PIN & TELL's Community Conduct rules. Please revise the content " +
    "before trying to publish it again."
  );
}

/* ============================================================
   PUBLIC PIN MODERATION FUNCTION
============================================================ */

export function moderatePinContent(
  input:
    PinContentInput,
): ModerationResult {
  const title =
    input.title ??
    "";

  const description =
    input.description ??
    "";

  const titleMatches =
    moderateField(
      "title",
      title,
    );

  const descriptionMatches =
    moderateField(
      "description",
      description,
    );

  const matches = [
    ...titleMatches,
    ...descriptionMatches,
  ];

  const requiresAdminReview =
    matches.some(
      (
        match,
      ) =>
        ruleRequiresAdminReview(
          match.ruleId,
        ),
    );

  const blocked =
    matches.length >
    0;

  return {
    allowed:
      !blocked,

    blocked,

    requiresAdminReview,

    maxSeverity:
      getMaxSeverity(
        matches,
      ),

    matches,

    userMessage:
      buildUserMessage(
        matches,
        requiresAdminReview,
      ),
  };
}

/* ============================================================
   GENERIC TEXT CHECK
============================================================ */

/*
 * Useful later for:
 *
 * comments
 * profile bios
 * chats
 *
 * without duplicating the matching
 * implementation.
 */

export function containsModeratedLanguage(
  value:
    string,
): boolean {
  const normalized =
    normalizeModerationText(
      value,
    );

  if (
    !normalized
  ) {
    return false;
  }

  return MODERATION_RULES.some(
    (
      rule,
    ) =>
      matchesRule(
        normalized,
        normalizeModerationText(
          rule.term,
        ),
      ),
  );
}