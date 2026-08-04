export interface PayrollStaff {
  id: string;
  name: string;
  salary: number;
  /** Branch name (API `branchName`, bridged to `storeName` on the wire). */
  storeName: string | null;
  /** Already paid for the current month? */
  paid: boolean;
}

export interface PayrollHistoryUser {
  id: string;
  name: string;
  salary: number;
  storeName: string | null;
  paidAt: string;
}

export interface PayrollHistoryMonth {
  monthKey: string;
  monthLabel: string;
  totalAmount: number;
  userCount: number;
  users: PayrollHistoryUser[];
}

export interface PayrollStatus {
  currentMonthKey: string;
  currentMonthLabel: string;
  currentMonthPaid: boolean;
  monthlyTotal: number;
  activeUserCount: number;
  remainingCount: number;
  users: PayrollStaff[];
  history: PayrollHistoryMonth[];
}
