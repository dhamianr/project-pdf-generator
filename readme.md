<p align="center">
  <img src="./logo.png" alt="Logo Generador de Reportes PDF" width="200"/>
</p>

# Generador de Reportes PDF

Un microservicio dockerizado construido con **Node.js**, **Fastify** y **TypeScript** para la generación dinámica de estados de cuenta en formato PDF.

Incluye soporte multi-idioma (i18n), seguridad por API Key + IP Whitelisting, logging de requests en **AWS S3**, y fuente de datos intercambiable entre **Google BigQuery** (producción) y **Mock local** (desarrollo/testing).

---

## Tecnologías Utilizadas

| Categoría | Tecnología |
|---|---|
| **Runtime** | Node.js 24 |
| **Framework** | Fastify 5 |
| **Lenguaje** | TypeScript 5 |
| **Generación de PDFs** | PDFKit |
| **Base de datos (prod)** | Google BigQuery |
| **Logging de requests** | AWS S3 (NDJSON) |
| **Infraestructura** | Docker |
| **Testing** | Vitest |
| **Seguridad** | API Key header (`x-api-key`) + IP Whitelisting opcional |

---

## Estructura del Proyecto

```
project-pdf-generator/
├── src/
│   ├── app.ts                     # Configuración de Fastify (sin arrancar el servidor)
│   ├── server.ts                  # Entry point: arranca el servidor y hace listen()
│   ├── config/
│   │   └── database.ts            # Configuración del cliente BigQuery
│   ├── services/
│   │   ├── dbService.ts           # Selector: BigQuery o Mock según USE_MOCK
│   │   ├── dbService.bigquery.ts  # Implementación real con BigQuery
│   │   ├── dbService.mock.ts      # Implementación mock para dev/tests
│   │   ├── logService.ts          # Logging de requests a AWS S3 (buffer + flush)
│   │   └── pdfService.ts          # Generación del PDF con PDFKit
│   ├── utils/
│   │   ├── translations.ts        # Soporte multi-idioma (es, en, pt)
│   │   └── random.ts
│   ├── types/                     # Tipos e interfaces TypeScript
│   └── mocks/                     # Datos de ejemplo para el modo mock
├── tests/                         # Tests unitarios e integración (Vitest)
├── docs/
│   └── arquitectura_futura.md     # Diagrama y plan de arquitectura Pub/Sub
├── Dockerfile
├── .env.example                   # Variables de entorno requeridas (sin secretos)
├── .dockerignore
├── .gitignore
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

---

## Configuración del Entorno

Este proyecto usa **Doppler** como gestor de secrets en producción/desarrollo real, y un `.env.test` local para los tests.

### Opción A — Doppler (recomendado para dev y producción)

1. Instalá el CLI según tu SO: [docs.doppler.com/docs/install-cli](https://docs.doppler.com/docs/install-cli)
2. Autenticarte: `doppler login`
3. Vincular el proyecto (ya configurado en `.doppler.yaml`):
   ```bash
   doppler setup
   ```
4. Correr el servidor con secrets inyectados:
   ```bash
   npm run dev:doppler
   ```

### Opción B — `.env` manual (fallback)

Copiá el archivo de ejemplo y completá con tus valores:

```bash
cp .env.example .env
```

Hay **dos modos de operación**:

#### Modo Mock (desarrollo local — sin credenciales reales)

```env
API_KEY=tu_clave_super_secreta_aqui
ENABLE_IP_WHITELIST=false
USE_MOCK=true
```

#### Modo Producción (con Google BigQuery y AWS S3)

```env
# Seguridad
API_KEY=tu_clave_super_secreta_aqui
ENABLE_IP_WHITELIST=false
ALLOWED_IPS=127.0.0.1,::1

# Fuente de datos
USE_MOCK=false

# Google BigQuery
BIGQUERY_PROJECT_ID=tu-proyecto-gcp
BIGQUERY_DATASET=mi_dataset
GCP_CLIENT_EMAIL=tu-cuenta@tu-proyecto.iam.gserviceaccount.com
GCP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# AWS S3 — Logs
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=tu_access_key
AWS_SECRET_ACCESS_KEY=tu_secret_key
LOG_S3_BUCKET=mi-bucket-de-logs
LOG_S3_PREFIX=api-logs
```

> En AWS (EC2/ECS) podés usar un IAM Role y omitir `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`.

---

## Cómo ejecutarlo en Desarrollo (Local)

1. Instalá las dependencias:
   ```bash
   npm install
   ```

2. Configurá el entorno (elegí una opción):
   ```bash
   # Con Doppler (recomendado)
   doppler login && doppler setup
   npm run dev:doppler

   # Sin Doppler
   cp .env.example .env   # completá con tus valores
   npm run dev
   ```

   El servidor escuchará en `http://localhost:3000`

---

## Testing

El proyecto usa **Vitest** con modo mock — los tests corren sin ninguna credencial externa (sin BigQuery, sin S3 real).

### Requisito: crear `.env.test` localmente

El archivo `.env.test` está en `.gitignore` (no se sube al repo). Tenés que crearlo manualmente en la raíz del proyecto:

```env
# .env.test — solo para tests locales, no contiene secrets reales
USE_MOCK=true
API_KEY=test-api-key-local
ENABLE_IP_WHITELIST=false
ALLOWED_IPS=127.0.0.1,::1
AWS_REGION=us-east-1
LOG_S3_BUCKET=test-bucket
LOG_S3_PREFIX=api-logs
```

> Los valores de AWS son placeholders — con `USE_MOCK=true` el código nunca intenta conectarse a S3 durante los tests.

### Comandos

```bash
# Correr todos los tests una sola vez
npm test

# Correr los tests en modo watch
npm run test:watch
```

Tests incluidos:

| Archivo | Qué verifica |
|---|---|
| `dbService.test.ts` | Lógica de acceso a datos |
| `logService.test.ts` | Buffer y flush a S3 |
| `reporte.route.test.ts` | Endpoint `/api/reporte` (auth, validaciones, respuesta PDF) |
| `translations.test.ts` | Sistema multi-idioma |

---

## Cómo desplegarlo en Producción (Docker)

1. Construí la imagen:
   ```bash
   docker build -t api-generador-pdf .
   ```

2. Levantá el contenedor inyectando los secrets:

   **Con Doppler (recomendado):**
   ```bash
   # Doppler inyecta las variables antes de ejecutar el contenedor
   doppler run -- docker run -d -p 3000:3000 \
     -e API_KEY \
     -e AWS_ACCESS_KEY_ID \
     -e AWS_SECRET_ACCESS_KEY \
     -e LOG_S3_BUCKET \
     -e USE_MOCK \
     api-generador-pdf
   ```

   **Sin Doppler (fallback con `.env`):**
   ```bash
   docker run -d -p 3000:3000 --env-file .env api-generador-pdf
   ```

---

## Uso de la API

### `GET /api/reporte`

Genera y descarga un estado de cuenta en formato PDF.

**Headers requeridos:**

| Header | Descripción |
|---|---|
| `x-api-key` | Tu API Key configurada en `.env` |

**Query Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|---|---|---|---|
| `userId` | `string` | ✅ | ID del usuario |
| `start` | `YYYY-MM-DD` | ✅ | Fecha de inicio del reporte |
| `end` | `YYYY-MM-DD` | ✅ | Fecha de fin del reporte |
| `lang` | `es` \| `en` \| `pt` | ❌ | Idioma del PDF (default: `es`) |

**Ejemplo:**

```bash
curl -H "x-api-key: tu_clave_secreta" \
  "http://localhost:3000/api/reporte?userId=123&start=2024-01-01&end=2024-01-31&lang=es" \
  --output reporte.pdf
```

**Respuestas posibles:**

| Código | Descripción |
|---|---|
| `200` | PDF generado exitosamente |
| `400` | Parámetros inválidos (ej: `start` posterior a `end`) |
| `401` | API Key inválida o ausente |
| `403` | IP no autorizada (si `ENABLE_IP_WHITELIST=true`) |
| `404` | Usuario no encontrado |
| `500` | Error interno del servidor |

---

## Logging

Cada request a `/api/reporte` queda registrado en AWS S3 en formato **NDJSON** (una línea JSON por entrada), con particionado compatible con AWS Athena:

```
s3://mi-bucket/api-logs/year=2026/month=05/day=08/hour=14/api_logs_20260508_140000.ndjson
```

Los logs se acumulan en memoria y se envían a S3 cada 5 minutos o cada 500 requests (lo que ocurra primero). Al apagar el servidor con `SIGTERM` se hace un flush final para no perder logs.

---

## Evolución y Escalado Futuro

Si bien este proyecto funciona como un microservicio síncrono independiente, su arquitectura puede escalar mediante un modelo orientado a eventos (Pub/Sub).

[Ver Arquitectura Futura](./docs/arquitectura_futura.md)

---

## Consideraciones de Seguridad

### Generación de API Keys

Para producción, la `API_KEY` debe ser un hash criptográfico fuerte. El proyecto incluye la utilidad `src/utils/random.ts` que genera un SHA-256 de 256 bytes aleatorios (64 caracteres hex):

```bash
# Usando la utilidad del proyecto (requiere haber compilado con npm run build)
node -e "import('./dist/utils/random.js').then(m => console.log(m.generateRandomSecret()))"

# Alternativa rápida con Node.js nativo (sin compilar)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Escalabilidad

A medida que el sistema crezca, considerar:

- **Rate Limiting** — `@fastify/rate-limit` + Redis para prevenir abusos
- **Request Timeout** — cortar conexiones inactivas del cliente
- **Worker Timeout** — tiempo máximo de vida para la generación del PDF (evitar procesos zombie)
