export interface PayrollRunUser {
  id: string;
  name: string;
  salary: number;
  storeName: string | null;
}

/** One salary payment run for a calendar month. */
export interface PayrollRun {
  id: string;
  monthKey: string; // YYYY-MM
  monthLabel: string; // e.g. "July 2026"
  totalAmount: number;
  userCount: number;
  paidAt: string;
  paidById: string;
  paidBy: { id: string; name: string };
  users: PayrollRunUser[];
}

export interface PayrollStatus {
  currentMonthKey: string;
  currentMonthLabel: string;
  currentMonthPaid: boolean;
  monthlyTotal: number; // sum of active users' salaries
  activeUserCount: number;
  runs: PayrollRun[];
}

export interface RunPayrollInput {
  monthKey: string;
}
