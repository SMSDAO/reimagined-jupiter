# Quick Start: Sync and Deploy to Vercel

This guide explains how to sync your local UI/design/feature updates to the gxq branch and deploy to Vercel.

## TL;DR

```bash
# 1. Make your changes to the webapp
cd webapp
# ... edit files ...

# 2. Commit and push to main
git add .
git commit -m "Update UI/features"
git push origin main

# 3. GitHub Actions automatically:
#    - Creates/updates gxq branch
#    - Creates PR (gxq → main)
#    - Vercel auto-deploys from gxq
```

## Detailed Workflow

### Step 1: Local Development

```bash
cd /path/to/reimagined-jupiter/webapp

# Install dependencies (first time only)
npm install

# Start development server
npm run dev

# Make your changes to:
# - app/*/page.tsx (pages)
# - components/*.tsx (components)
# - app/globals.css (styles)

# Test locally
# Open http://localhost:3000
```

### Step 2: Build and Test

```bash
# Build for production
npm run build

# If build succeeds, you're ready to deploy
```

### Step 3: Commit and Push to Main

```bash
cd ..  # back to repo root

# Stage your changes
git add .

# Commit with descriptive message
git commit -m "Add new feature: [description]"

# Push to main branch
git push origin main
```

### Step 4: Automatic Sync (GitHub Actions)

The workflow automatically:
1. ✅ Detects push to main
2. ✅ Syncs changes to gxq branch
3. ✅ Applies hostname/metadata replacements
4. ✅ Creates/updates PR (gxq → main)
5. ✅ Triggers Vercel deployment from gxq

### Step 5: Verify Deployment

1. **Check GitHub Actions**
   - Go to: https://github.com/SMSDAO/reimagined-jupiter/actions
   - Verify workflow completed successfully

2. **Review Pull Request**
   - Check the auto-generated PR
   - Review changes synced to gxq

3. **Check Vercel Deployment**
   - Go to your Vercel dashboard
   - Verify deployment is running/complete
   - Visit your deployment URL

## Matching the Reference Deployment

To ensure your local changes are properly synced for deployment.

### Current Features (All Implemented)

✅ **Pages**:
- Home (`/`) - Dashboard with feature overview
- Jupiter Swap (`/swap`) - Token swapping interface
- Sniper Bot (`/sniper`) - Token launch monitoring
- Token Launchpad (`/launchpad`) - Token creation with 3D roulette
- Airdrop Checker (`/airdrop`) - Wallet scoring and auto-claim
- Staking (`/staking`) - Liquid staking pools
- Flash Loan Arbitrage (`/arbitrage`) - Arbitrage opportunities

✅ **Design**:
- Modern Solana theme (purple, blue, green gradients)
- 3D effects and animations
- Responsive mobile/tablet/desktop
- Neon glow effects
- Framer Motion animations

✅ **Functionality**:
- Multi-wallet support (Phantom, Solflare, Backpack)
- Real-time Jupiter swap integration
- Flash loan provider integration
- Wallet scoring system (0-100)
- Auto-claim for airdrops
- 3D roulette wheel for token launches

### Verify Your Local Changes

```bash
# Check all pages exist
ls -la webapp/app/*/page.tsx

# Should show:
# - app/page.tsx
# - app/swap/page.tsx
# - app/sniper/page.tsx
# - app/launchpad/page.tsx
# - app/airdrop/page.tsx
# - app/staking/page.tsx
# - app/arbitrage/page.tsx
```

## Common Tasks

### Update a Single Page

```bash
# Example: Update the swap page
vim webapp/app/swap/page.tsx

# Test locally
cd webapp && npm run dev

# Commit and push
git add webapp/app/swap/page.tsx
git commit -m "Update swap page UI"
git push origin main
```

### Update Styling

```bash
# Edit global styles
vim webapp/app/globals.css

# Or update Tailwind config if needed
vim webapp/tailwind.config.ts

# Build and test
cd webapp && npm run build
```

### Add New Component

```bash
# Create component
vim webapp/components/NewComponent.tsx

# Use in page
vim webapp/app/some-page/page.tsx

# Test, commit, push
git add webapp/components/NewComponent.tsx webapp/app/some-page/page.tsx
git commit -m "Add new component"
git push origin main
```

## Environment Configuration

### Local Development

Create `webapp/.env.local`:
```env
NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com
```

### Vercel Production

Set in Vercel Dashboard → Settings → Environment Variables:
- Key: `NEXT_PUBLIC_RPC_URL`
- Value: Your QuickNode or Solana RPC URL

## Troubleshooting

### Build fails locally

```bash
cd webapp
rm -rf .next node_modules
npm install
npm run build
```

### Workflow doesn't trigger

- Ensure you pushed to `main` branch
- Check GitHub Actions permissions in repo settings
- Manually trigger from Actions tab

### Vercel deployment fails

- Check root directory is set to `webapp`
- Verify environment variables are set
- Check Vercel deployment logs

### Changes not visible on Vercel

- Wait for deployment to complete (~2-3 minutes)
- Hard refresh browser (Ctrl+Shift+R)
- Check Vercel deployment URL matches your branch

## Best Practices

1. **Always test locally** before pushing
2. **Use descriptive commit messages**
3. **Review the auto-generated PR** before merging
4. **Monitor GitHub Actions** for workflow status
5. **Verify Vercel deployment** after push

## Support

- **GitHub Actions Logs**: Check for workflow errors
- **Vercel Logs**: Check for deployment errors
- **Local Build**: Test with `npm run build` before pushing

---

**Ready to deploy?** Just push to main and the rest is automatic! 🚀
