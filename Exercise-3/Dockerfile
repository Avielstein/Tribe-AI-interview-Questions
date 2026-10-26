# Intake Triage: Next.js + Prisma + SQLite in one container.
# Build:  docker build -t intake-triage .
# Run:    docker compose up   (see docker-compose.yml)

FROM node:22-bookworm-slim AS base
WORKDIR /app
# Build tools in case better-sqlite3 has no prebuilt binary for this platform.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies first (cached unless package files or the schema change).
# The schema is needed because `npm ci` runs `prisma generate` as postinstall.
FROM base AS deps
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_URL=file:/data/intake.db
# Full node_modules (not pruned): the Prisma CLI is needed to apply migrations on start.
COPY --from=build /app /app
RUN mkdir -p /data
VOLUME ["/data"]
EXPOSE 3000
# Apply any pending migrations to the database in the volume, then start the server.
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
