import { logPool } from "../config/postgres.js";

export interface ApiLogEntry {
  userId: string | undefined;
  startDate: string | undefined;
  endDate: string | undefined;
  lang: string | undefined;
  statusCode: number;
  errorMessage: string | null;
  ipAddress: string | null;
  durationMs: number;
}

export async function logApiRequest(entry: ApiLogEntry): Promise<void> {
  const sql = `
    INSERT INTO api_logs
      (user_id, start_date, end_date, lang, status_code, error_message, ip_address, duration_ms)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `;
  try {
    await logPool.query(sql, [
      entry.userId ?? null,
      entry.startDate ?? null,
      entry.endDate ?? null,
      entry.lang ?? null,
      entry.statusCode,
      entry.errorMessage,
      entry.ipAddress,
      entry.durationMs,
    ]);
  } catch (err) {
    console.warn("Failed to write API log to database:", err);
  }
}
