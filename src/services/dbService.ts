import fs from "fs/promises";
import path from "path";

export interface User {
  id: string;
  name: string;
  email: string;
  documento: string;
}

export interface Transaction {
  id: string;
  userId: string;
  date: string;
  amount: number;
  description: string;
  type: string;
  currency: string;
}

export interface StatementData {
  user: User;
  transactions: Transaction[];
}

export async function getStatementData(
  userId: string,
  start: string,
  end: string,
): Promise<StatementData> {
  const usersPath = path.join(process.cwd(), "src/mocks/user.data.json");
  const txPath = path.join(process.cwd(), "src/mocks/transaction.data.json");

  const usersData: User[] = JSON.parse(await fs.readFile(usersPath, "utf-8"));
  const txData: Transaction[] = JSON.parse(await fs.readFile(txPath, "utf-8"));

  const user = usersData.find((u) => u.id === userId);

  if (!user) {
    throw new Error("USUARIO_NO_ENCONTRADO");
  }

  const transactions = txData.filter(
    (tx) => tx.userId === userId && tx.date >= start && tx.date <= end,
  );

  return { user, transactions };
}
