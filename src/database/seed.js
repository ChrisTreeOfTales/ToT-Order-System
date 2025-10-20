/**
 * Database Seed Script
 *
 * This script populates the database with initial data:
 * - Colors from colors.csv file
 * - Sample parts for testing
 *
 * Usage: npm run db:seed
 */

const fs = require('fs');
const path = require('path');
const { db } = require('./db');

/**
 * Parse CSV file into array of objects
 *
 * @param {string} filePath - Path to CSV file
 * @returns {Array} Array of objects with CSV data
 */
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(line => {
    // Filter out empty lines and comments
    return line.trim() && !line.trim().startsWith('#');
  });

  // First line is the header
  const headers = lines[0].split(',').map(h => h.trim());

  // Parse remaining lines
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || null;
      });
      data.push(row);
    }
  }

  return data;
}

/**
 * Seed colors from colors.csv file
 */
function seedColors() {
  console.log('Seeding colors from colors.csv...');

  // Parse colors.csv
  const colorsPath = path.join(__dirname, '../../colors.csv');
  const colors = parseCSV(colorsPath);

  // Prepare insert statement
  const insertColor = db.prepare(`
    INSERT OR REPLACE INTO colors (color_name, hex_code, pantone_code, is_active)
    VALUES (?, ?, ?, 1)
  `);

  // Insert all colors in a transaction for speed and atomicity
  const insertMany = db.transaction((colors) => {
    for (const color of colors) {
      // Skip if color_name is empty
      if (!color.color_name) continue;

      insertColor.run(
        color.color_name,
        color.hex_code,
        color.pantone_code || null
      );
    }
  });

  // Execute transaction
  insertMany(colors);

  console.log(`✓ Seeded ${colors.length} colors`);

  // Display imported colors
  const allColors = db.prepare('SELECT color_name, hex_code FROM colors ORDER BY color_name').all();
  console.log('Imported colors:');
  allColors.forEach(color => {
    console.log(`  - ${color.color_name} (${color.hex_code})`);
  });
}

/**
 * Seed sample parts for testing
 */
function seedParts() {
  console.log('Seeding sample parts...');

  const sampleParts = [
    { name: 'Base Layer', description: 'Main base layer for the print' },
    { name: 'Detail Layer', description: 'Fine detail overlay' },
    { name: 'Text Layer', description: 'Text and typography layer' },
    { name: 'Background', description: 'Background pattern or solid' },
    { name: 'Border', description: 'Border or frame element' }
  ];

  const insertPart = db.prepare(`
    INSERT OR REPLACE INTO parts (part_name, description, is_active)
    VALUES (?, ?, 1)
  `);

  const insertMany = db.transaction((parts) => {
    for (const part of parts) {
      insertPart.run(part.name, part.description);
    }
  });

  insertMany(sampleParts);

  console.log(`✓ Seeded ${sampleParts.length} sample parts`);

  // Display imported parts
  const allParts = db.prepare('SELECT part_name, description FROM parts ORDER BY part_name').all();
  console.log('Imported parts:');
  allParts.forEach(part => {
    console.log(`  - ${part.part_name}: ${part.description}`);
  });
}

/**
 * Main seed function
 */
function seed() {
  console.log('Starting database seed...\n');

  try {
    // Check if colors already exist
    const colorCount = db.prepare('SELECT COUNT(*) as count FROM colors').get().count;
    if (colorCount > 0) {
      console.log(`⚠️  Database already has ${colorCount} colors. Skipping color seed.`);
      console.log('   To re-seed, delete the database file and run npm run db:seed again.\n');
    } else {
      seedColors();
    }

    // Check if parts already exist
    const partCount = db.prepare('SELECT COUNT(*) as count FROM parts').get().count;
    if (partCount > 0) {
      console.log(`⚠️  Database already has ${partCount} parts. Skipping parts seed.`);
    } else {
      seedParts();
    }

    console.log('\n✓ Database seed completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  seed();
}

module.exports = { seed, seedColors, seedParts };
