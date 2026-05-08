import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import "dotenv/config";

const s3 = new S3Client({ region: process.env.AWS_REGION ?? "us-east-1" });
const FLUSH_INTERVAL_MS = 5 * 60 * 1000;
const FLUSH_BATCH_SIZE = 500;

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

interface StoredLogEntry extends ApiLogEntry {
  created_at: string;
}

let buffer: StoredLogEntry[] = [];

export function logApiRequest(entry: ApiLogEntry): void {
  buffer.push({ ...entry, created_at: new Date().toISOString() });
  if (buffer.length >= FLUSH_BATCH_SIZE) {
    void flushBuffer();
  }
}

export async function flushBuffer(): Promise<void> {
  const bucket = process.env.LOG_S3_BUCKET ?? "";
  const prefix = process.env.LOG_S3_PREFIX ?? "api-logs";
  if (buffer.length === 0 || !bucket) return;
  const toFlush = buffer.splice(0);
  const now = new Date();
  const key = buildKey(now, prefix);
  const body = toFlush.map((e) => JSON.stringify(e)).join("\n");
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: "application/x-ndjson",
      })
    );
  } catch (err) {
    console.warn("Failed to write logs to S3:", err);
  }
}

function buildKey(d: Date, prefix: string): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `${prefix}/year=${d.getFullYear()}/month=${pad(d.getMonth() + 1)}/day=${pad(d.getDate())}/hour=${pad(d.getHours())}/api_logs_${ts}.ndjson`;
}

const flushTimer = setInterval(() => {
  void flushBuffer();
}, FLUSH_INTERVAL_MS);

// Evitar que el timer mantenga el proceso vivo innecesariamente
flushTimer.unref();

async function shutdown() {
  clearInterval(flushTimer);
  await flushBuffer();
}

process.on("SIGTERM", () => shutdown().then(() => process.exit(0)));
process.on("SIGINT", () => shutdown().then(() => process.exit(0)));
