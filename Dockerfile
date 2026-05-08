# ─── STAGE 1: BUILD ─────────────────────────────────────────────────────────
# Instalamos TODAS las dependencias (incluyendo devDependencies como typescript
# y tsx) para poder compilar el TypeScript a JavaScript.
FROM node:24-slim AS builder

WORKDIR /app

# Copiamos solo los manifests primero para aprovechar el cache de capas de Docker.
# Si el código cambia pero las dependencias no, esta capa no se reconstruye.
COPY package*.json ./

# npm ci: instalación determinista basada en package-lock.json (ideal para CI/CD)
RUN npm ci

# Copiamos el resto del código fuente
COPY . .

# Compilamos TypeScript → genera la carpeta /app/dist
RUN npm run build


# ─── STAGE 2: PRODUCTION ─────────────────────────────────────────────────────
# Imagen final limpia: solo copiamos el JS compilado y las dependencias de
# producción. El compilador de TypeScript, tsx, vitest, etc. NO entran acá.
FROM node:24-slim AS production

WORKDIR /app

# Copiamos solo los manifests para instalar únicamente dependencias de producción
COPY package*.json ./
RUN npm ci --omit=dev

# Copiamos el output compilado desde el stage anterior
COPY --from=builder /app/dist ./dist

# Si tu app usa el logo.png u otros assets en runtime, copialos también:
# COPY --from=builder /app/logo.png ./logo.png

# Seguridad: corremos la app con un usuario sin privilegios (no root)
USER node

# Le avisamos a Docker que la app escucha en el puerto 3000
EXPOSE 3000

# Comando de arranque: ejecuta el JS compilado directamente con Node
CMD ["node", "dist/server.js"]