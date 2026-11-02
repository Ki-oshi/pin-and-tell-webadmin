import "server-only";

import { createHash } from "node:crypto";

/**
 * PIN & TELL image moderation.
 *
 * Server-side only. This module does not publish images or apply strikes.
 * Call it before inserting a pin; the API route decides whether to publish,
 * reject, or hold the submission for manual review.
 *
 * IMPORTANT: The original image must not be publicly accessible before
 * screening. Existing Android uploads to a public bucket require a later
 * coordinated change to private staging and storage permissions.
 */

const MODEL = "omni-moderation-latest";
const MODERATION_ENDPOINT = "https://api.openai.com/v1/moderations";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_FETCH_TIMEOUT_MS = 10_000;
const MODERATION_TIMEOUT_MS = 20_000;
const AUTO_BLOCK_SCORE = 0.9;

const IMAGE_CATEGORY_NAMES = new Set([
  "sexual",
  "self-harm",
  "self-harm/intent",
  "self-harm/instructions",
  "violence",
  "violence/graphic",
]);

// Only high-confidence categories should be eligible for automatic strikes.
// Other flagged images must be held for manual review without a strike.
const AUTO_BLOCK_CATEGORIES = new Set([
  "sexual",
  "violence/graphic",
]);

export type ImageModerationDecision = "allow" | "block" | "review";

export type ImageModerationResult = {
  decision: ImageModerationDecision;
  flagged: boolean;
  categories: string[];
  scores: Record<string, number>;
  sha256: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  model: string;
};

export type ImageModerationErrorCode =
  | "IMAGE_URL_INVALID"
  | "IMAGE_HOST_NOT_ALLOWED"
  | "IMAGE_FETCH_FAILED"
  | "IMAGE_TOO_LARGE"
  | "IMAGE_FORMAT_UNSUPPORTED"
  | "IMAGE_MODERATION_NOT_CONFIGURED"
  | "IMAGE_MODERATION_UNAVAILABLE";

export class ImageModerationError extends Error {
  readonly code: ImageModerationErrorCode;

  constructor(code: ImageModerationErrorCode, message: string) {
    super(message);
    this.name = "ImageModerationError";
    this.code = code;
  }
}

type ModerationApiResult = {
  flagged?: unknown;
  categories?: Record<string, unknown>;
  category_scores?: Record<string, unknown>;
  category_applied_input_types?: Record<string, unknown>;
};

type ModerationApiResponse = {
  model?: unknown;
  results?: ModerationApiResult[];
};

function validateSupabaseImageUrl(photoUrl: string): URL {
  let url: URL;
  let projectUrl: URL;

  try {
    url = new URL(photoUrl);
    projectUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  } catch {
    throw new ImageModerationError(
      "IMAGE_URL_INVALID",
      "The photo URL is invalid or the Supabase project is not configured.",
    );
  }

  if (
    url.protocol !== "https:" ||
    url.origin !== projectUrl.origin ||
    url.username !== "" ||
    url.password !== "" ||
    url.hash !== ""
  ) {
    throw new ImageModerationError(
      "IMAGE_HOST_NOT_ALLOWED",
      "Photos must be hosted in PIN & TELL's Supabase Storage.",
    );
  }

  const allowedPath =
    url.pathname.startsWith("/storage/v1/object/public/") ||
    url.pathname.startsWith("/storage/v1/object/sign/");

  // Prevent submission of generic URLs, including API URLs on our own host.
  // Also require both a bucket and object path.
  const storageParts = url.pathname.split("/").filter(Boolean);
  if (!allowedPath || storageParts.length < 6) {
    throw new ImageModerationError(
      "IMAGE_URL_INVALID",
      "The photo URL must refer to an existing Supabase Storage object.",
    );
  }

  return url;
}

function detectMimeType(
  bytes: Buffer,
): ImageModerationResult["mimeType"] | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    )
  ) {
    return "image/png";
  }

  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

function hasAnimation(bytes: Buffer, mimeType: string): boolean {
  // Avoid silently approving an animation after examining only one frame.
  if (mimeType === "image/png") {
    return bytes.includes(Buffer.from("acTL", "ascii"));
  }
  if (mimeType === "image/webp") {
    return (
      bytes.includes(Buffer.from("ANIM", "ascii")) ||
      bytes.includes(Buffer.from("ANMF", "ascii"))
    );
  }
  return false;
}

async function downloadTrustedPhoto(url: URL): Promise<{
  bytes: Buffer;
  mimeType: ImageModerationResult["mimeType"];
}> {
  let response: Response;

  try {
    response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS),
      headers: { Accept: "image/jpeg, image/png, image/webp" },
    });
  } catch {
    throw new ImageModerationError(
      "IMAGE_FETCH_FAILED",
      "The photo could not be retrieved for screening.",
    );
  }

  if (!response.ok || !response.body) {
    throw new ImageModerationError(
      "IMAGE_FETCH_FAILED",
      "The photo is unavailable for screening.",
    );
  }

  const statedSize = Number(response.headers.get("content-length"));
  if (Number.isFinite(statedSize) && statedSize > MAX_IMAGE_BYTES) {
    await response.body.cancel();
    throw new ImageModerationError(
      "IMAGE_TOO_LARGE",
      "Photo size exceeds the 8 MB moderation limit.",
    );
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let byteCount = 0;

  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;

      byteCount += chunk.value.byteLength;
      if (byteCount > MAX_IMAGE_BYTES) {
        await reader.cancel();
        throw new ImageModerationError(
          "IMAGE_TOO_LARGE",
          "Photo size exceeds the 8 MB moderation limit.",
        );
      }
      chunks.push(Buffer.from(chunk.value));
    }
  } catch (error) {
    if (error instanceof ImageModerationError) throw error;
    throw new ImageModerationError(
      "IMAGE_FETCH_FAILED",
      "The photo could not be read for screening.",
    );
  }

  const bytes = Buffer.concat(chunks, byteCount);
  const mimeType = detectMimeType(bytes);

  if (!mimeType || hasAnimation(bytes, mimeType)) {
    throw new ImageModerationError(
      "IMAGE_FORMAT_UNSUPPORTED",
      "Please upload a still JPEG, PNG, or WebP photo.",
    );
  }

  return { bytes, mimeType };
}

/**
 * Scan a photo stored under this project's Supabase Storage domain.
 * This deliberately refuses arbitrary external URLs to avoid server-side
 * requests to attacker-controlled or private network destinations.
 */
export async function moderatePinImage(photoUrl: string): Promise<ImageModerationResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new ImageModerationError(
      "IMAGE_MODERATION_NOT_CONFIGURED",
      "Image screening is not configured. The photo cannot be published.",
    );
  }

  const trustedUrl = validateSupabaseImageUrl(photoUrl);
  const { bytes, mimeType } = await downloadTrustedPhoto(trustedUrl);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const dataUrl = `data:${mimeType};base64,${bytes.toString("base64")}`;

  let response: Response;
  try {
    response = await fetch(MODERATION_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        input: [
          {
            type: "image_url",
            image_url: { url: dataUrl },
          },
        ],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(MODERATION_TIMEOUT_MS),
    });
  } catch {
    throw new ImageModerationError(
      "IMAGE_MODERATION_UNAVAILABLE",
      "Image screening is temporarily unavailable. Please try again later.",
    );
  }

  if (!response.ok) {
    console.error("[IMAGE MODERATION] Provider returned status:", response.status);
    throw new ImageModerationError(
      "IMAGE_MODERATION_UNAVAILABLE",
      "Image screening is temporarily unavailable. Please try again later.",
    );
  }

  let payload: ModerationApiResponse;
  try {
    payload = (await response.json()) as ModerationApiResponse;
  } catch {
    throw new ImageModerationError(
      "IMAGE_MODERATION_UNAVAILABLE",
      "Image screening returned an unreadable result.",
    );
  }

  const result = payload.results?.[0];
  if (
    !result ||
    typeof result.flagged !== "boolean" ||
    !result.categories ||
    !result.category_applied_input_types
  ) {
    throw new ImageModerationError(
      "IMAGE_MODERATION_UNAVAILABLE",
      "Image screening returned an incomplete result.",
    );
  }

  const categories: string[] = [];
  const scores: Record<string, number> = {};

  for (const [category, isFlagged] of Object.entries(result.categories)) {
    if (!IMAGE_CATEGORY_NAMES.has(category)) continue;

    const inputTypes = result.category_applied_input_types[category];
    if (!Array.isArray(inputTypes) || !inputTypes.includes("image")) continue;

    const score = result.category_scores?.[category];
    if (typeof score === "number" && Number.isFinite(score)) {
      scores[category] = Math.max(0, Math.min(1, score));
    }

    if (isFlagged === true) {
      categories.push(category);
    }
  }

  const flagged = result.flagged || categories.length > 0;
  let decision: ImageModerationDecision = "allow";
  if (flagged) {
    decision = "review";
    if (
      categories.some(
        (category) =>
          AUTO_BLOCK_CATEGORIES.has(category) &&
          (scores[category] ?? 0) >= AUTO_BLOCK_SCORE,
      )
    ) {
      decision = "block";
    }
  }

  return {
    decision,
    flagged,
    categories,
    scores,
    sha256,
    mimeType,
    model: typeof payload.model === "string" ? payload.model : MODEL,
  };
}
