import { BigQuery } from "@google-cloud/bigquery";
import { bigquery, DATASET_ID } from "../config/database.js";
import type { StatementData } from "../types/index.js";

// queries ficticias
export async function getStatementDataFromBigQuery(userId: string): Promise<StatementData> {
  const userQuery = `SELECT * FROM \`${DATASET_ID}.users\` WHERE id = @userId LIMIT 1`;
  const txQuery = `SELECT * FROM \`${DATASET_ID}.transactions\` WHERE userId = @userId ORDER BY date DESC`;

  // bigquery es null solo en modo mock — esta función nunca se llama en ese caso.
  const client = bigquery as BigQuery;
  const options = { query: userQuery, params: { userId } };
  const [[user]] = await client.query(options);
  const [transactions] = await client.query({
    query: txQuery,
    params: { userId },
  });

  return { user, transactions };
}
