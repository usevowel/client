/**
 * @fileoverview Floating Cursor Renderer - Renders the floating cursor in React
 * 
 * This component reads from FloatingCursorContext and renders the cursor.
 * It can be:
 * - Automatically included in VowelAgent (default)
 * - Rendered separately for custom placement
 * 
 * @module @vowel.to/client/components
 * @author vowel.to
 * @license Proprietary
 */

import { FloatingCursorComponent } from './FloatingCursorComponent';
import { useFloatingCursorOptional } from './FloatingCursorProvider';

/**
 * Props for FloatingCursorRenderer
 */
export interface FloatingCursorRendererProps {
  /** 
   * Optional class name for custom styling 
   * Note: Cursor is fixed positioned, so this may not have much effect
   */
  className?: string;
}

/**
 * Floating Cursor Renderer
 * 
 * Renders the floating cursor based on context state.
 * Safe to render multiple times - will only render if cursor is enabled and has state.
 * 
 * This component is automatically included in VowelAgent by default.
 * You only need to use this directly if:
 * - You disabled cursor in VowelAgent (enableFloatingCursor={false})
 * - You want custom cursor placement
 * - You're not using VowelAgent at all
 * 
 * @example Default (automatic - no need to use this)
 * ```tsx
 * <VowelProvider client={client}>
 *   <VowelAgent />
 * </VowelProvider>
 * ```
 * 
 * @example Custom placement
 * ```tsx
 * <VowelProvider client={client}>
 *   <VowelAgent enableFloatingCursor={false} />
 *   <FloatingCursorRenderer />
 * </VowelProvider>
 * ```
 * 
 * @example Without VowelAgent
 * ```tsx
 * <VowelProvider client={client}>
 *   <MyCustomUI />
 *   <FloatingCursorRenderer />
 * </VowelProvider>
 * ```
 */
export function FloatingCursorRenderer({}: FloatingCursorRendererProps = {}) {
  const context = useFloatingCursorOptional();

  // No context = no floating cursor provider = don't render
  if (!context) {
    return null;
  }

  // Not enabled = don't render
  if (!context.isEnabled) {
    return null;
  }

  // No cursor state = don't render (cursor is hidden)
  if (!context.cursorState) {
    return null;
  }

  return (
    <FloatingCursorComponent
      x={context.cursorState.x}
      y={context.cursorState.y}
      text={context.cursorState.text}
      isIdle={context.cursorState.isIdle}
      visible={true}
      cursorColor={context.config.appearance?.cursorColor}
      cursorSize={context.config.appearance?.cursorSize}
      badgeBackground={context.config.appearance?.badgeBackground}
      badgeTextColor={context.config.appearance?.badgeTextColor}
      enableTyping={context.config.animation?.enableTyping}
      typingSpeed={context.config.animation?.typingSpeed}
      enableBounce={context.config.animation?.enableBounce}
      transitionDuration={context.config.animation?.transitionDuration}
      zIndex={context.config.behavior?.zIndex}
    />
  );
}


