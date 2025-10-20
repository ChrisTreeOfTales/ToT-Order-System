# Print-Farm Management System - Technical Plan

## 1. System Overview

A standalone print-farm order management system for tracking orders through production stages, from order entry to shipping, with real-time multi-device access across iPads and PCs on the local network.

**Core Requirements:**
- Lightweight, locally hosted (with subdomain hosting option)
- Real-time updates across multiple devices
- Data persistence is paramount - no data loss
- Touch-optimized for iPads
- Minimalistic UI focused on usability
- List-based views with tight spacing
- Heavily commented code for non-developers

---

## 2. Technical Stack (Option C - Recommended)

### Backend
- **Database**: SQLite with Better-SQLite3 (synchronous operations, excellent performance)
  - Write-Ahead Logging (WAL) mode for better concurrent access
  - Automated hourly backups with timestamps
  - Transaction logging for all changes
- **Runtime**: Node.js (v18+ LTS)
- **Server Framework**: Fastify (lightweight, fast, excellent plugin ecosystem)
- **Real-time**: Server-Sent Events (SSE) for pushing updates to all connected clients
- **Validation**: Zod schema validation for all data inputs

### Frontend
- **Interactivity**: htmx (declarative, minimal JavaScript, server-driven)
- **UI Components**: Alpine.js (lightweight reactivity for UI state)
- **Styling**: TailwindCSS (utility-first, easy to customize, minimal bundle)
- **Touch Optimization**: Custom touch targets (minimum 44x44px for iPad)

### Development Tools
- **TypeScript**: For better code documentation and IDE support
- **Nodemon**: Auto-restart during development
- **ESLint + Prettier**: Code formatting consistency

### Why This Stack?
- **Minimal complexity**: Perfect for maintenance by someone with technical knowledge but not a developer
- **Excellent performance**: All synchronous operations, very fast
- **Easy deployment**: Single Node.js process, one database file
- **Low resource usage**: Can run on modest hardware
- **Well-documented**: All technologies have excellent documentation and community support

---

## 3. Data Model

### Database Schema

#### Colors Table
```sql
CREATE TABLE colors (
  color_id INTEGER PRIMARY KEY AUTOINCREMENT,
  color_name TEXT NOT NULL UNIQUE,
  hex_code TEXT NOT NULL,
  pantone_code TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```
**Notes:**
- Stores ~30 colors with visual representation
- hex_code for UI display (background color chips)
- pantone_code optional for reference
- is_active for soft-delete (never remove colors, just deactivate)

#### Orders Table
```sql
CREATE TABLE orders (
  order_id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK(platform IN ('Shopify', 'Etsy', 'Custom Order')),
  order_notes TEXT,
  ship_by_date DATE NOT NULL,
  is_express BOOLEAN DEFAULT 0,
  is_archived BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  shipped_at DATETIME
);
```
**Notes:**
- order_number: Auto-generated sequential (e.g., "001", "002", "003") but editable
  - Format: Zero-padded 3-digit number (001-999), then 4-digit (1000+)
  - Generation logic: SELECT MAX(order_number) + 1 from orders
  - User can override when creating order
- platform: Shopify, Etsy, or Custom Order
- order_notes: Free text field for special instructions
- ship_by_date: Target shipping date (manually set)
- is_express: Express shipping flag (prioritizes in all views)
- is_archived: Set to 1 when shipped
- All timestamps tracked for auditing

#### Products Table
```sql
CREATE TABLE products (
  product_id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(order_id)
);
```
**Notes:**
- One product can have multiple items (printing plates)
- Product status is derived from its items

#### Items Table (Printing Plates)
```sql
CREATE TABLE items (
  item_id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'In Queue'
    CHECK(status IN ('In Queue', 'In Printfarm', 'Printed', 'Assembled', 'Packed', 'Shipped')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(product_id)
);
```
**Notes:**
- Each item represents one physical printing plate
- Status drives the entire workflow
- Status can only move forward in sequence (enforced by application logic)
- Reprint resets status back to 'In Queue'

#### Item_Colors Table (Junction Table)
```sql
CREATE TABLE item_colors (
  item_id INTEGER NOT NULL,
  color_id INTEGER NOT NULL,
  color_order INTEGER NOT NULL,
  PRIMARY KEY (item_id, color_id),
  FOREIGN KEY (item_id) REFERENCES items(item_id),
  FOREIGN KEY (color_id) REFERENCES colors(color_id)
);
```
**Notes:**
- Links items to 1-4 colors
- color_order: Defines the sequence of colors (important for visual identification)
- UI will display color chips in order for quick visual identification

#### Parts Table
```sql
CREATE TABLE parts (
  part_id INTEGER PRIMARY KEY AUTOINCREMENT,
  part_name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```
**Notes:**
- Master list of all parts that can be included in items
- is_active for soft-delete

#### Item_Parts Table (Junction Table)
```sql
CREATE TABLE item_parts (
  item_id INTEGER NOT NULL,
  part_id INTEGER NOT NULL,
  needs_reprint BOOLEAN DEFAULT 0,
  PRIMARY KEY (item_id, part_id),
  FOREIGN KEY (item_id) REFERENCES items(item_id),
  FOREIGN KEY (part_id) REFERENCES parts(part_id)
);
```
**Notes:**
- Links items to their constituent parts
- needs_reprint: Flag for marking individual parts for reprint
- When any part needs_reprint = 1, the entire item resets to 'In Queue'

#### Status_History Table (Audit Log)
```sql
CREATE TABLE status_history (
  history_id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reason TEXT,
  FOREIGN KEY (item_id) REFERENCES items(item_id)
);
```
**Notes:**
- Tracks every status change for auditing
- reason: Captures why (e.g., "Reprint requested - color mismatch")
- Critical for debugging and understanding workflow issues

---

## 4. User Interface Views

### Design Principles
- **List-based layouts** (no cards unless absolutely necessary)
- **Minimal spacing** (tight, efficient use of screen space)
- **Large touch targets** for iPad (minimum 44x44px)
- **Color-coded visual identification** (color chips inline with item names)
- **Clear hierarchy** (express orders highlighted, sorted by ship-by date)
- **Minimalistic** (focus on data, not decoration)

### View 1: Queue Management (PC - Keyboard/Mouse)
**URL**: `/queue`

**Purpose**: Dispatch items to the print farm

**Display**:
- Table list of all items with status "In Queue"
- Sorted by: Express flag (top), then ship_by_date (ascending)
- Columns:
  - Checkbox (multi-select)
  - Express indicator (⚡ icon or "EXPRESS" badge)
  - Order # (clickable to see order details)
  - Customer Name
  - Product Name
  - Item Name
  - Color combination (visual color chips in sequence)
  - Parts list (comma-separated)
  - Ship By Date (highlighted if < 3 days away)
  - Created timestamp

**Actions**:
- Select multiple items (checkboxes)
- "Send to Printfarm" button (batch updates status to "In Printfarm")
- Filter by platform (Shopify/Etsy/Custom)
- Search by order number or customer name

**Technical Notes**:
- Keyboard shortcuts for efficiency (Space to select, Enter to submit)
- Auto-refresh via SSE when new items added

---

### View 2: Printfarm Removal (iPad)
**URL**: `/printfarm`

**Purpose**: Mark items as printed or flag for reprint

**Display**:
- List of all items with status "In Printfarm"
- Sorted by: Express flag, then ship_by_date
- Each row shows:
  - Express indicator
  - Order #
  - Item Name
  - Color chips (visual)
  - Parts list (expandable to show individual parts)
  - Ship By Date

**Actions per row**:
- Large "✓ Printed" button (marks item as "Printed")
- "Reprint" button that expands to show:
  - Option: "Reprint entire item"
  - Option: Checkboxes for individual parts
  - Confirm button (resets item to "In Queue" and sets needs_reprint flags)

**Technical Notes**:
- Touch-optimized: All buttons minimum 44px height
- Swipe gesture consideration for common actions
- Haptic feedback on button press (if supported by browser)
- Real-time updates when items change status

---

### View 3: Assembly/QC (iPad)
**URL**: `/assembly`

**Purpose**: Quality check and mark products as assembled

**Display**:
- List of all products where ALL items have status "Printed"
- Grouped by order, expandable
- Sorted by: Express flag, then ship_by_date
- Each order row shows:
  - Express indicator
  - Order #
  - Customer Name
  - Platform badge
  - Product count
  - Ship By Date
  - Expand/collapse toggle

**Expanded product view**:
- Shows all items in the product
- Each item shows:
  - Item Name
  - Color chips
  - Parts list
  - Individual reprint button

**Actions**:
- "✓ Mark Assembled" button (marks entire product's items as "Assembled")
- Individual item "Reprint" button (same as Printfarm view)

**Technical Notes**:
- Accordion-style expansion for products
- Cannot mark assembled if any item still "Printed" (validation)
- Visual confirmation before status change

---

### View 4: Packing/Shipping (iPad)
**URL**: `/packing`

**Purpose**: Pack and ship completed orders

**Display**:
- List of all orders where ALL products have items with status "Assembled"
- Sorted by: Express flag, then ship_by_date
- Columns:
  - Express indicator
  - Order #
  - Customer Name
  - Platform badge
  - Product Count
  - Item Count
  - Ship By Date
  - Order Notes (truncated, expandable)

**Actions**:
- "Pack Order" button → changes all items to "Packed"
- "Ship Order" button → changes all items to "Shipped" AND archives the order

**Technical Notes**:
- Two-step process to prevent accidental shipping
- "Ship Order" triggers archival (is_archived = 1, shipped_at = NOW())
- Confirmation modal before shipping
- Order disappears from view after shipping

---

### View 5: Order Entry (PC - Keyboard/Mouse)
**URL**: `/orders/new`

**Purpose**: Create new orders with products and items

**Display**:
- Multi-step form:
  1. Order details (number, customer, platform, notes, ship-by date, express flag)
  2. Add products (name, then add items to product)
  3. For each item: name, select parts (multi-select), select 1-4 colors
  4. Review and confirm

**Actions**:
- Save order (creates order, products, items, and all junction table entries)
- Items automatically created with status "In Queue"

**Technical Notes**:
- Form validation at each step
- Color picker shows visual chips
- Parts selection with search/filter
- Ability to duplicate items/products for efficiency
- Transaction-based save (all-or-nothing)

---

### View 6: Archive (PC)
**URL**: `/archive`

**Purpose**: View shipped orders for reference

**Display**:
- Read-only list of archived orders
- Search by order number, customer, date range
- Expandable to see full order details

**Technical Notes**:
- Pagination for performance
- No status changes allowed
- Export capability (CSV) for record-keeping

---

### View 7: Admin (PC - Keyboard/Mouse)
**URL**: `/admin`

**Purpose**: Manage system configuration, colors, and parts

**Display**:
- Tabbed interface with three sections:
  1. **Colors Management**
  2. **Parts Management**
  3. **System Settings**

#### Colors Management Tab
**Display**:
- Table list of all colors (active and inactive)
- Columns:
  - Color chip (visual preview)
  - Color Name
  - Hex Code
  - Pantone Code (optional)
  - Status (Active/Inactive)
  - Actions (Edit, Deactivate/Activate)

**Actions**:
- "Add New Color" button (opens form)
- Edit existing color (inline or modal)
- Deactivate/Activate colors (soft delete)
- Never permanently delete colors (data integrity)

**Add/Edit Form**:
- Color Name (text input)
- Hex Code (color picker + text input)
- Pantone Code (optional text input)
- Preview of color chip

#### Parts Management Tab
**Display**:
- Table list of all parts (active and inactive)
- Columns:
  - Part Name
  - Description
  - Status (Active/Inactive)
  - Used In (count of how many items use this part)
  - Actions (Edit, Deactivate/Activate)

**Actions**:
- "Add New Part" button (opens form)
- Edit existing part (inline or modal)
- Deactivate/Activate parts (soft delete)
- Cannot deactivate parts currently used in active orders (validation)
- Never permanently delete parts (data integrity)

**Add/Edit Form**:
- Part Name (text input)
- Description (textarea)

#### System Settings Tab (Future)
**Display**:
- Order number format settings
- Backup configuration
- View preferences
- Other system-wide settings

**Technical Notes**:
- Simple, clean interface
- Form validation (required fields, hex code format, etc.)
- Confirmation before deactivating items
- Visual feedback for all actions
- Changes take effect immediately across all views

---

## 5. Workflows and Business Logic

### Status Progression Rules

**Valid Status Transitions**:
```
In Queue → In Printfarm → Printed → Assembled → Packed → Shipped
                ↑______________|
                  (Reprint)
```

**Enforced Rules**:
1. Items can only move forward through statuses (no skipping)
2. Exception: Reprint resets item to "In Queue"
3. Product considered "ready for assembly" when ALL items are "Printed"
4. Order considered "ready to pack" when ALL items are "Assembled"
5. Cannot ship order unless ALL items are "Packed"

### Reprint Workflow

**When item marked for reprint**:
1. User can select "entire item" or individual parts
2. If individual parts selected:
   - Set `needs_reprint = 1` on those parts in item_parts table
3. Item status reset to "In Queue"
4. Entry created in status_history with reason
5. Item reappears in Queue view
6. All other items in the product continue their normal workflow

**Visual Indicators**:
- Reprinted items show "🔄 REPRINT" badge in Queue view
- Original creation date preserved, but shows "reprint requested" timestamp

### Express Order Handling

**Rules**:
- is_express flag on order propagates to all views
- Express orders always sorted to top of lists
- Visual indicator (⚡ or "EXPRESS" badge) on every row
- Different background color (subtle highlight) for entire row

### Ship-by Date Logic

**Display Rules**:
- Show ship-by date on all views
- Highlight (yellow/orange) if < 3 days away
- Highlight (red) if overdue
- Sort by ship-by date (ascending) within priority groups

---

## 6. Data Persistence & Backup Strategy

**Critical Requirement**: No data loss under any circumstances

### Database Configuration
```javascript
// SQLite configuration
const db = new Database('printfarm.db', {
  verbose: console.log // Log all queries in development
});

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

// Ensure foreign keys are enforced
db.pragma('foreign_keys = ON');
```

### Automated Backups
- **Frequency**: Every hour
- **Format**: `backups/printfarm_YYYY-MM-DD_HH-mm-ss.db`
- **Retention**: Keep all backups for 30 days, then keep one per day for 1 year
- **Location**: Local `./backups/` directory (and optional remote sync)

### Transaction Logging
- All status changes wrapped in transactions
- Failed transactions automatically rolled back
- Error logging to `./logs/errors.log`
- Success logging to `./logs/transactions.log`

### Startup Integrity Check
```javascript
// On server start, verify database integrity
db.pragma('integrity_check');
db.pragma('foreign_key_check');
```

### Recovery Procedures
**Documented in code comments**:
1. How to restore from backup
2. How to manually verify data integrity
3. How to export data to CSV for safety

---

## 7. Real-time Updates & Concurrent Access

### Real-time Strategy: Server-Sent Events (SSE)

**Why SSE over WebSockets**:
- Simpler implementation
- Auto-reconnection built-in
- Works over HTTP (no separate protocol)
- Perfect for server → client updates (our use case)

**Implementation**:
```javascript
// Server broadcasts status changes to all connected clients
// Clients listening on /events endpoint
// When item status changes, server sends event:
{
  type: 'status_change',
  itemId: 123,
  newStatus: 'Printed',
  view: 'printfarm' // Which views should refresh
}
```

### Concurrent Write Handling

**Scenario**: Two iPads try to update the same item simultaneously

**Strategy**:
1. Row-level locking using transactions
2. Last-write-wins (with timestamp validation)
3. Optimistic UI updates (show immediately, rollback on conflict)
4. Visual feedback if update fails

**Example**:
```javascript
// Transaction ensures atomic update
const updateStatus = db.transaction((itemId, newStatus) => {
  const current = db.prepare('SELECT status, updated_at FROM items WHERE item_id = ?').get(itemId);

  // Validate state transition is allowed
  if (!isValidTransition(current.status, newStatus)) {
    throw new Error('Invalid status transition');
  }

  // Update with timestamp
  db.prepare('UPDATE items SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE item_id = ?')
    .run(newStatus, itemId);

  // Log to history
  db.prepare('INSERT INTO status_history (item_id, old_status, new_status) VALUES (?, ?, ?)')
    .run(itemId, current.status, newStatus);
});
```

### Conflict Resolution UI
- If concurrent update detected, show notification
- Refresh view to show current state
- User can retry action if still valid

---

## 8. Hosting Strategy - Dual Environment Setup

### Decision: Fly.io Cloud Hosting (CHOSEN)

**Why Fly.io:**
- **Completely FREE** for our use case (both environments fit in free tier)
- **Always-on** (no spin-down delays)
- **Excellent performance** (global edge network)
- **Persistent storage** (3GB free - plenty for years of data)
- **Automatic SSL** certificates
- **Easy deployment** from command line
- **Professional subdomains** with custom domain support

---

### Dual Environment Architecture

**CRITICAL**: This system manages live business data. Testing changes in production risks data loss and workflow disruption. Two environments are **essential**, not optional.

#### Production Environment
- **URL**: `printfarm.yourdomain.com`
- **Purpose**: Live factory operations
- **Data**: Real orders and customer data
- **Stability**: Only updated after thorough testing
- **Uptime**: Always-on, business-critical
- **Cost**: $0/month (Fly.io free tier)

#### Testing Environment
- **URL**: `printfarm-test.yourdomain.com`
- **Purpose**: Safe testing ground for changes
- **Data**: Copy of production data (refreshed weekly)
- **Freedom**: Experiment without risk
- **Training**: New staff practice here
- **Cost**: $0/month (Fly.io free tier)

**Total Cost: $0/month** (both environments included in Fly.io free tier)

---

### Development → Testing → Production Workflow

```
1. Make code changes locally
2. Test locally (http://localhost:3000)
3. Deploy to TESTING environment
4. Test thoroughly on actual iPads
5. If everything works → Deploy to PRODUCTION
6. If bugs found → Fix and repeat from step 3
```

**Benefits**:
- **Risk Mitigation**: Never risk breaking production
- **Confidence**: Test real workflows before going live
- **Training**: New employees practice without touching real data
- **Data Recovery**: Testing has recent backup if production fails
- **Peace of Mind**: Factory keeps running while you experiment

---

### Fly.io Free Tier Details

**What's Included (Free Forever)**:
- 3 shared-cpu VMs (we use 2: production + testing)
- 3GB persistent storage total
- Automatic SSL certificates
- Custom domains
- Always-on (no sleeping/spin-down)
- Global Anycast network (fast from anywhere)

**IMPORTANT - Cost Monitoring**:
Since you're paying for everything you use, here's what to watch:

**Free Tier Limits (You Won't Exceed)**:
- 2,340 hours/month of shared-cpu-1x runtime (we use ~1,440 hours for 2 apps = 61% of free tier)
- 3GB persistent storage (we use 2GB = 67% of free tier)
- 160GB outbound data transfer/month (you'll use ~1-2GB = <2% of free tier)

**Estimated Monthly Cost**: **$0/month**
- Your usage: Well within free tier limits
- Two small apps with minimal traffic will not exceed limits

**How to Monitor Costs**:
```bash
# Check your current usage and costs
flyctl dashboard

# Or via CLI
flyctl billing show

# Set up billing alerts (recommended)
# Go to: https://fly.io/dashboard/personal/billing
# Set alert threshold to $5 (will email you if you approach costs)
```

**Red Flags (Would Trigger Costs)**:
- ❌ Running more than 3 VMs simultaneously
- ❌ Using more than 3GB storage
- ❌ Huge traffic spikes (very unlikely for internal factory use)
- ❌ Scaling up to larger VMs

**Your Setup (Safe)**:
- ✅ 2 VMs (testing + production)
- ✅ 1GB storage each (2GB total)
- ✅ Minimal traffic (iPads on local network)
- ✅ Small VM size (256MB RAM each)

**What You'll Pay**: $0/month (guaranteed within these limits)

---

### Alternative Options (For Reference)

#### Render
- **Free Tier**: 750 hours/month (enough for 24/7)
- **Limitation**: Spins down after 15 minutes inactivity (~30 second wake-up)
- **Paid**: $7/month for always-on
- **Good for**: Testing environment if you want to save Fly.io resources

#### Railway
- **Free Tier**: $5 credit/month
- **Usually covers small apps completely**
- **Paid**: ~$5-10/month if exceeded
- **Good for**: Easiest developer experience

#### Local Network Hosting (Not Chosen)
- **Setup**: Dedicated hardware running 24/7
- **Pros**: Complete control, no internet dependency
- **Cons**: Hardware maintenance, power outages, no remote access
- **Not chosen because**: Cloud hosting is more reliable and free

---

## 9. Code Structure & Organization

### Project Directory Structure
```
print-farm-system/
├── src/
│   ├── server.js              # Main server entry point
│   ├── database/
│   │   ├── db.js              # Database connection and setup
│   │   ├── schema.sql         # Database schema (for reference/migrations)
│   │   ├── migrations/        # Database migration scripts
│   │   └── seed.js            # Initial data (colors, sample parts)
│   ├── models/
│   │   ├── Order.js           # Order model (CRUD operations)
│   │   ├── Product.js         # Product model
│   │   ├── Item.js            # Item model
│   │   ├── Part.js            # Part model
│   │   └── Color.js           # Color model
│   ├── routes/
│   │   ├── queue.js           # Queue view routes
│   │   ├── printfarm.js       # Printfarm view routes
│   │   ├── assembly.js        # Assembly view routes
│   │   ├── packing.js         # Packing view routes
│   │   ├── orders.js          # Order entry routes
│   │   └── api.js             # API endpoints for AJAX operations
│   ├── views/                 # HTML templates
│   │   ├── layout.html        # Base layout template
│   │   ├── queue.html
│   │   ├── printfarm.html
│   │   ├── assembly.html
│   │   ├── packing.html
│   │   ├── orders-new.html
│   │   └── components/        # Reusable HTML components
│   ├── public/
│   │   ├── css/
│   │   │   └── styles.css     # TailwindCSS output
│   │   └── js/
│   │       ├── sse-client.js  # Server-Sent Events client
│   │       └── ui-helpers.js  # UI utilities
│   └── utils/
│       ├── backup.js          # Automated backup logic
│       ├── validation.js      # Data validation schemas (Zod)
│       └── logger.js          # Logging utility
├── backups/                   # Automated database backups
├── logs/                      # Application logs
├── tests/                     # Test files
├── package.json
├── tailwind.config.js
├── .env.example               # Environment variables template
├── README.md                  # Setup and usage documentation
└── PLAN.md                    # This file
```

### Code Documentation Standards

**Every function must have**:
```javascript
/**
 * Brief description of what this function does
 *
 * @param {type} paramName - Description of parameter
 * @returns {type} Description of return value
 *
 * Example usage:
 * const result = functionName(param);
 */
```

**Inline comments for complex logic**:
```javascript
// Check if all items in product are "Printed" status before allowing assembly
// This ensures quality control cannot be skipped
const allItemsPrinted = items.every(item => item.status === 'Printed');
```

**Database query comments**:
```javascript
// Get all items in "In Printfarm" status
// Sorted by express flag first (1 = express, 0 = regular)
// Then by ship_by_date ascending (oldest/most urgent first)
const query = `
  SELECT
    i.item_id,
    i.item_name,
    i.status,
    o.order_number,
    o.is_express,
    o.ship_by_date
  FROM items i
  JOIN products p ON i.product_id = p.product_id
  JOIN orders o ON p.order_id = o.order_id
  WHERE i.status = 'In Printfarm'
  ORDER BY o.is_express DESC, o.ship_by_date ASC
`;
```

---

## 10. Implementation Phases

### Phase 1: Database & Core Setup (Week 1)
**Tasks**:
- [ ] Initialize Node.js project
- [ ] Install dependencies (Fastify, Better-SQLite3, etc.)
- [ ] Create database schema (all tables)
- [ ] Implement database backup system
- [ ] Write seed data (30 colors)
- [ ] Test data persistence (create, read, update, delete)
- [ ] Verify backup restoration works

**Deliverable**: Functioning database with automated backups

---

### Phase 2: Data Models & Business Logic (Week 1-2)
**Tasks**:
- [ ] Create model classes for all entities
- [ ] Implement status transition validation
- [ ] Implement reprint workflow logic
- [ ] Create transaction wrappers for all updates
- [ ] Write status history logging
- [ ] Test concurrent write scenarios
- [ ] Test all status transitions

**Deliverable**: Robust data layer with enforced business rules

---

### Phase 3: Server & Basic UI (Week 2-3)
**Tasks**:
- [ ] Set up Fastify server
- [ ] Configure TailwindCSS
- [ ] Create base HTML layout template
- [ ] Implement Queue view (basic)
- [ ] Implement Printfarm view (basic)
- [ ] Implement Assembly view (basic)
- [ ] Implement Packing view (basic)
- [ ] Test navigation between views

**Deliverable**: Basic working UI for all stations

---

### Phase 4: Real-time Updates (Week 3)
**Tasks**:
- [ ] Implement SSE server endpoint
- [ ] Create SSE client JavaScript
- [ ] Connect status changes to SSE broadcasts
- [ ] Test multi-device real-time updates
- [ ] Implement optimistic UI updates
- [ ] Test conflict resolution

**Deliverable**: Real-time updates across all connected devices

---

### Phase 5: Order Entry & Advanced Features (Week 4)
**Tasks**:
- [ ] Create order entry form
- [ ] Implement multi-step form flow
- [ ] Color picker UI with visual chips
- [ ] Parts selection with search
- [ ] Order notes and express flag
- [ ] Form validation
- [ ] Test complete order creation flow

**Deliverable**: Complete order entry system

---

### Phase 6: iPad Optimization & Polish (Week 4-5)
**Tasks**:
- [ ] Optimize touch targets (44px minimum)
- [ ] Test on actual iPads
- [ ] Improve tap response (remove hover states)
- [ ] Implement swipe gestures (if beneficial)
- [ ] Add haptic feedback
- [ ] Fine-tune spacing and layout for tablets
- [ ] Test in landscape and portrait modes

**Deliverable**: Fully iPad-optimized interface

---

### Phase 7: Testing & Data Integrity (Week 5)
**Tasks**:
- [ ] Load test with realistic data volume
- [ ] Test concurrent access (multiple iPads)
- [ ] Verify backup/restore procedures
- [ ] Test all reprint scenarios
- [ ] Test express order prioritization
- [ ] Verify archival works correctly
- [ ] Database integrity checks

**Deliverable**: Thoroughly tested system ready for production

---

### Phase 8: Deployment (Week 5-6)
**Tasks**:
- [ ] Choose hosting option (local vs subdomain)
- [ ] If subdomain: Set up Railway/Render account
- [ ] Configure production environment
- [ ] Set up SSL certificate
- [ ] Configure subdomain DNS
- [ ] Deploy to production
- [ ] Test from factory iPads
- [ ] Create user documentation
- [ ] Train team on system usage

**Deliverable**: Live production system

---

## 11. Configuration & Environment

### Environment Variables (.env file)
```bash
# Server configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_PATH=./printfarm.db
BACKUP_DIR=./backups
BACKUP_INTERVAL_HOURS=1

# Logging
LOG_LEVEL=info
LOG_DIR=./logs

# Optional: IP whitelist for security (comma-separated)
ALLOWED_IPS=192.168.1.0/24

# Optional: Basic auth (for subdomain hosting)
BASIC_AUTH_USERNAME=admin
BASIC_AUTH_PASSWORD=your-secure-password
```

### Configuration File (config.js)
```javascript
module.exports = {
  // UI configuration
  ui: {
    itemsPerPage: 50,
    colorChipSize: 20, // pixels
    touchTargetMinSize: 44, // pixels for iPad
    shipByWarningDays: 3, // Highlight if ship-by within 3 days
  },

  // Status configuration
  statuses: [
    'In Queue',
    'In Printfarm',
    'Printed',
    'Assembled',
    'Packed',
    'Shipped'
  ],

  // Platform options
  platforms: [
    'Shopify',
    'Etsy',
    'Custom Order'
  ],

  // Backup configuration
  backup: {
    enabled: true,
    intervalHours: 1,
    retentionDays: 30,
    retentionYearly: 365
  }
};
```

---

## 12. Security Considerations

### Local Network Setup
- Network-level security (router firewall)
- Physical security (devices in factory)
- Optional: Basic authentication

### Subdomain Hosting Setup
- **IP Whitelist**: Restrict access to factory IP address
- **Basic Authentication**: Username/password for entire application
- **HTTPS**: SSL certificate (automatic with Railway/Render)
- **Environment Variables**: Never commit secrets to git
- **Database Encryption**: SQLite encryption extension (optional)
- **Regular Updates**: Keep dependencies updated for security patches

### Data Privacy
- No sensitive customer data (payment info, addresses) stored
- Customer names and order numbers only
- No GDPR concerns (business data, not personal data)

---

## 13. Maintenance & Monitoring

### Daily Checks (Automated)
- Database integrity check on startup
- Backup verification (ensure backup files created)
- Log rotation (prevent logs from growing too large)

### Weekly Checks (Manual)
- Review error logs
- Check disk space (backups directory)
- Verify all views loading correctly

### Monthly Checks
- Review backup retention (delete old backups per policy)
- Check for dependency updates
- Review performance (query speeds)

### Monitoring (If Subdomain Hosted)
- Hosting provider dashboard (Railway/Render)
- Uptime monitoring (built-in)
- Error alerts (configure email notifications)

---

## 14. Future Enhancements (Post-Launch)

**Nice-to-Have Features** (not in initial scope):
- Dashboard with statistics (items printed per day, average time per status)
- Barcode/QR code scanning for items
- Photo upload for items (before/after quality check)
- Integration with e-commerce platforms (Shopify API, Etsy API)
- Automatic order import from platforms
- Shipping label generation
- Customer notifications (email when order ships)
- Mobile app (native iOS app instead of web)
- Analytics and reporting
- Multi-user system with roles/permissions
- Inventory tracking for parts/materials

---

## 15. Decision Log

**Date: 2025-10-20**

### Decisions Made:
1. ✅ **Tech Stack**: Option C (SQLite + Node.js + Fastify + htmx + Alpine.js + TailwindCSS)
2. ✅ **Colors**: Database of ~30 colors with visual display (hex codes)
3. ✅ **Color Display**: Show actual color chips, not just count (1-4 colors per item)
4. ✅ **Reprint Workflow**: Reset existing item/part to "In Queue" status
5. ✅ **Order Platforms**: Shopify, Etsy, Custom Order (stored in DB)
6. ✅ **Order Notes**: Text field for special instructions
7. ✅ **Ship-by Date**: Manually set, displayed in all views, sorted by urgency
8. ✅ **Express Shipping**: Flag for priority, always shown at top of lists
9. ✅ **Authentication**: Physical location-based (no login system)
10. ✅ **Archival**: Orders archived when shipped
11. ✅ **Hosting**: Fly.io cloud hosting (completely free, dual-environment)
12. ✅ **Dual Environments**: Testing + Production (both free on Fly.io)
13. ✅ **Total Cost**: $0/month (within Fly.io free tier limits)

### Answers to Previous Questions:
- **Color management**: Admin UI for managing colors (add, edit, deactivate)
- **Order numbering**: Auto-generated sequential numbers, but editable if needed
- **Part management**: Admin UI for managing parts (add, edit, deactivate)
- **Admin View**: All database management (colors, parts, settings) in dedicated Admin section

### New Open Questions:
- None currently - ready to start implementation!

---

## 16. Getting Started (For Developer)

### Prerequisites
- Node.js v18+ installed
- Git installed
- Text editor (VS Code recommended)
- Terminal/command line access

### Initial Setup Commands
```bash
# Clone repository (if using git)
git clone [repository-url]
cd print-farm-system

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Initialize database and seed colors
npm run db:setup

# Start development server
npm run dev

# Access at http://localhost:3000
```

### Development Workflow
```bash
# Run in development mode (auto-restart on changes)
npm run dev

# Run tests
npm test

# Build TailwindCSS
npm run build:css

# Create manual backup
npm run backup

# Check database integrity
npm run db:check
```

---

## 17. Support & Documentation

### For Questions or Issues:
1. Check README.md for setup instructions
2. Review code comments (all functions documented)
3. Check logs in `./logs/` directory
4. Review this PLAN.md for architectural decisions

### Common Issues & Solutions:
**Issue**: Database locked error
- **Solution**: Check if another process is accessing the database, restart server

**Issue**: Real-time updates not working
- **Solution**: Check browser console for SSE connection errors, ensure firewall allows connections

**Issue**: Backup failed
- **Solution**: Check disk space, verify backup directory permissions

---

## 18. Hosting Setup Guide - Fly.io Step-by-Step

This comprehensive guide will walk you through setting up both testing and production environments on Fly.io. Total estimated time: **60 minutes**.

---

### Prerequisites Checklist

Before starting, make sure you have:

- [ ] **Domain name** (e.g., yourdomain.com) - You own this
- [ ] **DNS access** - You can add/edit DNS records for your domain
- [ ] **GitHub account** - Free at github.com
- [ ] **Fly.io account** - We'll create this together (free)
- [ ] **Credit card** - For Fly.io (won't charge for free tier)
- [ ] **Node.js installed** - Version 18 or higher ([nodejs.org](https://nodejs.org))
- [ ] **Git installed** - Check by running `git --version` in terminal
- [ ] **Terminal/Command line access** - Terminal on Mac, Command Prompt on Windows

---

### Part A: Install Fly.io CLI (5 minutes)

The Fly.io CLI (Command Line Interface) lets you deploy and manage your apps from your computer.

#### Step 1: Install flyctl (Fly.io CLI)

**On macOS (you're on macOS based on your system):**

```bash
# Install using Homebrew (recommended)
brew install flyctl
```

**Alternative if you don't have Homebrew:**

```bash
# Install using curl
curl -L https://fly.io/install.sh | sh
```

#### Step 2: Verify Installation

```bash
# Check that flyctl is installed
flyctl version

# You should see something like: flyctl v0.x.xxx
```

#### Step 3: Create Fly.io Account & Login

```bash
# This will open your browser to sign up/login
flyctl auth signup

# Follow the prompts in your browser:
# 1. Enter your email
# 2. Create a password
# 3. Verify your email
# 4. Add credit card (required but won't charge for free tier)
```

#### Step 4: Verify Login

```bash
# Check that you're logged in
flyctl auth whoami

# You should see your email address
```

**Checkpoint**: You should now be logged into Fly.io from your terminal.

---

### Part B: Prepare Your Project (10 minutes)

We need to create the basic project structure and push it to GitHub before deploying.

#### Step 1: Initialize Git Repository (if not already done)

```bash
# Navigate to your project directory
cd "/Users/treeoftales/ToT Order System/ToT-Order-System"

# Initialize git (if not already initialized)
git init

# Check git status
git status
```

#### Step 2: Create .gitignore File

This tells git which files NOT to upload to GitHub (like secrets and databases).

```bash
# Create .gitignore file
cat > .gitignore << 'EOF'
# Dependencies
node_modules/

# Environment variables (secrets)
.env
.env.local
.env.production

# Databases (don't commit database files)
*.db
*.db-shm
*.db-wal

# Logs
logs/
*.log

# Backups (too large for git)
backups/

# OS files
.DS_Store
Thumbs.db

# IDE files
.vscode/
.idea/

# Build outputs
dist/
build/

# Fly.io deployment files (generated)
.fly/
EOF
```

#### Step 3: Create Basic Project Files

We'll create a minimal Node.js project structure to deploy:

```bash
# Create package.json (project manifest)
cat > package.json << 'EOF'
{
  "name": "tot-printfarm-system",
  "version": "1.0.0",
  "description": "Print farm order management system",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  },
  "dependencies": {
    "fastify": "^4.25.0",
    "better-sqlite3": "^9.2.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF

# Create src directory
mkdir -p src

# Create a minimal server.js (placeholder for now)
cat > src/server.js << 'EOF'
// Minimal server for deployment testing
// This will be replaced with full implementation later

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Simple HTTP server (we'll replace with Fastify later)
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <html>
      <head><title>ToT Print Farm System</title></head>
      <body>
        <h1>ToT Print Farm Management System</h1>
        <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
        <p>Status: Server is running!</p>
        <p>This is a placeholder. Full system coming soon.</p>
      </body>
    </html>
  `);
});

server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
EOF
```

#### Step 4: Test Locally (Optional but Recommended)

```bash
# Test that the basic server works
node src/server.js

# You should see: "Server running on http://0.0.0.0:3000"
# Open http://localhost:3000 in your browser to verify
# Press Ctrl+C to stop the server
```

#### Step 5: Create GitHub Repository

**Option A: Using GitHub website (easier)**

1. Go to [github.com](https://github.com) and login
2. Click the "+" icon (top right) → "New repository"
3. Name it: `tot-printfarm-system`
4. Description: "Print farm order management system"
5. Keep it **Private** (recommended for business systems)
6. Do NOT initialize with README (we already have files)
7. Click "Create repository"
8. Copy the repository URL (looks like: `https://github.com/yourusername/tot-printfarm-system.git`)

**Option B: Using GitHub CLI (if you have it installed)**

```bash
gh repo create tot-printfarm-system --private --source=. --remote=origin
```

#### Step 6: Push to GitHub

```bash
# Add all files to git
git add .

# Create first commit
git commit -m "Initial commit: Basic project structure"

# Add GitHub as remote (replace with YOUR repository URL from step 5)
git remote add origin https://github.com/YOUR_USERNAME/tot-printfarm-system.git

# Push to GitHub
git push -u origin main
```

**Checkpoint**: Your code should now be on GitHub. Visit your repository URL to verify.

---

### Part C: Deploy Testing Environment (15 minutes)

Now we'll deploy the testing environment to Fly.io.

#### Step 1: Navigate to Project Directory

```bash
cd "/Users/treeoftales/ToT Order System/ToT-Order-System"
```

#### Step 2: Create Fly.io App (Testing)

```bash
# Launch Fly.io app creation wizard
flyctl launch --name tot-printfarm-test --no-deploy

# When prompted, choose:
# - Region: Choose closest to your location (e.g., lax for Los Angeles, sjc for San Jose)
# - Would you like to set up a PostgreSQL database? → NO (we're using SQLite)
# - Would you like to set up an Upstash Redis database? → NO
# - Would you like to deploy now? → NO (we'll configure first)
```

This creates a `fly.toml` configuration file.

#### Step 3: Configure fly.toml for Testing

Open the `fly.toml` file that was created and modify it:

```bash
cat > fly.toml << 'EOF'
# Fly.io configuration for ToT Print Farm System - TESTING

app = "tot-printfarm-test"
primary_region = "sjc"  # Change to your chosen region

[build]

[env]
  PORT = "8080"
  NODE_ENV = "testing"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = false  # Keep always-on
  auto_start_machines = true
  min_machines_running = 1  # Always have 1 machine running

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256

# Persistent storage for SQLite database
[mounts]
  source = "printfarm_data_test"
  destination = "/data"
  initial_size = "1gb"
EOF
```

#### Step 4: Create Persistent Volume for Database (Testing)

```bash
# Create a volume for the database (testing environment)
flyctl volumes create printfarm_data_test --region sjc --size 1

# You should see confirmation that the volume was created
```

#### Step 5: Deploy Testing Environment

```bash
# Deploy to Fly.io
flyctl deploy

# This will:
# 1. Build your app
# 2. Upload it to Fly.io
# 3. Start your app
# 4. Give you a URL
#
# Takes 2-3 minutes
```

#### Step 6: Verify Testing Deployment

```bash
# Open your testing app in browser
flyctl open

# You should see your placeholder page!

# Check logs to ensure it's running
flyctl logs

# Check status
flyctl status
```

**Checkpoint**: Your testing environment should now be live at `https://tot-printfarm-test.fly.dev`

---

### Part D: Deploy Production Environment (10 minutes)

Now we'll create a separate production environment.

#### Step 1: Create Fly.io App (Production)

```bash
# Create production app configuration
flyctl launch --name tot-printfarm-prod --no-deploy

# Choose same region as testing
```

#### Step 2: Configure fly.toml for Production

We need TWO separate fly.toml files. Let's rename the first one:

```bash
# Rename testing config
mv fly.toml fly.test.toml

# The launch command just created a new fly.toml for production
# Edit it:
cat > fly.toml << 'EOF'
# Fly.io configuration for ToT Print Farm System - PRODUCTION

app = "tot-printfarm-prod"
primary_region = "sjc"  # Same region as testing

[build]

[env]
  PORT = "8080"
  NODE_ENV = "production"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = false  # Keep always-on
  auto_start_machines = true
  min_machines_running = 1  # Always have 1 machine running

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256

# Persistent storage for SQLite database
[mounts]
  source = "printfarm_data_prod"
  destination = "/data"
  initial_size = "1gb"
EOF
```

#### Step 3: Create Persistent Volume for Database (Production)

```bash
# Create a volume for the database (production environment)
flyctl volumes create printfarm_data_prod --region sjc --size 1 --app tot-printfarm-prod
```

#### Step 4: Deploy Production Environment

```bash
# Deploy production (using the fly.toml file)
flyctl deploy

# This deploys the production app
```

#### Step 5: Verify Production Deployment

```bash
# Open production app
flyctl open --app tot-printfarm-prod

# Check status
flyctl status --app tot-printfarm-prod
```

**Checkpoint**: You now have TWO separate environments running:
- Testing: `https://tot-printfarm-test.fly.dev`
- Production: `https://tot-printfarm-prod.fly.dev`

---

### Part E: Configure Custom Domains (10 minutes)

Now let's add your custom domain names.

#### Step 1: Add Custom Domain to Testing App

```bash
# Add custom domain for testing
flyctl certs create printfarm-test.yourdomain.com --app tot-printfarm-test

# Fly.io will give you DNS instructions
# You'll see something like:
# "Add a CNAME record for printfarm-test.yourdomain.com pointing to tot-printfarm-test.fly.dev"
```

#### Step 2: Add Custom Domain to Production App

```bash
# Add custom domain for production
flyctl certs create printfarm.yourdomain.com --app tot-printfarm-prod

# You'll get similar DNS instructions
```

#### Step 3: Configure DNS Records

Now go to your domain's DNS settings (where you manage your domain - could be Namecheap, GoDaddy, Cloudflare, etc.)

**Add these two CNAME records:**

| Type  | Name              | Value (Points to)           | TTL  |
|-------|-------------------|-----------------------------|------|
| CNAME | printfarm-test    | tot-printfarm-test.fly.dev  | 3600 |
| CNAME | printfarm         | tot-printfarm-prod.fly.dev  | 3600 |

**Example for common DNS providers:**

**Cloudflare:**
1. Login to Cloudflare
2. Select your domain
3. Click "DNS"
4. Click "Add record"
5. Type: CNAME
6. Name: `printfarm-test`
7. Target: `tot-printfarm-test.fly.dev`
8. Proxy status: DNS only (gray cloud)
9. Save, then repeat for production

**Namecheap:**
1. Login to Namecheap
2. Domain List → Manage
3. Advanced DNS tab
4. Add New Record
5. Type: CNAME
6. Host: `printfarm-test`
7. Value: `tot-printfarm-test.fly.dev`
8. Save, then repeat for production

#### Step 4: Wait for DNS Propagation

```bash
# DNS changes take 5-30 minutes to propagate
# Check if your domain is working:

# Check testing domain
flyctl certs show printfarm-test.yourdomain.com --app tot-printfarm-test

# Check production domain
flyctl certs show printfarm.yourdomain.com --app tot-printfarm-prod

# When "Status" shows "Ready", your SSL certificate is active
```

#### Step 5: Verify Custom Domains

```bash
# Once DNS propagates, visit your custom URLs:
# https://printfarm-test.yourdomain.com
# https://printfarm.yourdomain.com

# Both should show your placeholder page with HTTPS (secure)
```

**Checkpoint**: Your apps should now be accessible via your custom domains with automatic HTTPS!

---

### Part F: Set Environment Variables (5 minutes)

Set environment-specific secrets and configuration.

#### For Testing Environment:

```bash
# Set secrets for testing
flyctl secrets set NODE_ENV=testing --app tot-printfarm-test

# Add any other secrets you need later (e.g., API keys)
# flyctl secrets set API_KEY=your-key --app tot-printfarm-test
```

#### For Production Environment:

```bash
# Set secrets for production
flyctl secrets set NODE_ENV=production --app tot-printfarm-prod

# Add any other secrets you need later
```

**Note**: Setting secrets automatically restarts the app.

---

### Part G: Verify Everything Works (5 minutes)

Let's make sure both environments are working correctly.

#### Test 1: Check Both Apps Are Running

```bash
# Check testing app
flyctl status --app tot-printfarm-test

# Check production app
flyctl status --app tot-printfarm-prod

# Both should show "Status: running"
```

#### Test 2: Access from iPad

On your iPad (connected to same network):
1. Open Safari
2. Visit `https://printfarm-test.yourdomain.com`
3. Should load the placeholder page
4. Visit `https://printfarm.yourdomain.com`
5. Should load the placeholder page

#### Test 3: Check Logs

```bash
# View testing logs
flyctl logs --app tot-printfarm-test

# View production logs
flyctl logs --app tot-printfarm-prod

# You should see "Server running" messages
```

#### Test 4: Verify Persistent Storage

```bash
# SSH into testing app
flyctl ssh console --app tot-printfarm-test

# Once inside, check the /data directory exists
ls -la /data

# Exit
exit

# Repeat for production if desired
```

**Checkpoint**: Both environments are running, accessible via custom domains, and have persistent storage!

---

### Part H: Ongoing Workflow - How to Deploy Updates

Once you start building the actual system, here's how to deploy updates:

#### For Testing Environment:

```bash
# 1. Make your code changes locally
# 2. Test locally: node src/server.js

# 3. Commit changes to git
git add .
git commit -m "Description of changes"
git push

# 4. Deploy to testing using test config
flyctl deploy --config fly.test.toml --app tot-printfarm-test

# 5. Test thoroughly on iPads using printfarm-test.yourdomain.com
# 6. If bugs found, fix and repeat from step 1
```

#### For Production Environment:

```bash
# Only deploy to production AFTER testing is successful!

# 1. Deploy to production using production config
flyctl deploy --config fly.toml --app tot-printfarm-prod

# 2. Monitor logs
flyctl logs --app tot-printfarm-prod

# 3. Verify on production URL: printfarm.yourdomain.com
```

#### Quick Deploy Commands (Save These)

```bash
# Deploy to testing
flyctl deploy --config fly.test.toml --app tot-printfarm-test

# Deploy to production
flyctl deploy --app tot-printfarm-prod

# View testing logs
flyctl logs --app tot-printfarm-test

# View production logs
flyctl logs --app tot-printfarm-prod

# Restart testing app
flyctl apps restart tot-printfarm-test

# Restart production app
flyctl apps restart tot-printfarm-prod
```

---

### Part I: Database Backup Strategy

Since your database is on persistent volumes, here's how to back it up:

#### Manual Backup (Testing)

```bash
# SSH into the app
flyctl ssh console --app tot-printfarm-test

# Inside the container, backup database
cp /data/printfarm.db /data/backup-$(date +%Y%m%d-%H%M%S).db

# Exit
exit

# Download backup to your computer
flyctl ssh sftp get /data/backup-*.db --app tot-printfarm-test
```

#### Manual Backup (Production)

```bash
# Same process for production
flyctl ssh console --app tot-printfarm-prod
cp /data/printfarm.db /data/backup-$(date +%Y%m%d-%H%M%S).db
exit
flyctl ssh sftp get /data/backup-*.db --app tot-printfarm-prod
```

**Recommended**: Set up automated daily backups once the system is in production (we can script this later).

---

### Part J: Monitoring & Maintenance

#### Check Usage (Stay Within Free Tier)

```bash
# View dashboard in browser
flyctl dashboard

# Or check specific app metrics
flyctl metrics --app tot-printfarm-test
flyctl metrics --app tot-printfarm-prod
```

#### Common Maintenance Commands

```bash
# View all your apps
flyctl apps list

# View app info
flyctl info --app tot-printfarm-test

# View volumes
flyctl volumes list --app tot-printfarm-test

# Scale up/down (if needed)
flyctl scale memory 512 --app tot-printfarm-prod

# View secrets (names only, not values)
flyctl secrets list --app tot-printfarm-test
```

---

### Troubleshooting

#### Issue: Deployment fails with "no space left on device"

**Solution**: Increase volume size:

```bash
# Create a new, larger volume
flyctl volumes create printfarm_data_test_new --size 2 --region sjc --app tot-printfarm-test

# Update fly.toml to use new volume
# Then redeploy
```

#### Issue: App shows 502 Bad Gateway

**Solution**: Check logs for errors:

```bash
flyctl logs --app tot-printfarm-test

# Common causes:
# - App crashed on startup
# - Wrong port configured (should be 8080)
# - Syntax error in code
```

#### Issue: Custom domain not working

**Solution**:

```bash
# 1. Verify DNS is configured correctly
nslookup printfarm-test.yourdomain.com

# Should show: tot-printfarm-test.fly.dev

# 2. Check certificate status
flyctl certs show printfarm-test.yourdomain.com --app tot-printfarm-test

# 3. If stuck, remove and re-add:
flyctl certs remove printfarm-test.yourdomain.com --app tot-printfarm-test
flyctl certs create printfarm-test.yourdomain.com --app tot-printfarm-test
```

#### Issue: Database lost after deployment

**Solution**: Make sure mounts are configured correctly in fly.toml and volume exists:

```bash
# Check volumes exist
flyctl volumes list --app tot-printfarm-test

# Make sure fly.toml has [mounts] section
```

---

### Next Steps

You now have:
- ✅ Testing environment: `https://printfarm-test.yourdomain.com`
- ✅ Production environment: `https://printfarm.yourdomain.com`
- ✅ Both running 24/7 for free
- ✅ Persistent storage for databases
- ✅ Automatic HTTPS/SSL
- ✅ Deployment workflow ready

**What to do next:**
1. Start building the actual system (Phase 1: Database & Core Setup)
2. Deploy changes to testing first, then production
3. Set up automated backups (we'll do this in Phase 1)

---

## Document History

| Date       | Changes                                    | Author      |
|------------|--------------------------------------------|-------------|
| 2025-10-20 | Initial plan created                       | Claude      |
| 2025-10-20 | Added colors DB, platforms, ship-by dates  | Claude      |
| 2025-10-20 | Added subdomain hosting option             | Claude      |
| 2025-10-20 | Chose Fly.io hosting (free, dual-env)      | Claude      |
| 2025-10-20 | Added comprehensive deployment guide       | Claude      |
| 2025-10-20 | Added Admin view, order numbering, cost monitoring | Claude |
|            |                                            |             |

---

**This plan will be updated as the project evolves. All major decisions and changes should be documented here.**
