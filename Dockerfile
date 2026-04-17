# Multi-stage Dockerfile para Next.js con pnpm
FROM node:20-alpine AS base

# Instalar pnpm
RUN npm install -g pnpm

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml ./

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Copiar todo el código fuente
COPY . .

# Construir la aplicación
RUN pnpm build

# Stage de producción
FROM node:20-alpine AS runner

WORKDIR /app

# Variables de entorno para producción
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copiar archivos necesarios desde el build
COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/public ./public

# Exponer puerto
EXPOSE 3000

# Comando para iniciar
CMD ["node", "server.js"]
