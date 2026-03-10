/**
 * @fileoverview Controlled Banner Component (Legacy)
 * 
 * A banner displayed at the top of controlled tabs to indicate they are being
 * controlled by the Vowel voice agent. Features an animated gradient background.
 * 
 * NOTE: This is the legacy version. The new default is ControlledByVowelFrame
 * which provides a full border frame instead of just a top banner.
 * 
 * @module @vowel.to/client/components
 * @author vowel.to
 * @license Proprietary
 */

import { Mic } from 'lucide-react';
import { cn, VOWEL_UI_SCOPE_CLASS } from '../utils';

/**
 * ControlledBannerLegacy component props
 */
export interface ControlledBannerLegacyProps {
  /** Text to display in banner */
  text?: string;
  
  /** Custom className */
  className?: string;
  
  /** Z-index for positioning */
  zIndex?: number;
  
  /** Whether to add body padding (to prevent content from being hidden behind banner) */
  addBodyPadding?: boolean;
}

/**
 * ControlledBannerLegacy Component
 * 
 * Displays a banner at the top of the page to indicate it's controlled by Vowel.
 * This is the legacy version - consider using ControlledByVowelFrame for the new frame design.
 * 
 * @example
 * ```tsx
 * <ControlledBannerLegacy text="Controlled by Vowel Voice Agent" />
 * ```
 */
export function ControlledBannerLegacy({
  text = 'Controlled by Vowel Voice Agent',
  className,
  zIndex = 999999,
  addBodyPadding = true,
}: ControlledBannerLegacyProps) {
  return (
    <>
      {/* Add custom styles for gradient animation and body padding */}
      <style>
        {`
          @keyframes vowel-gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          
          .vowel-controlled-banner {
            animation: vowel-gradient 15s ease infinite;
          }
          
          ${addBodyPadding ? 'body { padding-top: 48px !important; }' : ''}
        `}
      </style>
      
      <div
        className={cn(
          VOWEL_UI_SCOPE_CLASS,
          "vowel-controlled-banner",
          "fixed top-0 left-0 right-0",
          "py-3 px-5 text-center",
          "bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-400",
          "text-white font-sans text-sm font-medium tracking-wide",
          "shadow-md",
          className
        )}
        style={{
          zIndex,
          backgroundSize: '400% 400%',
        }}
      >
        <span className="inline-flex items-center gap-2">
          <Mic className="w-4.5 h-4.5" />
          <span>{text}</span>
        </span>
      </div>
    </>
  );
}
