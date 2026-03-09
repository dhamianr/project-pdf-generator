# 1. LA BASE: Agarramos una compu Linux chiquita que ya tiene Node.js versión 20 instalado.
FROM node:20-slim

# 2. LA CARPETA: Le decimos "A partir de ahora, todo lo que hagamos va en la carpeta /app del contenedor"
WORKDIR /app

# 3. LAS DEPENDENCIAS: Copiamos tu package.json adentro del contenedor
COPY package*.json ./

# 4. LA INSTALACIÓN: Le decimos a la consolita del contenedor que instale las librerías (Express, PDFKit, etc)
RUN npm install

# 5. EL CÓDIGO: Copiamos todo tu código (src, tsconfig.json, logo.png) al contenedor
COPY . .

# 6. LA TRADUCCIÓN: Ejecutamos el comando que armaste en el Paso 1 para pasar de TS a JS
RUN npm run build

# 7. EL PUERTO: Le avisamos a Docker que nuestra app se comunica por el puerto 3000
EXPOSE 3000

# 8. EL ARRANQUE: El comando final que va a mantener vivo al contenedor
CMD ["npm", "start"]