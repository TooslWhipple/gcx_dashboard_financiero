# Single-stage Dockerfile para Next.js con pnpm
# Se usa una sola stage para evitar problemas de path con pnpm + Prisma

FROM node:20-alpine

# Instalar pnpm
RUN npm install -g pnpm

# Establecer directorio de trabajo
WORKDIR /app

# Copiar todo el código
COPY . .

# Copiar prisma schema antes del install (para que pnpm lo detecte si hay postinstall)
COPY prisma ./prisma

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Generar Prisma Client (pnpm bloquea postinstall scripts)
RUN pnpm prisma generate

# Construir la aplicación
RUN pnpm build

# Copiar estáticos al directorio standalone (Next.js standalone a veces no los incluye)
RUN mkdir -p .next/standalone/.next && cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
RUN cp -r public .next/standalone/ 2>/dev/null || true

# Variables de entorno para producción
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Exponer puerto
EXPOSE 3000

# Comando para iniciar (desde /app para que encuentre .next/static)
CMD ["node", ".next/standalone/server.js"]
