# 🚀 Publishing AI Control Plane SDK to npm

## Complete Step-by-Step Guide

---

## 📋 Prerequisites

### 1. Create npm Account

If you don't have an npm account:

1. Go to https://www.npmjs.com/signup
2. Create account with your email
3. Verify your email

---

## 🎯 Publishing Steps

### Step 1: Login to npm

```bash
cd /home/ayush/code/ai-control-plane/sdk/nodejs
npm login
```

**You'll be prompted for:**

- Username
- Password
- Email
- One-time password (if 2FA enabled)

---

### Step 2: Update GitHub URL (Important!)

Before publishing, update `package.json` with your actual GitHub username:

```bash
# Edit package.json
# Change: "url": "https://github.com/yourusername/ai-control-plane.git"
# To: "url": "https://github.com/YOUR_ACTUAL_USERNAME/ai-control-plane.git"
```

---

### Step 3: Test the Package Locally

```bash
# In sdk/nodejs directory
npm pack
```

This creates a `.tgz` file. Check it contains:

- ✅ index.js
- ✅ index.d.ts
- ✅ README.md
- ✅ package.json

---

### Step 4: Publish to npm!

```bash
npm publish
```

**Expected output:**

```
+ ai-control-plane-sdk@1.0.0
```

🎉 **Congratulations! Your SDK is now on npm!**

---

## 🔍 Verify Publication

### Check on npm

Visit: https://www.npmjs.com/package/ai-control-plane-sdk

You should see:

- ✅ Package name
- ✅ Version 1.0.0
- ✅ Description
- ✅ README
- ✅ Keywords

---

### Test Installation

```bash
# In a test directory
mkdir test-sdk
cd test-sdk
npm init -y
npm install ai-control-plane-sdk

# Test it works
node
```

```javascript
import ControlPlaneSDK from "ai-control-plane-sdk";
const sdk = new ControlPlaneSDK({
  serviceName: "test",
  controlPlaneUrl: "http://localhost:8000",
});
console.log("SDK loaded successfully!");
```

---

## 📝 After Publishing

### 1. Update Your README.md

Add installation instructions to your main README:

````markdown
## Installation

```bash
npm install ai-control-plane-sdk
```
````

## Quick Start

```javascript
import ControlPlaneSDK from "ai-control-plane-sdk";

const sdk = new ControlPlaneSDK({
  serviceName: "my-service",
  controlPlaneUrl: "http://localhost:8000",
});

// Use as middleware
app.use(sdk.middleware("/api/users"));
```

````

---

### 2. Add npm Badge to README

```markdown
[![npm version](https://badge.fury.io/js/ai-control-plane-sdk.svg)](https://www.npmjs.com/package/ai-control-plane-sdk)
[![npm downloads](https://img.shields.io/npm/dm/ai-control-plane-sdk.svg)](https://www.npmjs.com/package/ai-control-plane-sdk)
````

---

### 3. Share Your Package!

**On GitHub:**

- Add to your profile README
- Create a release
- Add topics: `ai`, `microservices`, `sdk`

**On Social Media:**

- Twitter/X
- LinkedIn
- Dev.to
- Reddit (r/node, r/javascript)

**Example Post:**

```
🚀 Just published my first npm package!

ai-control-plane-sdk - AI-powered SDK for autonomous microservices optimization

✨ Features:
- Dynamic caching based on performance
- Circuit breaker pattern
- Multi-tenant support
- Zero-config middleware

npm install ai-control-plane-sdk

Check it out: https://www.npmjs.com/package/ai-control-plane-sdk
```

---

## 🔄 Publishing Updates

### When you make changes:

1. **Update version in package.json:**

   ```json
   {
     "version": "1.0.1" // or 1.1.0 for features, 2.0.0 for breaking changes
   }
   ```

2. **Publish update:**
   ```bash
   npm publish
   ```

### Versioning Guide:

- **1.0.0 → 1.0.1** (Patch): Bug fixes
- **1.0.0 → 1.1.0** (Minor): New features (backward compatible)
- **1.0.0 → 2.0.0** (Major): Breaking changes

---

## 🎓 npm Commands Reference

```bash
# Login
npm login

# Check who you're logged in as
npm whoami

# Publish package
npm publish

# Unpublish (within 72 hours)
npm unpublish ai-control-plane-sdk@1.0.0

# View package info
npm view ai-control-plane-sdk

# Update package
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0
npm publish
```

---

## ⚠️ Common Issues

### Issue 1: Package name already taken

**Error:** `403 Forbidden - PUT https://registry.npmjs.org/ai-control-plane-sdk - Package name too similar to existing package`

**Solution:** Change package name in `package.json`:

```json
{
  "name": "@yourusername/ai-control-plane-sdk"
}
```

---

### Issue 2: Not logged in

**Error:** `npm ERR! code ENEEDAUTH`

**Solution:**

```bash
npm login
```

---

### Issue 3: 2FA required

**Error:** `npm ERR! code EOTP`

**Solution:** Add OTP flag:

```bash
npm publish --otp=123456
```

---

## 📊 Monitoring Your Package

### npm Stats

- **Downloads:** https://npm-stat.com/charts.html?package=ai-control-plane-sdk
- **Package page:** https://www.npmjs.com/package/ai-control-plane-sdk

### GitHub Integration

Link your npm package to GitHub:

- npm will show GitHub stars
- README syncs automatically
- Issues link to GitHub

---

## 🎯 Next Steps After Publishing

### 1. Documentation (1-2 hours)

- ✅ Update main README.md
- ✅ Add installation instructions
- ✅ Add usage examples
- ✅ Add API reference

### 2. Examples (1 hour)

- ✅ Create example projects
- ✅ Show different use cases
- ✅ Add to `/examples` folder

### 3. Testing (1-2 hours)

- ✅ Add unit tests
- ✅ Add integration tests
- ✅ Set up CI/CD

### 4. Marketing (ongoing)

- ✅ Share on social media
- ✅ Write blog post
- ✅ Submit to awesome lists
- ✅ Answer questions on Stack Overflow

---

## ✅ Publishing Checklist

Before publishing, make sure:

- [ ] `package.json` has correct information
- [ ] `README.md` is clear and helpful
- [ ] `index.js` is tested and working
- [ ] `index.d.ts` has TypeScript definitions
- [ ] GitHub repository URL is correct
- [ ] You're logged into npm
- [ ] Version number is correct
- [ ] No sensitive information in code
- [ ] License is specified (MIT)

---

## 🎉 Success!

Once published, your package will be available at:

**npm:** https://www.npmjs.com/package/ai-control-plane-sdk

**Installation:**

```bash
npm install ai-control-plane-sdk
```

**Congratulations on publishing your first npm package!** 🚀

---

## 📞 Need Help?

- npm docs: https://docs.npmjs.com/
- npm support: https://www.npmjs.com/support
- Stack Overflow: Tag `npm`

---

**Ready to publish? Let's do it!** 🚀
