# syntax=docker/dockerfile:1.7
# Vibeahack backend — multi-stage build.
# Stages: deps → build → development → runtime
# docker-compose uses `development` in Phase 1.

# bookworm-slim (glibc) rather than alpine (musl) because @xenova/transformers
# pulls in onnxruntime-node, whose prebuilt native binary is glibc-only.
ARG NODE_IMAGE=node:22.11.0-bookworm-slim

# ---- deps: install all workspace deps once ----
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
# --ignore-scripts to avoid running postinstall hooks in workspaces we don't need here.
RUN npm ci --ignore-scripts
# sharp (transitive dep of @xenova/transformers) needs its install script to
# download the platform-specific prebuilt binary.
RUN npm rebuild sharp

# ---- build: compile shared + backend TypeScript to dist/ ----
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* tsconfig.base.json ./
COPY shared ./shared
COPY backend ./backend
RUN npm run build --workspace=shared
RUN npm run build --workspace=backend

# ---- development: source + dev deps, live-reload via nest start --watch ----
FROM ${NODE_IMAGE} AS development
WORKDIR /app
ENV NODE_ENV=development
# wget is used by the compose healthcheck; not in slim base.
RUN apt-get update && apt-get install -y --no-install-recommends wget && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* tsconfig.base.json ./
COPY shared ./shared
COPY backend ./backend
# Shared is compiled once at image build so backend can resolve @vibeahack/shared.
RUN npm run build --workspace=shared
EXPOSE 3000
WORKDIR /app/backend
CMD ["npm", "run", "start:dev"]

# ---- runtime: production image, no dev deps ----
FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends wget && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
RUN npm ci --omit=dev --ignore-scripts
COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/backend/dist ./backend/dist
EXPOSE 3000
WORKDIR /app/backend
CMD ["node", "dist/main.js"]
