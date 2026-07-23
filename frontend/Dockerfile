# Volo WiFi frontend — Dokploy / Docker (Next.js standalone)
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
WORKDIR /app
COPY . .

# Canonical env (preferred). Legacy NEXT_PUBLIC_* build args still accepted.
ARG API_URL
ARG CAPTIVE_API_URL
ARG SOCKET_URL
ARG SOCKET_PATH=/general/socket.io
ARG FILE_SERVER_URL
ARG HOST_NAME=localhost
ARG CACHE_PREFIX=volo-wifi
ARG BY_PASS=false
ARG CAPTIVE_HOST
ARG PARTNER_HOST
ARG COLLECTOR_HOST
ARG CUSTOMER_HOST

# Legacy aliases (optional — mirrored if canonical unset)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_SOCKET_PATH
ARG NEXT_PUBLIC_CACHE_PREFIX
ARG NEXT_PUBLIC_PARTNER_HOST
ARG NEXT_PUBLIC_CAPTIVE_API_URL
ARG NEXT_PUBLIC_CAPTIVE_HOST

ENV API_URL=${API_URL}
ENV CAPTIVE_API_URL=${CAPTIVE_API_URL}
ENV SOCKET_URL=${SOCKET_URL}
ENV SOCKET_PATH=${SOCKET_PATH}
ENV FILE_SERVER_URL=${FILE_SERVER_URL}
ENV HOST_NAME=${HOST_NAME}
ENV CACHE_PREFIX=${CACHE_PREFIX}
ENV BY_PASS=${BY_PASS}
ENV CAPTIVE_HOST=${CAPTIVE_HOST}
ENV PARTNER_HOST=${PARTNER_HOST}
ENV COLLECTOR_HOST=${COLLECTOR_HOST}
ENV CUSTOMER_HOST=${CUSTOMER_HOST}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SOCKET_URL=${NEXT_PUBLIC_SOCKET_URL}
ENV NEXT_PUBLIC_SOCKET_PATH=${NEXT_PUBLIC_SOCKET_PATH}
ENV NEXT_PUBLIC_CACHE_PREFIX=${NEXT_PUBLIC_CACHE_PREFIX}
ENV NEXT_PUBLIC_PARTNER_HOST=${NEXT_PUBLIC_PARTNER_HOST}
ENV NEXT_PUBLIC_CAPTIVE_API_URL=${NEXT_PUBLIC_CAPTIVE_API_URL}
ENV NEXT_PUBLIC_CAPTIVE_HOST=${NEXT_PUBLIC_CAPTIVE_HOST}

RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=4488

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 4488

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4488)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
