# Vowel Voice Widget - Logging Guide

## Overview

The Vowel voice widget now includes comprehensive logging to help with debugging and monitoring the widget's lifecycle.

## Log Prefixes

All logs are prefixed with emojis and identifiers for easy filtering:

- **🎤 [Vowel Liquid]** - Logs from the Liquid template
- **🎤 [VowelWebComponent]** - Logs from the web component
- **✅** - Success/completion
- **❌** - Error
- **⚠️** - Warning
- **⏳** - In progress/waiting
- **⏸️** - Disabled/paused
- **⏭️** - Skipped

## Expected Log Sequence

When the widget loads successfully, you should see logs in this order:

### 1. Liquid Template Initialization
```
🎤 [Vowel Liquid] Loading voice widget script...
🎤 [Vowel Liquid] Settings: { position, size, appId, enabled }
🎤 [Vowel Liquid] Setting up widget lifecycle monitoring...
✅ [Vowel Liquid] Widget script loaded successfully
```

### 2. Web Component Registration
```
🎤 [VowelWebComponent] Module loaded, auto-registering...
🎤 [VowelWebComponent] Checking if custom element is already registered...
🎤 [VowelWebComponent] Registering custom element 'vowel-voice-widget'...
✅ [VowelWebComponent] Custom element registered successfully
✅ [Vowel Liquid] vowel-voice-widget custom element defined
```

### 3. Component Initialization
```
🎤 [VowelWebComponent] Constructor called
✅ [VowelWebComponent] Shadow DOM attached
🎤 [VowelWebComponent] Connected to DOM
🎤 [VowelWebComponent] Attributes: { position, size, appId }
🎤 [VowelWebComponent] Rendering component...
✅ [VowelWebComponent] Component rendered
```

### 4. Vowel Client Setup
```
🎤 [VowelWebComponent] Initializing Vowel client...
🎤 [VowelWebComponent] Creating router adapter...
🎤 [VowelWebComponent] Vowel config: { appId, routesCount }
🎤 [VowelWebComponent] Creating Vowel client instance...
✅ [VowelWebComponent] Vowel client created
🎤 [VowelWebComponent] Subscribing to state changes...
✅ [VowelWebComponent] Vowel client initialized successfully
```

### 5. DOM Ready & Widget Discovery
```
🎤 [Vowel Liquid] DOM ready, checking for widget...
✅ [Vowel Liquid] Widget element found
✅ [Vowel Liquid] Widget client initialized after XXms
🎤 [Vowel Liquid] Client state: { ... }
```

### 6. User Interaction (Button Click)
```
🎤 [VowelWebComponent] Button clicked
🎤 [VowelWebComponent] Toggling voice session...
⏳ [VowelWebComponent] Button state: connecting
🎤 [VowelWebComponent] State changed: { isConnecting: true, ... }
🎤 [VowelWebComponent] Updating button state: { ... }
```

### 7. Session Connected
```
✅ [VowelWebComponent] Button state: connected
🎤 [VowelWebComponent] State changed: { isConnected: true, ... }
✅ [VowelWebComponent] Session toggled
```

### 8. Session Disconnected
```
⏸️ [VowelWebComponent] Button state: idle
🎤 [VowelWebComponent] State changed: { isConnected: false, ... }
```

## Filtering Logs

### Chrome DevTools

Filter by component:
```
[Vowel Liquid]      # Only Liquid template logs
[VowelWebComponent] # Only web component logs
```

Filter by status:
```
✅                 # Only success logs
❌                 # Only error logs
⚠️                 # Only warning logs
```

### Common Issues to Look For

#### Widget Not Loading
Check for:
```
❌ [Vowel Liquid] Failed to load widget script
```

#### Custom Elements Not Supported
```
❌ [Vowel Liquid] Custom Elements not supported in this browser
```

#### Widget Element Not Found
```
❌ [Vowel Liquid] Widget element not found in DOM
```

#### Client Not Initializing
```
⚠️ [Vowel Liquid] Widget client not initialized after 5 seconds
⚠️ [VowelWebComponent] app-id attribute is required
❌ [VowelWebComponent] Failed to initialize Vowel: [error details]
```

#### Session Toggle Failures
```
❌ [VowelWebComponent] Failed to toggle session: [error details]
```

## Debugging Tips

1. **Open Chrome DevTools Console** before loading the page to see all logs

2. **Filter logs** by prefix to focus on specific components:
   ```
   [Vowel Liquid]
   [VowelWebComponent]
   ```

3. **Check timing** - Look at the timestamps between logs to identify delays

4. **Look for errors** - Filter by ❌ to see only errors

5. **Monitor state changes** - Watch for state change logs to understand the widget lifecycle

6. **Check attributes** - Verify the attributes logged match your Liquid settings

## Disabling Logs

To disable logs in production, you would need to:

1. Build a production version without console.log calls
2. Use a bundler plugin to strip console statements
3. Or wrap all logs in a `if (DEBUG)` check

For now, logs are included in all builds for debugging purposes.

## Log Volume

The widget generates approximately:
- **10-15 logs** on initial load
- **2-4 logs** per state change
- **3-5 logs** per button click

This should have minimal performance impact.

