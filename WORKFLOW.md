# Development → Testing → Production Workflow

**CRITICAL**: This document defines the **mandatory** workflow for all changes to the ToT Print Farm system. This workflow protects production data and ensures stability.

---

## Core Principle

**NEVER deploy directly to production. ALWAYS test first.**

Production contains live business data. A bug in production means:
- Lost orders
- Incorrect shipments
- Factory downtime
- Data corruption

Testing environment exists to catch these issues **before** they affect the business.

---

## The Workflow (MANDATORY)

```
1. Develop Locally
   ↓
2. Test Locally (http://localhost:3000)
   ↓
3. Deploy to TESTING (tot-printfarm-test)
   ↓
4. Verify in TESTING thoroughly
   ↓
5. Only if TESTING works perfectly → Deploy to PRODUCTION
```

**Never skip steps. Never go directly to production.**

---

## Step-by-Step Process

### Step 1: Develop Locally

Make your code changes in your local development environment.

```bash
# Make your changes in src/
# Test locally
npm start

# Visit http://localhost:3000
# Test your changes thoroughly
```

**Verify locally:**
- App starts without errors
- New features work as expected
- No console errors
- Database operations work correctly

### Step 2: Commit Changes

Only commit when local testing passes.

```bash
git add .
git commit -m "Descriptive message of changes"
git push
```

### Step 3: Deploy to TESTING Environment

**This is the FIRST deployment target. Never skip this.**

```bash
# Deploy to testing
flyctl deploy --config fly.test.toml --app tot-printfarm-test

# Watch the deployment
flyctl logs --app tot-printfarm-test
```

**URLs:**
- Testing App: https://tot-printfarm-test.fly.dev
- Testing Health: https://tot-printfarm-test.fly.dev/health

### Step 4: Verify in TESTING

**CRITICAL**: Actually test the deployed app. Don't just check if it's running.

**Checklist:**
- [ ] Health check returns OK
- [ ] App loads without errors
- [ ] New features work as expected
- [ ] Existing features still work (regression test)
- [ ] Database queries work correctly
- [ ] Test on actual iPad (if UI changes)
- [ ] Test all user workflows affected by changes

**If anything fails:**
1. Fix the issue locally
2. Return to Step 1
3. DO NOT deploy to production

**Common testing commands:**
```bash
# Check health
curl https://tot-printfarm-test.fly.dev/health

# View logs
flyctl logs --app tot-printfarm-test

# SSH into testing app
flyctl ssh console --app tot-printfarm-test
```

### Step 5: Deploy to PRODUCTION

**ONLY after testing passes completely.**

```bash
# Deploy to production (SAME CODE that was tested)
flyctl deploy --config fly.toml --app tot-printfarm-prod

# Monitor the deployment
flyctl logs --app tot-printfarm-prod
```

**URLs:**
- Production App: https://tot-printfarm-prod.fly.dev
- Production Health: https://tot-printfarm-prod.fly.dev/health

### Step 6: Verify PRODUCTION

Even though testing passed, verify production works:

```bash
# Check health
curl https://tot-printfarm-prod.fly.dev/health

# Monitor logs for errors
flyctl logs --app tot-printfarm-prod

# Quick smoke test of critical features
```

---

## Quick Reference Commands

### Testing Environment
```bash
# Deploy to testing
flyctl deploy --config fly.test.toml --app tot-printfarm-test

# View logs
flyctl logs --app tot-printfarm-test

# Check status
flyctl status --app tot-printfarm-test

# SSH into app
flyctl ssh console --app tot-printfarm-test

# Restart app
flyctl apps restart tot-printfarm-test
```

### Production Environment
```bash
# Deploy to production (ONLY after testing passes)
flyctl deploy --config fly.toml --app tot-printfarm-prod

# View logs
flyctl logs --app tot-printfarm-prod

# Check status
flyctl status --app tot-printfarm-prod

# SSH into app
flyctl ssh console --app tot-printfarm-prod

# Restart app
flyctl apps restart tot-printfarm-prod
```

---

## Environment Differences

| Aspect | Testing | Production |
|--------|---------|------------|
| **App Name** | `tot-printfarm-test` | `tot-printfarm-prod` |
| **Config File** | `fly.test.toml` | `fly.toml` |
| **URL** | `tot-printfarm-test.fly.dev` | `tot-printfarm-prod.fly.dev` |
| **NODE_ENV** | `testing` | `production` |
| **Volume** | `printfarm_data_test` | `printfarm_data_prod` |
| **Data** | Test data / Copy of prod | Live business data |
| **Purpose** | Safe experimentation | Live operations |
| **Downtime OK?** | Yes | No |

---

## What Can Go Wrong If You Skip Testing

**Real scenarios that the testing environment prevents:**

1. **Database Migration Error**
   - Deploy adds new column
   - Migration fails halfway through
   - In production: orders can't be created
   - In testing: caught before production affected

2. **Breaking UI Change**
   - Deploy changes order form
   - Form validation broken
   - In production: factory can't enter orders
   - In testing: caught and fixed before deployment

3. **Performance Regression**
   - Deploy adds slow database query
   - Order list takes 30 seconds to load
   - In production: factory workflow grinds to halt
   - In testing: identified and optimized first

4. **Data Loss Bug**
   - Deploy has bug that deletes items
   - In production: real customer orders lost
   - In testing: bug caught, no data lost

---

## Emergency Rollback

If production breaks despite testing:

```bash
# Option 1: Redeploy last known good version
git checkout <last-good-commit>
flyctl deploy --config fly.toml --app tot-printfarm-prod

# Option 2: Rollback on Fly.io
flyctl releases --app tot-printfarm-prod
flyctl releases rollback <release-number> --app tot-printfarm-prod
```

---

## For AI Assistant (Claude Code)

**MANDATORY RULES:**

1. **NEVER deploy to production first**
   - Always deploy to testing before production
   - Always verify testing works before proceeding to production

2. **NEVER deploy both environments simultaneously**
   - Deploy testing first
   - Wait for verification
   - Only then deploy production

3. **ALWAYS use the correct config file**
   - Testing: `--config fly.test.toml --app tot-printfarm-test`
   - Production: `--config fly.toml --app tot-printfarm-prod`

4. **ALWAYS verify deployments**
   - Check health endpoint
   - Review logs
   - Confirm expected environment variable (testing vs production)

5. **ALWAYS follow the plan**
   - Refer to PLAN.md for architectural decisions
   - Don't deviate from the planned structure
   - Dual environments are non-negotiable

6. **WHEN making changes:**
   ```
   a. Make changes locally
   b. Test locally (npm start)
   c. Deploy to testing
   d. Verify testing thoroughly
   e. Only if testing works: deploy to production
   f. Verify production
   ```

7. **WHEN asked to "deploy the app":**
   - Deploy to testing first
   - Wait for user approval or verification
   - Then deploy to production

8. **NEVER:**
   - Skip testing environment
   - Deploy to production without testing first
   - Deploy both environments in parallel
   - Assume production is same as testing

---

## Summary

**Golden Rule:** Every change must flow through: Local → Testing → Production

**Why?** Because production data is irreplaceable, and downtime costs money.

**How?** By always deploying to testing first and verifying before touching production.

---

**Last Updated:** 2025-10-20
**Version:** 1.0.0
