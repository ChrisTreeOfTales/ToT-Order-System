/**
 * Seed Production Data
 *
 * This script seeds the database with production colors and parts data.
 * It's designed to run on Fly.io or any production environment.
 *
 * Usage: node src/database/seed-production.js
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database path - use /data for Fly.io production, local for development
const DB_PATH = process.env.NODE_ENV === 'production'
  ? '/data/printfarm.db'
  : path.join(__dirname, '../../printfarm.db');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  ToT Print Farm - Seed Production Data                   ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Database: ${DB_PATH}\n`);

// Production Colors Data
const COLORS = [
  { name: "ABS Black", hex: "#000000", material: "ABS", supplier: "Hatchbox", category: "Engineering", cost: 0.03, stock: 0 },
  { name: "Army Green", hex: "#68724D", material: "PLA", supplier: "Bambu Lab", category: "Matte", cost: 0.12, stock: 0 },
  { name: "Black", hex: "#000000", material: "PLA", supplier: "Bambu Lab", category: "Basic", cost: 0.12, stock: 0 },
  { name: "Blue", hex: "#0078BF", material: "PLA", supplier: "Bambu Lab", category: "Matte", cost: 0.12, stock: 0 },
  { name: "Bright Green", hex: "#BECF00", material: "PLA", supplier: "Bambu Lab", category: "Basic", cost: 0.12, stock: 0 },
  { name: "Brown", hex: "#7D6556", material: "PLA", supplier: "Bambu Lab", category: "Matte", cost: 0.12, stock: 0 },
  { name: "Copper", hex: "#5E4B3C", material: "PLA", supplier: "Bambu Lab", category: "Silk", cost: 0.2, stock: 0 },
  { name: "Cyan", hex: "#00B1B7", material: "PLA", supplier: "Bambu Lab", category: "Basic", cost: 0.12, stock: 0 },
  { name: "Dark Blue", hex: "#042F56", material: "PLA", supplier: "Bambu Lab", category: "Matte", cost: 0.12, stock: 0 },
  { name: "Dark Grey", hex: "#545454", material: "PLA", supplier: "Bambu Lab", category: "Basic", cost: 0.12, stock: 0 },
  { name: "Dark Purple", hex: "#482960", material: "PLA", supplier: "Bambu Lab", category: "Basic", cost: 0.12, stock: 0 },
  { name: "Dark Red", hex: "#9D2235", material: "PLA", supplier: "Bambu Lab", category: "Basic", cost: 0.12, stock: 0 },
  { name: "Dark Silver", hex: "#5F6367", material: "PLA", supplier: "Bambu Lab", category: "Silk+", cost: 0.2, stock: 0 },
  { name: "Gold", hex: "#F4A925", material: "PLA", supplier: "Bambu Lab", category: "Silk", cost: 0.2, stock: 0 },
  { name: "Green", hex: "#3F8E43", material: "PLA", supplier: "Bambu Lab", category: "Basic", cost: 0.12, stock: 0 },
  { name: "Grey", hex: "#9B9EA0", material: "PLA", supplier: "Bambu Lab", category: "Matte", cost: 0.12, stock: 0 },
  { name: "Light Blue", hex: "#A3D8E1", material: "PLA", supplier: "Bambu Lab", category: "Matte", cost: 0.12, stock: 0 },
  { name: "Light Brown", hex: "#D3B7A7", material: "PLA", supplier: "Bambu Lab", category: "Matte", cost: 0.12, stock: 0 },
  { name: "Neon Green", hex: "#00AE42", material: "PLA", supplier: "Bambu Lab", category: "Basic", cost: 0.12, stock: 0 },
  { name: "Neon Orange", hex: "#FF6A13", material: "PLA", supplier: "Bambu Lab", category: "Basic", cost: 0.12, stock: 0 },
  { name: "Neon Pink", hex: "#EC008C", material: "PLA", supplier: "Bambu Lab", category: "Basic", cost: 0.12, stock: 0 },
  { name: "Orange", hex: "#F99963", material: "PLA", supplier: "Bambu Lab", category: "Matte", cost: 0.12, stock: 0 },
  { name: "PETG Clear", hex: "#FFFFFF", material: "PETG", supplier: "SUNLU", category: "Engineering", cost: 0.035, stock: 0 },
  { name: "PLA Black", hex: "#000000", material: "PLA", supplier: "Hatchbox", category: "Standard", cost: 0.025, stock: 0 },
  { name: "PLA Blue", hex: "#0000FF", material: "PLA", supplier: "SUNLU", category: "Standard", cost: 0.025, stock: 0 },
  { name: "PLA Red", hex: "#FF0000", material: "PLA", supplier: "SUNLU", category: "Standard", cost: 0.025, stock: 0 },
  { name: "PLA White", hex: "#FFFFFF", material: "PLA", supplier: "Hatchbox", category: "Standard", cost: 0.025, stock: 0 },
  { name: "Pink", hex: "#E8AFCF", material: "PLA", supplier: "Bambu Lab", category: "Matte", cost: 0.12, stock: 0 },
  { name: "Purple", hex: "#8A30CF", material: "PLA", supplier: "PolyTerra", category: "Matte", cost: 0.22, stock: 0 },
  { name: "Red", hex: "#DE4343", material: "PLA", supplier: "Bambu Lab", category: "Matte", cost: 0.12, stock: 0 },
  { name: "Silver", hex: "#C8C8C8", material: "PLA", supplier: "Bambu Lab", category: "Silk+", cost: 0.2, stock: 0 },
  { name: "Yellow", hex: "#F7D959", material: "PLA", supplier: "Bambu Lab", category: "Matte", cost: 0.12, stock: 0 }
];

// Production Parts Data
const PARTS = [
  { code: "WM16001", name: "16mm Wound Marker 1D6", desc: "" },
  { code: "WM16002", name: "16mm Wound Marker 2D6", desc: "" },
  { code: "WM16003", name: "16mm Wound Marker 3D6", desc: "" },
  { code: "WM16004", name: "16mm Wound Marker 4D6", desc: "" },
  { code: "TOK0025", name: "25mm Token", desc: "Small token (25mm)" },
  { code: "LID40001", name: "4-Lid Border", desc: "" },
  { code: "LID40002", name: "4-Lid Skull", desc: "" },
  { code: "BOX4L001", name: "4L Token Box", desc: "" },
  { code: "BOX4M001", name: "4M Token Box", desc: "" },
  { code: "LID50001", name: "5-Lid Border", desc: "" },
  { code: "LID50PLAGUE", name: "5-Lid Plague", desc: "" },
  { code: "LID50002", name: "5-Lid Skull", desc: "" },
  { code: "TOK0054", name: "54mm Token", desc: "Large token (54mm)" },
  { code: "BOX5L001", name: "5L Token Box", desc: "" },
  { code: "BOX5M001", name: "5M Token Box", desc: "" },
  { code: "LID60001", name: "6-Lid Border", desc: "" },
  { code: "LID60002", name: "6-Lid Skull", desc: "" },
  { code: "BOX6L001", name: "6L Token Box", desc: "" },
  { code: "BOX6M001", name: "6M Token Box", desc: "" },
  { code: "BOX6XL01", name: "6XL Token Box", desc: "" }
];

try {
  // Open database
  console.log('Opening database...');
  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');
  console.log('✓ Database opened\n');

  // Check if data already exists
  const colorCount = db.prepare('SELECT COUNT(*) as count FROM colors').get().count;
  const partCount = db.prepare('SELECT COUNT(*) as count FROM parts').get().count;

  if (colorCount > 0 || partCount > 0) {
    console.log(`⚠️  Database already contains data:`);
    console.log(`   - ${colorCount} colors`);
    console.log(`   - ${partCount} parts`);
    console.log('\nTo re-seed, you need to manually clear the database first.\n');
    console.log('Run this SQL to clear:');
    console.log('  DELETE FROM colors;');
    console.log('  DELETE FROM parts;\n');
    process.exit(0);
  }

  // Import Colors
  console.log('─────────────────────────────────────────────────────────────');
  console.log('Seeding Colors...');
  console.log('─────────────────────────────────────────────────────────────\n');

  const insertColor = db.prepare(`
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

  const seedColors = db.transaction((colors) => {
    for (const color of colors) {
      insertColor.run(
        color.name,
        color.hex,
        color.material,
        color.supplier,
        color.category,
        color.cost,
        color.stock
      );
      console.log(`  ✓ Seeded: ${color.name} (${color.material} - ${color.supplier})`);
    }
  });

  seedColors(COLORS);
  console.log(`\n✓ Successfully seeded ${COLORS.length} colors\n`);

  // Import Parts
  console.log('─────────────────────────────────────────────────────────────');
  console.log('Seeding Parts...');
  console.log('─────────────────────────────────────────────────────────────\n');

  const insertPart = db.prepare(`
    INSERT INTO parts (
      part_code,
      part_name,
      description,
      is_active
    ) VALUES (?, ?, ?, 1)
  `);

  const seedParts = db.transaction((parts) => {
    for (const part of parts) {
      insertPart.run(
        part.code,
        part.name,
        part.desc
      );
      console.log(`  ✓ Seeded: ${part.code} - ${part.name}`);
    }
  });

  seedParts(PARTS);
  console.log(`\n✓ Successfully seeded ${PARTS.length} parts\n`);

  // Summary
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Seed Complete!                                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const finalColorCount = db.prepare('SELECT COUNT(*) as count FROM colors').get().count;
  const finalPartCount = db.prepare('SELECT COUNT(*) as count FROM parts').get().count;

  console.log(`Total Colors: ${finalColorCount}`);
  console.log(`Total Parts:  ${finalPartCount}\n`);

  // Close database
  db.close();
  console.log('✓ Database closed\n');
  console.log('Production data seeded successfully!\n');

} catch (error) {
  console.error('❌ Seed failed:', error);
  process.exit(1);
}
