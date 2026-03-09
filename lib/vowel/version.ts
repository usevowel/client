/**
 * Vowel Client Version
 * Auto-updated version information for the Vowel client library
 */

// Import package.json directly for clean version management
import packageJson from '../../package.json';

/**
 * Current version of the Vowel client library
 * Reads directly from package.json for consistency across the codebase
 */
export const VOWEL_VERSION = packageJson.version || 'unknown';

/**
 * Build timestamp (set during build)
 * Defaults to Unix epoch (1970-01-01T00:00:00.000Z) if not set during build
 * This can be used for cache busting and debugging
 */
export const VOWEL_BUILD_TIME = new Date(0).toISOString();

