import "server-only";

/**
 * Compatibility adapter. The pins API now calls moderatePinImageBytes() ONCE
 * for ALL visual categories. Keep this export for other older server imports,
 * but do not call it as a second check on the same photo.
 */
import { moderatePinImageBytes } from "@/lib/moderation/image-moderation";

export type GestureAnalysis = {
  suspected: boolean;
  score: number;
  model: string;
  handsAnalyzed: number;
};
export type GestureDetectionErrorCode =
  | "GESTURE_DETECTOR_NOT_CONFIGURED"
  | "GESTURE_DETECTOR_UNAVAILABLE"
  | "GESTURE_DETECTOR_INVALID_RESULT";

/** @deprecated The unified image moderation module replaces this adapter. */
export class GestureDetectionError extends Error {
  constructor(readonly code: GestureDetectionErrorCode, message: string) {
    super(message);
    this.name = "GestureDetectionError";
  }
}

/** @deprecated Prefer moderatePinImageBytes() and inspect all categories. */
export async function detectOffensiveGesture(input: Uint8Array): Promise<GestureAnalysis> {
  const result = await moderatePinImageBytes(input);
  const score = result.scores.offensive_gesture ?? 0;
  return {
    suspected: result.categories.includes("offensive_gesture") || result.uncertain,
    score,
    model: result.model,
    // The unified classifier does not count hands. Never invent a count.
    handsAnalyzed: 0,
  };
}
