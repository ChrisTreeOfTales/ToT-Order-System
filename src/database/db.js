/**
 * Database Connection and Configuration
 *
 * This module sets up the SQLite database connection using better-sqlite3
 * with proper configuration for concurrent access and data integrity.
 *
 * Key features:
 * - Write-Ahead Logging (WAL) mode for better concurrent read/write
 * - Foreign key enforcement
 * - Synchronous operations for simplicity and reliability
 * - Database integrity checks on startup
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Determine database path based on environment
// In production (Fly.io), database is stored in /data volume
// In development, database is stored in project root
const DB_PATH = process.env.NODE_ENV === 'production'
  ? '/data/printfarm.db'
  : path.join(__dirname, '../../printfarm.db');

// Ensure the directory exists (for production /data mount)
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

/**
 * Initialize database connection with optimal settings
 *
 * @returns {Database} Better-sqlite3 database instance
 */
function initializeDatabase() {
  console.log(`Initializing database at: ${DB_PATH}`);

  // Create database connection
  // verbose: Log all SQL queries in development
  const db = new Database(DB_PATH, {
    verbose: process.env.NODE_ENV === 'development' ? console.log : null
  });

  // Enable Write-Ahead Logging (WAL) mode
  // This allows multiple readers to access the database while a write is in progress
  // Much better for concurrent access than the default DELETE mode
  db.pragma('journal_mode = WAL');
  console.log('✓ Enabled WAL mode for better concurrent access');

  // Enable foreign key constraints
  // SQLite doesn't enforce foreign keys by default - we need to turn them on
  db.pragma('foreign_keys = ON');
  console.log('✓ Enabled foreign key constraints');

  // Set synchronous mode to NORMAL for better performance
  // NORMAL is safe with WAL mode and provides good balance of safety and speed
  db.pragma('synchronous = NORMAL');
  console.log('✓ Set synchronous mode to NORMAL');

  // Run integrity check to ensure database is not corrupted
  const integrityCheck = db.pragma('integrity_check');
  if (integrityCheck[0].integrity_check !== 'ok') {
    console.error('❌ Database integrity check failed!', integrityCheck);
    throw new Error('Database integrity check failed');
  }
  console.log('✓ Database integrity check passed');

  // Verify foreign keys are working
  const foreignKeyCheck = db.pragma('foreign_key_check');
  if (foreignKeyCheck.length > 0) {
    console.error('❌ Foreign key violations detected!', foreignKeyCheck);
    throw new Error('Foreign key violations detected');
  }
  console.log('✓ Foreign key check passed');

  return db;
}

/**
 * Initialize database schema from schema.sql file
 *
 * @param {Database} db - Database instance
 */
function initializeSchema(db) {
  console.log('Initializing database schema...');

  // Read schema file
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  // Execute schema (creates all tables, indexes, triggers, views)
  db.exec(schema);

  console.log('✓ Database schema initialized successfully');
}

/**
 * Check if database has been initialized (has tables)
 *
 * @param {Database} db - Database instance
 * @returns {boolean} True if database has tables
 */
function isDatabaseInitialized(db) {
  // Check if the 'orders' table exists
  const result = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name='orders'
  `).get();

  return result !== undefined;
}

/**
 * Get database statistics for monitoring
 *
 * @param {Database} db - Database instance
 * @returns {Object} Database statistics
 */
function getDatabaseStats(db) {
  const stats = {
    // Get database file size
    size: fs.statSync(DB_PATH).size,

    // Get row counts for main tables
    orders: db.prepare('SELECT COUNT(*) as count FROM orders').get().count,
    products: db.prepare('SELECT COUNT(*) as count FROM products').get().count,
    items: db.prepare('SELECT COUNT(*) as count FROM items').get().count,
    colors: db.prepare('SELECT COUNT(*) as count FROM colors').get().count,
    parts: db.prepare('SELECT COUNT(*) as count FROM parts').get().count,

    // Get active orders count
    activeOrders: db.prepare('SELECT COUNT(*) as count FROM orders WHERE is_archived = 0').get().count,

    // Get WAL checkpoint info
    walInfo: db.pragma('wal_checkpoint(PASSIVE)')
  };

  return stats;
}

// Create and export the database instance
const db = initializeDatabase();

// Check if database needs initialization
if (!isDatabaseInitialized(db)) {
  console.log('Database not initialized. Running schema initialization...');
  initializeSchema(db);
} else {
  console.log('✓ Database already initialized');
}

// Log database statistics
const stats = getDatabaseStats(db);
console.log('Database statistics:', {
  size: `${(stats.size / 1024).toFixed(2)} KB`,
  orders: stats.orders,
  products: stats.products,
  items: stats.items,
  colors: stats.colors,
  parts: stats.parts,
  activeOrders: stats.activeOrders
});

// Export database instance and utility functions
module.exports = {
  db,
  getDatabaseStats,
  initializeSchema,
  DB_PATH
};
