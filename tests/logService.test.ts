// tests/logService.test.ts
//
// Testeamos logService con S3.
// En vez de conectarnos a AWS real, mockeamos @aws-sdk/client-s3
// para verificar que se llama con los parámetros correctos.
//
// Queremos verificar:
//   ✅ ¿logApiRequest acumula en el buffer?
//   ✅ ¿flushBuffer llama a S3 con NDJSON válido?
//   ✅ ¿flushBuffer no hace nada si el buffer está vacío?
//   ✅ ¿No lanza error si S3 falla?

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// vi.mock() se hoistea al inicio del archivo antes de que se ejecute cualquier
// código, por eso mockSend debe declararse con vi.hoisted() para que esté
// disponible dentro del factory de vi.mock().
const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: vi.fn().mockImplementation((params) => params),
}));

// Importamos DESPUÉS del mock
import { logApiRequest, flushBuffer } from "../src/services/logService.js";

const sampleEntry = {
  userId: "u123",
  startDate: "2026-01-01",
  endDate: "2026-01-31",
  lang: "es",
  statusCode: 200,
  errorMessage: null,
  ipAddress: "127.0.0.1",
  durationMs: 150,
};

beforeEach(() => {
  vi.clearAllMocks();
  // Asegurar que el bucket esté configurado para los tests
  process.env.LOG_S3_BUCKET = "test-bucket";
});

afterEach(async () => {
  // Vaciar el buffer entre tests
  await flushBuffer();
});

describe("logApiRequest - acumula en buffer", () => {
  it("no llama a S3 inmediatamente al recibir un log", () => {
    logApiRequest(sampleEntry);
    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe("flushBuffer - escribe a S3", () => {
  it("no llama a S3 si el buffer está vacío", async () => {
    await flushBuffer();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("llama a S3 con body NDJSON válido", async () => {
    logApiRequest(sampleEntry);
    logApiRequest({ ...sampleEntry, userId: "u456", statusCode: 404 });

    await flushBuffer();

    expect(mockSend).toHaveBeenCalledTimes(1);

    const command = vi.mocked(mockSend).mock.calls[0][0] as {
      Body: string;
      Bucket: string;
      ContentType: string;
      Key: string;
    };

    expect(command.Bucket).toBe("test-bucket");
    expect(command.ContentType).toBe("application/x-ndjson");

    // Cada línea debe ser un JSON válido
    const lines = command.Body.trim().split("\n");
    expect(lines).toHaveLength(2);
    lines.forEach((line) => expect(() => JSON.parse(line)).not.toThrow());

    // Cada entrada debe tener created_at
    const parsed = lines.map((l) => JSON.parse(l));
    parsed.forEach((entry) => expect(entry.created_at).toBeTruthy());
  });

  it("la Key sigue el formato Hive-style particionado", async () => {
    logApiRequest(sampleEntry);
    await flushBuffer();

    const command = vi.mocked(mockSend).mock.calls[0][0] as { Key: string };
    expect(command.Key).toMatch(
      /^api-logs\/year=\d{4}\/month=\d{2}\/day=\d{2}\/hour=\d{2}\/api_logs_\d{8}_\d{6}\.ndjson$/
    );
  });

  it("vacía el buffer después del flush", async () => {
    logApiRequest(sampleEntry);
    await flushBuffer();
    vi.clearAllMocks();

    // Segundo flush → buffer vacío → no llama a S3
    await flushBuffer();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("no lanza error si S3 falla", async () => {
    mockSend.mockRejectedValueOnce(new Error("S3 no disponible"));
    logApiRequest(sampleEntry);

    await expect(flushBuffer()).resolves.not.toThrow();
  });
});
