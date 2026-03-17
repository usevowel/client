/**
 * Deprecation Warning Utilities
 *
 * Provides a consistent way to warn about deprecated API usage.
 * Warnings are emitted once per deprecated pattern per session to avoid log spam.
 */

const warnedPatterns = new Set<string>();

/**
 * Emit a deprecation warning (once per pattern per session).
 *
 * @param oldName - The deprecated API or property name
 * @param newName - The recommended replacement (optional)
 * @param migrationTip - Additional guidance for migration (optional)
 */
export function warnDeprecated(
  oldName: string,
  newName?: string,
  migrationTip?: string
): void {
  if (warnedPatterns.has(oldName)) return;
  warnedPatterns.add(oldName);

  const parts = [
    `⚠️  [vowel] Deprecated: "${oldName}".`,
    newName ? `Use "${newName}" instead.` : null,
    migrationTip,
  ].filter(Boolean);

  console.warn(parts.join(' '));
}

/**
 * Reset the warned-patterns set (useful for testing).
 */
export function _resetDeprecationWarningsForTesting(): void {
  warnedPatterns.clear();
}
