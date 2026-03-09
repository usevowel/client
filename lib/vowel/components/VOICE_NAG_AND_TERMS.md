# Voice Nag & Terms/Privacy Modal

This document explains how to use the Voice Nag wrapper and Terms/Privacy modal features for the Vowel voice agent component.

## Overview

Two new optional features have been added to enhance user onboarding and compliance:

1. **Voice Nag Wrapper** - A promotional message that introduces users to the voice agent feature
2. **Terms & Privacy Modal** - A modal requiring users to accept terms and privacy policy before using the voice agent

Both features use localStorage to persist user interactions and won't show again once dismissed/accepted.

## Features

### Voice Nag Wrapper

- **Purpose**: Introduce users to the voice agent with a friendly promotional message
- **Dismissal**: Automatically dismissed when user first uses the voice agent, or manually via "Got it" button
- **Persistence**: Uses localStorage to remember dismissal state
- **Customization**: Fully customizable title, description, and button text
- **Layout**: Intelligently positions around the floating mic button based on screen position

### Terms & Privacy Modal

- **Purpose**: Require users to accept terms of service and privacy policy before using the voice agent
- **Blocking**: Blocks voice agent usage until terms are accepted
- **Persistence**: Uses localStorage to remember acceptance state with timestamp
- **Customization**: Support for inline HTML content or external URLs for both terms and privacy
- **Tabs**: Automatically shows tabs when both terms and privacy are provided
- **Optional Decline**: Can optionally show a decline button

## Usage

### React Component (VowelAgent)

```tsx
import { VowelAgent } from '@vowel.to/client/components';

function App() {
  return (
    <VowelAgent
      position="bottom-right"
      showTranscripts={true}
      
      // Voice Nag Options
      enableNag={true}
      nagTitle="Try Voice Shopping! 🎤"
      nagDescription="Get personalized help finding products, checking out, and more—all hands-free with our voice assistant."
      nagButtonText="Got it"
      nagStorageKeyPrefix="my-store-voice-nag"
      onNagDismiss={() => console.log('Nag dismissed')}
      
      // Terms & Privacy Modal Options
      enableTermsModal={true}
      termsModalTitle="Terms & Privacy"
      termsModalDescription="Please review and accept our terms to use the voice assistant."
      termsUrl="https://example.com/terms"
      privacyUrl="https://example.com/privacy"
      termsAcceptButtonText="Accept & Continue"
      termsAllowDecline={false}
      termsStorageKeyPrefix="my-store-terms"
      onTermsAccept={() => console.log('Terms accepted')}
      onTermsDecline={() => console.log('Terms declined')}
    />
  );
}
```

### Web Component (HTML)

```html
<vowel-voice-widget
  app-id="your-app-id"
  preset="shopify"
  position="bottom-right"
  
  <!-- Voice Nag Options -->
  enable-nag="true"
  nag-title="Try Voice Shopping! 🎤"
  nag-description="Get personalized help finding products, checking out, and more—all hands-free with our voice assistant."
  nag-button-text="Got it"
  nag-storage-key-prefix="my-store-voice-nag"
  
  <!-- Terms & Privacy Modal Options -->
  enable-terms-modal="true"
  terms-modal-title="Terms & Privacy"
  terms-modal-description="Please review and accept our terms to use the voice assistant."
  terms-url="https://example.com/terms"
  privacy-url="https://example.com/privacy"
  terms-accept-button-text="Accept & Continue"
  terms-allow-decline="false"
  terms-storage-key-prefix="my-store-terms"
>
</vowel-voice-widget>
```

## Props Reference

### Voice Nag Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `enableNag` | `boolean` | `false` | Enable the voice nag wrapper |
| `nagTitle` | `string` | `"Try Voice Shopping! 🎤"` | Custom title for the nag message |
| `nagDescription` | `string` | See default | Custom description for the nag message |
| `nagButtonText` | `string` | `"Got it"` | Custom acknowledge button text |
| `nagStorageKeyPrefix` | `string` | `"vowel-voice-nag"` | LocalStorage key prefix for storing state |
| `onNagDismiss` | `function` | `undefined` | Callback when nag is dismissed |

### Terms & Privacy Modal Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `enableTermsModal` | `boolean` | `false` | Enable the terms and privacy modal |
| `termsModalTitle` | `string` | `"Terms & Privacy"` | Modal title |
| `termsModalDescription` | `string` | See default | Modal description/intro text |
| `termsContent` | `string` | `undefined` | Terms of service content (HTML or text) |
| `termsUrl` | `string` | `undefined` | URL to external terms of service |
| `privacyContent` | `string` | `undefined` | Privacy policy content (HTML or text) |
| `privacyUrl` | `string` | `undefined` | URL to external privacy policy |
| `termsAcceptButtonText` | `string` | `"Accept & Continue"` | Text for the accept button |
| `termsDeclineButtonText` | `string` | `"Decline"` | Text for the decline button |
| `termsAllowDecline` | `boolean` | `false` | Whether to show a decline button |
| `termsStorageKeyPrefix` | `string` | `"vowel-terms-privacy"` | LocalStorage key prefix |
| `onTermsAccept` | `function` | `undefined` | Callback when terms are accepted |
| `onTermsDecline` | `function` | `undefined` | Callback when terms are declined |

## LocalStorage Keys

### Voice Nag

- `{prefix}-dismissed`: Boolean indicating if nag was manually dismissed
- `{prefix}-used`: Boolean indicating if voice agent was used (auto-dismiss)

Default prefix: `vowel-voice-nag`

### Terms & Privacy

- `{prefix}-accepted`: Boolean indicating if terms were accepted
- `{prefix}-timestamp`: ISO timestamp of when terms were accepted

Default prefix: `vowel-terms-privacy`

## Examples

### Example 1: Nag Only

Show a promotional nag message without requiring terms acceptance:

```tsx
<VowelAgent
  position="bottom-right"
  enableNag={true}
  nagTitle="🎤 Voice Shopping is Here!"
  nagDescription="Try our new voice assistant for a hands-free shopping experience."
/>
```

### Example 2: Terms Only

Require terms acceptance without showing a nag:

```tsx
<VowelAgent
  position="bottom-right"
  enableTermsModal={true}
  termsUrl="https://mystore.com/terms"
  privacyUrl="https://mystore.com/privacy"
/>
```

### Example 3: Both Nag and Terms

Show both features together for complete onboarding:

```tsx
<VowelAgent
  position="bottom-right"
  
  // Show nag first
  enableNag={true}
  nagTitle="Welcome to Voice Shopping! 🎤"
  
  // Require terms before using
  enableTermsModal={true}
  termsUrl="https://mystore.com/terms"
  privacyUrl="https://mystore.com/privacy"
/>
```

### Example 4: Inline Terms Content

Provide terms content directly instead of using URLs:

```tsx
<VowelAgent
  position="bottom-right"
  enableTermsModal={true}
  termsContent={`
    <h3>Terms of Service</h3>
    <p>By using this service, you agree to...</p>
    <ul>
      <li>Be awesome</li>
      <li>Use voice responsibly</li>
    </ul>
  `}
  privacyContent={`
    <h3>Privacy Policy</h3>
    <p>We collect and use your data to...</p>
  `}
  termsAllowDecline={true}
  onTermsDecline={() => {
    // Optionally hide the voice agent entirely
    console.log('User declined terms');
  }}
/>
```

### Example 5: Shopify Web Component

Full example for Shopify stores:

```html
<vowel-voice-widget
  app-id="your-app-id"
  preset="shopify"
  position="bottom-right"
  show-transcripts="true"
  
  <!-- Promotional nag for first-time visitors -->
  enable-nag="true"
  nag-title="🛍️ Shop with Your Voice!"
  nag-description="Ask me anything about products, sizing, shipping, or checkout. I'm here to help!"
  
  <!-- Legal compliance -->
  enable-terms-modal="true"
  terms-url="https://mystore.com/pages/terms-of-service"
  privacy-url="https://mystore.com/policies/privacy-policy"
  terms-accept-button-text="I Agree"
>
</vowel-voice-widget>
```

## Styling and Customization

Both components use Tailwind CSS classes and support dark mode out of the box. They inherit positioning from the parent `VowelAgent` component.

### Voice Nag Styling

The nag wrapper automatically adjusts its layout based on the button position:
- For `right` positions: Button appears on the right, content on the left
- For `left` positions: Button appears on the left, content on the right
- Always maintains proper spacing and visual hierarchy

### Terms Modal Styling

The modal is centered on screen with:
- Semi-transparent backdrop
- Smooth animations
- Responsive sizing (max 90vh height, 2xl width)
- Scrollable content area
- Tab navigation when both terms and privacy provided

## Clearing Stored Data

To reset the dismissal/acceptance state for testing:

```javascript
// Clear nag state
localStorage.removeItem('vowel-voice-nag-dismissed');
localStorage.removeItem('vowel-voice-nag-used');

// Clear terms acceptance state
localStorage.removeItem('vowel-terms-privacy-accepted');
localStorage.removeItem('vowel-terms-privacy-timestamp');
```

Or use custom prefixes:

```javascript
// Clear custom nag state
localStorage.removeItem('my-store-voice-nag-dismissed');
localStorage.removeItem('my-store-voice-nag-used');

// Clear custom terms state
localStorage.removeItem('my-store-terms-accepted');
localStorage.removeItem('my-store-terms-timestamp');
```

## Behavior Notes

### Voice Nag

1. **First Load**: Nag shows immediately if enabled and not previously dismissed
2. **First Use**: Automatically dismisses when user connects to voice agent
3. **Manual Dismiss**: User can click "Got it" or X button to dismiss
4. **Persistence**: Never shows again after dismissal (unless localStorage is cleared)

### Terms Modal

1. **First Load**: Checks localStorage for acceptance status
2. **Connection Attempt**: Shows modal if user tries to connect without accepting
3. **Blocking**: Prevents voice agent from connecting until accepted
4. **Auto-Connect**: Automatically connects after accepting terms
5. **Persistence**: Stores acceptance with ISO timestamp for audit trail
6. **Decline**: If allowed, closes modal but doesn't prevent future attempts

## Accessibility

Both components include:
- Proper ARIA labels
- Keyboard navigation support (ESC to close modal when decline allowed)
- Semantic HTML structure
- Focus management
- Screen reader friendly content

## Browser Compatibility

Features require:
- LocalStorage support (available in all modern browsers)
- ES6+ JavaScript
- Tailwind CSS (included in Vowel package)

## Troubleshooting

### Nag not showing

1. Check `enableNag={true}` is set
2. Verify localStorage isn't blocking storage
3. Clear localStorage keys to reset state
4. Check browser console for errors

### Terms modal not blocking connection

1. Verify `enableTermsModal={true}` is set
2. Check localStorage for acceptance key
3. Ensure at least one of `termsUrl`/`termsContent` or `privacyUrl`/`privacyContent` is provided
4. Check browser console for connection blocking logs

### LocalStorage not persisting

1. Verify localStorage is enabled in browser
2. Check for incognito/private browsing mode
3. Ensure custom storage keys don't conflict with existing keys
4. Check browser storage quota

## License

Proprietary - © vowel.to

