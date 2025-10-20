/**
 * ProductTemplate Model
 *
 * Manages reusable product templates (Items) that can be composed of multiple Parts.
 * Each template defines:
 * - What parts make up the item (and how many of each)
 * - How many colors the item uses (1-4)
 * - Print time in minutes
 * - Print cost
 *
 * This allows creating Items from templates when entering orders, rather than
 * manually selecting parts every time.
 *
 * Example Templates:
 * - "4-Color Wound Marker Set" (16 markers + lid, 4 colors, 120 min, $2.50)
 * - "Token Box with 25 Tokens" (1 box + 25 tokens + lid, 2 colors, 90 min, $3.00)
 */

const Database = require('better-sqlite3');
const path = require('path');

// Database connection
const DB_PATH = process.env.NODE_ENV === 'production'
  ? '/data/printfarm.db'
  : path.join(__dirname, '../../printfarm.db');

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

/**
 * Get all product templates
 * @param {boolean} includeInactive - Include deactivated templates (default: false)
 * @returns {Array} Array of template objects with their constituent parts
 */
function getAll(includeInactive = false) {
  const query = `
    SELECT
      pt.*,
      COUNT(tp.part_id) as part_count,
      GROUP_CONCAT(
        json_object(
          'part_id', p.part_id,
          'part_code', p.part_code,
          'part_name', p.part_name,
          'quantity', tp.quantity
        )
      ) as parts_json
    FROM product_templates pt
    LEFT JOIN template_parts tp ON pt.template_id = tp.template_id
    LEFT JOIN parts p ON tp.part_id = p.part_id
    ${includeInactive ? '' : 'WHERE pt.is_active = 1'}
    GROUP BY pt.template_id
    ORDER BY pt.template_name
  `;

  const templates = db.prepare(query).all();

  // Parse the JSON parts data
  return templates.map(template => ({
    ...template,
    parts: template.parts_json
      ? JSON.parse(`[${template.parts_json}]`)
      : []
  }));
}

/**
 * Get a single product template by ID with all parts
 * @param {number} templateId - The template ID
 * @returns {object|null} Template object with parts array, or null if not found
 */
function getById(templateId) {
  const template = db.prepare(`
    SELECT * FROM product_templates WHERE template_id = ?
  `).get(templateId);

  if (!template) {
    return null;
  }

  // Get all parts for this template
  const parts = db.prepare(`
    SELECT
      p.part_id,
      p.part_code,
      p.part_name,
      p.description,
      tp.quantity
    FROM template_parts tp
    JOIN parts p ON tp.part_id = p.part_id
    WHERE tp.template_id = ?
    ORDER BY p.part_name
  `).all(templateId);

  return {
    ...template,
    parts
  };
}

/**
 * Create a new product template with its parts
 * @param {object} templateData - Template data
 * @param {string} templateData.template_name - Unique template name
 * @param {string} templateData.description - Optional description
 * @param {number} templateData.num_colors - Number of colors (1-4)
 * @param {number} templateData.print_time_minutes - Print time in minutes
 * @param {number} templateData.print_cost - Print cost in dollars
 * @param {Array} templateData.parts - Array of {part_id, quantity} objects
 * @returns {object} The created template with ID
 */
function create(templateData) {
  const { template_name, description, num_colors, print_time_minutes, print_cost, parts } = templateData;

  // Validate required fields
  if (!template_name) {
    throw new Error('template_name is required');
  }
  if (!num_colors || num_colors < 1 || num_colors > 4) {
    throw new Error('num_colors must be between 1 and 4');
  }

  // Use a transaction to ensure template and parts are created together
  const transaction = db.transaction(() => {
    // Create the template
    const stmt = db.prepare(`
      INSERT INTO product_templates (
        template_name, description, num_colors,
        print_time_minutes, print_cost, is_active
      ) VALUES (?, ?, ?, ?, ?, 1)
    `);

    const result = stmt.run(
      template_name,
      description || null,
      num_colors,
      print_time_minutes || 0,
      print_cost || 0.00
    );

    const templateId = result.lastInsertRowid;

    // Add parts to the template (if any provided)
    if (parts && parts.length > 0) {
      const partStmt = db.prepare(`
        INSERT INTO template_parts (template_id, part_id, quantity)
        VALUES (?, ?, ?)
      `);

      for (const part of parts) {
        partStmt.run(templateId, part.part_id, part.quantity || 1);
      }
    }

    return templateId;
  });

  const templateId = transaction();
  return getById(templateId);
}

/**
 * Update an existing product template
 * NOTE: This updates template metadata only, not the parts.
 * Use addPart() and removePart() to modify parts.
 *
 * @param {number} templateId - The template ID
 * @param {object} updates - Fields to update
 * @returns {boolean} True if updated, false if not found
 */
function update(templateId, updates) {
  const allowedFields = [
    'template_name', 'description', 'num_colors',
    'print_time_minutes', 'print_cost'
  ];

  const fields = Object.keys(updates).filter(field => allowedFields.includes(field));

  if (fields.length === 0) {
    return false;
  }

  const setClause = fields.map(field => `${field} = ?`).join(', ');
  const values = fields.map(field => updates[field]);

  const stmt = db.prepare(`
    UPDATE product_templates
    SET ${setClause}, updated_at = CURRENT_TIMESTAMP
    WHERE template_id = ?
  `);

  const result = stmt.run(...values, templateId);
  return result.changes > 0;
}

/**
 * Add a part to a template (or update quantity if already exists)
 * @param {number} templateId - The template ID
 * @param {number} partId - The part ID to add
 * @param {number} quantity - Quantity of this part (default: 1)
 * @returns {boolean} True if added/updated
 */
function addPart(templateId, partId, quantity = 1) {
  const stmt = db.prepare(`
    INSERT INTO template_parts (template_id, part_id, quantity)
    VALUES (?, ?, ?)
    ON CONFLICT(template_id, part_id)
    DO UPDATE SET quantity = excluded.quantity
  `);

  const result = stmt.run(templateId, partId, quantity);
  return result.changes > 0;
}

/**
 * Remove a part from a template
 * @param {number} templateId - The template ID
 * @param {number} partId - The part ID to remove
 * @returns {boolean} True if removed
 */
function removePart(templateId, partId) {
  const stmt = db.prepare(`
    DELETE FROM template_parts
    WHERE template_id = ? AND part_id = ?
  `);

  const result = stmt.run(templateId, partId);
  return result.changes > 0;
}

/**
 * Update the quantity of a part in a template
 * @param {number} templateId - The template ID
 * @param {number} partId - The part ID
 * @param {number} quantity - New quantity
 * @returns {boolean} True if updated
 */
function updatePartQuantity(templateId, partId, quantity) {
  const stmt = db.prepare(`
    UPDATE template_parts
    SET quantity = ?
    WHERE template_id = ? AND part_id = ?
  `);

  const result = stmt.run(quantity, templateId, partId);
  return result.changes > 0;
}

/**
 * Deactivate a product template (soft delete)
 * Deactivated templates won't show in default lists but remain in database
 * @param {number} templateId - The template ID
 * @returns {boolean} True if deactivated, false if not found
 */
function deactivate(templateId) {
  const stmt = db.prepare('UPDATE product_templates SET is_active = 0 WHERE template_id = ?');
  const result = stmt.run(templateId);
  return result.changes > 0;
}

/**
 * Reactivate a deactivated product template
 * @param {number} templateId - The template ID
 * @returns {boolean} True if activated, false if not found
 */
function activate(templateId) {
  const stmt = db.prepare('UPDATE product_templates SET is_active = 1 WHERE template_id = ?');
  const result = stmt.run(templateId);
  return result.changes > 0;
}

/**
 * Search product templates by name
 * @param {string} searchTerm - Search term
 * @param {boolean} includeInactive - Include deactivated templates
 * @returns {Array} Matching templates
 */
function search(searchTerm, includeInactive = false) {
  const query = `
    SELECT * FROM product_templates
    WHERE template_name LIKE ?
    ${includeInactive ? '' : 'AND is_active = 1'}
    ORDER BY template_name
  `;

  return db.prepare(query).all(`%${searchTerm}%`);
}

/**
 * Delete a product template permanently
 * WARNING: This is a hard delete and cannot be undone
 * Use deactivate() instead for normal operations
 * @param {number} templateId - The template ID
 * @returns {boolean} True if deleted
 */
function deleteTemplate(templateId) {
  // CASCADE will automatically delete template_parts entries
  const stmt = db.prepare('DELETE FROM product_templates WHERE template_id = ?');
  const result = stmt.run(templateId);
  return result.changes > 0;
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  addPart,
  removePart,
  updatePartQuantity,
  deactivate,
  activate,
  search,
  delete: deleteTemplate
};
