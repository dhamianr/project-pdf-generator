// tests/logService.test.ts
//
// ¿Qué es un mock?
// Es un "doble de actuación" — reemplazamos la función real (pool.query)
// por una función falsa que controlamos nosotros. Así evitamos conectarnos
// a la DB real en los tests.
//
// Queremos verificar:
//   ✅ ¿logApiRequest llama al pool.query con el SQL correcto?
//   ✅ ¿Le pasa los parámetros en el orden correcto?
//   ✅ ¿No lanza error si la DB falla? (falla silenciosa)

import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock() intercepta el import de postgres.ts y reemplaza logPool
// por un objeto falso que nosotros controlamos.
// Esto se ejecuta ANTES de que se importe logService.ts
vi.mock("../src/config/postgres.js", () => ({
  logPool: {
    // query es la función que reemplazamos con vi.fn()
    // vi.fn() es una función vacía que registra cuántas veces fue llamada
    // y con qué argumentos — sin hacer nada real
    query: vi.fn(),
  },
}));

// Importamos DESPUÉS del mock para que ya use la versión falsa
import { logApiRequest } from "../src/services/logService.js";
import { logPool } from "../src/config/postgres.js";

// Antes de cada test, reseteamos el mock para que no queden llamadas anteriores
beforeEach(() => {
  vi.clearAllMocks();
});

// 📌 GRUPO 1: Verifica que se llama a la DB correctamente
describe("logApiRequest - llamadas a la base de datos", () => {

  it("llama a pool.query una vez por request", async () => {
    await logApiRequest({
      userId: "123",
      startDate: "2026-03-01",
      endDate: "2026-03-31",
      lang: "es",
      statusCode: 200,
      errorMessage: null,
      ipAddress: "127.0.0.1",
      durationMs: 150,
    });

    // ¿Se llamó exactamente una vez?
    expect(logPool.query).toHaveBeenCalledTimes(1);
  });

  it("pasa los parámetros en el orden correcto", async () => {
    await logApiRequest({
      userId: "456",
      startDate: "2026-01-01",
      endDate: "2026-01-31",
      lang: "en",
      statusCode: 404,
      errorMessage: "Usuario no encontrado",
      ipAddress: "192.168.1.1",
      durationMs: 42,
    });

    // toHaveBeenCalledWith verifica con qué argumentos se llamó la función
    // El primer argumento es el SQL (no nos importa el texto exacto, solo los params)
    // El segundo es el array de valores → ese sí lo verificamos en orden
    expect(logPool.query).toHaveBeenCalledWith(
      expect.any(String), // el SQL puede ser cualquier string
      ["456", "2026-01-01", "2026-01-31", "en", 404, "Usuario no encontrado", "192.168.1.1", 42]
    );
  });

  it("convierte userId undefined a null", async () => {
    await logApiRequest({
      userId: undefined,   // ← viene como undefined
      startDate: "2026-03-01",
      endDate: "2026-03-31",
      lang: "es",
      statusCode: 400,
      errorMessage: null,
      ipAddress: null,
      durationMs: 5,
    });

    const llamada = vi.mocked(logPool.query).mock.calls[0];
    const params = llamada[1] as unknown[];

    // El primer param ($1) debe ser null, no undefined
    // PostgreSQL no entiende undefined — solo null
    expect(params[0]).toBeNull();
  });

});

// 📌 GRUPO 2: Falla silenciosa si la DB no responde
describe("logApiRequest - falla silenciosa", () => {

  it("no lanza error si pool.query falla", async () => {
    // Hacemos que el mock simule un error de DB
    vi.mocked(logPool.query).mockRejectedValueOnce(new Error("DB caída"));

    // La función NO debe lanzar el error hacia arriba
    await expect(
      logApiRequest({
        userId: "123",
        startDate: "2026-03-01",
        endDate: "2026-03-31",
        lang: "es",
        statusCode: 200,
        errorMessage: null,
        ipAddress: null,
        durationMs: 100,
      })
    ).resolves.not.toThrow(); // resuelve sin tirar error ✅
  });

});
