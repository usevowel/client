/**
 * Utility functions for Vowel library
 */

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export const VOWEL_UI_SCOPE_CLASS = "vowel-ui"

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
