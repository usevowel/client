/**
 * @fileoverview TermsPrivacyModal Component - Terms and conditions acceptance modal
 * 
 * This component displays a modal requiring users to accept terms of service and
 * privacy policy before using the voice agent. The acceptance state is persisted
 * to localStorage. The modal can be configured to show terms and/or privacy content
 * inline or as external links.
 * 
 * Features:
 * - Optional terms and conditions requirement
 * - Customizable content (inline or links)
 * - LocalStorage persistence
 * - Blocks voice agent usage until accepted
 * - Smooth modal animations
 * - Mobile-responsive design
 * - Keyboard navigation (ESC to close if decline allowed)
 * 
 * @module @vowel.to/client/components
 * @author vowel.to
 * @license Proprietary
 */

import { useState, useEffect } from "react";
import { X, Shield, FileText } from "lucide-react";
import { cn, VOWEL_UI_SCOPE_CLASS } from "../utils";

/**
 * Props for TermsPrivacyModal
 */
export interface TermsPrivacyModalProps {
  /** Whether to require terms acceptance */
  enabled?: boolean;

  /** Modal title */
  title?: string;

  /** Modal description/intro text */
  description?: string;

  /** Terms of service content (HTML or text) */
  termsContent?: string;

  /** URL to external terms of service */
  termsUrl?: string;

  /** Privacy policy content (HTML or text) */
  privacyContent?: string;

  /** URL to external privacy policy */
  privacyUrl?: string;

  /** Text for the accept button */
  acceptButtonText?: string;

  /** Text for the decline button (if allowed) */
  declineButtonText?: string;

  /** Whether to show a decline button */
  allowDecline?: boolean;

  /** LocalStorage key prefix for storing acceptance state */
  storageKeyPrefix?: string;

  /** Callback when terms are accepted */
  onAccept?: () => void;

  /** Callback when terms are declined */
  onDecline?: () => void;

  /** Whether the voice agent is trying to connect (triggers modal if not accepted) */
  isAttemptingConnection?: boolean;

  /** Function to block connection (called when terms not accepted) */
  blockConnection?: () => void;
}

/**
 * Default modal content
 */
const DEFAULT_TITLE = "Terms & Privacy";
const DEFAULT_DESCRIPTION = "Before using the voice assistant, please review and accept our terms of service and privacy policy.";
const DEFAULT_ACCEPT_BUTTON = "Accept & Continue";
const DEFAULT_DECLINE_BUTTON = "Decline";
const DEFAULT_STORAGE_KEY_PREFIX = "vowel-terms-privacy";

/**
 * TermsPrivacyModal Component
 * 
 * Displays a modal requiring users to accept terms and privacy policy before
 * using the voice agent. Acceptance is persisted to localStorage.
 * 
 * @example
 * ```tsx
 * <TermsPrivacyModal
 *   enabled={true}
 *   termsUrl="https://example.com/terms"
 *   privacyUrl="https://example.com/privacy"
 *   isAttemptingConnection={state.isConnecting}
 *   onAccept={() => console.log('Terms accepted')}
 * />
 * ```
 */
export function TermsPrivacyModal({
  enabled = false,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  termsContent,
  termsUrl,
  privacyContent,
  privacyUrl,
  acceptButtonText = DEFAULT_ACCEPT_BUTTON,
  declineButtonText = DEFAULT_DECLINE_BUTTON,
  allowDecline = false,
  storageKeyPrefix = DEFAULT_STORAGE_KEY_PREFIX,
  onAccept,
  onDecline,
  isAttemptingConnection = false,
  blockConnection,
}: TermsPrivacyModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [activeTab, setActiveTab] = useState<"terms" | "privacy">("terms");

  const acceptedKey = `${storageKeyPrefix}-accepted`;
  const acceptedTimestampKey = `${storageKeyPrefix}-timestamp`;

  // Initialize acceptance state from localStorage
  useEffect(() => {
    if (!enabled) {
      setHasAccepted(true); // If disabled, consider as accepted
      return;
    }

    try {
      const isAccepted = localStorage.getItem(acceptedKey) === "true";
      setHasAccepted(isAccepted);
      
      if (isAccepted) {
        const timestamp = localStorage.getItem(acceptedTimestampKey);
        console.log(`[TermsPrivacyModal] Terms previously accepted at ${timestamp || 'unknown time'}`);
      }
    } catch (error) {
      console.error("[TermsPrivacyModal] Error reading localStorage:", error);
      setHasAccepted(false);
    }
  }, [enabled, acceptedKey, acceptedTimestampKey]);

  // Show modal if attempting connection and terms not accepted
  useEffect(() => {
    if (enabled && isAttemptingConnection && !hasAccepted) {
      console.log("[TermsPrivacyModal] Connection attempted but terms not accepted - showing modal");
      setIsOpen(true);
      blockConnection?.();
    }
  }, [enabled, isAttemptingConnection, hasAccepted, blockConnection]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !allowDecline) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleDecline();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, allowDecline]);

  /**
   * Handle terms acceptance
   */
  const handleAccept = () => {
    try {
      const timestamp = new Date().toISOString();
      localStorage.setItem(acceptedKey, "true");
      localStorage.setItem(acceptedTimestampKey, timestamp);
      
      setHasAccepted(true);
      setIsOpen(false);
      
      console.log(`[TermsPrivacyModal] Terms accepted at ${timestamp}`);
      onAccept?.();
    } catch (error) {
      console.error("[TermsPrivacyModal] Error writing to localStorage:", error);
    }
  };

  /**
   * Handle terms decline
   */
  const handleDecline = () => {
    setIsOpen(false);
    console.log("[TermsPrivacyModal] Terms declined");
    onDecline?.();
  };

  // Don't render if disabled or already accepted
  if (!enabled || (hasAccepted && !isOpen)) {
    return null;
  }

  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(VOWEL_UI_SCOPE_CLASS, "fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] animate-in fade-in duration-300")}
        onClick={allowDecline ? handleDecline : undefined}
      />

      {/* Modal */}
      <div className={cn(VOWEL_UI_SCOPE_CLASS, "fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none")}>
        <div
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col pointer-events-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button in top right corner */}
          {allowDecline && (
            <button
              onClick={handleDecline}
              className={cn(
                "absolute top-4 right-4 z-10",
                "p-2 rounded-md",
                "text-gray-500 dark:text-gray-400",
                "hover:bg-gray-100 dark:hover:bg-gray-800",
                "hover:text-gray-900 dark:hover:text-gray-100",
                "transition-colors",
                "flex items-center justify-center"
              )}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Content wrapper */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Title and description */}
            <div className="flex items-start gap-3 mb-6">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {title}
                </h2>
                {description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {description}
                  </p>
                )}
              </div>
            </div>

            {/* Tabs (if both terms and privacy are provided) */}
            {(termsContent || termsUrl) && (privacyContent || privacyUrl) && (
              <div className="flex border-b border-gray-200 dark:border-gray-700 -mx-6 px-6 mb-6">
              <button
                onClick={() => setActiveTab("terms")}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                  activeTab === "terms"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                )}
              >
                <FileText className="w-4 h-4" />
                Terms of Service
              </button>
              <button
                onClick={() => setActiveTab("privacy")}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                  activeTab === "privacy"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                )}
              >
                <Shield className="w-4 h-4" />
                Privacy Policy
              </button>
            </div>
            )}

            {/* Content */}
            <div>
            {activeTab === "terms" && (termsContent || termsUrl) && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {termsContent ? (
                  <div dangerouslySetInnerHTML={{ __html: termsContent }} />
                ) : termsUrl ? (
                  <div className="text-center py-8">
                    <a
                      href={termsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                    >
                      <FileText className="w-4 h-4" />
                      View Terms of Service
                      <span className="text-xs">(opens in new tab)</span>
                    </a>
                  </div>
                ) : null}
              </div>
            )}

            {activeTab === "privacy" && (privacyContent || privacyUrl) && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {privacyContent ? (
                  <div dangerouslySetInnerHTML={{ __html: privacyContent }} />
                ) : privacyUrl ? (
                  <div className="text-center py-8">
                    <a
                      href={privacyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                    >
                      <Shield className="w-4 h-4" />
                      View Privacy Policy
                      <span className="text-xs">(opens in new tab)</span>
                    </a>
                  </div>
                ) : null}
              </div>
            )}

            {/* If only terms or only privacy, show it without tabs */}
            {!(termsContent || termsUrl) && (privacyContent || privacyUrl) && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {privacyContent ? (
                  <div dangerouslySetInnerHTML={{ __html: privacyContent }} />
                ) : privacyUrl ? (
                  <div className="text-center py-8">
                    <a
                      href={privacyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                    >
                      <Shield className="w-4 h-4" />
                      View Privacy Policy
                      <span className="text-xs">(opens in new tab)</span>
                    </a>
                  </div>
                ) : null}
              </div>
            )}

            {(termsContent || termsUrl) && !(privacyContent || privacyUrl) && activeTab === "terms" && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {termsContent ? (
                  <div dangerouslySetInnerHTML={{ __html: termsContent }} />
                ) : termsUrl ? (
                  <div className="text-center py-8">
                    <a
                      href={termsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                    >
                      <FileText className="w-4 h-4" />
                      View Terms of Service
                      <span className="text-xs">(opens in new tab)</span>
                    </a>
                  </div>
                ) : null}
              </div>
            )}
            </div>
          </div>

          {/* Footer with action buttons */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            {allowDecline && (
              <button
                onClick={handleDecline}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {declineButtonText}
              </button>
            )}
            <button
              onClick={handleAccept}
              className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg shadow-lg hover:shadow-xl transition-all"
            >
              {acceptButtonText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
