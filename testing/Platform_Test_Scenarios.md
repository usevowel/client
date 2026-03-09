# Platform Test Scenarios

## Overview

The vowel.to platform consists of the core library (`@vowel.to/react`), Convex backend, and integration components. This document outlines test scenarios for the platform's core functionality.

## Prerequisites

- Convex backend running (`bun run convex:dev`)
- Environment setup completed (`./setup-gemini-env.sh`)
- Test credentials: `REDACTED_EMAIL` / `REDACTED_PASSWORD`
- Node.js 18+ and bun/pnpm installed

## Test Scenarios

### 1. Core Library Testing

#### 1.1 Library Installation
- **Test Case:** Install @vowel.to/react package
- **Steps:**
  1. Create new React project
  2. Run `bun add @vowel.to/react`
  3. Verify package installation
  4. Check TypeScript definitions
- **Expected:** Package installed with proper types

#### 1.2 Basic Integration
- **Test Case:** Basic library integration
- **Steps:**
  1. Import `VowelProvider` and `VowelAgent`
  2. Wrap app with `VowelProvider`
  3. Add `VowelAgent` component
  4. Configure basic app ID
- **Expected:** Voice agent renders without errors

#### 1.3 Client-First Architecture
- **Test Case:** Test new client-first design
- **Steps:**
  1. Create `VowelClient` instance
  2. Configure with app ID and router
  3. Pass client to `VowelProvider`
  4. Verify client methods available
- **Expected:** Client instance works correctly

### 2. ToolManager System

#### 2.1 Tool Registration
- **Test Case:** Register custom tools
- **Steps:**
  1. Create `VowelClient` instance
  2. Register action: `searchProducts`
  3. Define parameters and handler
  4. Register action: `createUser`
  5. Test tool registration
- **Expected:** Tools registered successfully

#### 2.2 Built-in Tools
- **Test Case:** Test built-in navigation tools
- **Steps:**
  1. Configure router adapter
  2. Test `navigate` tool
  3. Test `getCurrentPageContext` tool
  4. Test `listRoutes` tool
- **Expected:** Built-in tools work correctly

#### 2.3 Tool Execution
- **Test Case:** Execute registered tools
- **Steps:**
  1. Make voice command: "Search for laptops"
  2. Verify `searchProducts` tool called
  3. Check parameters passed correctly
  4. Verify handler execution
- **Expected:** Tools execute with correct parameters

#### 2.4 Tool Error Handling
- **Test Case:** Test tool error scenarios
- **Steps:**
  1. Register tool with invalid handler
  2. Make voice command that triggers error
  3. Test with missing parameters
  4. Test with invalid parameter types
- **Expected:** Appropriate error handling

### 3. Router Integration

#### 3.1 TanStack Router Adapter
- **Test Case:** Test TanStack Router integration
- **Steps:**
  1. Configure TanStack Router
  2. Create `tanstackRouterAdapter`
  3. Pass adapter to `VowelClient`
  4. Verify route detection
- **Expected:** Routes automatically detected

#### 3.2 Auto Route Detection
- **Test Case:** Test automatic route discovery
- **Steps:**
  1. Define routes in TanStack Router
  2. Configure VowelClient with adapter
  3. Check detected routes
  4. Verify route descriptions
- **Expected:** All routes detected with descriptions

#### 3.3 Parameter Extraction
- **Test Case:** Test route parameter handling
- **Steps:**
  1. Define route: `/users/:id`
  2. Make voice command: "Go to user 123"
  3. Verify parameter extraction
  4. Test navigation with parameters
- **Expected:** Parameters extracted and used correctly

#### 3.4 Query Parameter Support
- **Test Case:** Test query parameter handling
- **Steps:**
  1. Define route: `/search` with query params
  2. Make voice command: "Search for laptops"
  3. Verify query parameters set
  4. Test navigation with query params
- **Expected:** Query parameters handled correctly

### 4. Voice Agent Functionality

#### 4.1 Voice Recognition
- **Test Case:** Test voice input recognition
- **Steps:**
  1. Click microphone button
  2. Say: "Go to dashboard"
  3. Verify speech recognition
  4. Test with different accents
- **Expected:** Voice commands recognized accurately

#### 4.2 Voice Response
- **Test Case:** Test voice output
- **Steps:**
  1. Make voice command
  2. Verify AI response
  3. Test voice synthesis
  4. Check response quality
- **Expected:** Clear, accurate voice responses

#### 4.3 Multimodal Interaction
- **Test Case:** Test voice + visual interaction
- **Steps:**
  1. Make voice command
  2. Verify visual feedback
  3. Test loading states
  4. Check error displays
- **Expected:** Seamless multimodal experience

### 5. Convex Backend Integration

#### 5.1 Real-time Updates
- **Test Case:** Test real-time data sync
- **Steps:**
  1. Configure Convex client
  2. Test real-time subscriptions
  3. Verify data updates
  4. Test offline/online handling
- **Expected:** Real-time updates work correctly

#### 5.2 Authentication Integration
- **Test Case:** Test auth with Convex
- **Steps:**
  1. Configure Better Auth
  2. Test sign in/sign out
  3. Verify session management
  4. Test protected routes
- **Expected:** Authentication works seamlessly

#### 5.3 Data Persistence
- **Test Case:** Test data storage
- **Steps:**
  1. Create voice agent configuration
  2. Save to Convex database
  3. Reload page
  4. Verify data persistence
- **Expected:** Data persists across sessions

### 6. API Integration

#### 6.1 Gemini Live API
- **Test Case:** Test Gemini integration
- **Steps:**
  1. Configure API key
  2. Test voice processing
  3. Verify tool calls
  4. Check response quality
- **Expected:** Gemini API works correctly

#### 6.2 Ephemeral Tokens
- **Test Case:** Test token management
- **Steps:**
  1. Generate ephemeral token
  2. Use token for API calls
  3. Test token expiration
  4. Verify rate limiting
- **Expected:** Token system works properly

#### 6.3 Error Handling
- **Test Case:** Test API error scenarios
- **Steps:**
  1. Test with invalid API key
  2. Test with network issues
  3. Test with rate limits
  4. Verify error messages
- **Expected:** Appropriate error handling

### 7. Performance Testing

#### 7.1 Load Testing
- **Test Case:** Test under load
- **Steps:**
  1. Simulate multiple users
  2. Test concurrent voice commands
  3. Monitor performance
  4. Check for bottlenecks
- **Expected:** System handles load gracefully

#### 7.2 Memory Usage
- **Test Case:** Test memory consumption
- **Steps:**
  1. Monitor memory usage
  2. Test long-running sessions
  3. Check for memory leaks
  4. Verify cleanup
- **Expected:** Memory usage remains stable

#### 7.3 Response Times
- **Test Case:** Test response performance
- **Steps:**
  1. Measure voice command response time
  2. Test navigation speed
  3. Check tool execution time
  4. Monitor API response times
- **Expected:** Response times within acceptable limits

### 8. Security Testing

#### 8.1 API Key Security
- **Test Case:** Test API key protection
- **Steps:**
  1. Verify keys not exposed in client
  2. Test key rotation
  3. Check access controls
  4. Verify encryption
- **Expected:** API keys properly secured

#### 8.2 Input Validation
- **Test Case:** Test input sanitization
- **Steps:**
  1. Test malicious voice commands
  2. Test injection attacks
  3. Verify parameter validation
  4. Check XSS prevention
- **Expected:** Inputs properly validated

#### 8.3 Session Security
- **Test Case:** Test session management
- **Steps:**
  1. Test session hijacking prevention
  2. Verify token security
  3. Test logout functionality
  4. Check session expiration
- **Expected:** Sessions properly secured

### 9. Cross-Browser Testing

#### 9.1 Chrome Compatibility
- **Test Case:** Test Chrome browser
- **Steps:**
  1. Test voice recognition
  2. Test WebRTC functionality
  3. Verify UI rendering
  4. Check performance
- **Expected:** Full functionality in Chrome

#### 9.2 Firefox Compatibility
- **Test Case:** Test Firefox browser
- **Steps:**
  1. Test basic functionality
  2. Verify voice features
  3. Check UI compatibility
  4. Test performance
- **Expected:** Core functionality works

#### 9.3 Safari Compatibility
- **Test Case:** Test Safari browser
- **Steps:**
  1. Test voice recognition
  2. Verify WebRTC support
  3. Check UI rendering
  4. Test performance
- **Expected:** Compatible with Safari

#### 9.4 Mobile Browser Testing
- **Test Case:** Test mobile browsers
- **Steps:**
  1. Test on iOS Safari
  2. Test on Android Chrome
  3. Verify touch interactions
  4. Check responsive design
- **Expected:** Mobile browsers supported

### 10. Integration Testing

#### 10.1 Demo Application Integration
- **Test Case:** Test with demo app
- **Steps:**
  1. Run demo application
  2. Test voice agent integration
  3. Verify tool calls work
  4. Check navigation functionality
- **Expected:** Seamless integration

#### 10.2 Admin Platform Integration
- **Test Case:** Test admin platform
- **Steps:**
  1. Configure voice agent in admin
  2. Test voice agent in admin
  3. Verify configuration persistence
  4. Check analytics integration
- **Expected:** Admin platform works correctly

#### 10.3 Third-party Integration
- **Test Case:** Test external integrations
- **Steps:**
  1. Test with external APIs
  2. Verify data flow
  3. Check error handling
  4. Test rate limiting
- **Expected:** External integrations work

## Test Data Requirements

### Sample App Configurations
```typescript
// E-commerce app configuration
const ecommerceConfig = {
  appId: 'ecommerce-demo',
  routes: [
    { path: '/products', description: 'Product catalog' },
    { path: '/cart', description: 'Shopping cart' },
    { path: '/checkout', description: 'Checkout process' }
  ],
  actions: [
    {
      name: 'searchProducts',
      description: 'Search for products',
      parameters: { query: 'string', category: 'string' }
    }
  ]
};
```

### Sample Voice Commands
- "Go to products page"
- "Search for laptops"
- "Add item to cart"
- "What pages can I visit?"
- "Navigate to user profile"
- "Create new user account"

### Sample Tool Definitions
```typescript
// Product search tool
const searchProductsTool = {
  name: 'searchProducts',
  description: 'Search for products with filters',
  parameters: {
    query: { type: 'string', description: 'Search query' },
    category: { type: 'string', description: 'Product category', optional: true },
    priceRange: { type: 'object', description: 'Price range filter', optional: true }
  },
  handler: async ({ query, category, priceRange }) => {
    // Implementation
  }
};
```

## Expected Test Results

### Success Criteria
- Library installs and integrates correctly
- ToolManager system works as expected
- Router integration detects routes automatically
- Voice agent recognizes and responds to commands
- Convex backend provides real-time updates
- API integrations work reliably
- Performance meets benchmarks
- Security measures are effective
- Cross-browser compatibility maintained
- Integration with demo and admin works

### Performance Benchmarks
- Library bundle size < 500KB
- Voice command response < 3 seconds
- Tool execution < 1 second
- Page navigation < 500ms
- Real-time updates < 1 second

## Troubleshooting

### Common Issues
1. **Voice Recognition Not Working**
   - Check microphone permissions
   - Verify browser compatibility
   - Test in Chrome browser

2. **Tool Registration Errors**
   - Verify tool definitions
   - Check parameter types
   - Validate handler functions

3. **Router Integration Issues**
   - Verify router adapter configuration
   - Check route definitions
   - Test parameter extraction

4. **Convex Connection Problems**
   - Verify backend is running
   - Check environment variables
   - Test network connectivity

### Debug Steps
1. Check browser console for errors
2. Verify network requests in DevTools
3. Test with different browsers
4. Check Convex dashboard
5. Verify environment configuration
6. Test with minimal configuration
7. Check API key validity
8. Verify microphone permissions

## Test Execution Notes

- Use Chrome browser for best voice agent compatibility
- Ensure microphone permissions are granted
- Test both desktop and mobile interfaces
- Verify all tool registrations work correctly
- Test error scenarios and edge cases
- Validate data persistence across sessions
- Check performance under load
- Verify security measures are effective
