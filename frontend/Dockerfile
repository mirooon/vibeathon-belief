# syntax=docker/dockerfile:1.7
# Vibeahack frontend — multi-stage build.
# Stages: deps → build → development → runtime
# docker-compose uses `development` in Phase 1.

ARG NODE_IMAGE=node:22.11.0-alpine

# ---- deps ----
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm ci --ignore-scripts

# ---- build: Vite production bundle ----
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* tsconfig.base.json ./
COPY shared ./shared
COPY frontend ./frontend
RUN npm run build --workspace=shared
RUN npm run build --workspace=frontend

# ---- development: Vite dev server, HMR ----
FROM ${NODE_IMAGE} AS development
WORKDIR /app
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* tsconfig.base.json ./
COPY shared ./shared
COPY frontend ./frontend
RUN npm run build --workspace=shared
EXPOSE 5173
WORKDIR /app/frontend
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ---- runtime: serve built assets via nginx ----
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
