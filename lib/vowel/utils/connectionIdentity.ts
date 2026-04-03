/**
 * Helpers for resolving the top-level token issuer identifier.
 *
 * During the appId -> apiKey transition, both fields are treated as aliases for
 * the same identifier. The identifier is interpreted as an API key when it uses
 * the publishable key prefix; otherwise it is treated as a legacy appId.
 */

const VOWEL_API_KEY_PREFIX = "vkey_";

export interface ConnectionIdentityInput {
  appId?: string;
  apiKey?: string;
}

export interface ResolvedConnectionIdentity {
  identifier?: string;
  appId?: string;
  apiKey?: string;
  useAuthorizationHeader: boolean;
}

function normalizeIdentifier(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function looksLikeVowelApiKey(value: string | undefined): boolean {
  const normalized = normalizeIdentifier(value);
  return typeof normalized === "string" && normalized.startsWith(VOWEL_API_KEY_PREFIX);
}

export function resolveConnectionIdentity(
  input: ConnectionIdentityInput
): ResolvedConnectionIdentity {
  const preferredIdentifier = normalizeIdentifier(input.apiKey) ?? normalizeIdentifier(input.appId);
  if (!preferredIdentifier) {
    return {
      identifier: undefined,
      appId: undefined,
      apiKey: undefined,
      useAuthorizationHeader: false,
    };
  }

  return {
    identifier: preferredIdentifier,
    appId: preferredIdentifier,
    apiKey: preferredIdentifier,
    useAuthorizationHeader: looksLikeVowelApiKey(preferredIdentifier),
  };
}

export function getSafeConnectionStoragePrefix(input: ConnectionIdentityInput): string {
  const explicitAppId = normalizeIdentifier(input.appId);
  if (explicitAppId && !looksLikeVowelApiKey(explicitAppId)) {
    return explicitAppId;
  }

  const explicitApiKey = normalizeIdentifier(input.apiKey);
  if (explicitApiKey && !looksLikeVowelApiKey(explicitApiKey)) {
    return explicitApiKey;
  }

  return "vowel";
}
