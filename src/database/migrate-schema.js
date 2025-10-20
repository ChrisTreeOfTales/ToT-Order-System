/**
 * Schema Migration Script
 * Applies schema updates to the local database
 * Checks if tables exist before creating them (safe to run multiple times)
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Database path (local development)
const DB_PATH = path.join(__dirname, '../../database/printfarm.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

console.log('='.repeat(60));
console.log('Schema Migration Tool');
console.log('='.repeat(60));
console.log(`Database: ${DB_PATH}`);
console.log(`Schema: ${SCHEMA_PATH}\n`);

// Check if database exists
if (!fs.existsSync(DB_PATH)) {
  console.error('❌ Database not found at:', DB_PATH);
  console.log('\nPlease run: npm run db:setup\n');
  process.exit(1);
}

// Open database connection
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL'); // Better concurrency
db.pragma('foreign_keys = ON');  // Enforce foreign keys

console.log('Connected to database\n');

// Read schema
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');

// Apply schema (CREATE IF NOT EXISTS ensures safe idempotent execution)
console.log('Applying schema updates...\n');
try {
  db.exec(schema);
  console.log('✓ Schema migration completed successfully\n');

  // Check what tables exist now
  const tables = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table'
    ORDER BY name
  `).all();

  console.log('Current database tables:');
  tables.forEach(table => {
    if (table.name !== 'sqlite_sequence') {
      console.log(`  ✓ ${table.name}`);
    }
  });

  // Check if new product_templates table exists
  const productTemplatesExists = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name='product_templates'
  `).get();

  if (productTemplatesExists) {
    console.log('\n✓ Product Templates table successfully created/verified');
  }

  const templatePartsExists = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name='template_parts'
  `).get();

  if (templatePartsExists) {
    console.log('✓ Template Parts junction table successfully created/verified');
  }

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
} finally {
  db.close();
}

console.log('\n' + '='.repeat(60));
console.log('Migration complete!');
console.log('='.repeat(60));
