// tests/translations.test.ts
//
// ¿Qué es esto?
// Un archivo de tests para el objeto i18n de translations.ts
//
// Estructura básica de un test:
//   describe("nombre del grupo") → agrupa tests relacionados
//   it("descripción en lenguaje natural") → un caso de prueba
//   expect(valor).toBe(esperado) → la aserción (la comparación)

import { describe, it, expect } from "vitest";
import { i18n } from "../src/utils/translations.js";

// 📌 GRUPO 1: Tests del idioma español
describe("i18n - español (es)", () => {

  it("tiene el título correcto", () => {
    expect(i18n.es.title).toBe("Estado de Cuenta");
  });

  it("tiene la etiqueta de cliente", () => {
    expect(i18n.es.client).toBeDefined(); // la propiedad existe
    expect(typeof i18n.es.client).toBe("string"); // y es un string
  });

  it("tiene los headers de la tabla de transacciones", () => {
    // headers es un array con los títulos de columnas del PDF
    expect(Array.isArray(i18n.es.headers)).toBe(true);
    expect(i18n.es.headers.length).toBeGreaterThan(0); // al menos 1 columna
  });

  it("tiene exactamente 4 headers", () => {
    // FECHA, DESCRIPCIÓN, MONEDA, MONTO
    expect(i18n.es.headers.length).toBe(4);
  });

});

// 📌 GRUPO 2: Tests del idioma inglés
describe("i18n - inglés (en)", () => {

  it("tiene el título correcto", () => {
    expect(i18n.en.title).toBe("Account Statement");
  });

  it("el título en inglés es distinto al de español", () => {
    // Detecta si alguien copió el texto sin traducirlo
    expect(i18n.en.title).not.toBe(i18n.es.title);
  });

});

// 📌 GRUPO 3: Tests del idioma portugués
describe("i18n - portugués (pt)", () => {

  it("tiene el título correcto", () => {
    expect(i18n.pt.title).toBe("Extrato de Conta");
  });

  it("el título en portugués es distinto al de español y al de inglés", () => {
    expect(i18n.pt.title).not.toBe(i18n.es.title);
    expect(i18n.pt.title).not.toBe(i18n.en.title);
  });

});

// 📌 GRUPO 4: Consistencia entre los tres idiomas
describe("i18n - consistencia entre idiomas", () => {

  it("los tres idiomas tienen las mismas claves", () => {
    const clavesEs = Object.keys(i18n.es).sort();
    const clavesEn = Object.keys(i18n.en).sort();
    const clavesPt = Object.keys(i18n.pt).sort();

    // Si alguien agrega una clave en español y se olvida de inglés → falla
    expect(clavesEn).toEqual(clavesEs);
    expect(clavesPt).toEqual(clavesEs);
  });

  it("los tres idiomas tienen la misma cantidad de headers", () => {
    expect(i18n.en.headers.length).toBe(i18n.es.headers.length);
    expect(i18n.pt.headers.length).toBe(i18n.es.headers.length);
  });

  it("los tres idiomas tienen los mismos tipos de transacción", () => {
    const tiposEs = Object.keys(i18n.es.txTypes).sort();
    const tiposEn = Object.keys(i18n.en.txTypes).sort();
    const tiposPt = Object.keys(i18n.pt.txTypes).sort();

    expect(tiposEn).toEqual(tiposEs);
    expect(tiposPt).toEqual(tiposEs);
  });

});
