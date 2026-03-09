# Quick Start: Voice Nag & Terms Modal

> **TL;DR**: Add promotional messaging and terms acceptance to your Shopify voice agent in 2 minutes.

## 🚀 Quickest Start (Copy & Paste)

### For Shopify Stores (HTML)

```html
<!-- Add this to your theme.liquid or any page -->
<script src="https://assets.codetek.us/apps/vowel/vowel-voice-widget.min.js"></script>

<vowel-voice-widget
  app-id="YOUR_APP_ID"
  preset="shopify"
  position="bottom-right"
  
  <!-- Enable nag -->
  enable-nag="true"
  nag-title="Try Voice Shopping! 🎤"
  nag-description="Ask me anything about products, sizing, or checkout—hands-free!"
  
  <!-- Enable terms modal -->
  enable-terms-modal="true"
  terms-url="https://yourstore.com/policies/terms-of-service"
  privacy-url="https://yourstore.com/policies/privacy-policy"
></vowel-voice-widget>
```

**That's it!** Replace `YOUR_APP_ID` and the URLs, and you're done.

---

## 📋 What You Get

### Voice Nag (Promotional Message)
- ✅ Shows once to introduce voice shopping
- ✅ Auto-dismisses when user tries voice agent
- ✅ Can be manually dismissed with "Got it" button
- ✅ Never shows again (stored in localStorage)

### Terms & Privacy Modal
- ✅ Requires acceptance before voice agent use
- ✅ Blocks connection until accepted
- ✅ Stores acceptance timestamp
- ✅ Never shows again after acceptance

---

## 🎯 Use Cases

### Scenario 1: Just the Nag (No Terms Required)
Perfect for stores that want to promote the feature without legal requirements.

```html
<vowel-voice-widget
  app-id="YOUR_APP_ID"
  preset="shopify"
  enable-nag="true"
></vowel-voice-widget>
```

### Scenario 2: Just Terms (No Promotional Nag)
For stores that need legal compliance but don't want promotional messaging.

```html
<vowel-voice-widget
  app-id="YOUR_APP_ID"
  preset="shopify"
  enable-terms-modal="true"
  terms-url="https://yourstore.com/terms"
  privacy-url="https://yourstore.com/privacy"
></vowel-voice-widget>
```

### Scenario 3: Both (Recommended for Shopify)
Best user experience: introduce the feature, then require terms acceptance.

```html
<vowel-voice-widget
  app-id="YOUR_APP_ID"
  preset="shopify"
  enable-nag="true"
  enable-terms-modal="true"
  terms-url="https://yourstore.com/terms"
  privacy-url="https://yourstore.com/privacy"
></vowel-voice-widget>
```

---

## 🎨 Customization

### Customize Nag Message

```html
<vowel-voice-widget
  app-id="YOUR_APP_ID"
  preset="shopify"
  
  enable-nag="true"
  nag-title="🛍️ Welcome to Voice Shopping!"
  nag-description="I can help you find products, answer questions, and complete checkout—all with your voice!"
  nag-button-text="Let's try it!"
></vowel-voice-widget>
```

### Customize Terms Modal

```html
<vowel-voice-widget
  app-id="YOUR_APP_ID"
  preset="shopify"
  
  enable-terms-modal="true"
  terms-modal-title="Legal Stuff"
  terms-modal-description="Quick legal note before we get started..."
  terms-url="https://yourstore.com/terms"
  privacy-url="https://yourstore.com/privacy"
  terms-accept-button-text="I Agree"
  terms-allow-decline="true"
></vowel-voice-widget>
```

### Custom LocalStorage Keys

If you want to use different storage keys (e.g., per-store or per-brand):

```html
<vowel-voice-widget
  app-id="YOUR_APP_ID"
  preset="shopify"
  
  enable-nag="true"
  nag-storage-key-prefix="my-brand-voice-nag"
  
  enable-terms-modal="true"
  terms-storage-key-prefix="my-brand-terms"
></vowel-voice-widget>
```

---

## 🧪 Testing

### Clear State for Testing

Open browser console and run:

```javascript
// Clear nag state
localStorage.removeItem('vowel-voice-nag-dismissed');
localStorage.removeItem('vowel-voice-nag-used');

// Clear terms state
localStorage.removeItem('vowel-terms-privacy-accepted');
localStorage.removeItem('vowel-terms-privacy-timestamp');

// Or clear ALL localStorage (nuclear option)
localStorage.clear();

// Reload page
location.reload();
```

### Check Current State

```javascript
console.log('Nag dismissed:', localStorage.getItem('vowel-voice-nag-dismissed'));
console.log('Nag used:', localStorage.getItem('vowel-voice-nag-used'));
console.log('Terms accepted:', localStorage.getItem('vowel-terms-privacy-accepted'));
console.log('Terms timestamp:', localStorage.getItem('vowel-terms-privacy-timestamp'));
```

---

## 📝 Common Configurations

### E-commerce Store (Full Featured)
```html
<vowel-voice-widget
  app-id="YOUR_APP_ID"
  preset="shopify"
  position="bottom-right"
  show-transcripts="true"
  enable-nag="true"
  nag-title="🛍️ Shop with Your Voice!"
  enable-terms-modal="true"
  terms-url="https://yourstore.com/policies/terms-of-service"
  privacy-url="https://yourstore.com/policies/privacy-policy"
></vowel-voice-widget>
```

### Minimal Setup (Just Required Features)
```html
<vowel-voice-widget
  app-id="YOUR_APP_ID"
  preset="shopify"
  enable-terms-modal="true"
  terms-url="https://yourstore.com/terms"
  privacy-url="https://yourstore.com/privacy"
></vowel-voice-widget>
```

### Premium Experience (All Features)
```html
<vowel-voice-widget
  app-id="YOUR_APP_ID"
  preset="shopify"
  position="bottom-right"
  show-transcripts="true"
  
  enable-nag="true"
  nag-title="✨ Introducing Voice Shopping"
  nag-description="Experience shopping like never before. Just speak, and I'll help you find exactly what you need!"
  nag-button-text="Show me how"
  
  enable-terms-modal="true"
  terms-modal-title="Before We Begin"
  terms-modal-description="To provide you with the best voice shopping experience, please review our terms."
  terms-url="https://yourstore.com/policies/terms-of-service"
  privacy-url="https://yourstore.com/policies/privacy-policy"
  terms-accept-button-text="Let's Go!"
  terms-allow-decline="false"
></vowel-voice-widget>
```

---

## 🔧 Advanced Usage

### Inline Terms Content (No External URLs)

```html
<vowel-voice-widget
  app-id="YOUR_APP_ID"
  preset="shopify"
  enable-terms-modal="true"
  terms-content="<h3>Terms</h3><p>By using this service, you agree to our terms...</p>"
  privacy-content="<h3>Privacy</h3><p>We collect and use your data to...</p>"
></vowel-voice-widget>
```

### React Component Usage

```tsx
import { VowelAgent } from '@vowel.to/client/components';

function ShopPage() {
  return (
    <VowelAgent
      position="bottom-right"
      enableNag={true}
      nagTitle="Try Voice Shopping! 🎤"
      enableTermsModal={true}
      termsUrl="https://example.com/terms"
      privacyUrl="https://example.com/privacy"
      onNagDismiss={() => console.log('User dismissed nag')}
      onTermsAccept={() => console.log('User accepted terms')}
    />
  );
}
```

---

## ❓ FAQ

### Q: Will this slow down my site?
**A:** No. Both features are optional and only load when enabled. Total bundle size impact is ~15KB gzipped.

### Q: What if a user clears their browser data?
**A:** They'll see the nag and/or terms modal again, just like a first-time visitor.

### Q: Can I track when users accept terms?
**A:** Yes! Use the `onTermsAccept` callback. The acceptance timestamp is also stored in localStorage.

### Q: Can users decline terms?
**A:** Yes, set `terms-allow-decline="true"`. The voice agent won't work until they accept.

### Q: Does this work on mobile?
**A:** Yes! Both components are fully responsive and work on all devices.

### Q: Can I customize the styling?
**A:** The components use Tailwind CSS and support dark mode. For deeper customization, you can override CSS classes.

---

## 🆘 Troubleshooting

### Nag Not Showing
1. ✅ Verify `enable-nag="true"` is set
2. ✅ Check browser console for errors
3. ✅ Clear localStorage and reload
4. ✅ Ensure localStorage is not blocked

### Terms Modal Not Blocking
1. ✅ Verify `enable-terms-modal="true"` is set
2. ✅ Verify `terms-url` or `terms-content` is provided
3. ✅ Clear localStorage to reset acceptance
4. ✅ Check browser console for errors

### LocalStorage Not Working
1. ✅ Check if localStorage is enabled (incognito mode may block it)
2. ✅ Check browser storage quota
3. ✅ Try clearing cookies and site data

---

## 📚 More Resources

- **Full Documentation**: `lib/vowel/components/VOICE_NAG_AND_TERMS.md`
- **Architecture Guide**: `lib/vowel/components/COMPONENT_ARCHITECTURE.md`
- **Example Page**: `shopify/examples/voice-nag-example.html`
- **Implementation Summary**: `VOICE_NAG_IMPLEMENTATION_SUMMARY.md`

---

## ✅ Checklist for Go-Live

Before deploying to production:

- [ ] Replace `YOUR_APP_ID` with actual Vowel app ID
- [ ] Update `terms-url` with your actual terms of service page
- [ ] Update `privacy-url` with your actual privacy policy page
- [ ] Test on desktop and mobile
- [ ] Test with localStorage cleared
- [ ] Test the full flow: nag → terms → connection
- [ ] Verify dark mode works (if your site uses it)
- [ ] Test in incognito/private browsing mode

---

**Need help?** Check the full documentation or contact support.

**Ready to launch?** Copy the code above, customize it for your store, and you're live! 🚀

