# Use official Node.js LTS image (Alpine for smaller size)
FROM node:20-alpine

# Install python3 and build tools needed for better-sqlite3
# better-sqlite3 requires native compilation
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
# Use --production to skip devDependencies in production
# better-sqlite3 will be compiled during this step
RUN npm ci --production

# Copy application source
COPY src/ ./src/
COPY colors.csv ./colors.csv

# Create data directory for persistent storage
RUN mkdir -p /data

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["npm", "start"]
