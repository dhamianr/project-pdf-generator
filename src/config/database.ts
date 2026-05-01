import { BigQuery } from "@google-cloud/bigquery";
import "dotenv/config";

const USE_MOCK = process.env.USE_MOCK === "true";
const clientEmail = process.env.GCP_CLIENT_EMAIL;
const privateKey = process.env.GCP_PRIVATE_KEY;
const projectId = process.env.BIGQUERY_PROJECT_ID;

if (!USE_MOCK && (!clientEmail || !privateKey || !projectId)) {
  throw new Error(
    "Faltan variables de entorno requeridas para BigQuery: BIGQUERY_PROJECT_ID, GCP_CLIENT_EMAIL, GCP_PRIVATE_KEY",
  );
}

export const bigquery = new BigQuery({
  projectId: projectId!,
  credentials: {
    client_email: clientEmail!,
    private_key: privateKey!.replace(/\\n/g, "\n"),
  },
});

export const DATASET_ID = process.env.BIGQUERY_DATASET ?? "pdf_services";
