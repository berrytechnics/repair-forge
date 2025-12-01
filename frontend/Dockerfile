FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY frontend/package.json frontend/yarn.lock* ./

# Install dependencies with cache optimization
RUN yarn install --frozen-lockfile --network-timeout 600000

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY frontend/ .

# Accept build argument for API URL
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED 1

# Build application with increased memory limit for low-memory servers
RUN NODE_OPTIONS="--max-old-space-size=2048" yarn build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
# PORT defaults to 3000, can be overridden via environment variable
ENV PORT 3000
# HOSTNAME must be 0.0.0.0 to bind to all interfaces (required for Docker)
ENV HOSTNAME 0.0.0.0

# Don't run as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# Copy necessary build outputs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy startup script and make it executable
COPY --chown=nextjs:nodejs frontend/start-server.js ./start-server.js
RUN chmod +x ./start-server.js

# Expose port (can be overridden via PORT environment variable)
EXPOSE 3000

# Run Next.js standalone server with wrapper script
# The wrapper ensures binding to 0.0.0.0 for Docker deployments
CMD ["node", "start-server.js"]