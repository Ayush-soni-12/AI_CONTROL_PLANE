# Enable 2FA and Publish Your npm Package

## Current Issue

npm requires Two-Factor Authentication (2FA) to publish packages. Your account currently has 2FA disabled.

## Solution: Enable 2FA

### Method 1: Enable 2FA via Command Line (Recommended)

```bash
cd /home/ayush/code/ai-control-plane/sdk/nodejs

# Enable 2FA for authorization and publishing
npm profile enable-2fa auth-and-writes
```

This will:

1. Show you a QR code in the terminal
2. Ask you to scan it with an authenticator app (Google Authenticator, Authy, etc.)
3. Ask you to enter a verification code from your authenticator app

### Method 2: Enable 2FA via Website

1. Go to https://www.npmjs.com/settings/ayushsoni12/profile
2. Click on "Two-Factor Authentication"
3. Follow the instructions to enable 2FA
4. Use an authenticator app like Google Authenticator or Authy

## After Enabling 2FA

Once 2FA is enabled, publish your package:

```bash
npm publish --access public
```

You'll be prompted to enter your 2FA code from your authenticator app.

## Alternative: Use an Access Token (For CI/CD)

If you want to automate publishing without entering 2FA codes each time:

1. Create a granular access token:

   ```bash
   npm token create --type=granular --scope=@ayushsoni12
   ```

2. Or create it via the website:
   - Go to https://www.npmjs.com/settings/ayushsoni12/tokens
   - Click "Generate New Token"
   - Choose "Granular Access Token"
   - Set permissions for publishing
   - Enable "Bypass 2FA"

3. Use the token:
   ```bash
   npm config set //registry.npmjs.org/:_authToken YOUR_TOKEN_HERE
   npm publish --access public
   ```

## Quick Start (Recommended Path)

```bash
# 1. Enable 2FA
npm profile enable-2fa auth-and-writes

# 2. Scan QR code with authenticator app

# 3. Enter verification code when prompted

# 4. Publish package
npm publish --access public

# 5. Enter 2FA code from authenticator app when prompted
```

## Verify Your Package After Publishing

```bash
# Check if package is published
npm view @ayushsoni12/ai-control-plane-sdk

# Or visit
# https://www.npmjs.com/package/@ayushsoni12/ai-control-plane-sdk
```
