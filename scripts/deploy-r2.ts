#!/usr/bin/env bun
/**
 * R2 Deployment Script
 * 
 * Deploys the standalone bundle to Cloudflare R2 after build.
 * This is a separate post-build step to keep the Vite build clean.
 * 
 * Usage:
 *   bun run deploy:r2
 * 
 * Environment variables required:
 *   R2_ENDPOINT
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_BUCKET_NAME
 *   R2_PUBLIC_BUCKET_URL (optional)
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '..', '.env');

console.log('🔍 Looking for .env file at:', envPath);

if (existsSync(envPath)) {
  console.log('✅ Found .env file, loading environment variables...');
  const envContent = readFileSync(envPath, 'utf-8');
  const loadedVars: string[] = [];
  
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        // Remove quotes if present
        const cleanValue = value.replace(/^["']|["']$/g, '');
        process.env[key.trim()] = cleanValue;
        loadedVars.push(key.trim());
      }
    }
  });
  
  console.log('📋 Loaded variables:', loadedVars.join(', '));
  console.log('');
  
  // Display R2 configuration (masked for security)
  const maskValue = (val?: string) => {
    if (!val) return '(not set)';
    if (val.length <= 8) return '***';
    return val.substring(0, 4) + '***' + val.substring(val.length - 4);
  };
  
  console.log('🔐 R2 Configuration:');
  console.log(`  R2_ENDPOINT: ${process.env.R2_ENDPOINT || '(not set)'}`);
  console.log(`  R2_BUCKET_NAME: ${process.env.R2_BUCKET_NAME || '(not set)'}`);
  console.log(`  R2_ACCESS_KEY_ID: ${maskValue(process.env.R2_ACCESS_KEY_ID)}`);
  console.log(`  R2_SECRET_ACCESS_KEY: ${maskValue(process.env.R2_SECRET_ACCESS_KEY)}`);
  console.log(`  R2_PUBLIC_BUCKET_URL: ${process.env.R2_PUBLIC_BUCKET_URL || '(not set)'}`);
  console.log('');
} else {
  console.warn('⚠️  No .env file found at', envPath);
  console.warn('⚠️  Will try to use environment variables from shell');
  console.log('');
}

// Configuration
const BUCKET_PATH = 'apps/vowel';
const DIST_DIR = 'dist/standalone';

const FILES_TO_UPLOAD = [
  {
    source: 'vowel-voice-widget.min.js',
    contentType: 'application/javascript',
    uploadAsLatest: true,
  },
  {
    source: 'vowel-voice-widget.min.js.map',
    contentType: 'application/json',
    uploadAsLatest: true,
  },
  {
    source: 'vowel-voice-widget.css',
    contentType: 'text/css',
    uploadAsLatest: true,
  },
];

interface DeployConfig {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicBucketUrl?: string;
}

async function deployToR2(config: DeployConfig): Promise<void> {
  const { endpoint, accessKeyId, secretAccessKey, bucketName, publicBucketUrl } = config;

  // Initialize S3 client (R2 is S3-compatible)
  const s3Client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  console.log('🚀 Starting R2 deployment...');
  console.log(`📁 Source directory: ${DIST_DIR}`);
  console.log(`🪣 Bucket name: ${bucketName}`);
  console.log(`📂 Bucket path: ${BUCKET_PATH}`);
  console.log('');

  const baseUrl = publicBucketUrl || endpoint;

  for (const file of FILES_TO_UPLOAD) {
    const filePath = join(DIST_DIR, file.source);

    // Check if file exists
    if (!existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }

    // Read file content
    const fileContent = readFileSync(filePath);
    const key = `${BUCKET_PATH}/${file.source}`;

    console.log(`📤 Uploading ${file.source}...`);

    try {
      // Upload file
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: fileContent,
          ContentType: file.contentType,
        })
      );

      const fileUrl = `${baseUrl}/${key}`;
      console.log(`✅ Uploaded: ${fileUrl}`);

      // Also upload as "latest" version if specified
      if (file.uploadAsLatest) {
        const latestKey = `${BUCKET_PATH}/${file.source}`;
        await s3Client.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: latestKey,
            Body: fileContent,
            ContentType: file.contentType,
          })
        );
        console.log(`📤 Uploaded as ${file.source}...`);
        console.log(`✅ Uploaded: ${baseUrl}/${latestKey}`);
      }
    } catch (error) {
      console.error(`❌ Failed to upload ${file.source}:`, error);
      process.exit(1);
    }
  }

  console.log('');
  console.log('✨ R2 deployment completed successfully!');
  console.log('');
}

// Main execution
async function main() {
  const { R2_ENDPOINT, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_BUCKET_URL } =
    process.env;

  // Check required environment variables
  if (!R2_ENDPOINT || !R2_BUCKET_NAME || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.error('❌ Missing required environment variables:');
    if (!R2_ENDPOINT) console.error('  - R2_ENDPOINT');
    if (!R2_BUCKET_NAME) console.error('  - R2_BUCKET_NAME');
    if (!R2_ACCESS_KEY_ID) console.error('  - R2_ACCESS_KEY_ID');
    if (!R2_SECRET_ACCESS_KEY) console.error('  - R2_SECRET_ACCESS_KEY');
    console.error('');
    console.error('Set these variables in your .env file or export them in your shell.');
    process.exit(1);
  }

  await deployToR2({
    endpoint: R2_ENDPOINT,
    bucketName: R2_BUCKET_NAME,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    publicBucketUrl: R2_PUBLIC_BUCKET_URL,
  });
}

main().catch((error) => {
  console.error('❌ Deployment failed:', error);
  process.exit(1);
});


