FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# ---- Builder ----
FROM base AS builder
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ---- Runner ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/dist ./dist
# Migration files must be present at runtime alongside the compiled migrate script
COPY --from=builder /app/src/infra/database/drizzle/migrations ./migrations

EXPOSE 3333

# migrate.js runs drizzle migrator (drizzle-orm only, no drizzle-kit needed in prod)
CMD ["sh", "-c", "node dist/infra/database/migrate.js && node dist/main/index.js"]
