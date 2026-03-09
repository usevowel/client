/**
 * ControlledByVowelFrame - Visual frame to indicate AI control
 * 
 * This component creates a visual border around the entire page using a single
 * mesh gradient background. The page content (body) is transformed to create
 * an inset effect, making the gradient visible as a border.
 * 
 * Key features:
 * - Single div with continuous mesh gradient (no four-div approach)
 * - CSS transform on body element to create border illusion
 * - "controlled by vowel" text banner at the top
 * - Rounded inner corners
 * - Works across any page type (React, vanilla, etc.)
 * - Uses Paper Design shaders for high-quality animated gradient
 * 
 * @module @vowel.to/client/components/ControlledByVowelFrame
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MeshGradient } from './shaders/MeshGradient';

/**
 * Props for ControlledByVowelFrame component
 */
export interface ControlledByVowelFrameProps {
  /** Whether the frame is visible (default: true) */
  visible?: boolean;
  
  /** Border width in viewport units (default: 1.2vw, ~20px on 1080p) */
  borderWidth?: string;
  
  /** Top border height multiplier for text (default: 2) */
  topHeightMultiplier?: number;
  
  /** Inner corner radius (default: 1rem) */
  cornerRadius?: string;
  
  /** Mesh gradient colors (default: Paper Design colors) */
  gradientColors?: string[];
  
  /** Gradient distortion (default: 0.8) */
  distortion?: number;
  
  /** Gradient swirl effect (default: 0.1) */
  swirl?: number;
  
  /** Animation speed (default: 1) */
  speed?: number;
}

/**
 * ControlledByVowelFrame Component
 * 
 * Creates a visual frame around the page with mesh gradient and banner text.
 * Uses CSS transforms to shrink the body element and show gradient border.
 * 
 * @example
 * ```tsx
 * // In your VowelAgent or web component:
 * {isControlled && <ControlledByVowelFrame />}
 * ```
 */
export function ControlledByVowelFrame({
  visible = true,
  borderWidth = '1.2vw', // ~20px on 1920px width (1080p)
  topHeightMultiplier = 2,
  cornerRadius = '1rem',
  gradientColors = ['#e0eaff', '#241d9a', '#f75092', '#9f50d3'],
  distortion = 0.8,
  swirl = 0.1,
  speed = 1,
}: ControlledByVowelFrameProps) {
  
  // Track window dimensions for MeshGradient
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
  });
  
  // Update dimensions on window resize
  useEffect(() => {
    if (!visible || typeof window === 'undefined') return;
    
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [visible]);
  
  useEffect(() => {
    if (!visible) return;
    
    // Calculate dimensions
    const topBorderHeight = `calc(${borderWidth} * ${topHeightMultiplier})`;
    
    // Create style element to transform body
    const styleId = 'vowel-controlled-frame-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    // Apply styles to body for border effect using margin
    styleElement.textContent = `
      /* Vowel Controlled Frame Styles */
      body {
        margin: ${topBorderHeight} ${borderWidth} ${borderWidth} ${borderWidth} !important;
        padding: 0 !important;
        min-height: calc(100vh - ${topBorderHeight} - ${borderWidth}) !important;
        border-radius: ${cornerRadius} !important;
        box-sizing: border-box !important;
      }
      
      /* Ensure html doesn't interfere */
      html {
        margin: 0 !important;
        padding: 0 !important;
      }
    `;
    
    // Store original body styles for cleanup
    const originalBodyStyle = {
      margin: document.body.style.margin,
      padding: document.body.style.padding,
      minHeight: document.body.style.minHeight,
      borderRadius: document.body.style.borderRadius,
      boxSizing: document.body.style.boxSizing,
    };
    
    const originalHtmlStyle = {
      margin: document.documentElement.style.margin,
      padding: document.documentElement.style.padding,
    };
    
    console.log('🎨 [ControlledByVowelFrame] Frame activated');
    
    // Cleanup function
    return () => {
      // Remove style element
      styleElement?.remove();
      
      // Restore original body styles
      Object.assign(document.body.style, originalBodyStyle);
      Object.assign(document.documentElement.style, originalHtmlStyle);
      
      console.log('🎨 [ControlledByVowelFrame] Frame deactivated');
    };
  }, [visible, borderWidth, topHeightMultiplier, cornerRadius]);
  
  if (!visible) return null;
  
  // Calculate dimensions for elements
  const topBorderHeight = `calc(${borderWidth} * ${topHeightMultiplier})`;
  
  // Render using portal to ensure it's at the root level
  return createPortal(
    <>
      {/* Mesh Gradient Background - Paper Design Shader */}
      <div
        id="vowel-controlled-gradient"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: -1,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        <MeshGradient
          // @ts-ignore - MeshGradient is not typed correctly
          width={dimensions.width}
          height={dimensions.height}
          colors={gradientColors}
          distortion={distortion}
          swirl={swirl}
          grainMixer={0}
          grainOverlay={0}
          speed={speed}
        />
      </div>
      
      {/* Banner Text - Top Border */}
      <div
        id="vowel-controlled-banner"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: topBorderHeight,
          zIndex: 1000000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          fontSize: 'calc(0.5vw + 0.8rem)',
          color: 'rgba(255, 255, 255, 0.95)',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          letterSpacing: '0.02em',
        }}
      >
        <span style={{ fontWeight: 400 }}>controlled by </span>
        <span style={{ fontWeight: 700, marginLeft: '0.3em' }}>vowel</span>
      </div>
    </>,
    document.body
  );
}

