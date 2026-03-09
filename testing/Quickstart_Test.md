# Quickstart Test - Bare Minimum Platform Verification

## Overview

This test verifies the core platform functionality with the absolute minimum steps to ensure the voice agent can work end-to-end.

## Prerequisites

- Convex backend running (`bun run convex:dev`)
- Environment setup completed (`./setup-gemini-env.sh`)

## Test Flow

### Step 1: Create User Account
1. Navigate to Admin Platform: http://localhost:3000
2. Click "Sign Up"
3. Enter:
   - Email: `REDACTED_EMAIL`
   - Password: `REDACTED_PASSWORD`
4. Submit registration
5. **Expected:** User created and redirected to dashboard

### Step 2: Login to Admin
1. If not already logged in, go to http://localhost:3000/signin
2. Enter credentials:
   - Email: `REDACTED_EMAIL`
   - Password: `REDACTED_PASSWORD`
3. Click "Sign In"
4. **Expected:** Successfully logged in and redirected to dashboard

### Step 3: Get API Key
1. In admin dashboard, navigate to "API Keys" or "Settings"
2. Click "Add API Key" or "Configure API Key"
3. Enter your Google Gemini API key
4. Click "Save" or "Test Connection"
5. **Expected:** API key saved and validated

### Step 4: Configure Demo App
1. In admin dashboard, go to "Apps" section
2. Click "Create App" or select existing demo app
3. Configure basic settings:
   - App Name: "Quickstart Demo"
   - Routes: Add at least one route (e.g., `/products` - "Product catalog")
4. Save configuration
5. **Expected:** App configuration saved

### Step 5: Launch Demo App
1. Open new terminal
2. Navigate to demo directory: `cd demo`
3. Start demo app: `bun run dev`
4. Open browser to: http://localhost:5173
5. **Expected:** Demo app loads successfully

### Step 6: Test Voice Commands
1. In demo app, look for microphone button (🎤)
2. Click microphone button
3. Grant microphone permissions when prompted
4. Try these basic voice commands:
   - "Go to products"
   - "What pages can I visit?"
   - "Navigate to home"
5. **Expected:** Voice commands are recognized and executed

## Success Criteria

✅ User account created successfully  
✅ Admin login works  
✅ API key configured and validated  
✅ Demo app launches without errors  
✅ Voice agent initializes  
✅ Basic voice commands work  
✅ Navigation via voice functions  

## Troubleshooting

### If Step 1-2 Fail (User Creation/Login)
- Check if Convex backend is running: `bun run convex:dev`
- Clear browser cache and try again
- Check browser console for errors

### If Step 3 Fails (API Key)
- Verify you have a valid Google Gemini API key
- Check if environment variables are set: `./setup-gemini-env.sh`
- Ensure API key has proper permissions

### If Step 4 Fails (App Configuration)
- Verify you're logged in to admin
- Check if app creation permissions are available
- Try with minimal configuration first

### If Step 5 Fails (Demo App Launch)
- Check if demo dependencies are installed: `cd demo && bun install`
- Verify port 5173 is available
- Check terminal for error messages

### If Step 6 Fails (Voice Commands)
- Ensure you're using Chrome browser
- Check microphone permissions
- Try simple commands first: "Hello" or "Test"
- Check browser console for errors

## Quick Fixes

### Reset Everything
```bash
# Stop all services
# Kill any running processes on ports 3000, 5173

# Restart Convex
bun run convex:dev

# Restart Admin (new terminal)
cd admin && bun run dev

# Restart Demo (new terminal)  
cd demo && bun run dev
```

### Check Environment
```bash
# Verify Convex is running
curl http://localhost:3000

# Check environment variables
bun run convex:env list
```

### Test Voice Agent Manually
1. Open Chrome browser
2. Go to http://localhost:5173
3. Open browser console (F12)
4. Look for any error messages
5. Try clicking microphone button
6. Check if voice agent initializes

## Expected Timeline

- **Total Time:** 10-15 minutes
- **Step 1-2:** 2-3 minutes (User setup)
- **Step 3:** 1-2 minutes (API key)
- **Step 4:** 2-3 minutes (App config)
- **Step 5:** 1-2 minutes (Demo launch)
- **Step 6:** 3-5 minutes (Voice testing)

## What This Test Proves

This quickstart test verifies that:
1. **Authentication works** - Users can create accounts and sign in
2. **Admin platform functions** - Configuration can be saved
3. **API integration works** - Gemini API key is accepted
4. **Demo app runs** - The voice agent can be deployed
5. **Voice agent functions** - Basic voice commands work
6. **End-to-end flow works** - Complete user journey is functional

If this test passes, the platform is ready for more comprehensive testing and development.
