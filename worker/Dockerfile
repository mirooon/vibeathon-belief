# syntax=docker/dockerfile:1.7
# Vibeahack worker — separate sync container.
# Stages: deps → build → runtime

ARG NODE_IMAGE=node:22.11.0-alpine

# ---- deps ----
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY worker/package.json ./worker/
RUN npm ci --ignore-scripts

# ---- build ----
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* tsconfig.base.json ./
COPY shared ./shared
COPY worker ./worker
RUN npm run build --workspace=shared
RUN npm run build --workspace=worker

# ---- development: tsx watch with source mounted from host ----
FROM ${NODE_IMAGE} AS development
WORKDIR /app
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* tsconfig.base.json ./
COPY shared ./shared
COPY worker ./worker
RUN npm run build --workspace=shared
WORKDIR /app/worker
CMD ["npm", "run", "start:dev"]

# ---- runtime ----
FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY worker/package.json ./worker/
RUN npm ci --omit=dev --ignore-scripts
COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/worker/dist ./worker/dist
WORKDIR /app/worker
CMD ["node", "dist/main.js"]
