# Admin UI Test Scenarios

## Overview

The Admin UI is the SaaS dashboard for managing vowel.to voice agents. This document outlines comprehensive test scenarios for the admin platform.

## Prerequisites

- Convex backend running (`bun run convex:dev`)
- Admin platform running (`cd admin && bun run dev`)
- Test credentials: `REDACTED_EMAIL` / `REDACTED_PASSWORD`
- Environment variables configured

## Test Scenarios

### 1. Authentication & Authorization

#### 1.1 User Registration
- **Test Case:** New user registration
- **Steps:**
  1. Navigate to `/signup`
  2. Enter test email: `REDACTED_EMAIL`
  3. Enter password: `REDACTED_PASSWORD`
  4. Submit registration form
- **Expected:** Successful registration and redirect to dashboard

#### 1.2 User Sign In
- **Test Case:** Existing user sign in
- **Steps:**
  1. Navigate to `/signin`
  2. Enter credentials: `REDACTED_EMAIL` / `REDACTED_PASSWORD`
  3. Click sign in
- **Expected:** Successful authentication and redirect to dashboard

#### 1.3 Session Management
- **Test Case:** Session persistence
- **Steps:**
  1. Sign in successfully
  2. Close browser tab
  3. Reopen browser and navigate to admin URL
- **Expected:** User remains signed in (session persisted)

#### 1.4 Protected Routes
- **Test Case:** Access control
- **Steps:**
  1. Sign out
  2. Try to access `/dashboard` directly
- **Expected:** Redirect to sign in page

### 2. Organization Management

#### 2.1 Create Organization
- **Test Case:** Create new organization
- **Steps:**
  1. Sign in to admin
  2. Navigate to organizations section
  3. Click "Create Organization"
  4. Enter organization name: "Test Organization"
  5. Submit form
- **Expected:** Organization created successfully

#### 2.2 Organization Settings
- **Test Case:** Update organization settings
- **Steps:**
  1. Select existing organization
  2. Navigate to settings
  3. Update organization name
  4. Save changes
- **Expected:** Settings updated successfully

#### 2.3 Team Member Management
- **Test Case:** Invite team members
- **Steps:**
  1. Go to organization settings
  2. Navigate to team section
  3. Click "Invite Member"
  4. Enter email address
  5. Select role (Admin/User)
  6. Send invitation
- **Expected:** Invitation sent successfully

### 3. Voice Agent Configuration

#### 3.1 Create Voice Agent App
- **Test Case:** Create new voice agent application
- **Steps:**
  1. Navigate to "Apps" section
  2. Click "Create App"
  3. Enter app name: "Test Voice App"
  4. Configure basic settings
  5. Save app
- **Expected:** App created with default configuration

#### 3.2 Configure Routes
- **Test Case:** Define app routes
- **Steps:**
  1. Select created app
  2. Navigate to "Routes" tab
  3. Add route: `/dashboard` - "Main dashboard page"
  4. Add route: `/users/:id` - "User profile page"
  5. Add route: `/search` - "Search page with filters"
  6. Save configuration
- **Expected:** Routes saved and available for voice navigation

#### 3.3 Configure Custom Actions
- **Test Case:** Define custom business logic actions
- **Steps:**
  1. Navigate to "Actions" tab
  2. Add action: `createUser`
  3. Define parameters: `name` (string), `email` (string)
  4. Add action: `searchProducts`
  5. Define parameters: `query` (string), `category` (string, optional)
  6. Save actions
- **Expected:** Custom actions available for voice commands

#### 3.4 System Instructions
- **Test Case:** Configure AI behavior
- **Steps:**
  1. Navigate to "Settings" tab
  2. Enter system instructions: "You are a helpful e-commerce assistant..."
  3. Configure voice settings (voice type, speed)
  4. Save settings
- **Expected:** Instructions applied to voice agent

### 4. API Key Management

#### 4.1 Add Google API Key
- **Test Case:** Configure Gemini API key
- **Steps:**
  1. Navigate to "API Keys" section
  2. Click "Add API Key"
  3. Select provider: "Google Gemini"
  4. Enter API key
  5. Test connection
  6. Save key
- **Expected:** API key validated and saved

#### 4.2 API Key Validation
- **Test Case:** Verify API key functionality
- **Steps:**
  1. Use configured API key
  2. Test voice agent functionality
  3. Check for errors in logs
- **Expected:** Voice agent works with valid API key

#### 4.3 API Key Rotation
- **Test Case:** Update API key
- **Steps:**
  1. Navigate to API keys
  2. Select existing key
  3. Click "Update"
  4. Enter new API key
  5. Save changes
- **Expected:** New key replaces old key

### 5. Voice Agent Testing

#### 5.1 Live Voice Testing
- **Test Case:** Test voice agent in dashboard
- **Steps:**
  1. Navigate to app configuration
  2. Click "Test Voice Agent"
  3. Click microphone button
  4. Say: "Go to dashboard"
- **Expected:** Voice command recognized and processed

#### 5.2 Tool Call Debugging
- **Test Case:** Debug tool calls
- **Steps:**
  1. Open voice agent test interface
  2. Make voice command
  3. Check tool call logs
  4. Verify parameters passed correctly
- **Expected:** Tool calls logged with correct parameters

#### 5.3 Error Handling
- **Test Case:** Test error scenarios
- **Steps:**
  1. Make invalid voice command
  2. Test with invalid API key
  3. Test with network issues
- **Expected:** Appropriate error messages displayed

### 6. Analytics & Monitoring

#### 6.1 Usage Analytics
- **Test Case:** View usage statistics
- **Steps:**
  1. Navigate to "Analytics" section
  2. Select date range
  3. View usage metrics
  4. Check voice command frequency
- **Expected:** Analytics data displayed correctly

#### 6.2 Performance Monitoring
- **Test Case:** Monitor system performance
- **Steps:**
  1. Check response times
  2. Monitor error rates
  3. View system health metrics
- **Expected:** Performance data available

#### 6.3 Log Management
- **Test Case:** View application logs
- **Steps:**
  1. Navigate to "Logs" section
  2. Filter by date/time
  3. Search for specific events
  4. Export logs if needed
- **Expected:** Logs accessible and searchable

### 7. User Interface Testing

#### 7.1 Responsive Design
- **Test Case:** Test mobile responsiveness
- **Steps:**
  1. Open admin in mobile browser
  2. Test navigation menu
  3. Test form inputs
  4. Test voice agent interface
- **Expected:** UI adapts to mobile screen

#### 7.2 Accessibility
- **Test Case:** Test accessibility features
- **Steps:**
  1. Use keyboard navigation
  2. Test screen reader compatibility
  3. Check color contrast
  4. Test focus management
- **Expected:** Accessible interface

#### 7.3 Dark Mode
- **Test Case:** Test dark mode toggle
- **Steps:**
  1. Toggle dark mode
  2. Verify all components adapt
  3. Test voice agent in dark mode
- **Expected:** Dark mode works consistently

### 8. Integration Testing

#### 8.1 Convex Backend Integration
- **Test Case:** Test backend connectivity
- **Steps:**
  1. Verify real-time updates
  2. Test data synchronization
  3. Check offline/online handling
- **Expected:** Seamless backend integration

#### 8.2 Voice Agent Integration
- **Test Case:** Test voice agent with configured app
- **Steps:**
  1. Configure voice agent
  2. Test in demo application
  3. Verify tool calls work
  4. Check navigation functionality
- **Expected:** Voice agent works in target app

## Test Data Requirements

### Sample Organizations
- "Test Organization" - Main test org
- "Demo Company" - Demo purposes
- "Development Org" - Development testing

### Sample Apps
- "E-commerce Demo" - Full e-commerce app
- "Admin Dashboard" - Admin interface
- "Customer Support" - Support chatbot

### Sample Routes
- `/dashboard` - Main dashboard
- `/users` - User management
- `/users/:id` - User profile
- `/products` - Product catalog
- `/search` - Search page
- `/cart` - Shopping cart
- `/admin` - Admin panel

### Sample Actions
- `createUser` - Create user account
- `searchProducts` - Search products
- `addToCart` - Add item to cart
- `updateProfile` - Update user profile
- `sendMessage` - Send support message

## Expected Test Results

### Success Criteria
- All authentication flows work correctly
- Organization management functions properly
- Voice agent configuration saves and applies
- API key management works securely
- Voice testing provides real-time feedback
- Analytics display accurate data
- UI is responsive and accessible
- Integration with backend is seamless

### Performance Benchmarks
- Page load times < 2 seconds
- Voice command response < 3 seconds
- Real-time updates < 1 second
- API key validation < 5 seconds

## Troubleshooting

### Common Issues
1. **Convex Connection Errors**
   - Verify `bun run convex:dev` is running
   - Check environment variables

2. **Voice Agent Not Working**
   - Verify API key is valid
   - Check microphone permissions
   - Test in Chrome browser

3. **Authentication Issues**
   - Clear browser cache
   - Check session storage
   - Verify credentials

### Debug Steps
1. Check browser console for errors
2. Verify network requests in DevTools
3. Check Convex dashboard for backend errors
4. Test with different browsers
5. Verify environment configuration

## Test Execution Notes

- Run tests in Chrome browser for best voice agent compatibility
- Ensure microphone permissions are granted
- Test both desktop and mobile interfaces
- Verify all CRUD operations work correctly
- Test error scenarios and edge cases
- Validate data persistence across sessions
