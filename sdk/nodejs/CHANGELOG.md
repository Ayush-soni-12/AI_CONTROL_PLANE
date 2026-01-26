# Changelog

All notable changes to the AI Control Plane SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-01-26

### 🔐 Breaking Changes

- **API Key Authentication Required**: All SDK operations now require a valid API key
  - API keys must be obtained from the Control Plane dashboard
  - API key is passed via the `apiKey` configuration parameter
  - All requests include `Authorization: Bearer <api_key>` header

### ✨ Added

- **Secure Authentication**: API key-based authentication for all Control Plane communications
- **User Association**: All signals are now associated with the user who owns the API key
- **API Key Validation**: Server-side validation of API keys with helpful error messages
- **Last Used Tracking**: API key usage timestamps are automatically updated
- **Warning Messages**: Console warnings when SDK is initialized without an API key
- **Graceful Error Handling**: Authentication failures don't crash your service

### 📝 Changed

- **Constructor Signature**: Added `apiKey` parameter (required)

  ```javascript
  // Before (v1.x)
  new ControlPlaneSDK({ serviceName: "my-service" });

  // After (v2.x)
  new ControlPlaneSDK({
    apiKey: "your-api-key",
    serviceName: "my-service",
  });
  ```

- **Track Method**: Automatically includes API key in Authorization header
- **GetConfig Method**: Automatically includes API key in Authorization header

### 📚 Documentation

- Added comprehensive API Authentication section to README
- Added environment variable best practices
- Added error handling examples
- Updated all code examples to include API key
- Added security best practices section

### 🔒 Security

- All signals are now authenticated and associated with users
- API keys can be rotated from the dashboard
- API keys can be deactivated without deletion
- Last used timestamp helps identify unused keys

### Migration Guide

#### For Existing Users (v1.x → v2.0)

1. **Generate an API Key**:
   - Login to your Control Plane dashboard
   - Navigate to API Keys page
   - Click "Generate New Key"
   - Copy the generated key

2. **Update Your Code**:

   ```javascript
   // Add apiKey to your SDK initialization
   const controlPlane = new ControlPlaneSDK({
     apiKey: process.env.CONTROL_PLANE_API_KEY, // ← Add this
     serviceName: "my-service",
     controlPlaneUrl: "http://localhost:8000",
   });
   ```

3. **Set Environment Variable**:

   ```bash
   # .env file
   CONTROL_PLANE_API_KEY=your-api-key-here
   ```

4. **Install dotenv** (if not already installed):

   ```bash
   npm install dotenv
   ```

5. **Load Environment Variables**:
   ```javascript
   import dotenv from "dotenv";
   dotenv.config();
   ```

That's it! Your existing code will work with just these changes.

---

## [1.0.1] - 2026-01-XX

### Fixed

- Minor bug fixes and improvements

## [1.0.0] - 2026-01-XX

### Added

- Initial release
- Performance tracking (latency, success/error rates)
- Runtime configuration retrieval
- Express middleware for automatic tracking
- Manual tracking API
- Tenant ID generation
- Configuration caching

---

## Upgrade Notes

### v1.x to v2.0

**Breaking Change**: API key authentication is now required.

**Impact**: All existing SDK instances will log warnings and fail to send signals without an API key.

**Action Required**:

1. Generate API key from dashboard
2. Add `apiKey` parameter to SDK initialization
3. Store API key in environment variables

**Timeline**: Update at your convenience. The SDK will continue to work but signals won't be tracked without an API key.

---

## Support

For questions or issues with upgrading, please:

- Check the [README](README.md) for detailed documentation
- Visit the [GitHub repository](https://github.com/Ayush-soni-12/AI_CONTROL_PLANE)
- Open an issue on GitHub
