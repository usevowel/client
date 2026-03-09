/**
 * @fileoverview Floating Cursor Provider - React Context for cursor state
 * 
 * Internal provider that manages floating cursor state in React applications.
 * Automatically wrapped by VowelProvider - users don't interact with this directly.
 * 
 * @module @vowel.to/client/components
 * @author vowel.to
 * @license Proprietary
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { FloatingCursorConfig, FloatingCursorUpdate } from '../types';

/**
 * Floating cursor context state
 */
export interface FloatingCursorContextType {
  /** Current cursor position and state */
  cursorState: FloatingCursorUpdate | null;
  
  /** Whether cursor is enabled */
  isEnabled: boolean;
  
  /** Cursor configuration */
  config: FloatingCursorConfig;
  
  /** Update cursor position and text */
  updateCursor: (update: FloatingCursorUpdate) => void;
  
  /** Show cursor in resting position */
  showResting: (text?: string) => void;
  
  /** Hide cursor */
  hide: () => void;
  
  /** Enable cursor */
  enable: () => void;
  
  /** Disable cursor */
  disable: () => void;
}

const FloatingCursorContext = createContext<FloatingCursorContextType | null>(null);

/**
 * Props for FloatingCursorProvider
 * 
 * Note: This is an internal component. Users don't use this directly.
 * It's automatically included in VowelProvider.
 */
export interface FloatingCursorProviderProps {
  /** Floating cursor configuration */
  config: FloatingCursorConfig;
  
  /** Children to render */
  children: ReactNode;
}

/**
 * Floating Cursor Provider (Internal)
 * 
 * Provides floating cursor state management for React applications.
 * This is automatically wrapped by VowelProvider - users don't need to use this directly.
 * 
 * The actual cursor rendering happens in FloatingCursorRenderer, which can be:
 * - Automatically included in VowelAgent (default)
 * - Rendered separately for custom placement
 * 
 * @example This is internal - users use VowelProvider instead
 * ```tsx
 * <VowelProvider client={client} floatingCursor={{ enabled: true }}>
 *   <VowelAgent /> // Cursor automatically included
 * </VowelProvider>
 * ```
 */
export function FloatingCursorProvider({
  config,
  children,
}: FloatingCursorProviderProps) {
  const [cursorState, setCursorState] = useState<FloatingCursorUpdate | null>(null);
  const [isEnabled, setIsEnabled] = useState(config.enabled);
  const [currentConfig] = useState(config);

  const contextValue: FloatingCursorContextType = {
    cursorState,
    isEnabled,
    config: currentConfig,
    
    updateCursor: (update: FloatingCursorUpdate) => {
      console.log('🎯 [FloatingCursorProvider] Updating cursor:', update);
      setCursorState(update);
    },
    
    showResting: (text = 'Ready') => {
      console.log('🎯 [FloatingCursorProvider] Showing resting position');
      setCursorState({
        x: 50,
        y: 91,
        text,
        isIdle: true,
      });
    },
    
    hide: () => {
      console.log('🎯 [FloatingCursorProvider] Hiding cursor');
      setCursorState(null);
    },
    
    enable: () => {
      console.log('🎯 [FloatingCursorProvider] Enabling cursor');
      setIsEnabled(true);
    },
    
    disable: () => {
      console.log('🎯 [FloatingCursorProvider] Disabling cursor');
      setIsEnabled(false);
      setCursorState(null);
    },
  };

  // Expose context globally so VowelClient can detect React mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__vowelFloatingCursorContext = contextValue;
      console.log('🎯 [FloatingCursorProvider] Exposed context globally for VowelClient detection');
      
      return () => {
        (window as any).__vowelFloatingCursorContext = null;
        console.log('🎯 [FloatingCursorProvider] Removed global context reference');
      };
    }
  }, [contextValue]);

  return (
    <FloatingCursorContext.Provider value={contextValue}>
      {children}
    </FloatingCursorContext.Provider>
  );
}

/**
 * Hook to access floating cursor context
 * 
 * Use this in custom components that need to control the floating cursor.
 * 
 * @example
 * ```tsx
 * function MyAutomationComponent() {
 *   const { updateCursor } = useFloatingCursor();
 *   
 *   const handleAction = () => {
 *     updateCursor({ x: 50, y: 50, text: 'Clicking button', isIdle: false });
 *   };
 *   
 *   return <button onClick={handleAction}>Perform Action</button>;
 * }
 * ```
 */
export function useFloatingCursor(): FloatingCursorContextType {
  const context = useContext(FloatingCursorContext);
  
  if (!context) {
    throw new Error('useFloatingCursor must be used within a VowelProvider with floatingCursor enabled');
  }
  
  return context;
}

/**
 * Optional hook that returns null if not in FloatingCursorProvider
 * 
 * Use this for components that work with or without cursor support.
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const cursor = useFloatingCursorOptional();
 *   
 *   const handleAction = () => {
 *     // Only update cursor if available
 *     cursor?.updateCursor({ x: 50, y: 50, text: 'Action', isIdle: false });
 *   };
 * }
 * ```
 */
export function useFloatingCursorOptional(): FloatingCursorContextType | null {
  return useContext(FloatingCursorContext);
}


