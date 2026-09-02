FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm build

FROM node:22-alpine
WORKDIR /app
COPY --from=base /app .
ENV NODE_ENV=production
CMD ["pnpm", "--filter", "@guntan/storefront", "start"]
