# Frequently Asked Questions

## General Questions

### What is Vowel for Shopify?
Vowel is a voice assistant app that adds AI-powered voice shopping to your Shopify store. Customers can search for products, navigate your store, and manage their cart using natural voice commands - all without typing or clicking.

### Who is it for?
- **Shopify store owners** wanting to improve customer experience
- **Mobile-first stores** looking to reduce friction
- **Growing businesses** seeking competitive advantage
- **Any merchant** wanting to boost conversions and accessibility

### Do I need coding skills?
**No!** Installation is done through the Shopify App Store with one click. Configuration is done through the theme customizer with a simple visual interface. No code needed.

### Will it work with my theme?
**Yes!** Vowel works with all Shopify themes - free, paid, and custom. It's a theme app extension that integrates automatically without modifying your theme code.

### What makes it different from chatbots?
Unlike chatbots that just provide text responses, Vowel's voice assistant actually **controls your store**. It navigates pages, searches products, manages cart, and executes real actions - not just suggestions.

---

## Installation & Setup

### How long does installation take?
**5-10 minutes total:**
- 2 minutes to install from App Store
- 2 minutes to get Google API key (free)
- 1 minute to create Vowel account
- 2 minutes to configure in theme
- 2 minutes to test

### Do I need a Gemini API key?
**Yes.** You need your own Google Gemini API key. This is free to get from [Google AI Studio](https://aistudio.google.com/). The free tier includes 60 requests/minute, which is enough for most stores.

### Why do I need to provide my own API key?
This gives you direct control over AI costs and usage. You pay Google directly with no markup from us. It's typically $0-10/month for most stores, and you can monitor usage in your Google account.

### Can I test before going live?
**Yes!** Install in your development store or test in preview mode in the theme customizer. The free tier lets you test with real customers before upgrading.

### What if I need help with installation?
- Check our [Installation Guide](./installation.md)
- Watch our video tutorials
- Contact support via in-app chat
- Join our Shopify Partners Discord

---

## Features & Functionality

### What can customers do with voice?

**Product Search:**
- "Find [product type]"
- "Show me [category] under $[price]"
- "What's your best seller?"

**Navigation:**
- "Go to the sale section"
- "Show me new arrivals"
- "Take me to checkout"

**Cart Management:**
- "Add this to my cart"
- "What's in my cart?"
- "Remove [item]"

**Store Information:**
- "What are your shipping times?"
- "Do you have a return policy?"
- "What's your phone number?"

### How does it know my store's products?
The app automatically scans your store's sitemap.xml to discover all products, collections, and pages. This happens in the background and updates every 15 minutes.

### Can customers use it on mobile?
**Yes!** It's actually better on mobile. Voice is much easier than typing on small screens. The voice button works perfectly on all mobile browsers.

### What languages are supported?
Currently **English** (US, UK, Australian accents). More languages coming soon:
- Spanish (planned)
- French (planned)
- German (planned)
- Japanese (planned)

### Does it work offline?
No, voice processing requires an internet connection to communicate with the AI. This is standard for all voice AI services.

### Can I customize the AI's personality?
**Yes!** In the Vowel dashboard, you can set custom system instructions to define how the AI responds, what tone it uses, and how it represents your brand.

---

## Technical Questions

### What browsers are supported?
**Desktop:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Mobile:**
- iOS Safari 14+
- Chrome Mobile
- Samsung Internet
- Android Browser

HTTPS is required (standard for all Shopify stores).

### Will it slow down my store?
**No.** The widget loads asynchronously and has no measurable impact on page speed or Lighthouse scores. It's optimized for performance with CDN delivery and lazy loading.

### Does it affect SEO?
**No.** The voice widget doesn't interfere with your store's SEO. Google sees your store the same way. Voice interactions don't create duplicate content or navigation issues.

### How is my data protected?
- Voice audio is processed but **not recorded or stored**
- All connections use HTTPS encryption
- Your API keys stay in your environment
- GDPR compliant
- No customer data shared with third parties

### What happens if the service goes down?
Your store continues working normally - the voice feature simply becomes unavailable. The widget shows a graceful error message. Your store's core functionality is never affected.

### Can I use it on specific pages only?
With the app block method, it appears on all pages. For page-specific control, you can use conditional Liquid logic in a custom theme edit (advanced users only).

---

## Pricing & Billing

### How much does it cost?
**Shopify Connector App: FREE (always)**

**External Services:**
1. **Vowel Platform** (vowel.to): Free and paid tiers available
2. **Google Gemini API**: Free tier available, pay-per-use beyond

Most stores can start entirely free and upgrade as they grow.

**For detailed pricing:** [vowel.to/pricing](https://vowel.to/pricing)

### Is there a free trial?
**The free tier is your trial.** No credit card needed. Test with real customers before paying anything.

### What if I exceed my free tier?
**Vowel:** You'll be prompted to upgrade on the Vowel platform.  
**Google:** Automatically billed for overage (you can set spending caps).

### Can I cancel anytime?
**Yes.** No contracts, no cancellation fees. Cancel through Shopify app management or Vowel dashboard. Takes effect at end of current billing period.

### Do you offer refunds?
**First 30 days:** Full refund, no questions asked.  
**After 30 days:** Prorated refunds for annual plans.  
**Monthly plans:** Cancel anytime, no refunds but no penalty.

### Are there discounts available?
Vowel offers various discounts:
- Non-profit discounts
- Annual prepay discounts
- New store offers
- Startup programs
- Volume discounts

**Check current offers:** [vowel.to/pricing](https://vowel.to/pricing)

### How is billing handled?
**Vowel:** Through Shopify app billing (appears on your Shopify bill).  
**Google:** Separate billing through Google Cloud/AI Studio.

---

## Usage & Performance

### How many customers will use voice?
Typically **5-15% of visitors** try voice shopping. Engagement increases over time as customers discover the feature.

### Does it improve conversion rates?
**Yes.** Beta stores see average improvements of:
- +15-25% overall conversion rate
- +30-40% mobile conversion rate
- +20-30% average order value
- -40-50% cart abandonment rate

### How accurate is voice recognition?
Very accurate - powered by Google's Gemini Live AI. It understands natural speech, multiple accents, and handles background noise well.

### What if it doesn't understand a command?
The AI will ask for clarification or suggest alternatives. It's trained to handle unclear requests gracefully and guide customers to what they're looking for.

### Can customers switch between voice and manual?
**Yes!** Customers can use voice when convenient and regular navigation anytime. They're complementary, not exclusive.

---

## Customization

### Can I change the button position?
**Yes!** Choose from four corners:
- Bottom-right (most popular)
- Bottom-left
- Top-right
- Top-left

### Can I change the button appearance?
Currently limited customization (size, position). More styling options coming soon. For custom styling, you can use CSS overrides (advanced).

### Can I hide the "Powered by Vowel" badge?
**Yes!** Paid Vowel plans include the option to remove branding. Check [vowel.to/pricing](https://vowel.to/pricing) for details.

### Can I add custom voice commands?
Currently, the app discovers your store automatically. Custom actions are coming soon for Shopify Plus merchants.

### Can I see transcripts of conversations?
**Yes!** Enable "Show Transcripts" in settings. Customers will see their conversation history. Store-level analytics coming in v1.1.

---

## Support & Help

### What support is included?
Support varies by Vowel platform plan:
- **Free tier:** Community support and documentation
- **Paid plans:** Email support with response time SLAs
- **Higher tiers:** Priority support with faster response
- **Enterprise:** Dedicated support with custom SLA

**For plan details:** [vowel.to/pricing](https://vowel.to/pricing)

### How do I get help?
- 📚 [Documentation](./installation.md)
- 💬 In-app chat support
- 📧 Email: support@vowel.to
- 🎥 Video tutorials
- 💭 Discord community

### What if customers have issues?
Most issues are browser permissions (microphone access). The widget provides clear instructions. For technical issues, contact our support team.

### Do you offer implementation help?
**Yes!** Implementation support varies by Vowel platform plan:
- Paid plans include email guidance and best practices
- Higher tiers include implementation support and optimization
- Enterprise includes dedicated onboarding and training

**For plan details:** [vowel.to/pricing](https://vowel.to/pricing)

---

## Store Management

### Can I use it on multiple stores?
**Yes!** Each store needs its own app installation. The number of stores/apps allowed depends on your Vowel platform plan.

**For plan details:** [vowel.to/pricing](https://vowel.to/pricing)

### Can I transfer to a new theme?
**Yes!** When you change themes, just add the voice assistant block to your new theme in the customizer. Your settings carry over.

### What if I update my products?
The app automatically detects changes by rescanning your sitemap every 15 minutes. No manual updates needed.

### Can I see analytics?
**Yes!** Analytics capabilities vary by Vowel platform plan:
- Basic analytics in free tier
- Advanced analytics in paid plans
- Full analytics dashboard with A/B testing in higher tiers

**For plan details:** [vowel.to/pricing](https://vowel.to/pricing)

### Can I A/B test voice features?
**Yes!** A/B testing tools are included in higher-tier Vowel plans to test different AI personalities, widget positions, and configurations.

**For plan details:** [vowel.to/pricing](https://vowel.to/pricing)

---

## Troubleshooting

### Voice widget not appearing
- **Check:** Is app installed and active?
- **Check:** Is block added to theme?
- **Check:** Browser JavaScript enabled?
- **Solution:** Re-add block or contact support

### Voice commands not working
- **Check:** Microphone permission granted?
- **Check:** HTTPS enabled? (should be on Shopify)
- **Check:** Browser supported?
- **Solution:** Test in different browser, check permissions

### "API key invalid" error
- **Check:** Is Gemini API key correct?
- **Check:** Is API key enabled in Google AI Studio?
- **Check:** Free tier limits exceeded?
- **Solution:** Verify key, check Google Cloud console

### Slow performance
- **Check:** Internet connection speed?
- **Check:** Many extensions installed?
- **Solution:** Usually network-related, test on different connection

### Widget disappeared after theme update
- **Re-add:** Go to theme customizer
- **Add:** Vowel Voice Assistant block again
- **Configure:** Settings should be saved
- **Solution:** Takes 2 minutes to re-add

---

## Privacy & Compliance

### Is it GDPR compliant?
**Yes.** Voice audio is processed but not stored. No personal data is retained. Full GDPR compliance with data processing agreements available.

### Is it HIPAA compliant?
Not currently. Contact us if you need HIPAA compliance for healthcare stores.

### Does it use cookies?
Minimal cookies for session management only. No tracking cookies. No third-party cookies.

### Can customers opt out?
**Yes.** They simply don't use the voice feature. It's optional and doesn't track users who don't interact with it.

### Where is data stored?
- Voice processing: Google's servers (your API key)
- App configuration: Vowel's servers (US-based)
- Customer data: Stays in your Shopify store

---

## Future Features

### What's coming next?
- Text input alternative (coming soon)
- More languages (planned)
- Advanced analytics features (in development)
- Custom actions for Shopify Plus (on roadmap)
- Visual understanding (on roadmap)
- Mobile app companion (on roadmap)

### Can I request features?
**Yes!** We love feedback:
- Submit via dashboard
- Post in Discord community
- Email suggestions
- Vote on roadmap

### Do you have a public roadmap?
**Yes!** View at [vowel.to/roadmap](#)

---

## Getting Started

### I'm ready to install. What's first?
1. **[Get Gemini API key](https://aistudio.google.com/)** (2 min, free)
2. **Install from Shopify App Store** (2 min)
3. **Configure in theme customizer** (2 min)
4. **Test with voice commands** (2 min)
5. **Go live!**

Full guide: [Installation Guide](./installation.md)

### Can I see a demo first?
**Yes!** Visit our [live demo store](https://demo.vowel.to) to try voice shopping yourself.

### Is there a video tutorial?
**Yes!** [Watch installation tutorial →](#)

---

## Still Have Questions?

**Can't find your answer?**

- 📚 Read the [full documentation](./installation.md)
- 💬 Join our [Discord community](#)
- 📧 Email [support@vowel.to](mailto:support@vowel.to)
- 📞 [Schedule a demo call →](#)
- 🎥 [Watch video tutorials →](#)

**Ready to add voice shopping?**  
**[Install from Shopify App Store →](#)** (Coming Soon)

---

*Last updated: January 2026*

