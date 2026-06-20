# syntax=docker/dockerfile:1.6
FROM node:20.18.1-bookworm-slim@sha256:35eccf0e5cdb40b8ba3531e1b756d0ed52ec6e9d74c1756cc6503e8734effd27 AS deps

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:20.18.1-bookworm-slim@sha256:35eccf0e5cdb40b8ba3531e1b756d0ed52ec6e9d74c1756cc6503e8734effd27 AS runtime

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
RUN mkdir -p /app/data && chown -R appuser:nodejs /app/data

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
