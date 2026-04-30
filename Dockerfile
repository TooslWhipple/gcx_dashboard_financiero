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

# Variables de entorno para producción
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Exponer puerto
EXPOSE 3000

# Comando para iniciar
CMD ["node", ".next/standalone/server.js"]
