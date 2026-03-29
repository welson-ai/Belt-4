# GitHub Secrets Setup Required

To complete the CI/CD pipeline setup, you need to add:

## 🔐 Required Secrets

Go to: **GitHub Repository → Settings → Secrets and variables → Actions**

### 1. VERCEL_TOKEN
- **Description**: Vercel deployment token
- **How to get**: 
  1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
  2. Account Settings → Tokens → Create New Token
  3. Copy token and paste here

### 2. VERCEL_ORG_ID  
- **Description**: Vercel organization ID
- **How to get**:
  1. Go to Vercel Dashboard
  2. Settings → General → Organization ID
  3. Copy and paste here

### 3. VERCEL_PROJECT_ID
- **Description**: Vercel project ID  
- **How to get**:
  1. Go to your Vercel project
  2. Settings → General → Project ID
  3. Copy and paste here

## 🚀 Required Variables (NOT Secrets)

Go to: **GitHub Repository → Settings → Secrets and variables → Actions → Variables**

### 4. VERCEL_ENABLED
- **Type**: Variable (not Secret)
- **Name**: VERCEL_ENABLED
- **Value**: true
- **Description**: Enable Vercel deployment

## 🎯 Why This Approach?

**GitHub Actions Security**: Secrets cannot be used in `if:` conditions for security reasons. Instead, we use:
- **Variables** for feature flags (VERCEL_ENABLED)
- **Secrets** for sensitive data (VERCEL_TOKEN, etc.)

## 📋 Setup Steps

1. **Add 3 Secrets** (above) in Actions → Secrets
2. **Add 1 Variable** (VERCEL_ENABLED) in Actions → Variables  
3. Save and test with a new commit

## 🔒 Security Notes

- **Secrets** are encrypted and only available to Actions
- **Variables** are visible but not sensitive
- **VERCEL_ENABLED** acts as a feature flag
- Rotate tokens regularly for security

## ✅ After Setup

Once configured, pipeline will:
- ✅ Check VERCEL_ENABLED variable before deploying
- ✅ Use secrets only within job steps (not conditions)
- ✅ Deploy to Vercel when enabled
- ✅ Skip gracefully when disabled

**Ready for production CI/CD!** 🎯
