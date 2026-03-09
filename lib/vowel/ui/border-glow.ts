/**
 * @fileoverview Border Glow - Visual indicator for active AI sessions
 * 
 * Provides a glowing border effect around the page to indicate when the AI is active.
 * The border is implemented as a fixed overlay with pointer-events disabled to
 * avoid interfering with page interaction.
 * 
 * @module @vowel.to/client/ui
 * @author vowel.to
 * @license Proprietary
 */

/**
 * Border glow configuration
 */
export interface BorderGlowConfig {
  /** Whether the glow is enabled */
  enabled: boolean;
  
  /** Glow color (CSS color value) */
  color?: string;
  
  /** Glow intensity (blur radius in pixels) */
  intensity?: number;
  
  /** Glow width (box-shadow spread in pixels) */
  width?: number;
  
  /** Animation duration in milliseconds */
  animationDuration?: number;
  
  /** Z-index for positioning */
  zIndex?: number;
  
  /** Whether to show pulsing animation */
  pulse?: boolean;
}

/**
 * Default border glow configuration
 */
const DEFAULT_CONFIG: Required<BorderGlowConfig> = {
  enabled: true,
  color: 'rgba(99, 102, 241, 0.5)', // Indigo-500 with opacity
  intensity: 30,
  width: 10,
  animationDuration: 2000,
  zIndex: 999999,
  pulse: true,
};

/**
 * Border Glow Manager
 * 
 * Manages the lifecycle and appearance of the border glow effect.
 * 
 * @example
 * ```typescript
 * const borderGlow = new BorderGlowManager({
 *   enabled: true,
 *   color: 'rgba(99, 102, 241, 0.5)',
 *   pulse: true
 * });
 * 
 * // Show the glow
 * borderGlow.show();
 * 
 * // Hide the glow
 * borderGlow.hide();
 * 
 * // Cleanup
 * borderGlow.destroy();
 * ```
 */
export class BorderGlowManager {
  private config: Required<BorderGlowConfig>;
  private element: HTMLDivElement | null = null;
  private isVisible: boolean = false;
  private styleElement: HTMLStyleElement | null = null;

  constructor(config: BorderGlowConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    if (this.config.enabled) {
      this.initialize();
    }
    
    console.log('✨ [BorderGlowManager] Initialized:', { enabled: this.config.enabled });
  }

  /**
   * Initialize the border glow element and styles
   */
  private initialize(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      console.warn('✨ [BorderGlowManager] Cannot initialize - window/document not available');
      return;
    }

    // Create style element with keyframe animation
    this.styleElement = document.createElement('style');
    this.styleElement.id = 'vowel-border-glow-styles';
    this.styleElement.textContent = `
      @keyframes vowel-border-glow-pulse {
        0%, 100% {
          opacity: 0.5;
        }
        50% {
          opacity: 1;
        }
      }
      
      .vowel-border-glow {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        transition: opacity 300ms ease-in-out;
        box-shadow: inset 0 0 ${this.config.intensity}px ${this.config.width}px ${this.config.color};
        z-index: ${this.config.zIndex};
        ${this.config.pulse ? `animation: vowel-border-glow-pulse ${this.config.animationDuration}ms ease-in-out infinite;` : ''}
      }
      
      .vowel-border-glow.hidden {
        opacity: 0;
      }
    `;
    document.head.appendChild(this.styleElement);

    // Create the glow element
    this.element = document.createElement('div');
    this.element.className = 'vowel-border-glow hidden';
    this.element.id = 'vowel-border-glow';
    document.body.appendChild(this.element);

    console.log('✨ [BorderGlowManager] Element and styles created');
  }

  /**
   * Show the border glow
   */
  public show(): void {
    if (!this.config.enabled || !this.element) {
      return;
    }

    if (this.isVisible) {
      return;
    }

    console.log('✨ [BorderGlowManager] Showing glow');
    this.element.classList.remove('hidden');
    this.isVisible = true;
  }

  /**
   * Hide the border glow
   */
  public hide(): void {
    if (!this.element) {
      return;
    }

    if (!this.isVisible) {
      return;
    }

    console.log('✨ [BorderGlowManager] Hiding glow');
    this.element.classList.add('hidden');
    this.isVisible = false;
  }

  /**
   * Toggle the border glow
   */
  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Check if the glow is currently visible
   */
  public isActive(): boolean {
    return this.isVisible;
  }

  /**
   * Update the glow configuration
   */
  public updateConfig(config: Partial<BorderGlowConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.enabled !== undefined) {
      if (config.enabled && !this.element) {
        this.initialize();
      } else if (!config.enabled && this.element) {
        this.destroy();
      }
    }

    // Update styles if element exists
    if (this.element && this.styleElement) {
      this.styleElement.textContent = `
        @keyframes vowel-border-glow-pulse {
          0%, 100% {
            opacity: 0.5;
          }
          50% {
            opacity: 1;
          }
        }
        
        .vowel-border-glow {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          transition: opacity 300ms ease-in-out;
          box-shadow: inset 0 0 ${this.config.intensity}px ${this.config.width}px ${this.config.color};
          z-index: ${this.config.zIndex};
          ${this.config.pulse ? `animation: vowel-border-glow-pulse ${this.config.animationDuration}ms ease-in-out infinite;` : ''}
        }
        
        .vowel-border-glow.hidden {
          opacity: 0;
        }
      `;
    }

    console.log('✨ [BorderGlowManager] Configuration updated:', config);
  }

  /**
   * Get current configuration
   */
  public getConfig(): Required<BorderGlowConfig> {
    return { ...this.config };
  }

  /**
   * Enable the border glow
   */
  public enable(): void {
    this.updateConfig({ enabled: true });
  }

  /**
   * Disable the border glow
   */
  public disable(): void {
    this.updateConfig({ enabled: false });
  }

  /**
   * Cleanup and remove the border glow
   */
  public destroy(): void {
    console.log('✨ [BorderGlowManager] Destroying');

    if (this.element) {
      this.element.remove();
      this.element = null;
    }

    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }

    this.isVisible = false;
  }
}

/**
 * Create a border glow instance with default configuration
 */
export function createBorderGlow(config?: Partial<BorderGlowConfig>): BorderGlowManager {
  return new BorderGlowManager({
    enabled: true,
    ...config,
  });
}




