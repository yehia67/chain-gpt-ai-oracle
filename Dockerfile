FROM node:20-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable
RUN corepack prepare pnpm@8.15.4 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY prisma ./prisma
RUN pnpm prisma:generate

COPY . .
RUN pnpm build

EXPOSE 3000
CMD ["sh", "-c", "until pnpm prisma:migrate:deploy; do echo 'Migration failed, retrying in 5s...'; sleep 5; done; pnpm start:prod"]
