// tests/dbService.test.ts
//
// Testeamos getStatementData() directamente, sin levantar ningún servidor.
// La función lee los archivos JSON de src/mocks/ — eso sigue funcionando igual.
//
// Casos que cubrimos:
//   ✅ Usuario encontrado → devuelve los datos correctos
//   ✅ Filtro por fechas → solo trae transacciones del rango pedido
//   ✅ Usuario sin transacciones en el rango → devuelve array vacío
//   ✅ Usuario inexistente → lanza el error correcto

import { describe, it, expect } from "vitest";
import { getStatementData } from "../src/services/dbService.js";

// 📌 GRUPO 1: Usuario encontrado
describe("getStatementData - usuario encontrado", () => {

  it("devuelve el usuario correcto para el id '123'", async () => {
    const { user } = await getStatementData("123", "2026-03-01", "2026-03-31");

    expect(user.id).toBe("123");
    expect(user.name).toBe("Juan Pérez");
    expect(user.email).toBe("juan@example.com");
  });

  it("devuelve el usuario correcto para el id '456'", async () => {
    const { user } = await getStatementData("456", "2026-03-01", "2026-03-31");

    expect(user.name).toBe("Marina Silva");
  });

});

// 📌 GRUPO 2: Filtro por rango de fechas
describe("getStatementData - filtro por fechas", () => {

  it("trae todas las transacciones de marzo 2026 para el usuario 123", async () => {
    const { transactions } = await getStatementData("123", "2026-03-01", "2026-03-31");

    // Según el mock, el usuario 123 tiene 9 transacciones en marzo
    expect(transactions.length).toBe(9);
  });

  it("solo trae transacciones dentro del rango pedido", async () => {
    // Pedimos solo la primera semana de marzo
    const { transactions } = await getStatementData("123", "2026-03-01", "2026-03-05");

    // En ese rango están: t1 (01), t2 (02), t3 (05) → 3 transacciones
    expect(transactions.length).toBe(3);

    // Verificamos que todas las fechas estén dentro del rango
    for (const tx of transactions) {
      expect(tx.date >= "2026-03-01").toBe(true);
      expect(tx.date <= "2026-03-05").toBe(true);
    }
  });

  it("devuelve array vacío si no hay transacciones en el rango", async () => {
    // Pedimos un rango donde el usuario 123 no tiene movimientos
    const { transactions } = await getStatementData("123", "2025-01-01", "2025-01-31");

    expect(transactions).toEqual([]); // array vacío
    expect(transactions.length).toBe(0);
  });

  it("no mezcla transacciones de distintos usuarios", async () => {
    const { transactions } = await getStatementData("123", "2026-03-01", "2026-03-31");

    // Todas las transacciones deben pertenecer al usuario 123
    for (const tx of transactions) {
      expect(tx.userId).toBe("123");
    }
  });

});

// 📌 GRUPO 3: Usuario inexistente
describe("getStatementData - usuario inexistente", () => {

  it("lanza un error si el userId no existe", async () => {
    // expect(...).rejects → forma de testear funciones async que deben fallar
    await expect(
      getStatementData("ID_QUE_NO_EXISTE", "2026-03-01", "2026-03-31")
    ).rejects.toThrow("USUARIO_NO_ENCONTRADO");
  });

  it("lanza un error con el mensaje exacto que usa el servidor para el 404", async () => {
    // Es importante que el mensaje sea exacto porque server.ts lo compara con ===
    const error = await getStatementData("XXX", "2026-01-01", "2026-12-31")
      .catch((e: Error) => e);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("USUARIO_NO_ENCONTRADO");
  });

});
