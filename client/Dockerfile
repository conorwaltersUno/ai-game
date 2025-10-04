FROM node:18-alpine AS base
WORKDIR /app

# ============================================
# Dependencies Stage
# ============================================
FROM base AS dependencies

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/
COPY shared ./shared

# Install root dependencies
RUN npm ci --only=production

# Install client dependencies
WORKDIR /app/client
RUN npm ci

# ============================================
# Build Stage
# ============================================
FROM dependencies AS build

# Reset to root for copying
WORKDIR /app

# Copy source code
COPY client ./client
COPY shared ./shared

# Build arguments
ARG VITE_API_URL=http://localhost:3001
ARG VITE_WS_URL=http://localhost:3001
ARG VITE_HOST_USERNAME=admin
ARG VITE_HOST_PASSWORD=admin123

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_WS_URL=${VITE_WS_URL}
ENV VITE_HOST_USERNAME=${VITE_HOST_USERNAME}
ENV VITE_HOST_PASSWORD=${VITE_HOST_PASSWORD}

# Build
WORKDIR /app/client
RUN npx vite build --mode production

# ============================================
# Production Stage
# ============================================
FROM nginx:alpine AS production

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy nginx config
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built app
COPY --from=build /app/client/dist /usr/share/nginx/html

# Create images directory
RUN mkdir -p /usr/share/nginx/html/images

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=10s \
    CMD curl -f http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
