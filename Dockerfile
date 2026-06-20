# syntax=docker/dockerfile:1.6
FROM node:20.18.1-bookworm-slim@sha256:9a81b87e2c0ba2e3e4f6a3b6c8d4e1f2a3b4c5d6e7f8091a2b3c4d5e6f708192 AS deps

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:20.18.1-bookworm-slim@sha256:9a81b87e2c0ba2e3e4f6a3b6c8d4e1f2a3b4c5d6e7f8091a2b3c4d5e6f708192 AS runtime

ENV NODE_ENV=production \
    PORT=3000

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs --no-create-home --shell /usr/sbin/nologin appuser \
    && apt-get update \
    && apt-get install -y --no-install-recommends dumb-init \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=deps --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --chown=appuser:nodejs package.json ./
COPY --chown=appuser:nodejs src ./src

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
