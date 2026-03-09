# How It Works

## Simple Overview

Vowel for Shopify connects three things:
1. **Your Shopify store** (products, collections, pages)
2. **Voice AI** (Google Gemini Live, powered by your API key)
3. **Your customers** (shopping with their voice)

The AI understands what your customers want, navigates your store, and helps them shop - all through natural voice conversation.

## For Store Owners

### Step 1: Install the App (2 minutes)

**From Shopify App Store:**
1. Search for "Vowel Voice Assistant"
2. Click "Install"
3. Approve app permissions
4. Done!

**What happens:**
- App installs automatically
- Extension becomes available in your theme
- No code changes to your store
- Reversible at any time

### Step 2: Get Your API Key (Free)

**Sign up for Google Gemini:**
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with Google account
3. Click "Get API Key"
4. Copy your key

**Why you need this:**
- Vowel uses your Gemini API key to power voice AI
- You pay Google directly (typically $2-10/month)
- Free tier: 60 requests/minute
- You control costs and usage

### Step 3: Configure in Theme (2 minutes)

**Add to your theme:**
1. Go to **Online Store → Themes**
2. Click **Customize** on your active theme
3. Click **Add section** or **Add block**
4. Find **"Vowel Voice Assistant"** under Apps
5. Add it to your theme

**Configure settings:**
- **Vowel App ID**: Get from [vowel.to dashboard](#)
- **Gemini API Key**: Paste your Google API key
- **Position**: Choose corner (bottom-right recommended)
- **Show Transcripts**: Enable conversation history (optional)

**Preview & Publish:**
- Test in preview mode
- Speak to test voice commands
- Click **Save** when ready
- Goes live immediately!

### Step 4: Test & Launch

**Test voice commands:**
- "Find [product type]"
- "Show me [collection]"
- "Add this to cart"
- "Go to checkout"

**What the AI does:**
- Scans your sitemap.xml automatically
- Learns all your products and pages
- Understands your store structure
- Responds to customer voice commands

## For Customers

### 1. Discover the Voice Button
- Floating button appears on all pages
- Positioned in chosen corner
- Click to activate voice
- Works on mobile and desktop

### 2. Start Speaking
**Customer:** "Find wireless headphones under $100"

**What happens:**
1. Browser captures voice
2. Sent to AI (via your API key)
3. AI understands intent
4. Searches your products
5. Navigates to results
6. Responds: "I found 12 wireless headphones under $100"

### 3. Continue Shopping by Voice
**Customer:** "Show me the blue ones"

**AI:**
- Filters to blue color
- Updates page
- Responds: "Here are 3 blue options"

**Customer:** "Add the second one to my cart"

**AI:**
- Adds product to cart
- Confirms action
- Responds: "Added to your cart!"

### 4. Complete Purchase
**Customer:** "Go to checkout"

**AI:**
- Navigates to cart/checkout
- Shows current items
- Responds: "You have 1 item. Ready to checkout?"

All without typing or clicking!

## Technical Flow

### Voice Input → AI → Store Action

```
Customer speaks
    ↓
[Browser captures audio]
    ↓
[Vowel SDK processes]
    ↓
[Sent to Gemini (your API key)]
    ↓
[AI understands intent]
    ↓
[Vowel routes to Shopify action]
    ↓
[Action executes in store]
    ↓
[AI responds to customer]
```

### Behind the Scenes

**1. Store Discovery (Automatic)**
- App scans your sitemap.xml
- Finds all products, collections, pages
- Categorizes by type
- Caches for 15 minutes
- Updates when content changes

**2. Voice Processing (Real-time)**
- Customer speaks
- Audio captured by browser
- Streamed to Gemini Live API
- Speech-to-text conversion
- Intent understanding
- Action determination

**3. Action Execution (Instant)**
- AI decides what to do
- Vowel routes to Shopify
- Action executes client-side
- Page updates immediately
- Voice response generated

**4. Response Generation (Natural)**
- AI creates natural reply
- Text-to-speech conversion
- Streamed back to customer
- Visual feedback shown

## Architecture

### Three Layers

**Layer 1: Your Shopify Store**
```
┌─────────────────────────────────┐
│  Shopify Store (Theme)          │
│  • Vowel widget embedded        │
│  • Products & collections       │
│  • Customer sessions            │
│  • Cart & checkout              │
└─────────────────────────────────┘
```

**Layer 2: Vowel Platform**
```
┌─────────────────────────────────┐
│  Vowel Platform (SDK)           │
│  • Web component widget         │
│  • Shopify adapter              │
│  • Audio streaming              │
│  • Action routing               │
└─────────────────────────────────┘
```

**Layer 3: AI Provider**
```
┌─────────────────────────────────┐
│  Google Gemini (Your Key)       │
│  • Voice processing             │
│  • Intent understanding         │
│  • Response generation          │
│  • You pay directly             │
└─────────────────────────────────┘
```

### Data Flow

**What stays in your store:**
- Customer data
- Order information
- Cart contents
- Session data
- Payment information

**What goes to Vowel:**
- Voice command intents
- Action execution requests
- Analytics (anonymous)

**What goes to Google:**
- Voice audio (processed only, not stored)
- Intent understanding
- Response generation

### Security & Privacy

**Customer Data Protection:**
- Voice audio processed, not stored
- No recording saved
- Commands encrypted in transit
- HTTPS required
- GDPR compliant

**API Key Security:**
- Your Gemini key stays in your environment
- Not accessible by other merchants
- Rotatable anytime
- Rate-limited by Google
- Your control

**Store Security:**
- No changes to Shopify security
- Works within Shopify permissions
- Read-only for most operations
- Cart actions customer-scoped
- Shopify-approved architecture

## Integration Methods

### Method 1: App Block (Recommended)
**Best for most stores**

```liquid
<!-- Automatically added by Shopify -->
<vowel-voice-widget 
  app-id="your-app-id"
  adapter="shopify"
  store-url="{{ shop.url }}"
  position="bottom-right">
</vowel-voice-widget>
```

**Pros:**
- No code needed
- Visual configuration
- Easy to remove
- Theme updates safe
- Works everywhere

### Method 2: Custom Theme Edit (Advanced)
**For custom implementations**

```liquid
<!-- Add to theme.liquid manually -->
<script src="https://assets.codetek.us/apps/vowel/vowel-voice-widget.min.js"></script>
<vowel-voice-widget 
  app-id="{{ settings.vowel_app_id }}"
  adapter="shopify"
  store-url="{{ shop.url }}">
</vowel-voice-widget>
```

**Pros:**
- More control
- Custom placement
- Advanced options
- Specific pages only

## Customization Options

### Visual Customization
**In theme customizer:**
- Widget position (4 corners)
- Button size
- Colors (coming soon)
- Show/hide transcripts
- Button style

### AI Personality
**In Vowel dashboard:**
- System instructions
- Response tone
- Voice characteristics
- Language preference
- Context rules

### Store-Specific
**Automatic from your store:**
- Product categories
- Collection structure
- Store policies
- Contact information
- Available pages

## Performance

### Load Time
- **Widget Load**: < 2 seconds
- **First Interaction**: < 1 second
- **Sitemap Scan**: < 5 seconds (background)
- **Voice Response**: < 2 seconds typical

### Store Impact
- **Page Speed**: No measurable impact
- **SEO**: No negative effect
- **Lighthouse Score**: Maintained
- **Mobile Performance**: Optimized

### Scalability
- Works with 10 products or 100,000
- Handles high traffic stores
- CDN-delivered assets
- Efficient caching
- Automatic optimization

## Browser Support

### Desktop
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Mobile
- ✅ iOS Safari 14+
- ✅ Chrome Mobile
- ✅ Samsung Internet
- ✅ Android Browser

### Requirements
- HTTPS required (standard for Shopify)
- Microphone access permission
- Modern JavaScript support
- WebSocket support

## What Happens When...

### Customer Has Slow Internet
- Voice still works
- May take 3-5 seconds
- Graceful degradation
- Clear status indicators

### Customer Denies Microphone
- Widget shows message
- Explains permissions needed
- Provides help link
- Optional: Switch to text mode (coming)

### Store Has Many Products
- Sitemap scan takes longer initially
- Caches results for 15 minutes
- Progressive loading
- Background updates
- No impact on customers

### API Key Runs Out of Quota
- Voice stops working
- Clear error message shown
- Merchant notification
- Customer sees graceful fallback

## Monitoring & Analytics

### Real-Time Monitoring
- Voice session active status
- Current interactions
- Error rates
- Response times

### Usage Analytics (Coming Soon)
- Total voice sessions
- Popular commands
- Conversion attribution
- Search queries
- Customer engagement

### Performance Metrics
- Load times
- Success rates
- Error tracking
- Browser compatibility
- Device breakdown

---

**Questions about how it works?** [See FAQ →](./faq.md)  
**Ready to install?** [See Installation Guide →](./installation.md)  
**Technical details?** [Developer Docs →](../app/README.md)

