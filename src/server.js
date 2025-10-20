/**
 * ToT Print Farm Management System - Server
 *
 * Main server entry point. This starts the Fastify server and
 * initializes all routes and middleware.
 *
 * For now, this is a basic placeholder server to test deployment.
 * Full implementation will be added in Phase 3.
 */

const fastify = require('fastify')({ logger: true });
const path = require('path');

// Import database (this initializes the connection)
const { db, getDatabaseStats } = require('./database/db');

// Server configuration from environment variables
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Health check endpoint
 * Used by Fly.io to verify the app is running
 */
fastify.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV
  };
});

/**
 * Home page - Placeholder for now
 */
fastify.get('/', async (request, reply) => {
  // Get database statistics
  const stats = getDatabaseStats(db);

  // Get color count
  const colorCount = db.prepare('SELECT COUNT(*) as count FROM colors').get().count;
  const partCount = db.prepare('SELECT COUNT(*) as count FROM parts').get().count;

  // Return HTML page
  reply.type('text/html');
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ToT Print Farm System</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          padding: 40px;
          max-width: 600px;
          width: 100%;
        }
        h1 {
          color: #333;
          margin-bottom: 10px;
          font-size: 32px;
        }
        .subtitle {
          color: #666;
          margin-bottom: 30px;
          font-size: 16px;
        }
        .status {
          background: #10b981;
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          margin-bottom: 30px;
          font-weight: 600;
        }
        .info {
          background: #f3f4f6;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .info h3 {
          color: #333;
          margin-bottom: 15px;
          font-size: 18px;
        }
        .stat {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .stat:last-child {
          border-bottom: none;
        }
        .stat-label {
          color: #666;
          font-weight: 500;
        }
        .stat-value {
          color: #333;
          font-weight: 600;
        }
        .badge {
          display: inline-block;
          padding: 4px 12px;
          background: #667eea;
          color: white;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .footer {
          text-align: center;
          color: #999;
          margin-top: 30px;
          font-size: 14px;
        }
        .success {
          color: #10b981;
        }
        a {
          color: #667eea;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎨 ToT Print Farm System</h1>
        <p class="subtitle">Order Management & Production Tracking</p>

        <div class="status">
          ✓ Server is running successfully
        </div>

        <div class="info">
          <h3>Environment Information</h3>
          <div class="stat">
            <span class="stat-label">Environment:</span>
            <span class="stat-value"><span class="badge">${NODE_ENV}</span></span>
          </div>
          <div class="stat">
            <span class="stat-label">Node Version:</span>
            <span class="stat-value">${process.version}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Database:</span>
            <span class="stat-value class="success">✓ Connected</span>
          </div>
        </div>

        <div class="info">
          <h3>Database Statistics</h3>
          <div class="stat">
            <span class="stat-label">Colors Loaded:</span>
            <span class="stat-value">${colorCount}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Parts Available:</span>
            <span class="stat-value">${partCount}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Active Orders:</span>
            <span class="stat-value">${stats.activeOrders}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Total Items:</span>
            <span class="stat-value">${stats.items}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Database Size:</span>
            <span class="stat-value">${(stats.size / 1024).toFixed(2)} KB</span>
          </div>
        </div>

        ${colorCount === 0 ? `
        <div class="info" style="background: #fef3c7; border-left: 4px solid #f59e0b;">
          <p style="color: #92400e;">
            <strong>⚠️ No colors loaded yet.</strong><br>
            Run <code style="background: white; padding: 2px 6px; border-radius: 4px;">npm run db:seed</code> to import colors from colors.csv
          </p>
        </div>
        ` : ''}

        <div class="footer">
          <p>Full system implementation coming soon...</p>
          <p style="margin-top: 10px;">
            <a href="/health">Health Check</a> ·
            <a href="https://github.com/anthropics/claude-code" target="_blank">Built with Claude Code</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
});

/**
 * Start the server
 */
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║  🎨 ToT Print Farm Management System                      ║
║                                                            ║
║  Server running on http://${HOST}:${PORT}${' '.repeat(Math.max(0, 26 - HOST.length - PORT.toString().length))}║
║  Environment: ${NODE_ENV}${' '.repeat(Math.max(0, 43 - NODE_ENV.length))}║
║  Database: Connected${' '.repeat(38)}║
║                                                            ║
║  Ready to accept connections!                             ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
  } catch (err) {
    fastify.log.error(err);
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\nReceived SIGINT. Shutting down gracefully...');
  await fastify.close();
  console.log('✓ Server closed');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\nReceived SIGTERM. Shutting down gracefully...');
  await fastify.close();
  console.log('✓ Server closed');
  process.exit(0);
});

// Start the server
start();
