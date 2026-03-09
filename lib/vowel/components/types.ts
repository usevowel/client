/**
 * Shared types for Vowel components
 */

/**
 * Position for floating VowelAgent
 */
export type VowelPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left";

export const positionClasses: Record<VowelPosition, string> = {
  "bottom-right": "bottom-6 right-6",
  "bottom-left": "bottom-6 left-6",
  "top-right": "top-6 right-6",
  "top-left": "top-6 left-6",
};
