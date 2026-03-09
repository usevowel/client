# Testing Documentation

## Overview

This directory contains comprehensive testing documentation for the vowel.to platform, including test scenarios for the Admin UI, Platform components, and Demo application.

## Directory Structure

```
testing/
├── README.md                    # This file - testing overview
├── Creds.md                     # Test credentials and setup
├── Admin_UI_Test_Scenarios.md   # Admin platform test scenarios
├── Platform_Test_Scenarios.md  # Core platform test scenarios
└── Demo_Test_Scenarios.md      # Demo application test scenarios
```

## Quick Start

### 1. Environment Setup

Before running any tests, ensure the following services are running:

```bash
# Start Convex backend
bun run convex:dev

# Set up environment variables
./setup-gemini-env.sh

# Start Admin Platform (in separate terminal)
cd admin
bun run dev
# Available at http://localhost:3000

# Start Demo Application (in separate terminal)
cd demo
bun run dev
# Available at http://localhost:5173
```

### 2. Test Credentials

Use the following test credentials for all testing:

**Email:** `lilkren+vowel_test@gmail.com`  
**Password:** `TestTestTest`

See [Creds.md](./Creds.md) for detailed credential information.

### 3. Running Tests

#### Admin UI Tests
- Navigate to http://localhost:3000
- Use test credentials to sign in
- Follow scenarios in [Admin_UI_Test_Scenarios.md](./Admin_UI_Test_Scenarios.md)

#### Platform Tests
- Test the core library functionality
- Verify ToolManager system
- Test router integration
- Follow scenarios in [Platform_Test_Scenarios.md](./Platform_Test_Scenarios.md)

#### Demo Application Tests
- Navigate to http://localhost:5173
- Use test credentials or predefined test accounts
- Follow scenarios in [Demo_Test_Scenarios.md](./Demo_Test_Scenarios.md)

## Test Categories

### 1. Authentication & Authorization
- User registration and sign in
- Session management
- Role-based access control
- Protected routes

### 2. Voice Agent Functionality
- Voice recognition and response
- Tool execution
- Navigation commands
- Error handling

### 3. Core Platform Features
- ToolManager system
- Router integration
- Convex backend integration
- API key management

### 4. User Interface Testing
- Responsive design
- Accessibility features
- Cross-browser compatibility
- Error displays

### 5. Performance Testing
- Load testing
- Memory usage
- Response times
- Real-time updates

### 6. Integration Testing
- Backend connectivity
- Voice agent integration
- Third-party API integration
- Cross-component communication

## Test Data

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

## Browser Compatibility

### Recommended Browsers
- **Chrome** - Full voice agent compatibility
- **Firefox** - Core functionality
- **Safari** - Basic compatibility
- **Mobile Chrome** - Mobile testing

### Voice Agent Requirements
- Microphone permissions
- WebRTC support
- Modern browser (Chrome recommended)
- Stable internet connection

## Performance Benchmarks

### Expected Performance
- Page load times < 2 seconds
- Voice command response < 3 seconds
- Tool execution < 1 second
- Navigation speed < 500ms
- Real-time updates < 1 second
- Memory usage remains stable

### Load Testing
- Multiple concurrent users
- High-frequency voice commands
- Real-time data synchronization
- API rate limiting

## Security Testing

### Authentication Security
- Session management
- Token security
- Password validation
- Access control

### API Security
- API key protection
- Input validation
- XSS prevention
- CSRF protection

### Data Security
- Data encryption
- Secure transmission
- Access controls
- Audit logging

## Troubleshooting

### Common Issues

#### Voice Agent Not Working
1. Check microphone permissions
2. Verify Chrome browser
3. Test with simple commands
4. Check browser console for errors

#### Authentication Problems
1. Clear browser cache
2. Check session storage
3. Verify credentials
4. Test with different browsers

#### Backend Connection Issues
1. Verify Convex is running
2. Check environment variables
3. Test network connectivity
4. Check Convex dashboard

#### Performance Issues
1. Monitor browser DevTools
2. Check network requests
3. Verify API response times
4. Test with different browsers

### Debug Steps
1. Check browser console for errors
2. Verify network requests in DevTools
3. Test with different browsers
4. Check Convex dashboard for backend errors
5. Verify environment configuration
6. Test with minimal configuration
7. Check API key validity
8. Verify microphone permissions

## Test Execution Guidelines

### Pre-Test Checklist
- [ ] Convex backend running
- [ ] Environment variables configured
- [ ] Test credentials available
- [ ] Chrome browser installed
- [ ] Microphone permissions granted
- [ ] Stable internet connection

### Test Execution
1. **Start with basic functionality** - Authentication, navigation
2. **Test voice agent features** - Voice recognition, tool execution
3. **Verify integration** - Backend connectivity, real-time updates
4. **Test edge cases** - Error scenarios, invalid inputs
5. **Performance testing** - Load testing, response times
6. **Cross-browser testing** - Different browsers and devices

### Post-Test Cleanup
- Clear browser cache
- Reset test data if needed
- Document any issues found
- Update test scenarios if needed

## Test Reporting

### Test Results Template
```
Test Case: [Test Case Name]
Status: [Pass/Fail]
Browser: [Chrome/Firefox/Safari]
Date: [YYYY-MM-DD]
Notes: [Any observations or issues]
```

### Issue Reporting
When reporting issues, include:
- Test case that failed
- Steps to reproduce
- Expected vs actual behavior
- Browser and version
- Console errors
- Screenshots if applicable

## Continuous Testing

### Automated Testing
- Unit tests for core functionality
- Integration tests for API endpoints
- E2E tests for critical user flows
- Performance tests for benchmarks

### Manual Testing
- Voice agent functionality
- Cross-browser compatibility
- User experience testing
- Accessibility testing

### Test Maintenance
- Update test scenarios regularly
- Add new test cases for new features
- Remove obsolete test cases
- Update test data as needed

## Contributing

### Adding New Test Cases
1. Identify the component or feature to test
2. Create comprehensive test scenarios
3. Include setup and cleanup steps
4. Specify expected results
5. Add troubleshooting information

### Updating Test Documentation
1. Keep test scenarios current
2. Update test data as needed
3. Add new troubleshooting steps
4. Update performance benchmarks
5. Maintain consistency across documents

## Resources

### Documentation
- [Main README](../README.md) - Project overview
- [Admin README](../admin/README.md) - Admin platform details
- [Demo README](../demo/README.md) - Demo application details
- [API Reference](../docs/guides/API_REFERENCE.md) - API documentation
- [Getting Started](../docs/guides/GETTING_STARTED.md) - Setup guide

### Tools
- Chrome DevTools - Debugging and performance
- Convex Dashboard - Backend monitoring
- Browser DevTools - Network and console debugging
- Voice Agent Interface - Voice command testing

### Support
- Check troubleshooting sections in each test document
- Review common issues and solutions
- Test with minimal configuration
- Verify environment setup

---

For questions or issues with testing, please refer to the individual test scenario documents or check the troubleshooting sections.
