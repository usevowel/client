# Quick Start - Shopify Voice Widget Development

## From This Directory (shopify/app)

### First Time Setup
```bash
# Authenticate with Shopify
shopify auth login
```

### Daily Development

```bash
# Start dev server (auto-builds widget)
bun run dev
```

That's it! The widget will be built and the dev server will start.

## Available Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | 🚀 Build widget + start dev server (use this!) |
| `bun run dev:nobuild` | ⚡ Start dev server only (skip build for speed) |
| `bun run build:widget` | 🔨 Build and copy widget bundle only |
| `bun run deploy` | 📦 Build + deploy to Shopify production |

## Quick Tips

- **Changed widget code?** → Use `bun run dev` to rebuild
- **Just Shopify changes?** → Use `bun run dev:nobuild` for faster restarts
- **Need to rebuild manually?** → Use `bun run build:widget`

## What Gets Built

The command builds `vowel-voice-widget.min.js` from the root library and copies it to:
```
extensions/vowel-voice-widget/assets/vowel-voice-widget.min.js
```

This bundle includes:
- ✅ Web component implementation
- ✅ Vowel client library
- ✅ Shopify platform adapter
- ✅ Default Convex URL (https://vowel-platform.convex.cloud)
- ✅ All dependencies

## Testing

1. Run `bun run dev`
2. Open the preview URL in your browser
3. Go to Online Store → Themes → Customize
4. Add "Vowel Voice Assistant" block to your theme
5. Configure position and size
6. Test the voice widget!

## Deployment

```bash
# Build and deploy in one command
bun run deploy
```

Or from project root:
```bash
cd ../..
bun run build:shopify
cd shopify/app
shopify app deploy
```

---

For full documentation, see [README.md](./README.md)

