#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Bump the build number suffix in package.json
 * Supports both legacy format (0.1.1-006) and beta format (0.1.2-beta.536)
 * 
 * Examples:
 *   0.1.1-006 -> 0.1.1-007
 *   0.1.2-beta.536 -> 0.1.2-beta.537
 *   0.1.2-beta.999 -> 0.1.2-beta.1000
 */
function bumpVersion() {
  const packagePath = path.join(process.cwd(), 'package.json');

  try {
    // Read package.json
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const currentVersion = packageJson.version;

    // Parse version with prerelease and build suffix (e.g., "0.1.2-beta.536" or "0.1.1-006")
    // Pattern matches: version-core (-prerelease)? .build-number
    const versionMatch = currentVersion.match(/^(.+?)(?:-(beta|alpha|rc)\.(\d+)|-(\d+))$/);

    if (!versionMatch) {
      console.log(`No build suffix found in version ${currentVersion}, skipping bump`);
      return;
    }

    let newVersion;
    
    if (versionMatch[2]) {
      // Beta/alpha/rc format: 0.1.2-beta.536
      const baseVersion = versionMatch[1];
      const prerelease = versionMatch[2];
      const buildNumber = parseInt(versionMatch[3], 10);
      const newBuildNumber = buildNumber + 1;
      newVersion = `${baseVersion}-${prerelease}.${newBuildNumber}`;
    } else {
      // Legacy format: 0.1.1-006
      const baseVersion = versionMatch[1];
      const buildNumber = parseInt(versionMatch[4], 10);
      const newBuildNumber = buildNumber + 1;
      const newBuildSuffix = newBuildNumber.toString().padStart(3, '0');
      newVersion = `${baseVersion}-${newBuildSuffix}`;
    }

    // Update package.json
    packageJson.version = newVersion;
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

    console.log(`Version bumped: ${currentVersion} -> ${newVersion}`);

  } catch (error) {
    console.error('Error bumping version:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  bumpVersion();
}

export { bumpVersion };
