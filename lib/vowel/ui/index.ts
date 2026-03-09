/**
 * @fileoverview UI Components - Visual feedback components
 * 
 * Exports all UI-related components and managers for providing visual
 * feedback during voice interactions.
 * 
 * @module @vowel.to/client/ui
 * @author vowel.to
 * @license Proprietary
 */

// Border Glow
export { BorderGlowManager, createBorderGlow } from './border-glow';
export type { BorderGlowConfig } from './border-glow';

// Floating Action Pill
export {
  FloatingActionPill,
  FloatingActionPillManager,
  createFloatingActionPill,
} from './FloatingActionPill';
export type {
  FloatingActionPillConfig,
  FloatingActionPillProps,
} from './FloatingActionPill';




