import { fmt } from "@/lib/utils";

export function computeProjectedNetProfit(params: {
  currentNetProfit: number;
  amount: number;
  oldAmount?: number;
}): number {
  const { currentNetProfit, amount, oldAmount = 0 } = params;
  return currentNetProfit + oldAmount - amount;
}

export function shouldWarnExpenseProfit(params: {
  currentNetProfit: number;
  amount: number;
  oldAmount?: number;
  isEdit: boolean;
}): boolean {
  const { currentNetProfit, amount, oldAmount = 0, isEdit } = params;

  if (!isEdit) {
    if (currentNetProfit < 0) return true;
    return amount > currentNetProfit;
  }

  const delta = amount - oldAmount;
  const projectedNetProfit = currentNetProfit - delta;

  if (currentNetProfit < 0 && delta > 0) return true;
  return projectedNetProfit < 0;
}

export function buildProfitWarningMessage(params: {
  currentNetProfit: number;
  amount: number;
  oldAmount?: number;
  isEdit: boolean;
  scopeLabel: string;
}): {
  title: string;
  message: string;
  projectedNetProfit: number;
  isEdit: boolean;
  oldAmount: number;
  newAmount: number;
  expenseDelta: number;
  netProfitExcludingExpense: number;
} {
  const {
    currentNetProfit,
    amount,
    oldAmount = 0,
    isEdit,
    scopeLabel,
  } = params;
  const projectedNetProfit = computeProjectedNetProfit({
    currentNetProfit,
    amount,
    oldAmount,
  });
  const expenseDelta = amount - oldAmount;
  const netProfitExcludingExpense = currentNetProfit + oldAmount;
  const scope = scopeLabel;
  const scopeSuffix = scope !== "company-wide" ? ` (${scope})` : "";

  if (!isEdit && currentNetProfit < 0) {
    return {
      title: "Net profit already negative",
      message: `Company-wide net profit to date is already ${fmt(currentNetProfit)}. This expense of ${fmt(amount)} will deepen the loss to ${fmt(projectedNetProfit)}.${scopeSuffix}`,
      projectedNetProfit,
      isEdit,
      oldAmount,
      newAmount: amount,
      expenseDelta,
      netProfitExcludingExpense,
    };
  }

  if (!isEdit && amount > currentNetProfit) {
    return {
      title: "Expense exceeds net profit",
      message: `This expense of ${fmt(amount)} exceeds company-wide net profit to date of ${fmt(currentNetProfit)}. Net profit would become ${fmt(projectedNetProfit)}.${scopeSuffix}`,
      projectedNetProfit,
      isEdit,
      oldAmount,
      newAmount: amount,
      expenseDelta,
      netProfitExcludingExpense,
    };
  }

  if (isEdit && currentNetProfit < 0 && amount > oldAmount) {
    return {
      title: "Increasing expense while at a loss",
      message: `Company-wide net profit to date is already ${fmt(currentNetProfit)}. Changing this expense from ${fmt(oldAmount)} to ${fmt(amount)} (${expenseDelta >= 0 ? "+" : ""}${fmt(expenseDelta)}) will bring net profit to ${fmt(projectedNetProfit)}.${scopeSuffix}`,
      projectedNetProfit,
      isEdit,
      oldAmount,
      newAmount: amount,
      expenseDelta,
      netProfitExcludingExpense,
    };
  }

  if (isEdit) {
    return {
      title: "Expense exceeds net profit",
      message: `Company-wide net profit to date is ${fmt(currentNetProfit)}, which already includes this expense at ${fmt(oldAmount)}. Changing it to ${fmt(amount)} (${expenseDelta >= 0 ? "+" : ""}${fmt(expenseDelta)}) would bring net profit to ${fmt(projectedNetProfit)}.${scopeSuffix}`,
      projectedNetProfit,
      isEdit,
      oldAmount,
      newAmount: amount,
      expenseDelta,
      netProfitExcludingExpense,
    };
  }

  return {
    title: "Expense exceeds net profit",
    message: `This change would bring company-wide net profit to date to ${fmt(projectedNetProfit)}. Current net profit is ${fmt(currentNetProfit)}.${scopeSuffix}`,
    projectedNetProfit,
    isEdit,
    oldAmount,
    newAmount: amount,
    expenseDelta,
    netProfitExcludingExpense,
  };
}
