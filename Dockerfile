# Multi-stage optimized build for Next.js video downloader
FROM node:20-alpine AS base

# Install security updates and required packages
RUN apk update && apk upgrade && apk add --no-cache \
    libc6-compat \
    dumb-init

# Dependencies stage
FROM base AS deps
WORKDIR /app

# Copy package files for better Docker layer caching
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Development dependencies stage
FROM base AS dev-deps
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies for build
RUN npm ci && npm cache clean --force

# Builder stage
FROM dev-deps AS builder
WORKDIR /app

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js application with standalone output
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

# Install runtime dependencies and security updates
RUN apk update && apk upgrade && apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    dumb-init \
    curl

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

# Copy standalone application files
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/extension ./extension

# Create necessary directories with proper permissions
RUN mkdir -p /tmp/videos /app/.next/cache && \
    chown -R nextjs:nodejs /tmp/videos /app/.next/cache

# Set environment variables
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/test || exit 1

# Use dumb-init for proper signal handling and PID 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]