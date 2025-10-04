FROM node:18-alpine AS base
RUN apk add --no-cache curl openssl openssl-dev
WORKDIR /app

# ============================================
# Dependencies Stage (Production Only)
# ============================================
FROM base AS dependencies

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY shared ./shared

# Install root dependencies
RUN npm ci --only=production

# Install server dependencies
WORKDIR /app/server
RUN npm ci --only=production

# ============================================
# Build Stage (With Dev Dependencies)
# ============================================
FROM base AS build

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY shared ./shared

# Install ALL dependencies (including dev dependencies for building)
RUN npm ci

WORKDIR /app/server
RUN npm ci

# Reset to root
WORKDIR /app

# Copy source code
COPY server ./server
COPY shared ./shared
COPY server/prisma ./server/prisma

# Generate Prisma Client
WORKDIR /app/server
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# ============================================
# Production Stage
# ============================================
FROM base AS production

# Copy everything from build stage
COPY --from=build /app ./

# The build stage already has everything we need:
# - node_modules (with dev dependencies)
# - server/node_modules (with dev dependencies)
# - server/dist (compiled TypeScript)
# - server/prisma (Prisma schema and generated client)
# - shared (shared types)

# Remove dev dependencies to reduce image size
WORKDIR /app
RUN npm prune --production 2>/dev/null || true
WORKDIR /app/server
RUN npm prune --production 2>/dev/null || true

# Create images directory
RUN mkdir -p /app/server/public/generated-images

WORKDIR /app/server

EXPOSE 3001

HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=60s \
    CMD curl -f http://localhost:3001/api/health || exit 1

# Create startup script using printf for proper newlines
RUN printf '#!/bin/sh\nset -e\n\necho "🔧 Setting up database..."\nnpx prisma db push --accept-data-loss\n\necho "✅ Database ready"\necho "🚀 Starting server..."\n\nnode dist/index.js\n' > /app/server/start.sh && \
    chmod +x /app/server/start.sh

CMD ["/app/server/start.sh"]
