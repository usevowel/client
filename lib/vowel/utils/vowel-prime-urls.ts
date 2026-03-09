/**
 * Vowel Prime URL Utilities
 * 
 * Helper functions for resolving vowel Prime worker URLs
 */

import type { VowelPrimeEnvironment } from '../types';

/**
 * Environment to URL mapping for vowel Prime workers
 */
const VOWEL_PRIME_URLS: Record<VowelPrimeEnvironment, string> = {
  local: 'wss://testing-prime.vowel.to/v1/realtime', // Local development with tunnel
  testing: 'wss://testing-prime.vowel.to/v1/realtime',
  dev: 'wss://dev-prime.vowel.to/v1/realtime',
  staging: 'wss://staging.prime.vowel.to/v1/realtime',
  production: 'wss://prime.vowel.to/v1/realtime',
  'billing-test': 'wss://billing-test.vowel.to/v1/realtime',
};

/**
 * Get the WebSocket URL for a vowel Prime environment
 * 
 * @param environment - Environment name
 * @returns WebSocket URL for the environment
 */
export function getVowelPrimeUrl(environment: VowelPrimeEnvironment): string {
  return VOWEL_PRIME_URLS[environment];
}

/**
 * Resolve vowel Prime worker URL from configuration
 * Priority: workerUrl > environment > default (staging)
 * 
 * @param workerUrl - Optional explicit worker URL
 * @param environment - Optional environment name
 * @returns Resolved WebSocket URL
 */
export function resolveVowelPrimeUrl(
  workerUrl?: string,
  environment?: VowelPrimeEnvironment
): string {
  // Explicit URL takes precedence
  if (workerUrl) {
    return workerUrl;
  }
  
  // Environment shortcut
  if (environment) {
    return getVowelPrimeUrl(environment);
  }
  
  // Default to staging
  return VOWEL_PRIME_URLS.staging;
}

/**
 * Convert WebSocket URL to HTTP URL for token generation
 * wss://example.com -> https://example.com
 * ws://example.com -> http://example.com
 * 
 * @param wsUrl - WebSocket URL
 * @returns HTTP URL
 */
export function wsToHttpUrl(wsUrl: string): string {
  return wsUrl.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');
}


