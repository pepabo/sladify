# Build stage
FROM node:22-slim AS builder
WORKDIR /app

RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm prisma generate && pnpm build

# Production stage
FROM node:22-slim
WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/* && \
    corepack enable pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY prisma ./prisma
RUN pnpm add prisma && pnpm prisma generate && pnpm remove prisma

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV DATABASE_URL="file:/data/sladify.db"

CMD ["node", "dist/index.js"]