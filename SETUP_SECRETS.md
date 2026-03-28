# GitHub Secrets Setup Required

To complete the CI/CD pipeline setup, you need to add these repository secrets:

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
  3. Copy the ID

### 3. VERCEL_PROJECT_ID
- **Description**: Vercel project ID  
- **How to get**:
  1. Go to your Vercel project
  2. Settings → General → Project ID
  3. Copy the ID

## 🚀 What Happens Without Secrets?

- **Security job**: ✅ Still runs (Rust install fixed)
- **Contract deployment**: ✅ Still works (uses cargo install stellar-cli)
- **Vercel deployment**: ⏭️ Skipped gracefully (no crash)
- **All other jobs**: ✅ Work normally

## 📋 Setup Steps

1. Navigate to repository secrets
2. Click "New repository secret" for each secret
3. Add the three secrets above
4. Save and test with a new commit

## 🔒 Security Notes

- These secrets are **encrypted** by GitHub
- Only available to Actions workflows
- Never exposed in logs or outputs
- Rotate tokens regularly for security

## ✅ After Setup

Once secrets are configured, the pipeline will:
- ✅ Run all tests and builds
- ✅ Deploy contracts to testnet on PRs
- ✅ Deploy frontend to Vercel on main branch pushes
- ✅ Run security scans
- ✅ Check code quality

**Ready for production CI/CD!** 🎯
