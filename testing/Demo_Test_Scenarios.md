# Demo Application Test Scenarios

## Overview

The Demo application is a full-featured e-commerce app showcasing the new Vowel voice agent architecture with ToolManager and simplified provider pattern. This document outlines comprehensive test scenarios for the demo application.

## Prerequisites

- Convex backend running (`bun run convex:dev`)
- Environment setup completed (`./setup-gemini-env.sh`)
- Demo application running (`cd demo && bun run dev`)
- Test credentials: `lilkren+vowel_test@gmail.com` / `TestTestTest`
- Chrome browser for best voice agent compatibility

## Test Scenarios

### 1. Authentication & User Management

#### 1.1 User Registration
- **Test Case:** New user registration
- **Steps:**
  1. Navigate to `/signup`
  2. Enter email: `lilkren+vowel_test@gmail.com`
  3. Enter password: `TestTestTest`
  4. Submit registration form
- **Expected:** Successful registration and redirect to dashboard

#### 1.2 User Sign In
- **Test Case:** Existing user sign in
- **Steps:**
  1. Navigate to `/signin`
  2. Enter credentials: `lilkren+vowel_test@gmail.com` / `TestTestTest`
  3. Click sign in
- **Expected:** Successful authentication and redirect to home

#### 1.3 Test User Accounts
- **Test Case:** Use predefined test accounts
- **Steps:**
  1. Sign in with `john@example.com` (Admin)
  2. Sign in with `jane@example.com` (User)
  3. Sign in with `bob@example.com` (User)
- **Expected:** All test accounts work with any password

#### 1.4 Role-Based Access
- **Test Case:** Test admin vs user permissions
- **Steps:**
  1. Sign in as regular user
  2. Try to access `/admin` routes
  3. Sign in as admin
  4. Verify admin access
- **Expected:** Role-based access control works

### 2. Voice Agent Integration

#### 2.1 Voice Agent Initialization
- **Test Case:** Voice agent loads correctly
- **Steps:**
  1. Navigate to any page
  2. Look for microphone button
  3. Click microphone button
  4. Verify voice agent interface appears
- **Expected:** Voice agent initializes without errors

#### 2.2 Microphone Permissions
- **Test Case:** Test microphone access
- **Steps:**
  1. Click microphone button
  2. Grant microphone permissions
  3. Test voice input
  4. Verify permissions persist
- **Expected:** Microphone permissions work correctly

#### 2.3 Voice Recognition
- **Test Case:** Test voice command recognition
- **Steps:**
  1. Click microphone button
  2. Say: "Go to products"
  3. Verify command recognition
  4. Test with different accents
- **Expected:** Voice commands recognized accurately

### 3. Navigation & Routing

#### 3.1 Basic Navigation
- **Test Case:** Test voice-controlled navigation
- **Steps:**
  1. Start on home page
  2. Say: "Go to products"
  3. Verify navigation to products page
  4. Say: "Go back to home"
- **Expected:** Navigation works via voice commands

#### 3.2 Route Listing
- **Test Case:** Test list routes functionality
- **Steps:**
  1. Click microphone button
  2. Say: "What pages can I visit?"
  3. Verify AI lists available routes
  4. Test navigation to listed routes
- **Expected:** AI provides accurate route information

#### 3.3 Parameterized Routes
- **Test Case:** Test routes with parameters
- **Steps:**
  1. Say: "Go to product 1"
  2. Verify navigation to `/product/1`
  3. Say: "Go to user 123"
  4. Verify navigation to `/users/123`
- **Expected:** Parameterized routes work correctly

#### 3.4 Query Parameters
- **Test Case:** Test routes with query parameters
- **Steps:**
  1. Say: "Search for laptops"
  2. Verify navigation to `/search?q=laptops`
  3. Say: "Search for electronics under 500"
  4. Verify query parameters set correctly
- **Expected:** Query parameters handled properly

### 4. Product Management

#### 4.1 Product Browsing
- **Test Case:** Browse product catalog
- **Steps:**
  1. Navigate to products page
  2. Verify product list displays
  3. Test product filtering
  4. Check product details
- **Expected:** Product catalog works correctly

#### 4.2 Voice Product Search
- **Test Case:** Search products via voice
- **Steps:**
  1. Say: "Search for laptops"
  2. Verify search results
  3. Say: "Find electronics under 500"
  4. Verify filtered results
- **Expected:** Voice search works accurately

#### 4.3 Product Categories
- **Test Case:** Test category filtering
- **Steps:**
  1. Say: "Show me electronics"
  2. Verify electronics category
  3. Say: "Show me clothing"
  4. Verify clothing category
- **Expected:** Category filtering works

#### 4.4 Product Details
- **Test Case:** View product details
- **Steps:**
  1. Click on a product
  2. Verify product details page
  3. Test voice navigation to product
  4. Say: "Go to product 1"
- **Expected:** Product details display correctly

### 5. Shopping Cart

#### 5.1 Add to Cart
- **Test Case:** Add items to cart
- **Steps:**
  1. Navigate to products page
  2. Say: "Add product 1 to cart"
  3. Verify item added to cart
  4. Test adding multiple items
- **Expected:** Items added to cart successfully

#### 5.2 View Cart
- **Test Case:** View shopping cart
- **Steps:**
  1. Say: "Show me my cart"
  2. Verify cart page displays
  3. Check cart contents
  4. Verify item quantities
- **Expected:** Cart displays correctly

#### 5.3 Update Cart
- **Test Case:** Modify cart contents
- **Steps:**
  1. Add items to cart
  2. Say: "Remove product 1 from cart"
  3. Verify item removed
  4. Say: "Update quantity to 3"
- **Expected:** Cart updates work correctly

#### 5.4 Clear Cart
- **Test Case:** Clear entire cart
- **Steps:**
  1. Add multiple items to cart
  2. Say: "Clear my cart"
  3. Verify cart is empty
  4. Test adding items after clear
- **Expected:** Cart clears successfully

### 6. Admin Panel (Admin Users Only)

#### 6.1 Admin Access
- **Test Case:** Access admin panel
- **Steps:**
  1. Sign in as admin user
  2. Say: "Go to dashboard"
  3. Verify admin dashboard
  4. Test admin navigation
- **Expected:** Admin panel accessible

#### 6.2 Product Management
- **Test Case:** Manage products in admin
- **Steps:**
  1. Navigate to admin products
  2. Say: "Create new product"
  3. Test product editing
  4. Say: "Delete product 1"
- **Expected:** Product management works

#### 6.3 User Management
- **Test Case:** Manage users in admin
- **Steps:**
  1. Navigate to admin users
  2. View user list
  3. Test user details
  4. Say: "Show user 123"
- **Expected:** User management works

#### 6.4 Cart Management
- **Test Case:** Monitor carts in admin
- **Steps:**
  1. Navigate to admin carts
  2. View cart analytics
  3. Test cart monitoring
  4. Say: "Show cart analytics"
- **Expected:** Cart management works

### 7. ToolManager System

#### 7.1 Built-in Tools
- **Test Case:** Test built-in navigation tools
- **Steps:**
  1. Test `navigate` tool
  2. Test `getCurrentPageContext` tool
  3. Test `listRoutes` tool
  4. Verify tool responses
- **Expected:** Built-in tools work correctly

#### 7.2 Custom Tools
- **Test Case:** Test custom business logic tools
- **Steps:**
  1. Test `searchProducts` tool
  2. Test `addToCart` tool
  3. Test `createUser` tool
  4. Verify tool execution
- **Expected:** Custom tools work correctly

#### 7.3 Tool Error Handling
- **Test Case:** Test tool error scenarios
- **Steps:**
  1. Test invalid tool calls
  2. Test missing parameters
  3. Test tool failures
  4. Verify error messages
- **Expected:** Appropriate error handling

### 8. State Management

#### 8.1 Cart State
- **Test Case:** Test cart state persistence
- **Steps:**
  1. Add items to cart
  2. Navigate to different pages
  3. Return to cart
  4. Verify cart state persisted
- **Expected:** Cart state persists across navigation

#### 8.2 User State
- **Test Case:** Test user state management
- **Steps:**
  1. Sign in as user
  2. Navigate between pages
  3. Refresh page
  4. Verify user state persisted
- **Expected:** User state persists correctly

#### 8.3 Real-time Updates
- **Test Case:** Test real-time state updates
- **Steps:**
  1. Open demo in multiple tabs
  2. Add item to cart in one tab
  3. Verify cart updates in other tab
  4. Test concurrent modifications
- **Expected:** Real-time updates work

### 9. UI/UX Testing

#### 9.1 Responsive Design
- **Test Case:** Test mobile responsiveness
- **Steps:**
  1. Open demo in mobile browser
  2. Test navigation menu
  3. Test voice agent interface
  4. Test form inputs
- **Expected:** UI adapts to mobile screen

#### 9.2 Voice Agent UI
- **Test Case:** Test voice agent interface
- **Steps:**
  1. Click microphone button
  2. Test voice input display
  3. Test response display
  4. Test loading states
- **Expected:** Voice agent UI works correctly

#### 9.3 Error Handling
- **Test Case:** Test error displays
- **Steps:**
  1. Test network errors
  2. Test invalid commands
  3. Test authentication errors
  4. Verify error messages
- **Expected:** Errors displayed appropriately

### 10. Performance Testing

#### 10.1 Page Load Performance
- **Test Case:** Test page load times
- **Steps:**
  1. Measure initial page load
  2. Test navigation speed
  3. Test voice agent initialization
  4. Monitor performance metrics
- **Expected:** Pages load quickly

#### 10.2 Voice Response Performance
- **Test Case:** Test voice command response time
- **Steps:**
  1. Make voice command
  2. Measure response time
  3. Test complex commands
  4. Monitor performance
- **Expected:** Voice responses are fast

#### 10.3 Memory Usage
- **Test Case:** Test memory consumption
- **Steps:**
  1. Monitor memory usage
  2. Test long-running sessions
  3. Check for memory leaks
  4. Verify cleanup
- **Expected:** Memory usage remains stable

### 11. Integration Testing

#### 11.1 Convex Backend Integration
- **Test Case:** Test backend connectivity
- **Steps:**
  1. Verify real-time updates
  2. Test data synchronization
  3. Check offline/online handling
  4. Test backend errors
- **Expected:** Backend integration works

#### 11.2 Voice Agent Integration
- **Test Case:** Test voice agent with demo
- **Steps:**
  1. Test voice commands
  2. Verify tool calls
  3. Check navigation
  4. Test error handling
- **Expected:** Voice agent works seamlessly

#### 11.3 Admin Platform Integration
- **Test Case:** Test admin platform connection
- **Steps:**
  1. Configure voice agent in admin
  2. Test configuration persistence
  3. Verify analytics integration
  4. Test settings updates
- **Expected:** Admin integration works

### 12. Cross-Browser Testing

#### 12.1 Chrome Testing
- **Test Case:** Test Chrome browser
- **Steps:**
  1. Test voice recognition
  2. Test WebRTC functionality
  3. Verify UI rendering
  4. Check performance
- **Expected:** Full functionality in Chrome

#### 12.2 Firefox Testing
- **Test Case:** Test Firefox browser
- **Steps:**
  1. Test basic functionality
  2. Verify voice features
  3. Check UI compatibility
  4. Test performance
- **Expected:** Core functionality works

#### 12.3 Safari Testing
- **Test Case:** Test Safari browser
- **Steps:**
  1. Test voice recognition
  2. Verify WebRTC support
  3. Check UI rendering
  4. Test performance
- **Expected:** Compatible with Safari

## Test Data Requirements

### Sample Products
```json
{
  "id": 1,
  "name": "MacBook Pro",
  "category": "electronics",
  "price": 1999.99,
  "description": "Apple MacBook Pro with M2 chip"
},
{
  "id": 2,
  "name": "Wireless Headphones",
  "category": "electronics",
  "price": 199.99,
  "description": "Noise-cancelling wireless headphones"
}
```

### Sample Users
```json
{
  "id": 1,
  "email": "john@example.com",
  "role": "admin",
  "name": "John Admin"
},
{
  "id": 2,
  "email": "jane@example.com",
  "role": "user",
  "name": "Jane User"
}
```

### Sample Voice Commands
- "Go to products"
- "Search for laptops"
- "Add product 1 to cart"
- "Show me my cart"
- "What pages can I visit?"
- "Go to dashboard"
- "Create new user"
- "Find electronics under 500"

## Expected Test Results

### Success Criteria
- Authentication flows work correctly
- Voice agent recognizes and responds to commands
- Navigation works via voice and UI
- Product browsing and search function properly
- Shopping cart operations work correctly
- Admin panel accessible and functional
- ToolManager system works as expected
- State management persists correctly
- UI is responsive and accessible
- Performance meets benchmarks
- Cross-browser compatibility maintained
- Integration with backend works seamlessly

### Performance Benchmarks
- Page load times < 2 seconds
- Voice command response < 3 seconds
- Navigation speed < 500ms
- Real-time updates < 1 second
- Memory usage remains stable

## Troubleshooting

### Common Issues
1. **Voice Agent Not Working**
   - Check microphone permissions
   - Verify Chrome browser
   - Test with simple commands

2. **Navigation Issues**
   - Check route definitions
   - Verify router configuration
   - Test with voice commands

3. **Cart Not Updating**
   - Check state management
   - Verify real-time updates
   - Test with multiple tabs

4. **Authentication Problems**
   - Clear browser cache
   - Check session storage
   - Verify credentials

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
- Verify all voice commands work correctly
- Test error scenarios and edge cases
- Validate data persistence across sessions
- Check performance under load
- Verify cross-browser compatibility
- Test admin functionality with admin users
- Validate ToolManager system functionality
