<p align="center">
  <img src="./logo.png" alt="Logo Generador de Reportes PDF" width="200"/>
</p>

# 📄 Generador de Reportes PDF

Un microservicio dockerizado construido con **Node.js**, **Fastify** y **TypeScript** para la generación dinámica de estados de cuenta en formato PDF.

Incluye soporte multi-idioma (i18n), seguridad por API Key + IP Whitelisting, logging de requests en PostgreSQL, y fuente de datos intercambiable entre **Google BigQuery** (producción) y **Mock local** (desarrollo/testing).

---

## 🛠️ Tecnologías Utilizadas

| Categoría | Tecnología |
|---|---|
| **Runtime** | Node.js 20+ |
| **Framework** | Fastify 5 |
| **Lenguaje** | TypeScript 5 |
| **Generación de PDFs** | PDFKit |
| **Base de datos (prod)** | Google BigQuery |
| **Logging de requests** | PostgreSQL (`pg`) |
| **Infraestructura** | Docker |
| **Testing** | Vitest |
| **Seguridad** | API Key header (`x-api-key`) + IP Whitelisting opcional |

---

## 📁 Estructura del Proyecto

```
project-pdf-generator/
├── src/
│   ├── app.ts                  # Configuración de Fastify (sin arrancar el servidor)
│   ├── server.ts               # Entry point: arranca el servidor y hace listen()
│   ├── config/
│   │   ├── database.ts         # Configuración del cliente BigQuery
│   │   └── postgres.ts         # Pool de conexiones PostgreSQL (para logs)
│   ├── services/
│   │   ├── dbService.ts        # Selector: BigQuery o Mock según USE_MOCK
│   │   ├── dbService.bigquery.ts  # Implementación real con BigQuery
│   │   ├── dbService.mock.ts   # Implementación mock para dev/tests
│   │   ├── logService.ts       # Registro de cada request en PostgreSQL
│   │   └── pdfService.ts       # Generación del PDF con PDFKit
│   ├── utils/
│   │   ├── translations.ts     # Soporte multi-idioma (es, en, pt)
│   │   └── random.ts           # Utilidades varias
│   ├── types/                  # Tipos e interfaces TypeScript
│   └── mocks/                  # Datos de ejemplo para el modo mock
├── tests/                      # Tests unitarios e integración (Vitest)
├── migrations/
│   └── 001_create_api_logs.sql # Schema de la tabla de logs en PostgreSQL
├── docs/
│   └── arquitectura_futura.md  # Diagrama y plan de arquitectura Pub/Sub
├── Dockerfile
├── .dockerignore
├── .gitignore
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

---

## ⚙️ Configuración del Entorno (`.env`)

Creá un archivo `.env` en la raíz del proyecto. Hay **dos modos de operación**:

### 🧪 Modo Mock (desarrollo y testing local — sin credenciales reales)

```env
# --- Seguridad ---
API_KEY=tu_clave_super_secreta_aqui
ENABLE_IP_WHITELIST=false
ALLOWED_IPS=127.0.0.1,::1

# --- Modo de datos ---
USE_MOCK=true

# --- PostgreSQL (logging de requests) ---
LOG_DB_HOST=localhost
LOG_DB_PORT=5432
LOG_DB_USER=tu_usuario
LOG_DB_PASSWORD=tu_password
LOG_DB_NAME=pdf_logs
```

### 🏭 Modo Producción (con Google BigQuery)

```env
# --- Seguridad ---
API_KEY=tu_clave_super_secreta_aqui
ENABLE_IP_WHITELIST=false
ALLOWED_IPS=127.0.0.1,::1

# --- Modo de datos ---
USE_MOCK=false

# --- Google BigQuery ---
BIGQUERY_PROJECT_ID=tu-proyecto-gcp
BIGQUERY_DATASET=pdf_services
GCP_CLIENT_EMAIL=tu-cuenta@tu-proyecto.iam.gserviceaccount.com
GCP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# --- PostgreSQL (logging de requests) ---
LOG_DB_HOST=localhost
LOG_DB_PORT=5432
LOG_DB_USER=tu_usuario
LOG_DB_PASSWORD=tu_password
LOG_DB_NAME=pdf_logs
```

---

## 🗄️ Configuración de la Base de Datos (PostgreSQL)

El servicio registra cada request de la API en una tabla de PostgreSQL. Antes de arrancar el servidor por primera vez, seguí estos pasos en orden:

**1. Crear la base de datos** (con el superusuario `postgres`):
```bash
psql -U postgres -c "CREATE DATABASE pdf_logs;"
```

**2. Otorgar permisos al usuario de tu `.env`** (necesario en PostgreSQL 15+, donde el esquema `public` ya no tiene permisos abiertos por defecto):
```bash
psql -U postgres -d pdf_logs -c "GRANT ALL ON SCHEMA public TO tu_usuario;"
```

**3. Ejecutar la migración:**
```bash
psql -U tu_usuario -d pdf_logs -f migrations/001_create_api_logs.sql
```

> Reemplazá `tu_usuario` y `pdf_logs` con los valores que definiste en tu `.env` para `PG_USER` y `PG_DATABASE` respectivamente.

Esto crea la tabla `api_logs` que almacena: `user_id`, `start_date`, `end_date`, `lang`, `status_code`, `error_message`, `ip_address`, y `duration_ms`.

---

## 🚀 Cómo ejecutarlo en Desarrollo (Local)

1. Instalá las dependencias:
   ```bash
   npm install
   ```

2. Configurá el entorno (modo mock recomendado para desarrollo):
   ```bash
   # Copiá y editá el .env (ver sección anterior)
   ```

3. Iniciá el servidor con recarga automática:
   ```bash
   npm run dev
   ```

   _El servidor escuchará en `http://localhost:3000`_

---

## 🧪 Testing

El proyecto incluye tests unitarios e integración con **Vitest**. El modo mock permite correr los tests sin ninguna credencial externa.

```bash
# Correr todos los tests una sola vez
npm test

# Correr los tests en modo watch (re-ejecuta al guardar)
npm run test:watch
```

Tests incluidos:
- `dbService.test.ts` — Lógica de acceso a datos
- `logService.test.ts` — Registro de requests
- `reporte.route.test.ts` — Endpoint `/api/reporte` (autenticación, validaciones, respuesta PDF)
- `translations.test.ts` — Sistema multi-idioma

---

## 🐳 Cómo desplegarlo en Producción (Docker)

Este proyecto está optimizado para correr en contenedores aislados.

1. Construí la imagen de Docker:
   ```bash
   docker build -t api-generador-pdf .
   ```

2. Levantá el contenedor en segundo plano (Detached mode):
   ```bash
   docker run -d -p 3000:3000 --env-file .env api-generador-pdf
   ```

---

## 📡 Uso de la API

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

**Ejemplo de request:**

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

## 📈 Evolución y Escalado Futuro

Si bien este proyecto funciona como un microservicio síncrono independiente, su arquitectura puede escalar de forma masiva mediante un modelo orientado a eventos (Pub/Sub).

👉 [Ver Arquitectura Futura](./docs/arquitectura_futura.md)

---

## 🛡️ Consideraciones para Producción y Seguridad

### 1. Generación de API Keys Seguras

Para entornos productivos, la `API_KEY` debe ser un hash criptográfico fuerte (mínimo 32 caracteres). Podés generarla así:

- **Opción A (Node.js nativo):**
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **Opción B (Gestores de Contraseñas):** Bitwarden, 1Password, o KeePass para generar y almacenar cadenas largas de forma segura.

### 2. Escalabilidad: Rate Limiting y Timeouts

A medida que el sistema crezca, será necesario implementar:

- **Rate Limiting:** Limitar peticiones por IP/usuario usando `@fastify/rate-limit` + Redis para prevenir abusos o ataques DDoS.
- **Request Timeout:** Cortar conexiones inactivas del cliente para no mantener puertos ocupados.
- **Worker Timeout:** Establecer un tiempo de vida máximo para la generación del PDF. Si un reporte entra en un bucle o es demasiado pesado, el proceso debe terminarse (ej. a los 3 minutos) para evitar procesos "zombie" que consuman toda la RAM del servidor.
