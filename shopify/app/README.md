# Vowel Customer Voice Assistant - Shopify Extension

## Overview

This is a **customer-facing** Shopify theme app extension that adds a voice assistant widget to your store. Customers can use natural voice commands to search for products, navigate collections, and manage their shopping experience.

## Features

- 🎤 **Voice Commands**: Natural language product search and navigation
- 🗺️ **Sitemap Discovery**: Automatically discovers all store routes from sitemap.xml
- 🎯 **Smart Categorization**: Intelligently categorizes products, collections, and pages
- 📱 **Responsive Design**: Works on all devices and screen sizes
- 🌐 **Internationalization**: Supports multiple languages
- ⚡ **Performance Optimized**: Minimal impact on store speed

## Installation

### Option 1: Shopify App Store (Production - Recommended)

When deployed to the Shopify App Store, installation becomes much simpler:

1. **Browse App Store**
   - Go to `https://apps.shopify.com`
   - Search for "Vowel Customer Voice Assistant"

2. **One-Click Install**
   - Click "Install" on the app page
   - Review and approve requested permissions
   - Click "Install app"

3. **Automatic Integration**
   - App is instantly available in your store
   - No CLI commands or development tools required
   - Extension automatically appears in theme customizer

4. **Theme Setup**
   - Go to Online Store → Themes
   - Click "Customize" on your active theme
   - Add "Vowel Voice Assistant" block to your preferred location
   - Configure position and settings

**Benefits of App Store Installation:**
- ✅ No technical setup required
- ✅ Automatic updates when app is updated
- ✅ Professional app listing with reviews and ratings
- ✅ Shopify handles hosting and maintenance
- ✅ Works with all themes automatically

### Option 2: Development Installation (For Testing)

For development and testing purposes:

```bash
# 1. Install Shopify CLI (one-time setup)
npm install -g @shopify/cli

# 2. Authenticate with your store
shopify auth login

# 3. Deploy to your development store
shopify app dev --store=your-store.myshopify.com

# 4. The app will be available for testing in your theme customizer
```

## Configuration

### Theme Customization

**For App Store Users:**
1. **Access Theme Customizer**
   - Go to your Shopify admin
   - Navigate to "Online Store" → "Themes"
   - Click "Customize" on your active theme

2. **Add Voice Widget Block**
   - In the theme customizer, look for **"App Blocks"** or **"Apps"** section
   - Find **"Vowel Voice Assistant"** and add it to your theme
   - Choose your preferred position (bottom-right, bottom-left, etc.)

3. **Configure Settings**
   - **Vowel App ID** (REQUIRED): Enter your Vowel application ID from the Vowel platform
   - **Widget Position**: Choose corner placement (bottom-right, bottom-left, top-right, top-left)
   - **Show Transcripts**: Enable/disable conversation transcript panel
   - **Adjust widget position** and size
   - **Configure appearance** settings

**For Developers (Additional Options):**
- **Customize voice model** and language settings
- **Modify system instructions** for AI behavior
- **Adjust sitemap parsing** parameters
- **Configure webhook endpoints** for advanced integrations

### App Store Submission Requirements

When preparing for App Store deployment, ensure:

- ✅ **Proper app permissions** (read_themes for theme extensions)
- ✅ **Comprehensive error handling** and fallbacks
- ✅ **Performance optimization** (minimal impact on store speed)
- ✅ **Cross-browser compatibility** testing
- ✅ **Mobile responsiveness** verification
- ✅ **GDPR compliance** for voice data handling
- ✅ **Professional app listing** with clear descriptions and screenshots

## Usage

### For Customers

1. **Voice Widget Discovery**
   - Floating microphone button appears on all store pages
   - Click the button to activate voice interface

2. **Voice Commands**
   ```text
   "Find red shoes" - Search for products
   "Show me electronics under $100" - Filtered search
   "Go to the sale section" - Navigate to collections
   "Add this to my cart" - Add current product to cart
   "What are your store hours?" - Get store information
   ```

3. **Follow-up Commands**
   - Continue the conversation naturally
   - Ask for related products or information
   - Navigate between different sections

### For Store Owners

1. **Monitor Usage**
   - Check app analytics for voice command usage
   - Review popular search queries
   - Monitor conversion impact

2. **Content Optimization**
   - Use voice analytics to improve product descriptions
   - Optimize collections for voice navigation
   - Update content based on popular queries

## Voice Commands Reference

### Product Discovery
- `"Find [product type]"` - Search for products by category
- `"Show me [category] under $[price]"` - Filtered search by price
- `"What [specific product] do you have?"` - Specific product search

### Navigation
- `"Go to [collection name]"` - Navigate to collection
- `"Show me the [page name] page"` - Navigate to static pages
- `"Take me to [section]"` - General navigation

### Shopping Actions
- `"Add this to my cart"` - Add current product to cart
- `"Show me my cart"` - View cart contents
- `"Go to checkout"` - Navigate to checkout

### Store Information
- `"What are your store hours?"` - Business hours
- `"Where are you located?"` - Store location
- `"Do you have a return policy?"` - Store policies

## Technical Details

### App Store vs Development Deployment

| Aspect | Development | App Store |
|--------|-------------|-----------|
| **Installation** | Manual CLI deployment | One-click from App Store |
| **Permissions** | Self-configured | Pre-approved by Shopify |
| **Updates** | Manual deployment | Automatic via Shopify |
| **Hosting** | Local development | Shopify-managed CDN |
| **Testing** | Development store only | All compatible stores |
| **Monetization** | Free during development | Subscription/pricing model |
| **Support** | Self-supported | Shopify Partner Dashboard |

### Package Structure

The extension uses the `@vowel.to/client` package with web component:

```javascript
// Web component (framework-agnostic, auto-registers)
import '@vowel.to/client/web-component';

// Or use the standalone bundle (no build step required)
<script src="dist/vowel-voice-widget.min.js"></script>

// REQUIRED: app-id attribute must be provided
<vowel-voice-widget 
  app-id="your-vowel-app-id"
  adapter="shopify"
  position="bottom-right"
  show-transcripts="true">
</vowel-voice-widget>
```

### File Structure
```
shopify-vowel-customer-extension/
├── extensions/                # Shopify theme app extension
│   └── vowel-voice-widget/
│       ├── assets/            # Static assets
│       │   ├── vowel-voice-widget.min.js  # Standalone bundle
│       │   └── README.md      # Asset documentation
│       ├── blocks/            # Theme integration
│       │   └── voice-widget.liquid       # Widget block
│       ├── locales/           # Internationalization
│       │   └── en.default.json
│       └── shopify.extension.toml        # Extension configuration
├── shopify.app.toml           # App configuration
└── README.md                  # This file
```

**Note**: The Vowel platform adapter (Shopify-specific code) now lives in the main `@vowel.to/client` package at `src/lib/vowel/platforms/shopify/`

### Sitemap Integration

The extension automatically:
1. **Fetches** your store's `sitemap.xml`
2. **Parses** all public URLs (products, collections, pages, blogs)
3. **Categorizes** routes for voice navigation
4. **Caches** results for 15 minutes
5. **Updates** when store content changes

### Performance

- **Initial Load**: < 2 seconds (basic functionality)
- **Sitemap Parsing**: < 5 seconds (background process)
- **Memory Usage**: < 1MB for route data
- **Network**: < 50KB total for sitemap requests

### Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile**: iOS Safari, Chrome Mobile, Samsung Internet
- **Features**: Speech Recognition API, DOMParser, Fetch API

## Troubleshooting

### Common Issues

#### Voice Widget Not Appearing
1. **Check Installation**: Verify the extension is properly installed
2. **Theme Compatibility**: Ensure your theme supports app blocks
3. **JavaScript Enabled**: Check if JavaScript is enabled in browser
4. **Refresh Cache**: Clear browser cache and reload

#### Voice Commands Not Working
1. **Microphone Permissions**: Allow microphone access in browser
2. **Speech Recognition**: Ensure browser supports speech recognition
3. **Network Connection**: Check internet connectivity
4. **Sitemap Access**: Verify sitemap.xml is accessible

#### Performance Issues
1. **Large Sitemap**: Very large stores may need optimization
2. **Browser Resources**: Clear browser cache if slow
3. **Network Speed**: Check internet connection speed

### Debugging

#### Browser Console
```javascript
// Check if extension loaded
console.log('Vowel loaded:', window.vowelCustomer);

// Check routes discovered
console.log('Routes:', window.vowelCustomer?.getRoutes());

// Check available actions
console.log('Actions:', window.vowelCustomer?.getActions());

// Check sitemap cache
console.log('Cache:', window.SitemapParser?.prototype?.cache);
```

#### Shopify Admin
1. **Check App Status**: Verify app is installed and active
2. **Theme Integration**: Ensure block is added to theme
3. **Error Logs**: Check for any extension-related errors

## Development

### Build System

This directory has a self-contained Vite-based build system that automatically deploys to Cloudflare R2 CDN.

**Quick Start:**
```bash
cd shopify/app
bun install          # Install dependencies (first time)
bun run build        # Build & deploy to R2
```

**Available Commands:**
- `bun run build` - Build bundle and deploy to R2 CDN
- `bun run dev` - Watch mode (rebuild on changes)
- `bun run deploy` - Build + deploy to Shopify
- `bun run shopify:dev` - Start Shopify dev server

**Build Output:**
- `extensions/vowel-voice-widget/assets/vowel-voice-widget.min.js` (466 KB → 118 KB gzipped)
- `extensions/vowel-voice-widget/assets/vowel-voice-widget.min.js.map` (2.1 MB)
- `extensions/vowel-voice-widget/assets/vowel-voice-widget.css` (40 KB → 6.7 KB gzipped)

**CDN URLs:**
All files are automatically deployed to:
- https://assets.codetek.us/apps/vowel/vowel-voice-widget.min.js
- https://assets.codetek.us/apps/vowel/vowel-voice-widget.min.js.map
- https://assets.codetek.us/apps/vowel/vowel-voice-widget.css

The Liquid template loads files from the CDN for fast global delivery.

**Configuration Files:**
- `vite.config.ts` - Build configuration
- `vite-plugin-r2-deploy.ts` - R2 deployment plugin
- `.env` - R2 credentials (not committed)
- `package.json` - Dependencies & scripts

### Local Development

```bash
cd shopify/app

# First time: Install dependencies
bun install

# Authenticate with Shopify (first time only)
shopify auth login

# Build widget and start dev server
bun run dev &
shopify app dev --store=your-store.myshopify.com
```

### App Store Submission Process

1. **Complete Development**
   - Ensure all features work correctly
   - Test across multiple themes and browsers
   - Optimize performance and error handling

2. **Prepare App Listing**
   - Write compelling app description
   - Create demo videos and screenshots
   - Set pricing and billing structure

3. **Submit for Review**
   - Upload to Shopify Partners Dashboard
   - Complete app review questionnaire
   - Wait for Shopify approval (2-4 weeks)

4. **Launch**
   - App becomes available in Shopify App Store
   - Users can install with one click
   - Automatic updates for all users

### Testing Checklist

**For Development:**
- [ ] Extension installs without errors
- [ ] Voice widget appears on all pages
- [ ] Sitemap parsing works correctly
- [ ] Voice commands execute properly
- [ ] Responsive design works on mobile
- [ ] Performance meets requirements
- [ ] Error handling works gracefully

**For App Store:**
- [ ] Cross-browser compatibility (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsiveness on all devices
- [ ] GDPR compliance for voice data
- [ ] Performance impact under 2 seconds load time
- [ ] Accessibility standards compliance
- [ ] Error handling for edge cases

## Support

### For Merchants (App Store Users)
- **Installation**: One-click from Shopify App Store
- **Documentation**: Available in app dashboard and support docs
- **Support**: Contact through in-app chat or support tickets
- **Updates**: Automatic updates when app is updated

### For Developers
- **Source Code**: Available on GitHub
- **Issues**: Report bugs and feature requests via GitHub Issues
- **Contributing**: Pull requests welcome for community improvements
- **Partnership**: Join Shopify Partner Program for app publishing

## Version History

### v1.0.0 (Current)
- Initial release with sitemap-based route discovery
- Voice widget with speech recognition
- Basic product search and navigation
- Responsive design for all devices
- Internationalization support

## License

MIT License - See LICENSE file for details

---

**Made with ❤️ for Shopify merchants and their customers**
