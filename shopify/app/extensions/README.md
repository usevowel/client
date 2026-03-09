# Vowel Voice Widget Assets

This directory contains the bundled assets for the Vowel voice widget.

## Files

### `vowel-voice-widget.min.js`

The standalone bundle containing:
- Web component implementation
- Vowel client library
- Shopify platform adapter
- All required dependencies

This file is generated from the main `@vowel.to/client` package.

## Building the Bundle

### Quick Build (Recommended)

From the project root, use the convenience script:

```bash
bun run build:shopify
```

This will:
1. Build the standalone bundle (`dist/vowel-voice-widget.min.js`)
2. Automatically copy it to both Shopify extension directories

### Manual Build

To generate and copy the standalone bundle manually:

```bash
# From the project root
bun run build:standalone

# Copy the bundle to this directory
cp dist/vowel-voice-widget.min.js shopify/app/extensions/vowel-voice-widget/assets/
```

## Development

During development, you can use the watch mode:

```bash
# From the project root
bun run dev
```

This will rebuild the library automatically when files change.

## Usage

The bundle is loaded in `blocks/voice-widget.liquid`:

```liquid
<script src="{{ 'vowel-voice-widget.min.js' | asset_url }}" defer></script>
<vowel-voice-widget position="bottom-right" size="default" app-id="..."></vowel-voice-widget>
```

The web component will auto-register when the script loads.

