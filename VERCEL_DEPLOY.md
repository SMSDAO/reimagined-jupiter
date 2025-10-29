# Deploying to Vercel

This is a monorepo with two components:
1. **Backend CLI** (root `/src`) - TypeScript trading bot
2. **Frontend Web App** (`/webapp`) - Next.js application

## Deploy the Web App to Vercel

### Method 1: Vercel Dashboard (Recommended)

1. Go to https://vercel.com/new
2. Import your GitHub repository: `SMSDAO/reimagined-jupiter`
3. **IMPORTANT**: Configure the following settings:
   - **Root Directory**: Select `webapp` (click "Edit" next to Root Directory)
   - **Framework Preset**: Next.js (auto-detected)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)
4. Add Environment Variables:
   - `NEXT_PUBLIC_RPC_URL` = `https://api.mainnet-beta.solana.com` (or your QuickNode URL)
5. Click "Deploy"

### Method 2: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to webapp directory
cd webapp

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### Method 3: Deploy Button

Click the button below to deploy:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/SMSDAO/reimagined-jupiter&root-directory=webapp&env=NEXT_PUBLIC_RPC_URL&envDescription=Solana%20RPC%20endpoint%20URL&envLink=https://www.quicknode.com)

## Troubleshooting

### Issue: 404 NOT_FOUND Error After Deployment

**Symptoms**: Deployment succeeds but the site shows "404: NOT_FOUND" error.

**Causes and Solutions**:

1. **Root Directory not set correctly**:
   - Go to Project Settings → General → Root Directory
   - Set it to `webapp`
   - Redeploy

2. **Missing Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add `NEXT_PUBLIC_RPC_URL` with value: `https://api.mainnet-beta.solana.com`
   - Redeploy

3. **Build Command Issues**:
   - Ensure Build Command is: `npm run build`
   - Ensure Install Command is: `npm install`
   - Output Directory should be: `.next`

4. **Framework Detection**:
   - Ensure Framework Preset is set to "Next.js"
   - If not detected, manually select it in project settings

**After making any changes, always redeploy**:
- Go to Deployments tab
- Click "..." on latest deployment
- Click "Redeploy"

### Issue: "Can't see webapp, only src directory"

**Solution**: You must set the **Root Directory** to `webapp` in Vercel's project settings:

1. In your Vercel project, go to **Settings** → **General**
2. Find **Root Directory** section
3. Click **Edit**
4. Enter: `webapp`
5. Click **Save**
6. Redeploy

### Issue: "Build fails with 'Cannot find module'"

**Solution**: Ensure you're building from the webapp directory. The root directory setting must be `webapp`.

### Issue: "Environment variables not working"

**Solution**: Add `NEXT_PUBLIC_RPC_URL` in Vercel dashboard under Settings → Environment Variables.

## What Gets Deployed

When you deploy with root directory set to `webapp`, Vercel will:
- ✅ Deploy only the Next.js web application
- ✅ Build using `webapp/package.json`
- ✅ Serve from `webapp/.next`
- ❌ Not deploy the backend CLI (that runs separately on your server)

## Backend Deployment (Optional)

The backend CLI (`/src`) is designed to run on your own server for automated trading:

```bash
# On your server
git clone <repo>
cd reimagined-jupiter
npm install
npm run build
cp .env.example .env
# Configure .env
npm start start  # Run auto-execution
```

## Need Help?

See complete deployment guide in `VERCEL_DEPLOYMENT.md`
