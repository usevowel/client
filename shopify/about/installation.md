# Installation Guide

## Quick Start (5 Minutes)

### Prerequisites
- Shopify store (any plan)
- Shopify admin access
- Google account (for API key)

### Installation Steps

## Step 1: Install from Shopify App Store (2 min)

### Option A: Direct Installation (Coming Soon)
1. **Visit App Store**
   - Go to [Shopify App Store](#)
   - Search for "Vowel Voice Assistant"
   - Click on the app listing

2. **Install App**
   - Click **"Add app"** button
   - Review permissions requested:
     - ✓ Read themes (for extension)
     - ✓ Read products (for search)
     - ✓ Read collections (for navigation)
   - Click **"Install app"**

3. **Confirmation**
   - App installs automatically
   - Redirected to welcome screen
   - Extension now available in themes

### Option B: Development Installation (For Testing)
If app is not yet published to App Store:

```bash
# Install Shopify CLI (one-time)
npm install -g @shopify/cli @shopify/app

# Clone repository
git clone [repository-url]
cd client/shopify/app

# Authenticate
shopify auth login

# Start development server
shopify app dev
```

Follow the CLI prompts to connect to your development store.

---

## Step 2: Get Your Gemini API Key (2 min)

### Free Tier (Recommended to Start)

1. **Visit Google AI Studio**
   - Go to [aistudio.google.com](https://aistudio.google.com/)
   - Sign in with your Google account

2. **Get API Key**
   - Click **"Get API Key"** button
   - Click **"Create API key"**
   - Copy the key (starts with `AIza...`)

3. **Important Notes**
   - Free tier: 60 requests per minute
   - Enough for most small-medium stores
   - Upgrade to paid tier if needed
   - Keep your key private!

### Paid Tier (High-Volume Stores)

For stores with high traffic:

1. **Google Cloud Console**
   - Go to [console.cloud.google.com](https://console.cloud.google.com/)
   - Create or select a project
   - Enable "Gemini API"

2. **Create Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Create API key
   - Set up billing

3. **Benefits**
   - Higher rate limits
   - Better support
   - Billing controls
   - Usage analytics

---

## Step 3: Create Vowel Account (1 min)

1. **Sign Up**
   - Go to [vowel.to/signup](#)
   - Create free account
   - No credit card required

2. **Create App**
   - Click **"New App"**
   - Name: "My Shopify Store"
   - Platform: "Shopify"
   - Click **"Create"**

3. **Get App ID**
   - Copy your **App ID** (shown on dashboard)
   - Example: `app_abc123xyz`
   - Keep this handy for next step

---

## Step 4: Add to Your Theme (2 min)

### Using Theme Customizer (Recommended)

1. **Open Theme Customizer**
   - In Shopify Admin: **Online Store → Themes**
   - Find your active theme
   - Click **"Customize"**

2. **Add App Block**
   - Click **"Add section"** or **"Add block"**
   - Look for **"Apps"** category
   - Find **"Vowel Voice Assistant"**
   - Drag to desired location (footer recommended)

3. **Configure Settings**
   ```
   Required Settings:
   ├─ Vowel App ID: [paste from step 3]
   ├─ Gemini API Key: [paste from step 2]
   
   Optional Settings:
   ├─ Widget Position: bottom-right (or choose)
   ├─ Show Transcripts: false (or enable)
   └─ Button Size: medium (or adjust)
   ```

4. **Save Changes**
   - Click **"Save"** in top right
   - Widget is now live!

### Manual Theme Edit (Advanced)

If you prefer manual installation:

1. **Edit theme.liquid**
   - Go to **Online Store → Themes**
   - Click **"Actions" → "Edit code"**
   - Open `layout/theme.liquid`

2. **Add Before `</body>`**
   ```liquid
   {% comment %} Vowel Voice Assistant {% endcomment %}
   <script src="https://assets.codetek.us/apps/vowel/vowel-voice-widget.min.js"></script>
   <vowel-voice-widget 
     app-id="{{ settings.vowel_app_id }}"
     api-key="{{ settings.vowel_api_key }}"
     adapter="shopify"
     store-url="{{ shop.url }}"
     position="bottom-right">
   </vowel-voice-widget>
   ```

3. **Add Settings to config/settings_schema.json**
   ```json
   {
     "name": "Vowel Voice Assistant",
     "settings": [
       {
         "type": "text",
         "id": "vowel_app_id",
         "label": "Vowel App ID",
         "info": "Get from vowel.to dashboard"
       },
       {
         "type": "text",
         "id": "vowel_api_key",
         "label": "Gemini API Key",
         "info": "Get from Google AI Studio"
       }
     ]
   }
   ```

4. **Configure in Theme Settings**
   - Go to theme customizer
   - Click **"Theme settings"**
   - Enter your credentials
   - Save

---

## Step 5: Test & Launch (2 min)

### Test Voice Commands

1. **Open Your Store**
   - Visit your store's frontend
   - You should see the floating voice button

2. **Click to Activate**
   - Click the microphone button
   - Allow microphone permission (if prompted)

3. **Test Commands**
   ```
   Try saying:
   - "What products do you have?"
   - "Show me [category]"
   - "Find [product type]"
   - "Go to the sale section"
   ```

4. **Verify Responses**
   - AI should respond with voice
   - Store should navigate/search
   - Transcripts should appear (if enabled)

### Common Test Scenarios

**Product Search:**
- ✓ "Find wireless headphones"
- ✓ "Show me products under $50"
- ✓ "What's your best seller?"

**Navigation:**
- ✓ "Go to the about page"
- ✓ "Show me new arrivals"
- ✓ "Take me to checkout"

**Cart Actions:**
- ✓ "Add this to my cart" (on product page)
- ✓ "What's in my cart?"
- ✓ "Remove the first item"

### Troubleshooting Tests

If something doesn't work:

1. **Check Browser Console** (F12)
   - Look for error messages
   - Check if widget loaded
   - Verify API connections

2. **Verify Settings**
   - App ID correct?
   - API key valid?
   - Store URL correct?

3. **Test Permissions**
   - Microphone allowed?
   - HTTPS enabled? (should be on Shopify)
   - Browser supported?

---

## Configuration Options

### Basic Configuration

**Required:**
- ✓ Vowel App ID
- ✓ Gemini API Key

**Optional:**
- Position (bottom-right, bottom-left, top-right, top-left)
- Show transcripts (true/false)
- Button size (small, medium, large)

### Advanced Configuration

**In Vowel Dashboard:**
- Custom AI instructions
- Voice personality
- Language settings
- Response templates
- Analytics tracking

**In Theme Code:**
- Custom CSS styling
- JavaScript event hooks
- Custom actions
- Page-specific rules

---

## Verification Checklist

### Pre-Launch
- [ ] App installed successfully
- [ ] API key working (free quota check)
- [ ] Vowel account created
- [ ] Widget appears on all pages
- [ ] Voice commands work
- [ ] Mobile responsive
- [ ] Browser compatibility tested
- [ ] Microphone permissions work

### Post-Launch
- [ ] Customer feedback collected
- [ ] Analytics tracking
- [ ] Error monitoring
- [ ] API usage monitoring
- [ ] Performance check
- [ ] Mobile experience verified

---

## Next Steps

### Optimize Your Setup

1. **Customize AI Behavior**
   - Set brand voice and tone
   - Add store-specific context
   - Configure response templates

2. **Monitor Performance**
   - Check analytics daily
   - Monitor API usage
   - Track conversion impact

3. **Promote the Feature**
   - Add banner: "Try voice shopping!"
   - Social media announcement
   - Email to customers
   - Homepage highlight

### Get More From Vowel

1. **Explore Advanced Features**
   - Custom actions
   - Multi-language (coming soon)
   - Advanced analytics
   - A/B testing

2. **Join Community**
   - Shopify Partners forum
   - Vowel Discord server
   - Share feedback
   - Feature requests

3. **Upgrade Plan**
   - Start with free tier
   - Monitor usage
   - Upgrade as you grow
   - Volume discounts available

---

## Support

### Installation Help

**Common Issues:**
- Widget not appearing → Check theme compatibility
- Voice not working → Verify microphone permissions
- API errors → Check API key validity
- Slow performance → Check network connection

**Get Help:**
- 📚 [Documentation](../app/README.md)
- 💬 [Support Chat](#) (in app dashboard)
- 📧 [Email Support](#)
- 🎥 [Video Tutorials](#)

### Technical Support

**For Merchants:**
- Installation support
- Configuration help
- Troubleshooting
- Feature questions

**For Developers:**
- GitHub Issues
- Developer documentation
- API reference
- Code examples

---

**Installation complete?** [Learn how to customize →](./how-it-works.md)  
**Need help?** [See FAQ →](./faq.md)  
**Questions?** [Contact Support](#)

