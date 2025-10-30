# 🚀 Deploying This Next.js App to Vercel

## ⚠️ IMPORTANT: Set Root Directory to `webapp`

This repository is a monorepo with two parts:
- `/src` - Backend CLI (TypeScript trading bot)
- `/webapp` - Frontend Web App (Next.js) **← You are here!**

When deploying to Vercel, you must configure it to use **this directory** (`webapp`) as the root.

## Quick Deploy Steps

### Via Vercel Dashboard

1. Go to https://vercel.com/new
2. Import repository: `SMSDAO/reimagined-jupiter`
3. **Click "Edit" next to "Root Directory"**
4. Enter: `webapp`
5. Add environment variable: `NEXT_PUBLIC_RPC_URL`
6. Click "Deploy"

### Via Vercel CLI

```bash
# Make sure you're in the webapp directory
cd webapp

# Deploy
vercel --prod
```

## Troubleshooting

### "I see the 'src' folder instead of webapp files"

This means you haven't set the Root Directory correctly. 

**Solution**:
1. Go to your Vercel project settings
2. Navigate to Settings → General
3. Find "Root Directory"
4. Click "Edit"
5. Enter `webapp`
6. Save and redeploy

### "Build fails"

Make sure:
- Root Directory is set to `webapp`
- Environment variable `NEXT_PUBLIC_RPC_URL` is set
- Build command is `npm run build` (should be auto-detected)

### "404 NOT_FOUND Error After Deployment"

If deployment succeeds but you get a 404 error:

1. **Verify Root Directory**: Must be set to `webapp` (not `.` or `/`)
2. **Check Environment Variables**: Add `NEXT_PUBLIC_RPC_URL` in project settings
3. **Verify Framework**: Should be detected as "Next.js"
4. **Redeploy**: After making changes, go to Deployments → click "..." → "Redeploy"

**Quick Fix**:
```bash
# Delete and reimport the project with correct settings
# Or use Vercel CLI from webapp directory:
cd webapp
vercel --prod
```

## What This Deploys

When properly configured with `webapp` as root directory:
- ✅ Next.js web application
- ✅ All UI pages (swap, sniper, launchpad, etc.)
- ✅ Wallet integration
- ✅ Modern responsive design

## Need Help?

See the main deployment guide: `/VERCEL_DEPLOY.md` in the repository root.
