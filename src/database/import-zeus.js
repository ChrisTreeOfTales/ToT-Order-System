/**
 * Import ZEUS Database Data
 *
 * This script imports colors and parts from the existing ZEUS database
 * into the new print farm management system.
 *
 * Usage: node src/database/import-zeus.js
 */

const Database = require('better-sqlite3');
const path = require('path');

// Path to ZEUS database
const ZEUS_DB_PATH = '/Users/treeoftales/Documents/ToT Code/ToT-ZEUS/database/zeus.db';

// Path to print farm database
const PRINTFARM_DB_PATH = path.join(__dirname, '../../printfarm.db');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  ToT Print Farm - Import ZEUS Data                        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

try {
  // Open ZEUS database (read-only)
  console.log('Opening ZEUS database...');
  const zeusDb = new Database(ZEUS_DB_PATH, { readonly: true });
  console.log('✓ ZEUS database opened\n');

  // Open print farm database
  console.log('Opening Print Farm database...');
  const printfarmDb = new Database(PRINTFARM_DB_PATH);
  printfarmDb.pragma('foreign_keys = ON');
  console.log('✓ Print Farm database opened\n');

  // Import Colors
  console.log('─────────────────────────────────────────────────────────────');
  console.log('Importing Colors from ZEUS...');
  console.log('─────────────────────────────────────────────────────────────\n');

  const zeusColors = zeusDb.prepare(`
    SELECT
      name,
      hex_code,
      material_type,
      supplier,
      category,
      cost_per_gram,
      stock_grams
    FROM colors
    ORDER BY name
  `).all();

  console.log(`Found ${zeusColors.length} colors in ZEUS database\n`);

  // Clear existing colors first (for clean import)
  printfarmDb.prepare('DELETE FROM colors').run();
  console.log('✓ Cleared existing colors\n');

  const insertColor = printfarmDb.prepare(`
    INSERT INTO colors (
      color_name,
      hex_code,
      material_type,
      supplier,
      category,
      cost_per_gram,
      stock_grams,
      is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const importColors = printfarmDb.transaction((colors) => {
    for (const color of colors) {
      insertColor.run(
        color.name,
        color.hex_code,
        color.material_type,
        color.supplier,
        color.category,
        color.cost_per_gram,
        color.stock_grams
      );
      console.log(`  ✓ Imported: ${color.name} (${color.material_type} - ${color.supplier})`);
    }
  });

  importColors(zeusColors);
  console.log(`\n✓ Successfully imported ${zeusColors.length} colors\n`);

  // Import Parts
  console.log('─────────────────────────────────────────────────────────────');
  console.log('Importing Parts from ZEUS...');
  console.log('─────────────────────────────────────────────────────────────\n');

  const zeusParts = zeusDb.prepare(`
    SELECT
      part_id,
      part_name,
      notes
    FROM standalone_parts
    ORDER BY part_name
  `).all();

  console.log(`Found ${zeusParts.length} parts in ZEUS database\n`);

  // Clear existing parts first (for clean import)
  printfarmDb.prepare('DELETE FROM parts').run();
  console.log('✓ Cleared existing parts\n');

  const insertPart = printfarmDb.prepare(`
    INSERT INTO parts (
      part_code,
      part_name,
      description,
      is_active
    ) VALUES (?, ?, ?, 1)
  `);

  const importParts = printfarmDb.transaction((parts) => {
    for (const part of parts) {
      insertPart.run(
        part.part_id,
        part.part_name,
        part.notes || ''
      );
      console.log(`  ✓ Imported: ${part.part_id} - ${part.part_name}`);
    }
  });

  importParts(zeusParts);
  console.log(`\n✓ Successfully imported ${zeusParts.length} parts\n`);

  // Summary
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Import Complete!                                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const colorCount = printfarmDb.prepare('SELECT COUNT(*) as count FROM colors').get().count;
  const partCount = printfarmDb.prepare('SELECT COUNT(*) as count FROM parts').get().count;

  console.log(`Total Colors: ${colorCount}`);
  console.log(`Total Parts:  ${partCount}\n`);

  // Close databases
  zeusDb.close();
  printfarmDb.close();

  console.log('✓ Databases closed\n');
  console.log('You can now start the server with: npm start\n');

} catch (error) {
  console.error('❌ Import failed:', error);
  process.exit(1);
}
