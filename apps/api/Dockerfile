FROM node:24-alpine AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable
WORKDIR /app

ARG DATABASE_URL=postgresql://jzoom:build_only@postgres:5432/jzoom?schema=public
ENV DATABASE_URL=$DATABASE_URL

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @jzoom/api... build

FROM node:24-alpine AS runtime

ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable
WORKDIR /app

COPY --from=build /app /app

EXPOSE 4000
CMD ["pnpm", "--filter", "@jzoom/api", "start"]
