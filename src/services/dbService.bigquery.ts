import { bigquery, DATASET_ID } from "../config/database.js";
import type { StatementData } from "../types/index.js";

// queries ficticias
export async function getStatementDataFromBigQuery(userId: string): Promise<StatementData> {
  const userQuery = `SELECT * FROM \`${DATASET_ID}.users\` WHERE id = @userId LIMIT 1`;
  const txQuery = `SELECT * FROM \`${DATASET_ID}.transactions\` WHERE userId = @userId ORDER BY date DESC`;

  const options = { query: userQuery, params: { userId } };
  const [[user]] = await bigquery.query(options);
  const [transactions] = await bigquery.query({
    query: txQuery,
    params: { userId },
  });

  return { user, transactions };
}
