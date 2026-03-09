/**
 * @fileoverview Error Modal Component - Displays errors with friendly messages and debug details
 * 
 * This component provides a user-friendly error modal that appears when the vowel client
 * encounters an error. It shows a simple error message with an expandable debug section
 * for technical details.
 * 
 * @module @vowel.to/client/components
 * @author vowel.to
 * @license Proprietary
 */

import { useState } from "react";
import { AlertCircle, Bug, ChevronDown, ChevronUp } from "lucide-react";
import { Modal } from "./Modal";

/**
 * Props for ErrorModal component
 */
export interface ErrorModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  
  /** Close handler */
  onClose: () => void;
  
  /** Error message to display */
  errorMessage: string;
  
  /** Optional error details (object or string) */
  errorDetails?: string | object;
  
  /** Optional timestamp */
  timestamp?: Date;
}

/**
 * Error Modal Component
 * 
 * Displays a friendly error message with an expandable debug section.
 * 
 * @example
 * ```tsx
 * <ErrorModal
 *   isOpen={hasError}
 *   onClose={() => setHasError(false)}
 *   errorMessage="Connection failed"
 *   errorDetails={{ code: "ECONNREFUSED", stack: "..." }}
 * />
 * ```
 */
export function ErrorModal({
  isOpen,
  onClose,
  errorMessage,
  errorDetails,
  timestamp,
}: ErrorModalProps) {
  const [showDebug, setShowDebug] = useState(false);

  // Format error details for display
  const formatErrorDetails = (): string => {
    if (!errorDetails) return "";
    
    if (typeof errorDetails === "string") {
      return errorDetails;
    }
    
    try {
      return JSON.stringify(errorDetails, null, 2);
    } catch {
      return String(errorDetails);
    }
  };

  const formattedDetails = formatErrorDetails();
  const hasDetails = formattedDetails.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={true}
    >
      <div className="space-y-4">
        {/* Header with Vowel branding */}
        <div className="flex items-center gap-2 mb-2">
          <span 
            className="text-xl font-normal tracking-tight leading-none text-gray-900 dark:text-gray-100"
            style={{ fontFamily: 'OCR-A, monospace' }}
          >
            vowel
          </span>
        </div>

        {/* Error Icon and Message */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              The agent encountered an error
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
              {errorMessage}
            </p>
            {timestamp && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {timestamp.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        {/* Debug Section */}
        {hasDetails && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="flex items-center gap-2 w-full text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <Bug className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <span>Debug Details</span>
              {showDebug ? (
                <ChevronUp className="w-4 h-4 ml-auto text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 ml-auto text-gray-600 dark:text-gray-400" />
              )}
            </button>
            
            {showDebug && (
              <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <pre className="text-xs text-gray-800 dark:text-gray-200 font-mono overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">
                  {formattedDetails}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white dark:text-gray-900 bg-gray-900 dark:bg-gray-100 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </Modal>
  );
}
