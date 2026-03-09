<p align="center">
  <img src="./logo.png" alt="Logo Ficticio del Proyecto Reporte Fácil" width="200"/>
</p>

# 📄 Generador de Reportes PDF

Un microservicio dockerizado construido con **Node.js** y **Fastify** para la generación dinámica de estados de cuenta en formato PDF. Incluye soporte multi-idioma (i18n) y seguridad por API Key + IP Whitelisting.

## 🛠️ Tecnologías Utilizadas

- **Backend:** Node.js + Fastify
- **Lenguaje:** TypeScript
- **Generación de PDFs:** PDFKit
- **Infraestructura:** Docker
- **Seguridad:** API Key Header (`x-api-key`) + IP Whitelisting opcional.

## ⚙️ Configuración del Entorno (.env)

Antes de ejecutar el proyecto, creá un archivo `.env` en la raíz copiando la estructura de `.env.example`:

API_KEY=tu_clave_super_secreta_aqui
ENABLE_IP_WHITELIST=false
ALLOWED_IPS=127.0.0.1,::1

## 🚀 Cómo ejecutarlo en Desarrollo (Local)

1. Instalar las dependencias:
   npm install

2. Iniciar el servidor con recarga automática:
   npm run dev

   _El servidor escuchará en `http://localhost:3000`_

## 🐳 Cómo desplegarlo en Producción (Docker)

Este proyecto está optimizado para correr en contenedores aislados.

1. Construir la imagen de Docker:
   docker build -t api-generador-pdf .

2. Levantar el contenedor en segundo plano (Detached mode):
   docker run -d -p 3000:3000 --env-file .env api-generador-pdf

## 📡 Uso de la API

**Endpoint:** `GET /api/reporte`

**Headers requeridos:**

- `x-api-key`: <TU_API_KEY>

**Query Parameters:**

- `userId` (string): ID del usuario.
- `start` (YYYY-MM-DD): Fecha de inicio del reporte.
- `end` (YYYY-MM-DD): Fecha de fin del reporte.
- `lang` (opcional): Idioma del reporte (`es` | `en` | `pt`). Por defecto es `es`.

## 📈 Evolución y Escalado Futuro

Si bien este proyecto actualmente funciona como un microservicio independiente, puede escalar de forma masiva.

Podés ver el diagrama y la explicación de la **Arquitectura Orientada a Eventos (Pub/Sub)** planificada para el futuro en la carpeta de documentación:

👉 [Ver Arquitectura Futura](./docs/arquitectura_futura.md)

## 🛡️ Consideraciones para Producción y Seguridad

### 1. Generación de API Keys Seguras

Para entornos productivos, la `API_KEY` debe ser un hash criptográfico fuerte (mínimo 32 caracteres) y no una palabra simple. Podés generarla fácilmente de estas dos maneras:

- **Opción A (Node.js nativo):** Ejecutá el siguiente comando en tu terminal para generar un hash hexadecimal aleatorio de 64 caracteres:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **Opción B (Gestores de Contraseñas):** Es altamente recomendable utilizar herramientas como Bitwarden, 1Password o KeePass para generar cadenas alfanuméricas largas y almacenarlas de forma segura.

### 2. Escalabilidad: Limitaciones y Timeouts

A medida que el sistema crezca y se implemente la arquitectura asincrónica (ver sección de Evolución), será obligatorio definir las siguientes reglas:

- **Rate Limiting:** Implementar un límite de peticiones (ej. utilizando `@fastify/rate-limit` y Redis) para prevenir abusos o ataques DDoS. _Ejemplo: Solicitud excesiva de resumenes en un corto tiempo en la app._
- **Timeouts:**
  - **Request Timeout:** Cortar conexiones inactivas desde el cliente para no mantener puertos ocupados innecesariamente (dependiendo de donde se lo solicite).
  - **Worker Timeout:** Establecer un tiempo de vida máximo para la tarea de generación de PDF. Si un reporte es demasiado pesado y entra en un bucle, el proceso debe ser aniquilado (ej. a los 3 minutos) para evitar que procesos "zombies" consuman toda la memoria RAM del servidor.
