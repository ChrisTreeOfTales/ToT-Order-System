# ToT Print Farm Management System

A standalone print-farm order management system for tracking orders through production stages, from order entry to shipping, with real-time multi-device access.

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ ([Download](https://nodejs.org))
- Git ([Download](https://git-scm.com))
- Fly.io CLI ([Install](https://fly.io/docs/hands-on/install-flyctl/))

### Local Development

```bash
# Clone the repository
git clone https://github.com/ChrisTreeOfTales/ToT-Order-System.git
cd ToT-Order-System

# Install dependencies
npm install

# Set up database (first time only)
npm run db:setup

# Start development server
npm start

# Visit http://localhost:3000
```

## 🌍 Live Environments

### Testing Environment
- **URL:** https://printfarm-test.treeoftales.se
- **Fly.io:** https://tot-printfarm-test.fly.dev
- **Purpose:** Safe testing ground for all changes
- **Data:** Test data (safe to break)

### Production Environment
- **URL:** https://printfarm.treeoftales.se
- **Fly.io:** https://tot-printfarm-prod.fly.dev
- **Purpose:** Live factory operations
- **Data:** Real business data (NEVER break this)

## 📋 Development Workflow

**CRITICAL:** Always follow the TEST → PROD workflow. See [WORKFLOW.md](WORKFLOW.md) for complete details.

### Quick Workflow

```bash
# 1. Make changes locally
# Edit files in src/

# 2. Test locally
npm start
# Visit http://localhost:3000 and verify changes work

# 3. Commit changes
git add .
git commit -m "Description of changes"
git push

# 4. Deploy to TESTING first
flyctl deploy --config fly.test.toml --app tot-printfarm-test

# 5. Verify testing environment
# Visit https://printfarm-test.treeoftales.se
# Test thoroughly on iPads

# 6. Only if testing passes: Deploy to PRODUCTION
flyctl deploy --config fly.toml --app tot-printfarm-prod

# 7. Verify production
# Visit https://printfarm.treeoftales.se
```

**⚠️ NEVER skip the testing step. Production contains live business data.**

## 📁 Project Structure

```
ToT-Order-System/
├── src/
│   ├── server.js              # Main server entry point
│   └── database/
│       ├── db.js              # Database connection and setup
│       ├── schema.sql         # Database schema
│       ├── setup.js           # Initial setup script
│       └── seed.js            # Seed data (colors, parts)
├── colors.csv                 # Color definitions (imported to database)
├── fly.test.toml              # Testing environment config
├── fly.toml                   # Production environment config
├── Dockerfile                 # Container definition
├── package.json               # Dependencies and scripts
├── PLAN.md                    # Complete technical plan
├── WORKFLOW.md                # Deployment workflow (MANDATORY reading)
└── README.md                  # This file
```

## 🛠 Available Scripts

```bash
npm start           # Start the server (production mode)
npm run dev         # Start with auto-reload (development mode)
npm run db:setup    # Initialize database and seed data
npm run db:seed     # Seed data only (colors, parts)
npm run db:backup   # Create manual database backup
```

## 🔧 Database

- **Engine:** SQLite with better-sqlite3
- **Mode:** Write-Ahead Logging (WAL) for concurrent access
- **Location (Dev):** `./printfarm.db`
- **Location (Prod):** `/data/printfarm.db` (persistent volume)

### Database Schema

- **orders** - Customer orders
- **products** - Products within orders
- **items** - Individual printing plates
- **colors** - Available colors (~30 colors)
- **parts** - Parts that make up items
- **item_colors** - Junction table (items → colors)
- **item_parts** - Junction table (items → parts)
- **status_history** - Audit log of status changes

See [src/database/schema.sql](src/database/schema.sql) for full schema.

## 🚢 Deployment

### Deploy to Testing
```bash
flyctl deploy --config fly.test.toml --app tot-printfarm-test
```

### Deploy to Production (ONLY after testing passes)
```bash
flyctl deploy --config fly.toml --app tot-printfarm-prod
```

### View Logs
```bash
# Testing
flyctl logs --app tot-printfarm-test

# Production
flyctl logs --app tot-printfarm-prod
```

### Check Status
```bash
# Testing
flyctl status --app tot-printfarm-test

# Production
flyctl status --app tot-printfarm-prod
```

## 🔒 Security

- **Database:** SQLite with foreign key constraints enabled
- **HTTPS:** Automatic SSL certificates via Let's Encrypt
- **Data Persistence:** Persistent volumes on Fly.io (survives deployments)
- **Backups:** Database backups stored in `/backups` directory

## 📖 Documentation

- **[PLAN.md](PLAN.md)** - Complete technical plan and architecture
- **[WORKFLOW.md](WORKFLOW.md)** - Mandatory deployment workflow (READ THIS!)
- **[NEXT-STEPS.md](NEXT-STEPS.md)** - Implementation roadmap

## 🏗 Tech Stack

### Backend
- **Runtime:** Node.js 20 (LTS)
- **Framework:** Fastify (fast, lightweight)
- **Database:** SQLite with better-sqlite3
- **Deployment:** Fly.io (Docker containers)

### Frontend (Coming in Phase 3)
- **Interactivity:** htmx
- **Reactivity:** Alpine.js
- **Styling:** TailwindCSS

## 🌟 Features (Planned)

- [ ] Order entry and management
- [ ] Real-time status tracking (In Queue → Printed → Shipped)
- [ ] Multi-color item support (1-4 colors per item)
- [ ] Express order prioritization
- [ ] iPad-optimized touch interface
- [ ] Multi-device sync (iPads + PCs)
- [ ] Automatic backups
- [ ] Order archival system

## 👥 Team

- **Development:** Built with [Claude Code](https://claude.com/claude-code)
- **Organization:** Tree of Tales
- **Repository:** https://github.com/ChrisTreeOfTales/ToT-Order-System

## 📝 License

UNLICENSED - Private use only

---

**Need Help?**
- Check [WORKFLOW.md](WORKFLOW.md) for deployment process
- Check [PLAN.md](PLAN.md) for architecture decisions
- Review code comments (all functions are documented)
