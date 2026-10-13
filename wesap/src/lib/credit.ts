export interface CreditCheckResult {
  blocked: boolean;
  exposure: number;
}

// Open O2C exposure = total of that customer's sales orders not yet Paid.
// Blocked if exposure + this order's total would exceed the credit limit.
export async function checkCreditLimit(
  db: D1Database,
  customerId: number,
  orderTotal: number,
  creditLimit: number
): Promise<CreditCheckResult> {
  const row = await db
    .prepare(`SELECT COALESCE(SUM(total_amount), 0) as exposure FROM sales_orders WHERE customer_id = ?1 AND status != 'Paid'`)
    .bind(customerId)
    .first<{ exposure: number }>();
  const exposure = row?.exposure ?? 0;
  return { blocked: exposure + orderTotal > creditLimit, exposure };
}
