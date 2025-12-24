# ==============================================================================
# Multi-stage Dockerfile for GXQ Studio
# Supports: Railway, AWS, Azure, Alibaba Cloud, Docker Compose, VPS
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Base Node Image
# ------------------------------------------------------------------------------
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# ------------------------------------------------------------------------------
# Stage 2: Backend Dependencies
# ------------------------------------------------------------------------------
FROM base AS backend-deps
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci --production=false

# ------------------------------------------------------------------------------
# Stage 3: Backend Builder
# ------------------------------------------------------------------------------
FROM backend-deps AS backend-builder
COPY src ./src
COPY api ./api
COPY lib ./lib
COPY scripts ./scripts
RUN npm run build:backend

# ------------------------------------------------------------------------------
# Stage 4: Backend Production
# ------------------------------------------------------------------------------
FROM base AS backend
ENV NODE_ENV=production

# Install production dependencies only
COPY package*.json ./
RUN npm ci --production --ignore-scripts

# Copy built files from builder
COPY --from=backend-builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create necessary directories
RUN mkdir -p /app/data /app/logs && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Start application (use unified server by default)
CMD ["node", "dist/src/server.js"]

# ------------------------------------------------------------------------------
# Stage 5: Full Stack (Backend + Webapp)
# For platforms that need both in one container
# ------------------------------------------------------------------------------
FROM base AS fullstack

# Install dependencies for both backend and webapp
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci --production=false

# Copy and build backend
COPY src ./src
COPY api ./api
COPY lib ./lib
COPY scripts ./scripts
RUN npm run build:backend

# Copy and build webapp
COPY webapp ./webapp
RUN cd webapp && npm ci && npm run build

# Install production dependencies only
RUN npm ci --production --ignore-scripts

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create necessary directories
RUN mkdir -p /app/data /app/logs && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose ports (backend: 3000, webapp: 3001)
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Start both services (requires process manager or script)
CMD ["sh", "-c", "node dist/src/server.js & cd webapp && npm start"]
