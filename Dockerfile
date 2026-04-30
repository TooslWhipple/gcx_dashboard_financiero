# Multi-stage Dockerfile para Next.js con pnpm
FROM node:20-alpine AS base

# Instalar pnpm
RUN npm install -g pnpm

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml ./

# Copiar el esquema Prisma antes para que `prisma generate` lo encuentre
COPY prisma ./prisma

# Instalar dependencias (los build scripts de Prisma quedan ignorados por pnpm)
RUN pnpm install --frozen-lockfile

# Generar Prisma Client manualmente (pnpm bloquea el postinstall por seguridad)
RUN pnpm prisma generate

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

# Copiar Prisma Client generado y schema (standalone no siempre los incluye)
COPY --from=base /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=base /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=base /app/prisma ./prisma

# Exponer puerto
EXPOSE 3000

# Comando para iniciar
CMD ["node", "server.js"]
