/**
 * Database Setup Script
 *
 * This script initializes the database and seeds it with initial data.
 * Run this once after initial installation.
 *
 * Usage: npm run db:setup
 */

const { db, initializeSchema } = require('./db');
const { seed } = require('./seed');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  ToT Print Farm - Database Setup                          ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

try {
  console.log('Step 1: Initializing database schema...');
  initializeSchema(db);
  console.log('✓ Schema initialized\n');

  console.log('Step 2: Seeding initial data...');
  seed();
  console.log('\n✓ Setup complete!\n');

  console.log('You can now start the server with: npm start\n');
} catch (error) {
  console.error('❌ Setup failed:', error);
  process.exit(1);
}
