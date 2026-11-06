export interface CreditCheckResult {
  blocked: boolean;
  exposure: number;
}

// Open O2C exposure = total of that customer's sales orders not yet Paid,
// excluding Rejected ones (they will never be delivered or billed).
// Blocked if exposure + this order's total would exceed the credit limit.
//
// Blocked (Credit) orders are deliberately still counted: they are pending
// commitments that a credit controller may release at any time. Excluding
// them would let a second order (or a retried split PO) for the same
// customer pass the check while the first is merely waiting for release,
// so both could end up released over the limit.
export async function checkCreditLimit(
  db: D1Database,
  customerId: number,
  orderTotal: number,
  creditLimit: number
): Promise<CreditCheckResult> {
  const row = await db
    .prepare(`SELECT COALESCE(SUM(total_amount), 0) as exposure FROM sales_orders WHERE customer_id = ?1 AND status NOT IN ('Paid', 'Rejected')`)
    .bind(customerId)
    .first<{ exposure: number }>();
  const exposure = row?.exposure ?? 0;
  return { blocked: exposure + orderTotal > creditLimit, exposure };
}
