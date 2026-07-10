# Fonda Resa — single monolith image.
# The API (Express) serves the built React SPA, the /uploads photos and the /api routes
# all from one process on port 3000. Caddy (external) fronts it with HTTPS.

# ── Builder: install everything, build web + api, generate Prisma client ──
FROM node:20-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install deps (workspaces) using only manifests first for better layer caching
COPY package.json package-lock.json ./
COPY packages/api/package.json packages/api/
COPY packages/web/package.json packages/web/
RUN npm ci

# Build
COPY . .
RUN npx prisma generate --schema=packages/api/prisma/schema.prisma
RUN npm run build -w packages/web
RUN npm run build -w packages/api

# ── Runner ──
FROM node:20-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production

# node_modules (incl. generated Prisma client, prisma CLI and tsx for migrate/seed)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/packages/api/package.json ./packages/api/package.json
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/api/prisma ./packages/api/prisma
COPY --from=builder /app/packages/web/dist ./packages/web/dist

EXPOSE 3000
CMD ["node", "packages/api/dist/server.js"]
