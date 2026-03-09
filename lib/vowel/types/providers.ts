/**
 * Shared provider identifiers for the Vowel client runtime.
 *
 * This is the single source of truth for realtime providers used across
 * types, validation, and provider factory selection.
 */
export const SUPPORTED_REALTIME_PROVIDERS = [
  "gemini",
  "openai",
  "grok",
  "vowel-prime",
] as const;

export type ProviderType = (typeof SUPPORTED_REALTIME_PROVIDERS)[number];

export const OPENAI_COMPATIBLE_PROVIDERS = [
  "openai",
  "grok",
] as const;

export type OpenAICompatibleProviderType = (typeof OPENAI_COMPATIBLE_PROVIDERS)[number];

