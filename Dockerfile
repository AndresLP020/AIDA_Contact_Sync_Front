# syntax=docker/dockerfile:1
# Contexto de build: raíz del monorepo. NEXT_PUBLIC_API_URL es la URL del backend vista desde el NAVEGADOR.

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
COPY frontend/contracts/package.json frontend/contracts/
COPY backend/package.json backend/
RUN npm ci --workspace frontend --include-workspace-root=false --no-audit --no-fund
COPY frontend frontend
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
ARG FRAME_ANCESTORS=
ARG NEXT_PUBLIC_GHL_PARENT_ORIGINS=
ARG NEXT_PUBLIC_SHOW_DEMO_HINT=false
ARG NEXT_PUBLIC_DEMO_PASSWORD=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    FRAME_ANCESTORS=$FRAME_ANCESTORS \
    NEXT_PUBLIC_GHL_PARENT_ORIGINS=$NEXT_PUBLIC_GHL_PARENT_ORIGINS \
    NEXT_PUBLIC_SHOW_DEMO_HINT=$NEXT_PUBLIC_SHOW_DEMO_HINT \
    NEXT_PUBLIC_DEMO_PASSWORD=$NEXT_PUBLIC_DEMO_PASSWORD \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace frontend

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /app/frontend/.next/standalone ./
COPY --from=build --chown=node:node /app/frontend/.next/static ./frontend/.next/static
COPY --from=build --chown=node:node /app/frontend/public ./frontend/public
USER node
EXPOSE 3000
CMD ["node", "frontend/server.js"]
