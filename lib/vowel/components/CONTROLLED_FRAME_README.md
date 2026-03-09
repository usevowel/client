# Controlled by Vowel Frame

## Overview

The **Controlled by Vowel Frame** is a visual component that wraps the entire page with a border frame to indicate that the page is under AI control. It uses the [Paper Design mesh gradient shader](https://shaders.paper.design/mesh-gradient) via the `@paper-design/shaders-react` package as a continuous animated background visible around the edges of the page.

## Key Features

- **Single Div Approach**: Uses one continuous gradient background (no four-div approach that would break gradient continuity)
- **CSS Transform Magic**: Transforms the `body` element to create an inset effect, making the gradient visible as a border
- **"controlled by vowel" Text**: Displays at the top with custom typography
- **Rounded Inner Corners**: Smooth, polished appearance
- **Works Everywhere**: Compatible with React apps, vanilla JS, and as a web component

## Components

### ControlledByVowelFrame (Primary)

The new full-frame border component with mesh gradient.

```tsx
import { ControlledByVowelFrame } from '@vowel.to/client/components';

<ControlledByVowelFrame 
  visible={true}
  borderWidth="1.2vw"                          // ~20px on 1080p
  topHeightMultiplier={2}                       // Top is 2x border width for text
  cornerRadius="1rem"                           // Rounded inner corners
  gradientColors={['#e0eaff', '#241d9a', '#f75092', '#9f50d3']}
  distortion={0.8}                              // Gradient distortion
  swirl={0.1}                                   // Gradient swirl effect
  speed={1}                                     // Animation speed
/>
```

### ControlledBanner (Alias)

Now an alias to `ControlledByVowelFrame` for backward compatibility.

```tsx
import { ControlledBanner } from '@vowel.to/client/components';

// This now renders the full frame (not just a top banner)
<ControlledBanner />
```

### ControlledBannerLegacy

The original top banner (kept for backward compatibility).

```tsx
import { ControlledBannerLegacy } from '@vowel.to/client/components';

<ControlledBannerLegacy text="Controlled by Vowel Voice Agent" />
```

## Web Component Usage

The frame is automatically available as a web component:

```html
<!-- Basic usage -->
<vowel-controlled-banner></vowel-controlled-banner>

<!-- With custom settings -->
<vowel-controlled-banner 
  border-width="1.5vw"
  top-height-multiplier="2.5"
  corner-radius="1.5rem"
  distortion="0.9"
  swirl="0.2"
  speed="1.5">
</vowel-controlled-banner>

<!-- With custom gradient colors -->
<vowel-controlled-banner 
  gradient-colors='["#e0eaff", "#241d9a", "#f75092", "#9f50d3"]'>
</vowel-controlled-banner>
```

## How It Works

### CSS Margin Approach

The component:

1. **Creates a fixed background** with the mesh gradient (z-index: -1) covering the full viewport
2. **Adds margin to the `body` element** using CSS:
   - Top margin is larger to accommodate text banner
   - Side and bottom margins create the border effect
   - Adds rounded corners
   - Gradient shows through behind the body
3. **Renders text banner** on top for "controlled by vowel" message

### Style Injection

The component injects styles dynamically:

```css
body {
  margin: calc(1.2vw * 2) 1.2vw 1.2vw 1.2vw !important;  /* Top, Right, Bottom, Left */
  min-height: calc(100vh - calc(1.2vw * 2) - 1.2vw) !important;
  border-radius: 1rem !important;
}

html {
  margin: 0 !important;
  padding: 0 !important;
}
```

## Migration Guide

### If you were using ControlledBanner

No changes needed! The component now automatically uses the new frame design:

```tsx
// Before (top banner)
<ControlledBanner text="Controlled by Vowel" />

// After (automatically uses frame)
<ControlledBanner />  // Props changed!
```

### If you need the old top banner

Use `ControlledBannerLegacy`:

```tsx
import { ControlledBannerLegacy } from '@vowel.to/client/components';

<ControlledBannerLegacy text="Controlled by Vowel Voice Agent" />
```

## Design Rationale

### Why a Full Frame?

The full border frame:
- **Clearly indicates control**: The entire page is visually encapsulated
- **Professional appearance**: Polished, intentional design
- **Continuous gradient**: Single mesh gradient flows naturally
- **Non-intrusive**: Content remains fully accessible within the frame

### Why Margin Instead of Wrapper?

Using margin on the `body` element instead of wrapping content:
- **Simple and clean**: Just adds margin to existing body
- **No JSX nesting required**: Simply mount the component anywhere
- **Works with any page type**: React, Vue, vanilla JS, etc.
- **Automatic**: No need to modify existing page structure
- **CSS-based**: Leverages browser optimizations
- **Preserves document flow**: Content behaves naturally

## Technical Details

### Props Reference

```typescript
interface ControlledByVowelFrameProps {
  visible?: boolean;              // Show/hide frame (default: true)
  borderWidth?: string;           // Border size (default: "1.2vw")
  topHeightMultiplier?: number;   // Top height multiplier (default: 2)
  cornerRadius?: string;          // Inner corner radius (default: "1rem")
  gradientColors?: string[];      // Gradient colors (default: ['#e0eaff', '#241d9a', '#f75092', '#9f50d3'])
  distortion?: number;            // Gradient distortion (default: 0.8)
  swirl?: number;                 // Gradient swirl effect (default: 0.1)
  speed?: number;                 // Animation speed (default: 1)
}
```

### Z-Index Layers

- **Gradient background**: `z-index: -1` (behind all content)
- **Page content**: Natural stacking (z-index: auto)
- **Banner text**: `z-index: 1000000` (on top)

### Cleanup

The component automatically:
- Removes injected styles on unmount
- Restores original `body` and `html` styles
- Cleans up event listeners

## Browser Compatibility

- ✅ Chrome/Edge (modern)
- ✅ Firefox (modern)
- ✅ Safari (modern)
- ✅ Mobile browsers

Requires support for:
- CSS `calc()`
- CSS fixed positioning
- React Portals
- WebGL (for Paper Design shader)

## Performance

- **Lightweight**: Single WebGL canvas + overlay + text
- **GPU accelerated**: WebGL-based mesh gradient shader
- **No layout thrashing**: CSS transform approach
- **Efficient**: Uses Paper Design's optimized shader
- **Responsive**: Automatically resizes on window resize

## Examples

### Basic React Usage

```tsx
import { ControlledByVowelFrame } from '@vowel.to/client/components';

function MyApp() {
  const [isControlled, setIsControlled] = useState(false);
  
  return (
    <>
      {isControlled && <ControlledByVowelFrame />}
      <YourAppContent />
    </>
  );
}
```

### Conditional Display

```tsx
// In VowelWebComponentWrapper or similar
{isControlled && <ControlledByVowelFrame />}
```

### Custom Border and Gradient

```tsx
<ControlledByVowelFrame 
  borderWidth="2vw"
  topHeightMultiplier={3}
  cornerRadius="2rem"
  gradientColors={['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4']}
  distortion={1.0}
  swirl={0.3}
  speed={2}
/>
```

## Future Enhancements

Potential improvements:
- Custom gradient shader options
- Animation variants
- Theming support
- Accessibility features (screen reader announcements)
- Banner position options (top, bottom, sides)

## Credits

- Mesh Gradient: [Paper Design Shaders](https://shaders.paper.design/)
- Component Architecture: vowel.to team

