/**
 * Admin Routes
 *
 * Handles all admin-related routes:
 * - /admin - Main admin page
 * - /admin/colors - Color management API
 * - /admin/parts - Part management API
 */

const Color = require('../models/Color');
const Part = require('../models/Part');

async function adminRoutes(fastify, options) {
  // ============================================================================
  // ADMIN PAGE
  // ============================================================================

  /**
   * GET /admin
   * Main admin page with tabs for Colors and Parts management
   */
  fastify.get('/admin', async (request, reply) => {
    const colors = Color.getAll();
    const parts = Part.getAll();

    return reply.view('admin.ejs', {
      colors,
      parts,
      title: 'Admin - Colors & Parts Management'
    });
  });

  // ============================================================================
  // COLOR API ENDPOINTS
  // ============================================================================

  /**
   * GET /admin/api/colors
   * Get all colors (active by default, or all if includeInactive=true)
   */
  fastify.get('/admin/api/colors', async (request, reply) => {
    const includeInactive = request.query.includeInactive === 'true';
    const colors = Color.getAll(includeInactive);
    return { colors };
  });

  /**
   * GET /admin/api/colors/:id
   * Get a specific color by ID
   */
  fastify.get('/admin/api/colors/:id', async (request, reply) => {
    const color = Color.getById(request.params.id);
    if (!color) {
      return reply.code(404).send({ error: 'Color not found' });
    }
    return { color };
  });

  /**
   * POST /admin/api/colors
   * Create a new color
   *
   * Body parameters:
   * - color_name (required)
   * - hex_code (required)
   * - pantone_code (optional)
   * - material_type (optional)
   * - supplier (optional)
   * - category (optional)
   * - cost_per_gram (optional)
   * - stock_grams (optional)
   */
  fastify.post('/admin/api/colors', async (request, reply) => {
    try {
      const colorData = request.body;

      // Validation
      if (!colorData.color_name || !colorData.hex_code) {
        return reply.code(400).send({
          error: 'color_name and hex_code are required'
        });
      }

      const color = Color.create(colorData);
      return reply.code(201).send({ color, message: 'Color created successfully' });
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        return reply.code(409).send({ error: 'Color with this name already exists' });
      }
      throw error;
    }
  });

  /**
   * PUT /admin/api/colors/:id
   * Update an existing color
   *
   * Body parameters: Same as POST
   */
  fastify.put('/admin/api/colors/:id', async (request, reply) => {
    try {
      const colorData = request.body;

      // Validation
      if (!colorData.color_name || !colorData.hex_code) {
        return reply.code(400).send({
          error: 'color_name and hex_code are required'
        });
      }

      const color = Color.update(request.params.id, colorData);
      if (!color) {
        return reply.code(404).send({ error: 'Color not found' });
      }

      return { color, message: 'Color updated successfully' };
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        return reply.code(409).send({ error: 'Color with this name already exists' });
      }
      throw error;
    }
  });

  /**
   * DELETE /admin/api/colors/:id
   * Deactivate a color (soft delete)
   */
  fastify.delete('/admin/api/colors/:id', async (request, reply) => {
    const success = Color.deactivate(request.params.id);
    if (!success) {
      return reply.code(404).send({ error: 'Color not found' });
    }
    return { message: 'Color deactivated successfully' };
  });

  /**
   * POST /admin/api/colors/:id/activate
   * Reactivate a deactivated color
   */
  fastify.post('/admin/api/colors/:id/activate', async (request, reply) => {
    const success = Color.activate(request.params.id);
    if (!success) {
      return reply.code(404).send({ error: 'Color not found' });
    }
    return { message: 'Color activated successfully' };
  });

  // ============================================================================
  // PART API ENDPOINTS
  // ============================================================================

  /**
   * GET /admin/api/parts
   * Get all parts (active by default, or all if includeInactive=true)
   */
  fastify.get('/admin/api/parts', async (request, reply) => {
    const includeInactive = request.query.includeInactive === 'true';
    const parts = Part.getAll(includeInactive);
    return { parts };
  });

  /**
   * GET /admin/api/parts/:id
   * Get a specific part by ID
   */
  fastify.get('/admin/api/parts/:id', async (request, reply) => {
    const part = Part.getById(request.params.id);
    if (!part) {
      return reply.code(404).send({ error: 'Part not found' });
    }
    return { part };
  });

  /**
   * POST /admin/api/parts
   * Create a new part
   *
   * Body parameters:
   * - part_code (required) - Unique SKU code
   * - part_name (required)
   * - description (optional)
   */
  fastify.post('/admin/api/parts', async (request, reply) => {
    try {
      const partData = request.body;

      // Validation
      if (!partData.part_code || !partData.part_name) {
        return reply.code(400).send({
          error: 'part_code and part_name are required'
        });
      }

      const part = Part.create(partData);
      return reply.code(201).send({ part, message: 'Part created successfully' });
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        return reply.code(409).send({ error: 'Part with this code or name already exists' });
      }
      throw error;
    }
  });

  /**
   * PUT /admin/api/parts/:id
   * Update an existing part
   *
   * Body parameters: Same as POST
   */
  fastify.put('/admin/api/parts/:id', async (request, reply) => {
    try {
      const partData = request.body;

      // Validation
      if (!partData.part_code || !partData.part_name) {
        return reply.code(400).send({
          error: 'part_code and part_name are required'
        });
      }

      const part = Part.update(request.params.id, partData);
      if (!part) {
        return reply.code(404).send({ error: 'Part not found' });
      }

      return { part, message: 'Part updated successfully' };
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        return reply.code(409).send({ error: 'Part with this code or name already exists' });
      }
      throw error;
    }
  });

  /**
   * DELETE /admin/api/parts/:id
   * Deactivate a part (soft delete)
   */
  fastify.delete('/admin/api/parts/:id', async (request, reply) => {
    const success = Part.deactivate(request.params.id);
    if (!success) {
      return reply.code(404).send({ error: 'Part not found' });
    }
    return { message: 'Part deactivated successfully' };
  });

  /**
   * POST /admin/api/parts/:id/activate
   * Reactivate a deactivated part
   */
  fastify.post('/admin/api/parts/:id/activate', async (request, reply) => {
    const success = Part.activate(request.params.id);
    if (!success) {
      return reply.code(404).send({ error: 'Part not found' });
    }
    return { message: 'Part activated successfully' };
  });
}

module.exports = adminRoutes;
