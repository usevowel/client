/**
 * @fileoverview Modal Component - Simple Portal-based Modal
 * 
 * Simple modal overlay with inline styles - no external dependencies.
 * Used for settings and other dialogs in the vowel client.
 * 
 * @module @vowel.to/client/components
 * @author vowel.to
 * @license Proprietary
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn, VOWEL_UI_SCOPE_CLASS } from '../utils';

/**
 * Modal component props
 */
export interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  
  /** Close handler */
  onClose: () => void;
  
  /** Modal children/content */
  children: React.ReactNode;
  
  /** Custom className for modal content */
  className?: string;
  
  /** Whether to show close button */
  showCloseButton?: boolean;
}

/**
 * Modal Component
 * 
 * Simple modal with portal rendering and inline styles.
 * 
 * @example
 * ```tsx
 * <Modal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Settings"
 * >
 *   <p>Modal content here</p>
 * </Modal>
 * ```
 */
export function Modal({
  isOpen,
  onClose,
  children,
  className = '',
  showCloseButton = true,
}: ModalProps) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div className={cn(VOWEL_UI_SCOPE_CLASS, "fixed inset-0 z-[999999] flex items-center justify-center p-4")}>
      {/* Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/75 dark:bg-black/80 animate-[vowel-fadeIn_0.2s_ease-in-out]"
      />
      
      {/* Modal Content */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative w-full max-w-[800px] max-h-[90vh]",
          "bg-white dark:bg-gray-900",
          "rounded-lg shadow-xl",
          "flex flex-col",
          "animate-[vowel-slideIn_0.2s_ease-out]",
          className
        )}
      >
        {/* Close button in top right corner */}
        {showCloseButton && (
          <button
            onClick={onClose}
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
            <X size={20} />
          </button>
        )}
        
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
      
      {/* Inline styles for animations */}
      <style>{`
        @keyframes vowel-fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes vowel-slideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );

  // Render in portal
  return createPortal(modalContent, document.body);
}
