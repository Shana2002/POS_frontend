import type { UserRole } from "../../auth/types";
import type { Invoice } from "../invoices/types";
import type { Payment, PaymentFilters } from "./types";

const branchScoped: UserRole[] = ["BRANCH_MANAGER", "SALES_REP"];
const payableStatuses = ["ISSUED", "PARTIALLY_DELIVERED", "DELIVERED"];
function minorUnits(value: string) {
  const match = value.trim().match(/^(\d+)(?:\.(\d+))?$/);
  if (!match) return null;
  return BigInt(match[1] + (match[2] || "").padEnd(2, "0").slice(0, 2));
}
export function buildPaymentParams(
  filters: PaymentFilters,
): Record<string, string | number | boolean> {
  const keys: Array<keyof PaymentFilters> = [
    "branch_id",
    "invoice_id",
    "customer_id",
    "method",
    "reversed",
    "from",
    "to",
    "page",
    "per_page",
  ];
  const entries: Array<[string, string | number | boolean]> = [];
  keys.forEach((key) => {
    const value = filters[key];
    if (!value) return;
    if (key === "page" || key === "per_page")
      entries.push([key, Number(value)]);
    else if (key === "reversed") entries.push([key, value === "true"]);
    else entries.push([key, value]);
  });
  return Object.fromEntries(entries);
}
export function paymentScope(
  role: UserRole,
  assignedBranch: string | null,
  requested: string,
) {
  const locked = branchScoped.includes(role);
  return { branchId: locked ? assignedBranch || "" : requested, locked };
}
export function canPayInvoice(
  invoice: Pick<Invoice, "status" | "balance_due">,
) {
  const balance = minorUnits(invoice.balance_due);
  return (
    payableStatuses.includes(invoice.status.toUpperCase()) &&
    balance !== null &&
    balance > BigInt(0)
  );
}
export function amountError(amount: string, balance: string) {
  const entered = minorUnits(amount);
  const due = minorUnits(balance);
  if (entered === null || entered <= BigInt(0))
    return "Enter a valid amount greater than zero.";
  if (due !== null && entered > due)
    return `Amount cannot exceed the current balance of ${balance}.`;
  return undefined;
}
export function canReversePayment(payment: Pick<Payment, "is_reversed">) {
  return !payment.is_reversed;
}
export function isOverpaymentError(error: unknown) {
  return (
    error instanceof Error &&
    (("code" in error && error.code === "OVERPAYMENT") ||
      /overpayment/i.test(error.message))
  );
}
