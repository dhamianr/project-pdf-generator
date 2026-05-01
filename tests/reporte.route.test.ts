// tests/reporte.route.test.ts
//
// Testeamos la ruta GET /api/reporte usando fastify.inject()
//
// ¿Qué es fastify.inject()?
// Simula un request HTTP completo (con headers, query params, etc.)
// sin abrir ningún puerto real. La respuesta es idéntica a la real.
//
// Flujo:
//   buildApp() → crea Fastify con las rutas configuradas
//   fastify.inject({ ... }) → simula el request
//   response → verificamos statusCode y body

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildApp } from "../src/app.js";

// La API key que usamos en todos los requests válidos.
// Viene de .env.test (cargado por vitest.config.ts) — nunca hardcodeada acá.
// Si no existe la variable, el "!" hace que TypeScript falle en compilación
// en lugar de pasar undefined silenciosamente.
const VALID_API_KEY = process.env.API_KEY!;

// beforeEach / afterEach → se ejecutan antes y después de CADA test
// Así cada test empieza con una instancia limpia de Fastify
let app: ReturnType<typeof buildApp>;

beforeEach(() => {
  app = buildApp();
});

afterEach(async () => {
  await app.close(); // cerramos la instancia para no dejar recursos colgados
});

// 📌 GRUPO 1: Autenticación
describe("GET /api/reporte - autenticación", () => {

  it("devuelve 401 si no se envía el header x-api-key", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/reporte?userId=123&start=2026-03-01&end=2026-03-31",
      // sin headers → sin API key
    });

    expect(response.statusCode).toBe(401);

    // El body viene como string, lo parseamos a objeto
    const body = JSON.parse(response.body);
    expect(body.error).toBe("Acceso denegado. Credenciales inválidas.");
  });

  it("devuelve 401 si la api key es incorrecta", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/reporte?userId=123&start=2026-03-01&end=2026-03-31",
      headers: { "x-api-key": "clave-incorrecta" },
    });

    expect(response.statusCode).toBe(401);
  });

});

// 📌 GRUPO 2: Validación de parámetros
describe("GET /api/reporte - validación de params", () => {

  it("devuelve 400 si start es posterior a end", async () => {
    const response = await app.inject({
      method: "GET",
      // start (marzo) > end (enero) → inválido
      url: "/api/reporte?userId=123&start=2026-03-01&end=2026-01-01",
      headers: { "x-api-key": VALID_API_KEY },
    });

    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.body);
    expect(body.error).toBe("La fecha de inicio no puede ser posterior al fin.");
  });

  it("devuelve 400 si faltan parámetros requeridos", async () => {
    // Falta el parámetro 'end'
    const response = await app.inject({
      method: "GET",
      url: "/api/reporte?userId=123&start=2026-03-01",
      headers: { "x-api-key": VALID_API_KEY },
    });

    // Fastify rechaza el request por el schema antes de llegar al handler
    expect(response.statusCode).toBe(400);
  });

});

// 📌 GRUPO 3: Lógica de negocio
describe("GET /api/reporte - lógica", () => {

  it("devuelve 404 si el userId no existe", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/reporte?userId=ID_INEXISTENTE&start=2026-03-01&end=2026-03-31",
      headers: { "x-api-key": VALID_API_KEY },
    });

    expect(response.statusCode).toBe(404);

    const body = JSON.parse(response.body);
    expect(body.error).toBe("Usuario no encontrado");
  });

  it("devuelve 200 y un PDF para un request válido", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/reporte?userId=123&start=2026-03-01&end=2026-03-31",
      headers: { "x-api-key": VALID_API_KEY },
    });

    expect(response.statusCode).toBe(200);

    // Verificamos que la respuesta sea un PDF
    expect(response.headers["content-type"]).toBe("application/pdf");

    // Los PDFs siempre empiezan con los bytes "%PDF"
    expect(response.body.startsWith("%PDF")).toBe(true);
  });

});
