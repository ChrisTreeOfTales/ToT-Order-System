# 🚀 Next Steps - Updated Plan

**Date**: 2025-10-20
**Domain**: treeoftales.se (hosted by one.com)
**Hosting**: Fly.io (logged in via GitHub, credit card ready)
**Cost**: $0/month (within free tier - monitoring in place)

---

## ✅ Decisions Made

1. **Admin View**: Colors, Parts, and System Settings managed in `/admin` view
2. **Order Numbering**: Auto-generated sequential (001, 002, 003...) but editable
3. **Colors Management**: Full UI for add/edit/deactivate colors
4. **Parts Management**: Full UI for add/edit/deactivate parts
5. **Cost Awareness**: We're monitoring usage to stay within free tier ($0/month)

---

## 📋 For You (Non-Technical)

### **Task 1: Fill in Your Colors** (15 minutes)
**File**: `colors.csv` (I just created it in your project folder)

**How to do it**:
1. Open `/Users/treeoftales/ToT Order System/ToT-Order-System/colors.csv`
2. Follow the instructions in the file
3. Add all ~30 colors you use for printing
4. Format: `color_name,hex_code,pantone_code`
5. Example: `Red,#FF0000,Pantone 185 C`

**Need help with hex codes?**
- Use this tool: https://htmlcolorcodes.com/
- Or I can help you convert color names to hex codes

**When done**: Let me know and I'll import them into the database

---

### **Task 2: Set Up Hosting on Fly.io** (60 minutes)
**Guide**: Section 18 in `PLAN.md`

**Before you start, you'll need**:
- ✅ Domain: treeoftales.se (you have this)
- ✅ DNS access: one.com (you have this)
- ✅ GitHub account (you have this)
- ✅ Fly.io account (logged in via GitHub)
- ✅ Credit card (adding now)
- ⚠️ Node.js installed? (Check by running: `node --version`)

**If Node.js not installed**:
```bash
# Install Node.js v18 or higher
# Download from: https://nodejs.org/
# Choose "LTS" version (recommended)
```

**Follow These Steps**:
Go through Section 18 of PLAN.md, starting with:
- Part A: Install Fly.io CLI (5 min)
- Part B: Prepare Your Project (10 min)
- Part C: Deploy Testing Environment (15 min)
- Part D: Deploy Production Environment (10 min)
- Part E: Configure Custom Domains (10 min)

**Your URLs will be**:
- Testing: `https://printfarm-test.treeoftales.se`
- Production: `https://printfarm.treeoftales.se`

**DNS Records you'll need to add at one.com**:
| Type  | Name           | Value (Points to)           |
|-------|----------------|-----------------------------|
| CNAME | printfarm-test | tot-printfarm-test.fly.dev  |
| CNAME | printfarm      | tot-printfarm-prod.fly.dev  |

---

### **Task 3: Set Up Billing Alerts** (5 minutes)
**Why**: Peace of mind - you'll be notified if costs approach $5

**How**:
1. Go to: https://fly.io/dashboard/personal/billing
2. Click "Set up billing alerts"
3. Set threshold to: **$5**
4. Enter your email
5. Save

**Expected monthly cost**: $0 (but you'll know if something changes)

---

### **Task 4: Check Your Progress** (Anytime)
Once hosting is set up, you can check it anytime:

```bash
# See both apps running
flyctl apps list

# Check current usage (should be 0% of free tier at first)
flyctl billing show

# Open testing environment in browser
flyctl open --app tot-printfarm-test

# Open production environment in browser
flyctl open --app tot-printfarm-prod
```

---

## 🛠️ For Me (Technical)

### **Phase 1: Initial Project Setup** (TODAY - 2-3 hours)

#### Task 1: Create Project Structure
```bash
# Initialize Node.js project
npm init -y

# Install core dependencies
npm install fastify better-sqlite3

# Install dev dependencies
npm install --save-dev nodemon

# Create directory structure
mkdir -p src/database src/models src/routes src/views src/public/css src/public/js src/utils backups logs
```

#### Task 2: Create Database Schema
- Write complete SQL schema for all tables
- Add order number auto-generation logic
- Create database initialization script
- Add data integrity checks

#### Task 3: Create Seed Data Script
- Wait for colors.csv from user
- Create script to import colors from CSV
- Add sample parts for testing
- Create database seeding function

#### Task 4: Set Up Git
```bash
# Add all initial files
git add .

# Initial commit
git commit -m "Initial project setup: structure, schema, and config"

# Push to GitHub (once user creates repo)
git push origin main
```

#### Task 5: Create Basic Server
- Minimal Fastify server for deployment testing
- Environment variable configuration
- Health check endpoint
- Logging setup

**Deliverable**: Basic project ready for deployment testing

---

### **Phase 2: Database Implementation** (NEXT - 1-2 days)

#### Task 1: Database Connection & Setup
- Implement better-sqlite3 connection
- Configure WAL mode for concurrent access
- Add foreign key enforcement
- Create initialization function

#### Task 2: Create All Models
- `Color.js` - CRUD operations for colors
- `Part.js` - CRUD operations for parts
- `Order.js` - Order management with auto-numbering
- `Product.js` - Product management
- `Item.js` - Item management with status workflow
- All models heavily commented

#### Task 3: Implement Business Logic
- Order number generation (001, 002, 003...)
- Status transition validation
- Reprint workflow
- Soft delete for colors/parts

#### Task 4: Automated Backups
- Hourly backup script
- Backup to `/backups` directory
- Backup retention policy (30 days)
- Restore function

#### Task 5: Testing
- Test all CRUD operations
- Test data persistence
- Test backup/restore
- Test concurrent operations

**Deliverable**: Fully functional database layer with all business logic

---

### **Phase 3: Admin View** (AFTER Phase 2 - 2-3 days)

#### Task 1: Admin Routes
- `/admin` - Main admin page
- `/admin/colors` - Colors management
- `/admin/parts` - Parts management

#### Task 2: Admin UI
- Tabbed interface (Colors, Parts, Settings)
- Colors table with add/edit/delete
- Parts table with add/edit/delete
- Form validation
- Color picker for hex codes

#### Task 3: Admin API Endpoints
- POST /api/colors - Add color
- PUT /api/colors/:id - Edit color
- DELETE /api/colors/:id - Deactivate color
- POST /api/parts - Add part
- PUT /api/parts/:id - Edit part
- DELETE /api/parts/:id - Deactivate part

**Deliverable**: Full admin interface for managing colors and parts

---

### **Phase 4: Core Views** (AFTER Phase 3 - 1 week)

Build all main factory views:
1. Queue Management
2. Printfarm Removal
3. Assembly/QC
4. Packing/Shipping
5. Order Entry
6. Archive

**Deliverable**: Complete working system

---

## 📅 Suggested Timeline

### **Today (2025-10-20)**
- **YOU**: Fill in colors.csv (15 min)
- **YOU**: Start hosting setup (60 min)
- **ME**: Create project structure & database schema (2-3 hours)

### **Tomorrow**
- **YOU**: Finish hosting setup if not done
- **YOU**: Set up billing alerts
- **ME**: Implement all data models and business logic

### **This Week**
- **YOU**: Test deployed versions as features are added
- **ME**: Complete Phase 1 & 2 (database + models)
- **ME**: Start Phase 3 (Admin view)

### **Next Week**
- **YOU**: Add your colors and parts via Admin UI
- **ME**: Complete Phase 3 & 4 (Admin + Core views)
- **BOTH**: Test complete workflows on iPads

### **Week 3-4**
- **ME**: iPad optimization and polish
- **YOU**: Test with team, provide feedback
- **BOTH**: Final testing before production use

---

## ❓ What To Do Right Now

### **You Should**:
1. ✅ Fill in `colors.csv` with your ~30 colors
2. ✅ Check if Node.js is installed (`node --version`)
3. ✅ Start Section 18 of PLAN.md (Hosting Setup)
4. ✅ Let me know when colors.csv is ready

### **I Will**:
1. ✅ Wait for your colors.csv
2. ✅ Create initial project structure
3. ✅ Write database schema
4. ✅ Set up basic server for deployment
5. ✅ Wait for you to finish hosting setup, then help troubleshoot if needed

---

## 🆘 If You Get Stuck

**Hosting Setup Issues**:
- Share the error message
- Share which step you're on
- I can guide you through it

**Colors.csv Help**:
- Not sure about hex codes? I can help convert
- Not sure about color names? Just describe them
- Send me what you have and I'll format it

**Node.js Installation**:
- Mac: Download from https://nodejs.org/
- Choose "LTS" (Long Term Support) version
- Run installer
- Verify: `node --version` should show v18 or higher

---

## 📞 Check-In Points

**After you finish colors.csv**:
- Let me know → I'll import them into the database seed

**After you finish hosting setup**:
- Share your two URLs → I'll verify they work
- Share any issues → I'll help troubleshoot

**After I finish Phase 1**:
- I'll deploy to your testing environment → You can see it live
- You can test the basic structure

---

## 🎯 End Goal for This Week

By end of this week, you should have:
- ✅ Two live environments (testing + production)
- ✅ Database with your colors imported
- ✅ Basic admin interface to add/edit colors and parts
- ✅ Confidence in the deployment workflow

Then next week we build the actual factory views!

---

**Ready? Start with colors.csv and let me know when you're done! 🚀**
