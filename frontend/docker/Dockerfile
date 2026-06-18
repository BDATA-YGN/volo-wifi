# Base image
FROM node:18-alpine AS base

# Dependencies stage
FROM base AS deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Builder stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG ENV_FILE=.env.local
COPY ${ENV_FILE} .env.local
# Ensure build fails on error
RUN yarn build || { echo "Build failed"; exit 1; }

# Production runner stage
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=development \
    NEXT_TELEMETRY_DISABLED=1
# Create non-root user and group
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nextjs
# Copy necessary files from builder, including node_modules
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.env.local ./.env.local
# Switch to non-root user
USER nextjs
EXPOSE ${NEXTJS_PORT:-3000}
# Use next start for standard mode
CMD ["npx", "next", "start"]