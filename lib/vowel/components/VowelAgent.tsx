/**
 * @fileoverview VowelAgent Component - Floating voice agent UI button
 * 
 * This file contains the `VowelAgent` React component which provides a floating
 * voice agent button that can be positioned anywhere on the screen. It includes
 * visual feedback for connection states, speaking states, and an optional
 * transcript panel for viewing conversation history.
 * 
 * Features:
 * - Floating button with customizable position
 * - Visual states: idle, connecting, active, speaking
 * - Optional transcript panel
 * - Smooth animations and transitions
 * - Accessible keyboard navigation
 * - Customizable styling
 * 
 * @module @vowel.to/client/components
 * @author vowel.to
 * @license Proprietary
 */

import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { useVowel } from "./VowelProviderSimple";
import { FloatingMicButton } from "./FloatingMicButton";
import { VoiceNagWrapper, type VoiceNagWrapperProps } from "./VoiceNagWrapper";
import { TermsPrivacyModal, type TermsPrivacyModalProps } from "./TermsPrivacyModal";
import { FloatingCursorRenderer } from "./FloatingCursorRenderer";
import { VowelCaption } from "./VowelCaption";
import { ErrorModal } from "./ErrorModal";
import { cn, VOWEL_UI_SCOPE_CLASS } from "../utils";
import type { VowelPosition } from "./types";
import { positionClasses } from "./types";
import "../styles/styles.css";

/**
 * Props for VowelAgent
 */
export interface VowelAgentProps {
  /** Position of the floating button */
  position?: VowelPosition;

  /** Custom className */
  className?: string;

  /** Show transcript panel */
  showTranscripts?: boolean;

  /** Custom button color */
  buttonColor?: string;

  // Voice Nag Options
  /** Enable the voice nag wrapper */
  enableNag?: boolean;

  /** Custom title for the nag message */
  nagTitle?: VoiceNagWrapperProps["nagTitle"];

  /** Custom description for the nag message */
  nagDescription?: VoiceNagWrapperProps["nagDescription"];

  /** Custom acknowledge button text for nag */
  nagButtonText?: VoiceNagWrapperProps["nagButtonText"];

  /** LocalStorage key prefix for nag state */
  nagStorageKeyPrefix?: VoiceNagWrapperProps["storageKeyPrefix"];

  /** Callback when nag is dismissed */
  onNagDismiss?: VoiceNagWrapperProps["onDismiss"];

  // Terms & Privacy Modal Options
  /** Enable the terms and privacy modal */
  enableTermsModal?: boolean;

  /** Modal title for terms/privacy */
  termsModalTitle?: TermsPrivacyModalProps["title"];

  /** Modal description for terms/privacy */
  termsModalDescription?: TermsPrivacyModalProps["description"];

  /** Terms of service content (HTML or text) */
  termsContent?: TermsPrivacyModalProps["termsContent"];

  /** URL to external terms of service */
  termsUrl?: TermsPrivacyModalProps["termsUrl"];

  /** Privacy policy content (HTML or text) */
  privacyContent?: TermsPrivacyModalProps["privacyContent"];

  /** URL to external privacy policy */
  privacyUrl?: TermsPrivacyModalProps["privacyUrl"];

  /** Text for the accept button in modal */
  termsAcceptButtonText?: TermsPrivacyModalProps["acceptButtonText"];

  /** Text for the decline button in modal */
  termsDeclineButtonText?: TermsPrivacyModalProps["declineButtonText"];

  /** Whether to show a decline button in modal */
  termsAllowDecline?: TermsPrivacyModalProps["allowDecline"];

  /** LocalStorage key prefix for terms acceptance state */
  termsStorageKeyPrefix?: TermsPrivacyModalProps["storageKeyPrefix"];

  /** Callback when terms are accepted */
  onTermsAccept?: TermsPrivacyModalProps["onAccept"];

  /** Callback when terms are declined */
  onTermsDecline?: TermsPrivacyModalProps["onDecline"];

  /**
   * Whether to render the floating cursor
   * Only applies when VowelProvider has floatingCursor enabled
   * 
   * @default true
   * 
   * Set to false if you want to render the cursor separately:
   * @example
   * ```tsx
   * <VowelProvider client={client}>
   *   <VowelAgent enableFloatingCursor={false} />
   *   <FloatingCursorRenderer />
   * </VowelProvider>
   * ```
   */
  enableFloatingCursor?: boolean;
}

/**
 * Floating voice agent button with optional transcript panel
 * Positioned in a corner of the screen
 *
 * @example
 * ```tsx
 * import { VowelAgent } from '@/lib/vowel';
 *
 * function App() {
 *   return (
 *     <>
 *       <YourApp />
 *       <VowelAgent
 *         position="bottom-right"
 *         showTranscripts={true}
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export function VowelAgent({
  position = "bottom-right",
  className,
  showTranscripts = false,
  // Nag props
  enableNag = false,
  nagTitle,
  nagDescription,
  nagButtonText,
  nagStorageKeyPrefix,
  onNagDismiss,
  // Terms modal props
  enableTermsModal = false,
  termsModalTitle,
  termsModalDescription,
  termsContent,
  termsUrl,
  privacyContent,
  privacyUrl,
  termsAcceptButtonText,
  termsDeclineButtonText,
  termsAllowDecline,
  termsStorageKeyPrefix,
  onTermsAccept,
  onTermsDecline,
  // Floating cursor prop
  enableFloatingCursor = true,
}: VowelAgentProps) {
  const { state, toggleSession, clearTranscripts, client } = useVowel();
  const [showPanel, setShowPanel] = useState(false);
  const [isAttemptingConnection, setIsAttemptingConnection] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const connectionBlockedRef = useRef(false);

  // Track error state and show modal when error occurs
  useEffect(() => {
    if (state.error && !showErrorModal) {
      setShowErrorModal(true);
    }
  }, [state.error, showErrorModal]);

  // Handle error modal close - clear error from client state
  const handleErrorModalClose = () => {
    setShowErrorModal(false);
    if (client && state.error) {
      client.clearError();
    }
  };

  // Don't render if client is not available yet
  if (!client) {
    return null;
  }

  // SYNCHRONOUS click handler - Opens content window for Shopify
  const handleToggleSession = () => {
    console.log("[VowelAgent] handleToggleSession fired", {
      isConnecting: state.isConnecting,
      isConnected: state.isConnected,
      hasError: !!state.error,
      termsModalEnabled: enableTermsModal,
    });

    // If there's an error, clear it and allow reconnection
    if (state.error) {
      console.log("[VowelAgent] Error state detected, clearing error and attempting reconnection");
      if (client) {
        client.clearError();
      }
      // Continue to connection logic below
    }

    // Always allow disconnection, regardless of state (connecting, AI speaking, etc.)
    if (state.isConnected || state.isConnecting) {
      console.log("[VowelAgent] Disconnecting session (allowed at any state)");
      proceedWithConnection(); // This will call toggleSession which handles disconnection
      return;
    }

    // If terms modal is enabled and user is trying to connect, trigger the modal check
    if (enableTermsModal && !state.isConnected) {
      console.log("[VowelAgent] Terms modal enabled, checking acceptance...");
      setIsAttemptingConnection(true);
      
      // The TermsPrivacyModal will check localStorage and show itself if needed
      // If terms haven't been accepted, connection will be blocked
      // We'll reset the attempt flag after a short delay to allow the modal to show
      setTimeout(() => {
        if (connectionBlockedRef.current) {
          console.log("[VowelAgent] Connection blocked by terms modal");
          setIsAttemptingConnection(false);
          connectionBlockedRef.current = false;
          return;
        }
        // If we get here, terms were already accepted, proceed with connection
        proceedWithConnection();
      }, 100);
      return;
    }

    // No terms modal, proceed with connection
    proceedWithConnection();
  };

  /**
   * Proceed with the actual connection logic
   */
  const proceedWithConnection = () => {
    // For Shopify: Open content window SYNCHRONOUSLY on user gesture
    // WindowProxy may be null (popup blocked) but window still opens
    // Navigation is handled via BroadcastChannel regardless
    if (!state.isConnected && typeof window !== 'undefined') {
      const needsContentWindow = (window as any).__vowelNeedsContentWindow === true;
      
      if (needsContentWindow) {
        console.log("🚀 [VowelAgent] Opening controlled content window...");
        
        // Add query parameter to mark this as a controlled tab
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('vowel_controlled', 'true');
        const controlledUrl = currentUrl.toString();
        
        console.log("   📍 URL:", controlledUrl);
        console.log("   🔖 Query param: vowel_controlled=true");
        
        const contentWindow = window.open(controlledUrl, '_blank', 'noopener,noreferrer');
        
        if (contentWindow) {
          // Set window name for additional identification
          const windowName = `vowel-content-${Date.now()}`;
          contentWindow.name = windowName;
          console.log("✅ [VowelAgent] Content window opened successfully");
          console.log("   📛 Window name:", windowName);
          console.log("   🔗 URL with query param:", controlledUrl);
        } else {
          console.warn("⚠️ [VowelAgent] WindowProxy blocked by popup blocker");
          console.log("   ℹ️  Window may still open in background");
          console.log("   ℹ️  Navigation will work via BroadcastChannel");
        }
      }
    }

    // Call toggleSession (async is fine now, window already opened)
    toggleSession().catch(error => {
      console.error("[VowelAgent] toggleSession failed", error);
    });
    
    // Reset attempt flag
    setIsAttemptingConnection(false);
  };

  /**
   * Block connection when terms haven't been accepted
   */
  const handleBlockConnection = () => {
    console.log("[VowelAgent] Connection blocked - terms not accepted");
    connectionBlockedRef.current = true;
  };

  /**
   * Handle terms acceptance - proceed with connection
   */
  const handleTermsAccepted = () => {
    console.log("[VowelAgent] Terms accepted - proceeding with connection");
    onTermsAccept?.();
    
    // Trigger connection after acceptance
    setTimeout(() => {
      proceedWithConnection();
    }, 300);
  };

  // Calculate transcript panel position based on button position
  const getTranscriptPosition = () => {
    const isBottom = position.includes('bottom');
    const isRight = position.includes('right');
    
    return cn(
      "absolute w-80 max-h-96 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden",
      isBottom ? "bottom-24" : "top-24",
      isRight ? "right-0" : "left-0"
    );
  };

  return (
    <>
      {/* Error Modal */}
      {state.error && (
        <ErrorModal
          isOpen={showErrorModal}
          onClose={handleErrorModalClose}
          errorMessage={state.error.message}
          errorDetails={state.error.details}
          timestamp={state.error.timestamp}
        />
      )}

      {/* Terms & Privacy Modal */}
      {enableTermsModal && (
        <TermsPrivacyModal
          enabled={enableTermsModal}
          title={termsModalTitle}
          description={termsModalDescription}
          termsContent={termsContent}
          termsUrl={termsUrl}
          privacyContent={privacyContent}
          privacyUrl={privacyUrl}
          acceptButtonText={termsAcceptButtonText}
          declineButtonText={termsDeclineButtonText}
          allowDecline={termsAllowDecline}
          storageKeyPrefix={termsStorageKeyPrefix}
          onAccept={handleTermsAccepted}
          onDecline={onTermsDecline}
          isAttemptingConnection={isAttemptingConnection}
          blockConnection={handleBlockConnection}
        />
      )}

      {/* Main Voice Agent UI */}
      <div className={cn(VOWEL_UI_SCOPE_CLASS, "fixed z-50", positionClasses[position], className)}>
        {/* Transcript Panel */}
        {showTranscripts && showPanel && (
        <div className={getTranscriptPosition()}>
          <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">
              Conversation
            </h3>
            <div className="flex items-center gap-3">
              <button
                onClick={clearTranscripts}
                className="text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => setShowPanel(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full p-1 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto max-h-80 p-4 space-y-3">
            {state.transcripts.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                No conversation yet. Start talking!
              </p>
            ) : (
              state.transcripts.map((transcript, index) => {
                const isLatest = index === state.transcripts.length - 1;
                const isActiveUser = isLatest && transcript.role === "user" && state.isUserSpeaking;
                const isActiveAssistant = isLatest && transcript.role === "assistant" && (state.isAISpeaking || state.isAIThinking);
                
                return (
                  <div
                    key={index}
                    className={cn(
                      "p-3 rounded-xl text-sm shadow-sm transition-all hover:shadow-md",
                      transcript.role === "user"
                        ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white ml-8"
                        : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 mr-8 border border-gray-200 dark:border-gray-700",
                      // Add pulse animation for active speaker's latest message
                      (isActiveUser || isActiveAssistant) && "animate-pulse ring-2 ring-offset-2",
                      isActiveUser && "ring-blue-400",
                      isActiveAssistant && state.isAISpeaking && "ring-purple-400",
                      isActiveAssistant && state.isAIThinking && !state.isAISpeaking && "ring-yellow-400"
                    )}
                  >
                    <div className={cn(
                      "font-bold text-xs mb-1.5 uppercase tracking-wide",
                      transcript.role === "user" 
                        ? "text-blue-100" 
                        : "text-gray-600 dark:text-gray-400"
                    )}>
                      {transcript.role === "user" ? "You" : "Assistant"}
                      {isActiveUser && " • Speaking"}
                      {isActiveAssistant && state.isAISpeaking && " • Speaking"}
                      {isActiveAssistant && state.isAIThinking && !state.isAISpeaking && " • Thinking"}
                    </div>
                    <div className="leading-relaxed">{transcript.text}</div>
                    <div className={cn(
                      "text-xs mt-2",
                      transcript.role === "user"
                        ? "text-blue-200"
                        : "text-gray-500 dark:text-gray-500"
                    )}>
                      {transcript.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Status Badge */}
      {/* {state.isConnected && (
        <div className={cn(
          "absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap shadow-lg border-2 transition-all duration-300",
          // State-specific styling
          state.isAISpeaking
            ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white border-purple-400 animate-pulse"
            : state.isAIThinking
            ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-yellow-400 animate-pulse"
            : state.isUserSpeaking
            ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-400 animate-pulse"
            : "bg-gradient-to-r from-gray-900 to-gray-800 dark:from-gray-100 dark:to-gray-200 text-white dark:text-gray-900 border-gray-700 dark:border-gray-300"
        )}>
          {state.isAISpeaking && "🔊 AI Speaking"}
          {state.isAIThinking && !state.isAISpeaking && "🧠 AI Thinking"}
          {state.isUserSpeaking && !state.isAIThinking && !state.isAISpeaking && "🎤 Listening"}
          {!state.isAISpeaking && !state.isAIThinking && !state.isUserSpeaking && state.status}
        </div>
      )} */}

      {/* Main Button - Wrapped with optional VoiceNagWrapper */}
      <VoiceNagWrapper
        enabled={enableNag}
        position={position}
        nagTitle={nagTitle}
        nagDescription={nagDescription}
        nagButtonText={nagButtonText}
        storageKeyPrefix={nagStorageKeyPrefix}
        onDismiss={onNagDismiss}
        isConnected={state.isConnected}
      >
        <FloatingMicButton
          isConnected={state.isConnected}
          isConnecting={state.isConnecting}
          isDisconnecting={state.isDisconnecting}
          isUserSpeaking={state.isUserSpeaking}
          isAiSpeaking={state.isAISpeaking}
          isAiThinking={state.isAIThinking}
          isToolExecuting={state.isToolExecuting}
          isResuming={state.isResuming}
          isPaused={state.status === "Paused"}
          isHibernated={state.isHibernated}
          hasError={!!state.error}
          onClick={handleToggleSession}
          title={state.error ? "Error occurred - click to reconnect" : (state.isConnected ? "Stop voice session" : "Start voice session")}
          inline={true} // Use inline mode - parent handles positioning
          showActionIcon={true} // Show action (what will happen on click) instead of current state
          showSettings={true} // Show settings button (hover to reveal)
          client={client} // Pass client for settings modal
        />
      </VoiceNagWrapper>

      {/* Floating cursor - rendered by default when VowelProvider has floatingCursor enabled */}
      {enableFloatingCursor && <FloatingCursorRenderer />}

      {/* Caption System (unofficial dev tool) */}
      {client && (() => {
        const config = client.getConfig();
        return config._caption?.enabled && (
          <VowelCaption
            position={config._caption.position || 'top-center'}
            maxWidth={config._caption.maxWidth}
            showRole={config._caption.showRole}
          />
        );
      })()}

      {/* Transcript Toggle */}
      {showTranscripts && (
        <button
          onClick={() => setShowPanel(!showPanel)}
          className={cn(
            "absolute text-xs font-medium bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-700 dark:text-gray-300 px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all border border-gray-200/50 dark:border-gray-700/50 hover:scale-105",
            position.includes('bottom') ? "-top-14" : "-bottom-14",
            position.includes('right') ? "right-0" : "left-0"
          )}
        >
          {showPanel ? "Hide" : "Show"} Chat
        </button>
      )}
      </div>
    </>
  );
}
