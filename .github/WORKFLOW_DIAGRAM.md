# Automated Sync Workflow Diagram

## Visual Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DEVELOPER WORKFLOW                           │
└─────────────────────────────────────────────────────────────────────┘

  Developer makes changes locally
           │
           ▼
  ┌──────────────────┐
  │  Local Changes   │
  │  - UI updates    │
  │  - Features      │
  │  - Design        │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │   Test Locally   │
  │  npm run build   │
  │  npm run dev     │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  Commit & Push   │
  │  git push origin │
  │      main        │
  └────────┬─────────┘
           │
           │
┌──────────┴────────────────────────────────────────────────────────┐
│                  GITHUB ACTIONS WORKFLOW                          │
│                  (Automatic - No Action Needed)                   │
└───────────────────────────────────────────────────────────────────┘
           │
           ▼
  ┌──────────────────┐
  │  Workflow Starts │
  │  On push to main │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ Checkout Repo    │
  │ Configure Git    │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  Check if gxq    │
  │  branch exists   │
  └────┬────────┬────┘
       │        │
  YES  │        │  NO
       │        │
       ▼        ▼
  ┌────────┐ ┌──────────┐
  │ Merge  │ │  Create  │
  │ main → │ │   gxq    │
  │  gxq   │ │  branch  │
  └───┬────┘ └────┬─────┘
      │           │
      └─────┬─────┘
            │
            ▼
  ┌──────────────────┐
  │ Apply hostname   │
  │ & metadata       │
  │ replacements     │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  Commit Changes  │
  │  to gxq branch   │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │   Push to gxq    │
  │  git push origin │
  │       gxq        │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  Create/Update   │
  │  Pull Request    │
  │   gxq → main     │
  └────────┬─────────┘
           │
           │
┌──────────┴────────────────────────────────────────────────────────┐
│                     VERCEL DEPLOYMENT                             │
│                  (If configured - Automatic)                      │
└───────────────────────────────────────────────────────────────────┘
           │
           ▼
  ┌──────────────────┐
  │ Vercel detects   │
  │ push to gxq      │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │   Build webapp   │
  │  npm run build   │
  │   (in webapp/)   │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │     Deploy       │
  │  to Production   │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  🎉 LIVE!        │
  │  your-app.vercel │
  │      .app        │
  └──────────────────┘
```

## Branch Strategy

```
     main                    gxq                   Vercel
       │                      │                       │
       │                      │                       │
   [commit] ────────────────────────────────────────────
       │         auto sync    │        auto deploy    │
       │─────────────────────>│──────────────────────>│
       │                      │                       │
       │                      │                       │
   [commit] ────────────────────────────────────────────
       │         auto sync    │        auto deploy    │
       │─────────────────────>│──────────────────────>│
       │                      │                       │
       │      <PR created>    │                       │
       │<─────────────────────│                       │
       │                      │                       │
```

## Key Points

### 🔵 What Developers Do
1. Make changes locally
2. Test with `npm run dev`
3. Commit and push to `main`
4. **That's it!** Everything else is automatic

### 🟢 What Happens Automatically
1. GitHub Actions detects push to main
2. Syncs all changes to gxq branch
3. Creates/updates PR for review
4. Vercel deploys from gxq branch

### 🟡 What Gets Deployed
- All 10 webapp pages
- All UI/design updates
- All feature changes
- All configuration updates

## Timing

```
Push to main
     │
     ├─ [30s] GitHub Actions starts
     ├─ [60s] Sync to gxq completes
     ├─ [10s] PR created
     ├─ [90s] Vercel build starts
     ├─ [120s] Vercel build completes
     └─ [10s] Deployment live
     
Total: ~5 minutes from push to live
```

## File Changes Tracked

```
webapp/
  ├── app/                   ✅ Synced
  │   ├── page.tsx          ✅ Synced
  │   ├── swap/             ✅ Synced
  │   ├── sniper/           ✅ Synced
  │   ├── launchpad/        ✅ Synced
  │   ├── airdrop/          ✅ Synced
  │   ├── staking/          ✅ Synced
  │   └── arbitrage/        ✅ Synced
  ├── components/           ✅ Synced
  ├── lib/                  ✅ Synced
  ├── public/               ✅ Synced
  ├── next.config.ts        ✅ Synced
  ├── package.json          ✅ Synced
  └── ... all other files   ✅ Synced
```

## Success Indicators

### ✅ Workflow Succeeded
- Check mark in GitHub Actions tab
- gxq branch updated with latest commit
- PR created/updated with changes
- Commit message in gxq branch history

### ✅ Deployment Succeeded  
- Green check in Vercel dashboard
- New deployment URL active
- Changes visible on live site
- No build errors in logs

## Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| Workflow not starting | Push to `main` branch, not other branches |
| Build failing | Test locally: `cd webapp && npm run build` |
| Vercel not deploying | Check root directory is set to `webapp` |
| PR not created | Check GitHub Actions permissions |
| Changes not visible | Wait for deployment (~5 min), hard refresh |

---

**For detailed instructions**: See [SYNC_DEPLOY_GUIDE.md](SYNC_DEPLOY_GUIDE.md)

**For technical details**: See [WORKFLOW_DOCUMENTATION.md](WORKFLOW_DOCUMENTATION.md)
