/**
 * @fileoverview Dark Mode Manager - Handles dark mode preference and application
 * 
 * Manages dark mode state, persistence, and DOM manipulation for the vowel client.
 * 
 * @module @vowel.to/client/utils
 * @author vowel.to
 * @license Proprietary
 */

const STORAGE_KEY = 'vowel-dark-mode';

/**
 * Dark mode manager class
 */
export class DarkModeManager {
  private isDark: boolean = false;
  private storageKey: string;

  constructor(storageKeyPrefix: string = 'vowel') {
    this.storageKey = `${storageKeyPrefix}-${STORAGE_KEY}`;
    this.initialize();
  }

  /**
   * Initialize dark mode from localStorage or system preference
   */
  private initialize(): void {
    if (typeof window === 'undefined') return;

    // Check localStorage first
    const stored = localStorage.getItem(this.storageKey);
    if (stored !== null) {
      this.isDark = stored === 'true';
    } else {
      // Fall back to system preference
      this.isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    this.apply();
  }

  /**
   * Apply dark mode to the document
   */
  private apply(): void {
    if (typeof document === 'undefined') return;

    const html = document.documentElement;
    if (this.isDark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }

  /**
   * Get current dark mode state
   */
  getIsDark(): boolean {
    return this.isDark;
  }

  /**
   * Set dark mode state
   */
  setIsDark(isDark: boolean): void {
    this.isDark = isDark;
    
    // Persist to localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, String(isDark));
    }
    
    this.apply();
  }

  /**
   * Toggle dark mode
   */
  toggle(): void {
    this.setIsDark(!this.isDark);
  }

  /**
   * Listen to system preference changes
   */
  watchSystemPreference(callback?: (isDark: boolean) => void): () => void {
    if (typeof window === 'undefined') {
      return () => {}; // No-op cleanup
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handler = (e: MediaQueryListEvent) => {
      // Only update if user hasn't manually set a preference
      const stored = localStorage.getItem(this.storageKey);
      if (stored === null) {
        this.isDark = e.matches;
        this.apply();
        callback?.(this.isDark);
      }
    };

    mediaQuery.addEventListener('change', handler);
    
    return () => {
      mediaQuery.removeEventListener('change', handler);
    };
  }
}
