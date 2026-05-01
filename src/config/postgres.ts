import pg from "pg";
import "dotenv/config";

export const logPool = new pg.Pool({
  host: process.env.LOG_DB_HOST ?? "localhost",
  port: Number(process.env.LOG_DB_PORT ?? "5432"),
  database: process.env.LOG_DB_NAME ?? "pdf_services_logs",
  user: process.env.LOG_DB_USER ?? "postgres",
  password: process.env.LOG_DB_PASSWORD ?? "",
  max: 5,
  idleTimeoutMillis: 30_000,
});

logPool.on("error", (err) => {
  console.error("Unexpected log DB pool error: ", err);
});
