FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl ca-certificates
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
