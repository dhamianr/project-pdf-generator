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
