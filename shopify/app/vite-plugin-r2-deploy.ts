/**
 * Vite Plugin for Cloudflare R2 Deployment
 * 
 * This plugin automatically uploads the built bundle to Cloudflare R2 after the build completes.
 * It uses the AWS SDK S3 client which is compatible with R2's S3-compatible API.
 * 
 * Features:
 * - Upload versioned files with cache-busting suffixes
 * - Optionally upload "latest" version without suffix
 * - Clean up old versioned files (configurable retention)
 * - Deterministic cache-busting based on git commit hash
 */

import type { Plugin } from 'vite';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, basename } from 'node:path';

/**
 * Configuration options for the R2 deployment plugin
 */
export interface R2DeployOptions {
  /** R2 endpoint URL */
  endpoint: string;
  /** R2 access key ID */
  accessKeyId: string;
  /** R2 secret access key */
  secretAccessKey: string;
  /** Public bucket URL for accessing uploaded files */
  publicBucketUrl: string;
  /** Path within the bucket where files will be uploaded (e.g., 'apps/vowel/shopify') */
  bucketPath: string;
  /** Files to upload - array of { source: string, contentType: string } */
  files: Array<{
    /** Source file path or glob pattern relative to project root */
    source: string;
    /** Content type (defaults to 'application/javascript') */
    contentType?: string;
    /** Also upload this file with the specified filename (without hash) */
    uploadAsLatest?: string;
  }>;
  /** Whether to enable deployment (defaults to true) */
  enabled?: boolean;
  /** Whether to clean up old versioned files (defaults to false) */
  cleanOldVersions?: boolean;
  /** Number of old versions to keep (defaults to 5) */
  keepVersions?: number;
}

/**
 * Creates a Vite plugin that deploys files to Cloudflare R2 after build
 * 
 * @param options - Configuration options for R2 deployment
 * @returns Vite plugin
 * 
 * @example
 * ```ts
 * export default defineConfig({
 *   plugins: [
 *     r2Deploy({
 *       endpoint: process.env.R2_ENDPOINT!,
 *       accessKeyId: process.env.R2_ACCESS_KEY_ID!,
 *       secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
 *       publicBucketUrl: process.env.R2_PUBLIC_BUCKET_URL!,
 *       bucketPath: 'apps/vowel',
 *       files: [
 *         {
 *           source: 'dist/vowel-voice-widget-*.min.js',
 *           contentType: 'application/javascript',
 *           uploadAsLatest: 'vowel-voice-widget.min.js'
 *         },
 *         {
 *           source: 'dist/vowel-voice-widget-*.min.js.map',
 *           contentType: 'application/json'
 *         }
 *       ],
 *       cleanOldVersions: true,
 *       keepVersions: 5
 *     })
 *   ]
 * });
 * ```
 */
export function r2Deploy(options: R2DeployOptions): Plugin {
  const {
    endpoint,
    accessKeyId,
    secretAccessKey,
    publicBucketUrl,
    bucketPath,
    files,
    enabled = true,
    cleanOldVersions = false,
    keepVersions = 5
  } = options;

  // Extract bucket name from endpoint
  // R2 endpoint format: https://<account-id>.r2.cloudflarestorage.com
  const bucketName = 'assets'; // R2 bucket name - adjust if needed

  return {
    name: 'vite-plugin-r2-deploy',
    
    /**
     * Runs after the bundle is closed - uploads files to R2
     */
    async closeBundle() {
      if (!enabled) {
        console.log('⏸️  R2 deployment disabled');
        return;
      }

      console.log('\n🚀 Starting R2 deployment...');

      // Initialize S3 client (R2 is S3-compatible)
      const s3Client = new S3Client({
        region: 'auto', // R2 uses 'auto' region
        endpoint: endpoint,
        credentials: {
          accessKeyId: accessKeyId,
          secretAccessKey: secretAccessKey,
        },
      });

      try {
        // Upload each file (supports glob patterns)
        for (const fileConfig of files) {
          // Simple glob matching using Node's fs
          const matchedFiles = matchGlobPattern(fileConfig.source);

          if (matchedFiles.length === 0) {
            console.warn(`⚠️  No files matched pattern: ${fileConfig.source}`);
            continue;
          }

          for (const matchedFile of matchedFiles) {
            const sourcePath = matchedFile;
            
            if (!existsSync(sourcePath)) {
              console.warn(`⚠️  Source file not found: ${sourcePath}`);
              continue;
            }

            const fileContent = readFileSync(sourcePath);
            const filename = basename(matchedFile);
            const key = `${bucketPath}/${filename}`;
            const contentType = fileConfig.contentType || 
              (filename.endsWith('.js') ? 'application/javascript' : 
               filename.endsWith('.map') ? 'application/json' : 
               filename.endsWith('.css') ? 'text/css' :
               'application/octet-stream');

            console.log(`📤 Uploading ${filename}...`);

            const command = new PutObjectCommand({
              Bucket: bucketName,
              Key: key,
              Body: fileContent,
              ContentType: contentType,
              // Short cache with revalidation - ensures fresh content while allowing some caching
              CacheControl: 'public, max-age=300, must-revalidate',
            });

            await s3Client.send(command);

            const publicUrl = `${publicBucketUrl}/${key}`;
            console.log(`✅ Uploaded: ${publicUrl}`);

            // If uploadAsLatest is specified, also upload with that filename
            if (fileConfig.uploadAsLatest) {
              const latestKey = `${bucketPath}/${fileConfig.uploadAsLatest}`;
              
              console.log(`📤 Uploading as ${fileConfig.uploadAsLatest}...`);

              const latestCommand = new PutObjectCommand({
                Bucket: bucketName,
                Key: latestKey,
                Body: fileContent,
                ContentType: contentType,
                // Short cache with revalidation - ensures fresh content while allowing some caching
                CacheControl: 'public, max-age=300, must-revalidate',
              });

              await s3Client.send(latestCommand);

              const latestPublicUrl = `${publicBucketUrl}/${latestKey}`;
              console.log(`✅ Uploaded: ${latestPublicUrl}`);
            }
          }
        }

        // Clean up old versioned files if requested
        if (cleanOldVersions) {
          await cleanupOldVersions(s3Client, bucketName, bucketPath, keepVersions);
        }

        console.log('\n✨ R2 deployment completed successfully!\n');
      } catch (error) {
        console.error('\n❌ R2 deployment failed:', error);
        throw error;
      }
    }
  };
}

/**
 * Simple glob pattern matching using Node's fs
 * Matches files in a directory using wildcards
 */
function matchGlobPattern(pattern: string): string[] {
  try {
    // Extract directory and pattern parts
    const lastSlash = pattern.lastIndexOf('/');
    const dir = pattern.substring(0, lastSlash);
    const filePattern = pattern.substring(lastSlash + 1);
    
    const dirPath = resolve(process.cwd(), dir);
    
    if (!existsSync(dirPath)) {
      return [];
    }
    
    // Read directory and filter files
    const files = readdirSync(dirPath);
    
    // Convert glob pattern to regex
    const regexPattern = filePattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);
    
    return files
      .filter(file => regex.test(file))
      .map(file => resolve(dirPath, file));
  } catch (error) {
    console.warn(`Failed to match pattern ${pattern}:`, error);
    return [];
  }
}

/**
 * Clean up old versioned files from R2
 * Keeps only the latest N versions
 */
async function cleanupOldVersions(
  s3Client: S3Client,
  bucketName: string,
  bucketPath: string,
  keepVersions: number
): Promise<void> {
  try {
    console.log(`🧹 Cleaning up old versions (keeping latest ${keepVersions})...`);

    // List all objects in the bucket path
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: `${bucketPath}/vowel-voice-widget.`,
    });

    const listResult = await s3Client.send(listCommand);

    if (!listResult.Contents || listResult.Contents.length === 0) {
      console.log('   No old versions found');
      return;
    }

    // Extract version-suffixed files (exclude "latest" versions without suffix)
    const versionedFiles = listResult.Contents
      .filter(obj => obj.Key && /vowel-voice-widget\.[a-z0-9]+\.(min\.js|css|min\.js\.map)$/.test(obj.Key))
      .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0));

    // Group by file type (js, css, map)
    const filesByType = new Map<string, typeof versionedFiles>();
    for (const file of versionedFiles) {
      const ext = file.Key?.match(/\.(min\.js\.map|min\.js|css)$/)?.[1] || 'unknown';
      if (!filesByType.has(ext)) {
        filesByType.set(ext, []);
      }
      filesByType.get(ext)!.push(file);
    }

    // Delete old versions for each file type
    const toDelete: string[] = [];
    for (const [_ext, files] of filesByType) {
      // Keep the latest N versions for each file type
      const oldFiles = files.slice(keepVersions);
      for (const file of oldFiles) {
        if (file.Key) {
          toDelete.push(file.Key);
        }
      }
    }

    if (toDelete.length > 0) {
      console.log(`   Deleting ${toDelete.length} old version(s)...`);
      
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: {
          Objects: toDelete.map(key => ({ Key: key })),
        },
      });

      await s3Client.send(deleteCommand);
      console.log(`   ✅ Cleaned up ${toDelete.length} old file(s)`);
    } else {
      console.log('   No old versions to clean up');
    }
  } catch (error) {
    console.warn('   ⚠️ Failed to clean up old versions:', error);
    // Don't throw - cleanup failure shouldn't fail the deployment
  }
}

