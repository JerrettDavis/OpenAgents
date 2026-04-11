# ──────────────────────────────────────────────────────────────
# Stage 1 – dependencies
# ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/orchestrator-web/package.json apps/orchestrator-web/package.json
RUN pnpm install --filter orchestrator-web... --frozen-lockfile

# ──────────────────────────────────────────────────────────────
# Stage 2 – build
# ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable

COPY --from=deps /app/ ./
COPY tsconfig.base.json ./tsconfig.base.json
COPY apps/orchestrator-web ./apps/orchestrator-web

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter orchestrator-web build

# ──────────────────────────────────────────────────────────────
# Stage 3 – runtime (standalone output)
# ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid  1001 nextjs

COPY --from=build --chown=nextjs:nodejs /app/apps/orchestrator-web/.next/standalone /app/
COPY --from=build --chown=nextjs:nodejs /app/apps/orchestrator-web/.next/static /app/apps/orchestrator-web/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/orchestrator-web/public /app/apps/orchestrator-web/public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

WORKDIR /app/apps/orchestrator-web
CMD ["node", "server.js"]
