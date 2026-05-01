import { getStatementDataFromBigQuery } from "./dbService.bigquery.js";
import { getStatementDataFromMock } from "./dbService.mock.js";

const USE_MOCK = process.env.USE_MOCK === "true";

export const getStatementData = USE_MOCK
  ? getStatementDataFromMock
  : getStatementDataFromBigQuery;
