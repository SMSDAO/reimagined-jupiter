# GitHub Actions Workflow Documentation

## Overview

This repository includes an automated GitHub Actions workflow that synchronizes changes from the `main` branch to the `gxq` branch for Vercel deployment.

## Workflow: rename-vercel-hosts.yml

### Purpose
Automatically sync UI, design, and functionality updates from `main` to `gxq` branch and create a pull request for review.

### Trigger
The workflow triggers on every push to the `main` branch.

### What it does

1. **Branch Synchronization**
   - Checks if `gxq` branch exists
   - Creates new `gxq` branch if it doesn't exist
   - Merges latest changes from `main` to `gxq`

2. **Hostname/Metadata Replacements**
   - Applies any necessary hostname replacements for Vercel
   - Creates marker file documenting the replacements
   - Commits changes to `gxq` branch

3. **Pull Request Creation**
   - Creates or updates a PR from `gxq` to `main`
   - Includes detailed description of changes
   - Labels the PR for easy identification

### Branch Strategy

```
main (production ready code)
  ↓ (automatic sync on push)
gxq (Vercel deployment branch)
  ↓ (pull request for review)
main (merge back if needed)
```

### Vercel Deployment Configuration

When deploying to Vercel from the `gxq` branch:

1. **Root Directory**: Set to `webapp`
2. **Framework**: Next.js (auto-detected)
3. **Build Command**: `npm run build`
4. **Output Directory**: `.next`
5. **Environment Variables**:
   - `NEXT_PUBLIC_RPC_URL`: Your Solana RPC endpoint

### How to Use

1. **Make changes locally** to UI, design, or features
2. **Commit and push** to the `main` branch:
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```
3. **Workflow automatically runs** and:
   - Syncs changes to `gxq` branch
   - Creates/updates PR for review
4. **Review the PR** on GitHub
5. **Vercel auto-deploys** from `gxq` branch (if configured)

### Manual Sync (if needed)

If you need to manually sync the branches:

```bash
# Fetch latest changes
git fetch origin

# Checkout or create gxq branch
git checkout -b gxq origin/gxq || git checkout gxq

# Merge from main
git merge origin/main

# Push to remote
git push origin gxq
```

### Vercel Setup

#### Connect Repository to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import: `SMSDAO/reimagined-jupiter`
3. Select the `gxq` branch for deployment
4. Configure:
   - Root Directory: `webapp`
   - Framework: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
5. Add Environment Variable:
   - Key: `NEXT_PUBLIC_RPC_URL`
   - Value: Your Solana RPC URL (e.g., `https://api.mainnet-beta.solana.com`)
6. Click Deploy

#### Auto-Deploy on Push

Vercel will automatically redeploy when:
- Changes are pushed to the `gxq` branch
- The GitHub Actions workflow syncs changes from `main`

### Troubleshooting

#### Workflow fails
- Check GitHub Actions logs in the repository's Actions tab
- Ensure the repository has proper permissions for GitHub Actions
- Verify the workflow file syntax is correct

#### gxq branch not syncing
- Manually trigger the workflow from GitHub Actions tab
- Check for merge conflicts between main and gxq
- Verify GitHub token has write permissions

#### Vercel deployment fails
- Check Vercel deployment logs
- Ensure root directory is set to `webapp`
- Verify environment variables are configured
- Check that the build succeeds locally

### Benefits

✅ **Automated Sync**: No manual branch management needed
✅ **Safe Deployment**: Review changes via PR before production
✅ **Version Control**: Track all deployment changes
✅ **Rollback Ready**: Easy to revert via Git
✅ **CI/CD Integration**: Seamless with Vercel's auto-deploy

### Files Created by Workflow

- `.github/HOSTNAME_REPLACEMENTS.txt`: Marker file documenting replacements

### Security

The workflow uses GitHub's built-in `GITHUB_TOKEN` which:
- Has limited permissions (read/write to repository)
- Expires after the workflow completes
- Does not require manual secret configuration

### Next Steps

1. Push changes to `main` branch
2. Monitor GitHub Actions workflow execution
3. Review and merge the auto-generated PR
4. Verify deployment on Vercel

---

**For more information**: See [VERCEL_DEPLOY.md](../VERCEL_DEPLOY.md) for detailed Vercel deployment instructions.
