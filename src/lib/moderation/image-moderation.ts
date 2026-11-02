import "server-only";

import { createHash } from "node:crypto";

/**
 * PIN & TELL - server-side photo moderation.
 *
 * This module only evaluates images. It does not upload, publish, delete,
 * sanction accounts, or create reports.
 *
 * Preferred workflow:
 *  1. Receive the photo in a private staging bucket or as a verified request.
 *  2. Fetch the bytes through a trusted server-side mechanism.
 *  3. Call moderatePinImageBytes() before making the photo public.
 *  4. Publish only after the pin API accepts both the photo and text.
 *
 * Keep OPENAI_API_KEY on the server. Never add it to the Android application.
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

// High-confidence findings eligible for an automatic block.
// Other flags are for manual review without an automatic strike.
const AUTO_BLOCK_CATEGORIES = new Set(["sexual", "violence/graphic"]);

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

type SupportedMimeType = ImageModerationResult["mimeType"];

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

function detectMimeType(bytes: Buffer): SupportedMimeType | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) return "image/jpeg";

  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    )
  ) return "image/png";

  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) return "image/webp";

  return null;
}

function isAnimated(bytes: Buffer, mimeType: SupportedMimeType): boolean {
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

function validateImageBytes(input: Uint8Array): {
  bytes: Buffer;
  mimeType: SupportedMimeType;
} {
  if (input.byteLength === 0) {
    throw new ImageModerationError(
      "IMAGE_FORMAT_UNSUPPORTED",
      "The photo is empty or cannot be read.",
    );
  }

  if (input.byteLength > MAX_IMAGE_BYTES) {
    throw new ImageModerationError(
      "IMAGE_TOO_LARGE",
      "Photo size exceeds the 8 MB moderation limit.",
    );
  }

  const bytes = Buffer.from(input);
  const mimeType = detectMimeType(bytes);

  if (!mimeType || isAnimated(bytes, mimeType)) {
    throw new ImageModerationError(
      "IMAGE_FORMAT_UNSUPPORTED",
      "Please upload a still JPEG, PNG, or WebP photo.",
    );
  }

  return { bytes, mimeType };
}

async function scanImageBytes(
  bytes: Buffer,
  mimeType: SupportedMimeType,
): Promise<ImageModerationResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new ImageModerationError(
      "IMAGE_MODERATION_NOT_CONFIGURED",
      "Image screening is not configured. The photo cannot be published.",
    );
  }

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
        input: [{ type: "image_url", image_url: { url: dataUrl } }],
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
    console.error("[IMAGE MODERATION] Provider status:", response.status);
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
    const applicableTypes = result.category_applied_input_types[category];
    if (!Array.isArray(applicableTypes) || !applicableTypes.includes("image")) continue;

    const rawScore = result.category_scores?.[category];
    if (typeof rawScore === "number" && Number.isFinite(rawScore)) {
      scores[category] = Math.max(0, Math.min(1, rawScore));
    }
    if (isFlagged === true) categories.push(category);
  }

  const flagged = result.flagged || categories.length > 0;
  const highConfidenceBlock = categories.some(
    (category) =>
      AUTO_BLOCK_CATEGORIES.has(category) &&
      (scores[category] ?? 0) >= AUTO_BLOCK_SCORE,
  );

  return {
    decision: highConfidenceBlock ? "block" : flagged ? "review" : "allow",
    flagged,
    categories,
    scores,
    sha256,
    mimeType,
    model: typeof payload.model === "string" ? payload.model : MODEL,
  };
}

/**
 * Preferred API for the new secure upload workflow.
 * Pass image bytes received privately and authenticated on the server.
 * A moderation failure throws; callers MUST NOT publish on failure.
 */
export async function moderatePinImageBytes(
  input: Uint8Array,
): Promise<ImageModerationResult> {
  const { bytes, mimeType } = validateImageBytes(input);
  return scanImageBytes(bytes, mimeType);
}

/**
 * Legacy URL-based API (kept for backward compatibility).
 * Only project-hosted Supabase Storage URLs are accepted.
 * IMPORTANT: Fetching a public URL does not make the upload private.
 * Prefer moderatePinImageBytes() before making any image publicly readable.
 */
export async function moderatePinImage(
  photoUrl: string,
): Promise<ImageModerationResult> {
  let url: URL;
  let projectUrl: URL;
  try {
    url = new URL(photoUrl);
    projectUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  } catch {
    throw new ImageModerationError(
      "IMAGE_URL_INVALID",
      "The photo URL is invalid or Supabase is not configured.",
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

  const parts = url.pathname.split("/").filter(Boolean);
  const pathPrefix = parts.slice(0, 4).join("/");
  const allowedPrefix =
    pathPrefix === "storage/v1/object/public" ||
    pathPrefix === "storage/v1/object/sign";

  if (!allowedPrefix || parts.length < 6 || parts[4] !== "pin-photos") {
    throw new ImageModerationError(
      "IMAGE_URL_INVALID",
      "The photo URL must point to the PIN & TELL pin-photos bucket.",
    );
  }

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

  const contentLength = response.headers.get("content-length");
  if (contentLength !== null && Number(contentLength) > MAX_IMAGE_BYTES) {
    await response.body.cancel();
    throw new ImageModerationError(
      "IMAGE_TOO_LARGE",
      "Photo size exceeds the 8 MB moderation limit.",
    );
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      total += chunk.value.byteLength;
      if (total > MAX_IMAGE_BYTES) {
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
  } finally {
    reader.releaseLock();
  }

  return moderatePinImageBytes(Buffer.concat(chunks, total));
}
