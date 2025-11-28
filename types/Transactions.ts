type Transactions = {
  id: number;
  amount: number;
  date: string;
  description: string | null;
  status: "Not Yet Paid" | "Pending" | "Completed" | "Missing in Action" | null;
  type: "Income" | "Expense";
  vehicle: number | null;
};

export type { Transactions };
