#!/usr/bin/env bun

/**
 * Version Management Script for @vowel.to/client
 * 
 * Automates the versioning workflow for the client library:
 * 1. Collects changesets from .ai/sessions/unreleased/ and root .ai/sessions/unreleased/
 * 2. Determines version bump (major/minor/patch) based on changeset types
 * 3. Updates package.json version
 * 4. Generates CHANGELOG.md entry from changesets
 * 5. Archives sessions to .ai/sessions/released/vX.Y.Z/
 * 6. Creates git tag (client-vX.Y.Z)
 * 7. Commits changes
 * 
 * Special considerations for client library:
 * - Version must match package.json for npm publishing
 * - Always run `bun run build` before publishing
 * - Consider beta releases for testing: 0.6.2-beta.1
 * 
 * Usage:
 *   bun run version              # Auto-detect version bump
 *   bun run version:major        # Force major bump
 *   bun run version:minor        # Force minor bump
 *   bun run version:patch        # Force patch bump
 *   bun run version:check        # Dry run (no changes)
 *   bun run publish:release      # Version + build + publish
 * 
 * @see ../../DEV_WORKFLOW.md for complete documentation
 */

import path from 'path';
import fs from 'fs';
import {
  parseCliArgs,
  collectChangesets,
  determineVersionBump,
  bumpVersion,
  generateChangelogEntry,
  updateChangelog,
  archiveSessions,
  updatePackageJson,
  updateVersionFile,
  createGitTag,
  commitChanges,
  displayReleaseSummary,
  type VersionConfig
// @ts-ignore - importing from outside rootDir
} from '../../scripts/version-utils';

// Component configuration
const COMPONENT = 'client';
const CWD = process.cwd();
const ROOT_DIR = path.join(CWD, '..');

const config: VersionConfig = {
  component: COMPONENT,
  unreleasedDir: path.join(CWD, '.ai/sessions/unreleased'),
  releasedDir: path.join(CWD, '.ai/sessions/released'),
  changelogPath: path.join(CWD, 'docs/CHANGELOG.md'),
  packageJsonPath: path.join(CWD, 'package.json'),
  versionFilePath: path.join(CWD, 'docs/VERSION'),
  rootAiDir: path.join(ROOT_DIR, '.ai')
};

/**
 * Main execution function
 */
async function main() {
  console.log(`\n🚀 @vowel.to/client Version Management\n`);

  // Parse CLI arguments
  const args = parseCliArgs(process.argv.slice(2));

  // Collect changesets
  console.log('📋 Collecting changesets...');
  const changesets = collectChangesets(config);

  if (changesets.length === 0) {
    console.log('\n❌ No changesets found in .ai/sessions/unreleased/');
    console.log('   Create a changeset.yaml in each session before releasing.\n');
    process.exit(1);
  }

  console.log(`✅ Found ${changesets.length} changeset(s):\n`);
  for (const cs of changesets) {
    const sessionLabel = cs.session.startsWith('root:') 
      ? `${cs.session} (cross-component)` 
      : cs.session;
    console.log(`   - ${sessionLabel} (${cs.type})`);
  }

  // Get current version
  const pkg = JSON.parse(fs.readFileSync(config.packageJsonPath, 'utf8'));
  const currentVersion = pkg.version;
  console.log(`\n📌 Current version: ${currentVersion}`);

  // Determine version bump
  const bumpType = determineVersionBump(changesets, args.forceType);
  const newVersion = bumpVersion(currentVersion, bumpType);
  console.log(`📈 Version bump: ${bumpType} → ${newVersion}\n`);

  // Dry run mode
  if (args.isDryRun) {
    console.log('🔍 Dry run - no changes will be made\n');
    console.log('Changelog preview:');
    console.log(generateChangelogEntry(changesets, newVersion));
    return;
  }

  // Changelog only mode
  if (args.changelogOnly) {
    console.log('📝 Generating changelog only...\n');
    updateChangelog(config, changesets, newVersion);
    return;
  }

  // Confirm release
  console.log('⚠️  This will:');
  console.log(`   1. Update package.json to ${newVersion}`);
  console.log(`   2. Generate CHANGELOG.md entry`);
  console.log(`   3. Archive ${changesets.length} session(s) to .ai/sessions/released/v${newVersion}/`);
  console.log(`   4. Create git tag: ${COMPONENT}-v${newVersion}`);
  console.log(`   5. Commit changes\n`);

  // Execute release
  console.log('🔨 Executing release...\n');
  
  updatePackageJson(config, newVersion);
  updateVersionFile(config, newVersion);
  updateChangelog(config, changesets, newVersion);
  archiveSessions(config, changesets, newVersion);
  createGitTag(COMPONENT, newVersion);
  commitChanges(COMPONENT, newVersion);

  // Display summary
  displayReleaseSummary(COMPONENT, newVersion, changesets);
}

// Run main function
main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});



