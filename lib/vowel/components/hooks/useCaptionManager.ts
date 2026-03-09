/**
 * @fileoverview Caption Manager Hook - Manages caption state and transcript events
 * 
 * This hook manages the caption system state, accumulating transcript deltas
 * and handling caption lifecycle (streaming, finalization, dismissal).
 * 
 * @internal
 * Unofficial dev tool for testing speech transcription
 * 
 * @module @vowel.to/client/components/hooks
 * @author vowel.to
 * @license Proprietary
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useVowel } from '../VowelProviderSimple';

/**
 * Caption state
 */
export interface CaptionState {
  /** Current caption text */
  text: string;
  /** Role: user or assistant */
  role: 'user' | 'assistant';
  /** Whether caption is currently visible */
  isVisible: boolean;
  /** Timestamp when caption was created */
  timestamp: Date;
  /** Whether caption is being streamed (deltas arriving) */
  isStreaming: boolean;
}

/**
 * Streaming state for accumulating deltas
 */
interface StreamingState {
  /** Current response ID being streamed */
  responseId: string | null;
  /** Accumulated text from deltas */
  text: string;
  /** Role of the streaming caption */
  role: 'user' | 'assistant';
}

/**
 * Accumulate delta text for streaming captions
 * 
 * OpenAI Agents.js SDK sends incremental text deltas. We concatenate them with spaces
 * to ensure proper word separation. The responseId change triggers a reset for new responses.
 * 
 * @param currentText - Currently accumulated text
 * @param deltaText - New incremental delta
 * @returns Accumulated text with space separator
 */
function accumulateDelta(currentText: string, deltaText: string): string {
  if (!deltaText) return currentText;
  if (!currentText) return deltaText;
  
  // Add space between deltas to ensure proper word separation
  // OpenAI Realtime API may send deltas without spaces between words
  // Only add space if currentText doesn't already end with one
  const needsSpace = !currentText.endsWith(' ') && !deltaText.startsWith(' ');
  return currentText + (needsSpace ? ' ' : '') + deltaText;
}

/**
 * Hook to manage caption state and transcript events
 * 
 * @returns Caption state and dismissal function
 */
export function useCaptionManager() {
  const { client } = useVowel();
  const [caption, setCaption] = useState<CaptionState | null>(null);
  const streamingStateRef = useRef<StreamingState>({
    responseId: null,
    text: '',
    role: 'assistant',
  });
  
  // Get caption config to check if streaming is enabled
  const captionConfig = client?.getConfig()._caption;
  const showStreaming = captionConfig?.showStreaming ?? true; // Default: true
  const showDeltaSumOnly = captionConfig?._showDeltaSumOnly ?? false; // Default: false

  /**
   * Show a new caption
   */
  const showCaption = useCallback((text: string, role: 'user' | 'assistant', isStreaming: boolean = false) => {
    if (!text.trim()) return;

    setCaption({
      text: text.trim(),
      role,
      isVisible: true,
      timestamp: new Date(),
      isStreaming,
    });
  }, []);

  /**
   * Dismiss current caption
   */
  const dismissCaption = useCallback(() => {
    setCaption(prev => prev ? { ...prev, isVisible: false } : null);
    // Clear after animation
    setTimeout(() => {
      setCaption(null);
      streamingStateRef.current = {
        responseId: null,
        text: '',
        role: 'assistant',
      };
    }, 300);
  }, []);

  /**
   * Handle transcript events from the client
   * Shows streaming captions if enabled, otherwise only complete transcripts
   */
  useEffect(() => {
    if (!client) return;

    // Subscribe to transcript events
    const unsubscribe = client.onTranscriptEvent((event) => {
      if (event.type === 'delta' && showStreaming) {
        // Streaming caption - accumulate deltas
        const currentState = streamingStateRef.current;
        
        // Check if this is a reset signal (empty text with responseId)
        const isReset = !event.text && event.responseId;
        
        // Check if this is a new response (different responseId or reset signal)
        const isNewResponse = event.responseId && 
          (event.responseId !== currentState.responseId || isReset);
        
        if (isNewResponse) {
          // New response starting - reset accumulation
          streamingStateRef.current = {
            responseId: event.responseId || null,
            text: event.text || '', // Start fresh
            role: event.role,
          };
        } else if (event.text) {
          // Accumulate delta with deduplication
          const accumulatedText = accumulateDelta(currentState.text, event.text);
          
          streamingStateRef.current = {
            ...currentState,
            text: accumulatedText,
          };
        }
        
        // Show streaming caption (only if we have text)
        if (streamingStateRef.current.text) {
          showCaption(streamingStateRef.current.text, event.role, true);
        }
      } else if (event.type === 'done') {
        // Complete caption
        if (showDeltaSumOnly) {
          // Debug mode: Show accumulated delta sum instead of final text
          const accumulatedText = streamingStateRef.current.text;
          if (accumulatedText) {
            showCaption(accumulatedText, event.role, false);
          }
        } else {
          // Normal mode: Show final text from "done" event
          if (event.text) {
            showCaption(event.text, event.role, false);
          }
        }
        
        // Clear streaming state
        streamingStateRef.current = {
          responseId: null,
          text: '',
          role: 'assistant',
        };
      }
      // If showStreaming is false, ignore 'delta' events
    });

    return () => {
      unsubscribe();
    };
  }, [client, showCaption, showStreaming]);

  return {
    caption,
    dismissCaption,
    showCaption,
  };
}
