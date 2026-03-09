# Tool Retry & Step Limiting Implementation

## Overview

This document describes the implementation of tool retry logic, step limiting, and performance optimizations for the Vowel client library, specifically addressing the `get_page_snapshot` validation errors and improving overall reliability.

**Key Features**:
- ✅ Fixed Zod schema validation errors with `.passthrough()`
- ✅ **AI-guided retry strategy** - Soft failures allow AI to learn and self-correct
- ✅ Step limiting to prevent infinite loops (default: **30 steps**)
- ✅ Failure tracking per tool (max 3 failures before warning)
- ✅ Performance monitoring with detailed timing breakdowns
- ✅ **No snapshot size limits** for Vowel Prime & Gemini (WebSocket)
- ⚠️ OpenAI limited to 200KB (WebRTC channel limitation, not LLM limit)

> **Philosophy**: Let the AI handle errors intelligently instead of hardcoded automatic retries.  
> The AI can analyze errors, correct parameters, and try different approaches.

## Changes Made

### 1. Fixed `get_page_snapshot` Zod Schema Validation ✅

**Problem**: The AI was sending additional properties to `get_page_snapshot` (which has no parameters), causing validation errors:
```
Tool call validation failed: parameters for tool get_page_snapshot did not match schema: 
errors: [additionalProperties '' not allowed]
```

**Solution**: Made Zod schemas more resilient by using `.passthrough()` for all tool schemas.

**Files Modified**:
- `client/lib/vowel/providers/VowelPrimeRealtimeProvider.ts`
- `client/lib/vowel/providers/OpenAIRealtimeProvider.ts`

**Changes**:
```typescript
// Before: Strict schema that rejects unknown properties
const schema = z.object(schemaObj);

// After: Resilient schema that allows additional properties
const schema = hasParameters 
  ? z.object(schemaObj).passthrough()
  : z.object({}).passthrough();
```

This prevents validation errors when the AI sends unexpected properties while still validating the expected parameters.

---

### 2. AI-Guided Retry Strategy ✅

**Feature**: Intelligent error handling that lets the AI learn from failures and self-correct.

**Configuration** (`client/lib/vowel/types/types.ts`):
```typescript
export interface ToolRetryConfig {
  maxRetries?: number;    // Max consecutive failures per tool (default: 3)
  maxSteps?: number;      // Max total tool calls per session (default: 30)
}

// Usage in VowelVoiceConfig
voiceConfig: {
  toolRetry: {
    maxRetries: 3,       // Max failures before stern warning
    maxSteps: 30         // Max total tool calls to prevent infinite loops
  }
}
```

**Strategy: Let AI Handle Retries**

Instead of automatic/hardcoded retries, we use **soft failures** that allow the AI to intelligently respond:

1. **Tool fails** → Error sent back to AI (not a hard crash)
2. **AI analyzes error** → Can understand what went wrong
3. **AI self-corrects** → Retries with fixed parameters or different approach
4. **Failure tracking** → Prevents infinite loops (max 3 failures per tool)

**Error Response to AI**:
```typescript
// First failure - AI can try again (2 retries left)
{
  success: false,
  error: "Invalid product ID: abc123",
  failureCount: 1,
  maxFailures: 3,
  retriesLeft: 2,
  message: "Tool execution failed (attempt 1/3, 2 retries remaining). Error: Invalid product ID: abc123. You may analyze the error and try again with corrected parameters or a different approach."
}

// Second failure - AI can try again (1 retry left)
{
  success: false,
  error: "Product not found: def456",
  failureCount: 2,
  maxFailures: 3,
  retriesLeft: 1,
  message: "Tool execution failed (attempt 2/3, 1 retry remaining). Error: Product not found: def456. You may analyze the error and try again with corrected parameters or a different approach."
}

// After 3rd failure - Stern warning (0 retries left)
{
  success: false,
  error: "Invalid product ID: xyz789",
  failureCount: 3,
  maxFailures: 3,
  retriesLeft: 0,
  message: "Tool 'get_product' has failed 3 times with errors (0 retries remaining). This suggests the tool may not work as expected with the current parameters or approach. Please try a completely different approach, use a different tool if available, or inform the user that this action cannot be completed. Last error: Invalid product ID: xyz789"
}
```

**Benefits of AI-Guided Retry**:
- ✅ **Intelligent correction** - AI can fix wrong parameters
- ✅ **Flexible approach** - AI can try different strategies
- ✅ **Learn from errors** - AI understands what went wrong
- ✅ **No hardcoded logic** - AI makes smart decisions
- ✅ **Better UX** - AI can explain issues to users

---

### 3. Implemented Step Limiting ✅

**Feature**: Prevents infinite loops by limiting total tool executions per session.

**Default Limit**: 30 steps (reduced from 50 for better control)

**How It Works**:
1. Every tool call increments `totalStepCount`
2. When `totalStepCount >= maxSteps` (30), AI receives a notification message
3. AI is instructed to inform the user and ask how to proceed
4. After the notification, only one additional step is allowed (with no tool calls)
5. Any further tool calls are rejected

**Limit Reached Response**:
```typescript
{
  error: "Maximum step limit reached (30 steps). You have used all available tool execution steps for this conversation. Please inform the user that you've reached the maximum number of actions and ask how they would like to proceed. Do NOT attempt any more tool calls.",
  stepLimitReached: true,
  totalSteps: 30,
  maxSteps: 30
}
```

**Logging**:
```
📊 [SessionManager] Step 28/30
📊 [SessionManager] Step 29/30
📊 [SessionManager] Step 30/30
⚠️ [SessionManager] Step limit reached (30 steps)
```

---

### 4. Performance Optimizations for `get_page_snapshot` ✅

**File**: `client/lib/vowel/platforms/generic/dom-search.ts`

**Optimizations**:

#### a. **Performance Timing**
Added granular timing measurements for each stage:
```typescript
⏱️  Tree generation: 12.34ms
⏱️  Element mapping: 5.67ms (42 elements)
⏱️  YAML rendering: 23.45ms
⏱️  Ref replacement: 8.90ms (42 refs)
🎯 Total time: 50.36ms
```

#### b. **Efficient Regex Replacement**
```typescript
// Before: Creating regex in loop (slow)
for (const [ref, id] of Object.entries(mapping)) {
  text = text.replace(new RegExp(`\\[ref=${ref}\\]`, 'g'), `[ref=${id}]`);
}

// After: Pre-compile all patterns (faster)
const replacements = Object.entries(mapping).map(([ref, id]) => ({
  pattern: new RegExp(`\\[ref=${ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'g'),
  replacement: `[ref=${id}]`
}));

for (const { pattern, replacement } of replacements) {
  text = text.replace(pattern, replacement);
}
```

#### c. **Performance Monitoring**
Automatic performance tracking and warnings (size warnings removed - LLM supports long context):
```typescript
// Performance metrics logged for all operations
⏱️  Tree generation: 12.34ms
⏱️  Element mapping: 5.67ms (42 elements)
⏱️  YAML rendering: 23.45ms
⏱️  Ref replacement: 8.90ms (42 refs)
✅ Generated AI snapshot with 42 interactive elements
📊 Snapshot size: 45.2KB
🎯 Total time: 50.36ms

// Warning only for slow generation (not size)
⚠️  [Performance] Snapshot generation took 150ms (threshold: 100ms)
   Consider optimizing page structure if this impacts user experience
```

---

### 5. Updated Configuration Types ✅

**File**: `client/lib/vowel/types/types.ts`

Added comprehensive TypeScript interfaces:
- `ToolRetryConfig` - Retry and step limit configuration
- Updated `VowelVoiceConfig` to include `toolRetry?: ToolRetryConfig`

Full TypeDoc comments provided for IntelliSense support.

---

## Usage Examples

### Basic Setup (Default Configuration)

```typescript
import { VowelClient } from '@vowel.to/client';

const vowel = new VowelClient({
  appId: 'your-app-id',
  voiceConfig: {
    // AI-guided retry enabled by default
    // Max 3 failures per tool, 30 total steps
    // No configuration needed unless you want to customize
  }
});
```

### Custom Configuration

```typescript
const vowel = new VowelClient({
  appId: 'your-app-id',
  voiceConfig: {
    toolRetry: {
      maxRetries: 5,        // Allow 5 failures per tool before warning
      maxSteps: 50          // Allow up to 50 total tool calls
    }
  }
});
```

### Strict Configuration (More Aggressive Limiting)

```typescript
const vowel = new VowelClient({
  appId: 'your-app-id',
  voiceConfig: {
    toolRetry: {
      maxRetries: 2,        // Only 2 failures allowed per tool
      maxSteps: 20          // Lower step limit for simpler use cases
    }
  }
});
```

---

## Performance Recommendations

### 1. **Optimize Page Structure**
- Reduce unnecessary DOM nesting
- Use semantic HTML to improve ARIA tree efficiency
- Minimize the number of interactive elements per page

### 2. **Use Targeted Element Search**
For large pages, prefer `search_elements` over `get_page_snapshot`:
```typescript
// Instead of:
const snapshot = await vowel.getPageSnapshot();

// Use targeted search:
const results = await vowel.searchElements('add to cart button');
```

### 3. **Monitor Performance**
Watch console logs for performance metrics:
- Snapshot generation time is logged for all operations
- Generation > 100ms → Consider page optimization if impacting UX
- Snapshot size is logged but not limited (LLM supports long context)

### 4. **Set Appropriate Step Limits**
Based on your use case:
- **Simple apps** (e.g., forms): `maxSteps: 20`
- **E-commerce** (e.g., product browsing): `maxSteps: 30` (default)
- **Complex workflows** (e.g., multi-step wizards): `maxSteps: 50`
- **Very complex** (e.g., multi-page workflows): `maxSteps: 100`

---

## Testing

### Test the Fix

1. **Run the React demo**:
```bash
cd demos/demo
bun run dev
```

2. **Test tool retry**:
- Trigger a tool failure (e.g., navigate to invalid route)
- Verify the tool is retried automatically
- Check console logs for retry messages

3. **Test step limiting**:
- Set a low `maxSteps` value (e.g., 5)
- Perform multiple actions
- Verify AI receives notification at step limit
- Verify AI asks user how to proceed

4. **Test performance**:
- Open a complex page with many elements
- Call `get_page_snapshot`
- Check console for performance metrics
- Verify no validation errors occur

---

## Troubleshooting

### Issue: "Step limit reached" too quickly
**Solution**: Increase `maxSteps` in `voiceConfig.toolRetry.maxSteps`

### Issue: Tool keeps retrying indefinitely
**Solution**: Verify `maxRetries` is set correctly (default: 3)

### Issue: Validation errors still occurring
**Solution**: Check that you're using the latest version with `.passthrough()` schemas

### Issue: Snapshot generation is slow (>100ms)
**Solution**: 
- Check console for performance timing breakdown
- Consider page structure optimization if it impacts user experience
- Note: Large snapshots are fine - LLM supports very long context

---

## Migration Guide

### Existing Applications

No breaking changes! The retry mechanism is enabled by default with sensible defaults.

**Optional**: Add explicit configuration if you want custom behavior:
```typescript
voiceConfig: {
  toolRetry: {
    maxRetries: 5,
    maxSteps: 100
  }
}
```

---

## Implementation Details

### Files Modified

**Client Library**:
1. **`client/lib/vowel/providers/VowelPrimeRealtimeProvider.ts`**
   - Added `.passthrough()` to Zod schemas for resilience
   - Added optional parameter handling

2. **`client/lib/vowel/providers/OpenAIRealtimeProvider.ts`**
   - Updated `convertVowelActionToZod()` with `.passthrough()`
   - Updated truncation warnings to clarify WebRTC limitation

3. **`client/lib/vowel/managers/SessionManager.ts`**
   - Added step limiting: `totalStepCount`, `maxSteps` (default: 30)
   - Added failure tracking: `toolFailureCount`, `maxToolFailures` (default: 3)
   - Enhanced `handleProviderToolCall()` with AI-guided retry logic
   - Soft failure responses with helpful error messages for AI
   - Added state reset in `disconnect()`

4. **`client/lib/vowel/types/types.ts`**
   - Added `ToolRetryConfig` interface
   - Updated `VowelVoiceConfig` with `toolRetry` field
   - Documented AI-guided retry strategy
   - Changed defaults: `maxSteps: 30`, `maxRetries: 3`

5. **`client/lib/vowel/platforms/generic/dom-search.ts`**
   - Added performance timing measurements
   - Optimized regex replacement with pre-compiled patterns
   - Removed size warnings (LLM supports long context)

---

## Future Enhancements

Potential improvements for future versions:

1. **Adaptive Retry Delays**: Exponential backoff between retries
2. **Tool-Specific Retry Limits**: Different retry counts per tool
3. **Snapshot Caching**: Cache snapshots for repeated calls
4. **Incremental Snapshots**: Only update changed elements
5. **Parallel Tool Execution**: Execute independent tools concurrently

---

## Summary

This implementation provides:
✅ **Resilient tool execution** - No more validation errors (`.passthrough()` schemas)
✅ **AI-guided retry** - Soft failures let AI learn and self-correct (max 3 per tool)
✅ **Step limiting** - Maximum 30 steps per session (prevents infinite loops)
✅ **Intelligent error handling** - AI analyzes errors and corrects parameters
✅ **Performance insights** - Detailed timing metrics (no size limits)
✅ **Graceful degradation** - AI notified when limits reached
✅ **Long context support** - No snapshot size restrictions (Vowel Prime, Gemini)
✅ **Flexible approach** - AI can try different strategies, not hardcoded retries

**Philosophy**: Trust the AI to handle errors intelligently rather than hardcoded automatic retries.

**No Breaking Changes**: All features work with sensible defaults, no code changes required for existing applications.

