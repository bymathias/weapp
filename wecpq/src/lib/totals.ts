export interface LineItemInput {
  sku: string;
  description: string;
  quantity: number;
  unit_price: number;
}

export interface ComputedLineItem extends LineItemInput {
  line_total: number;
}

// Business rules — always computed server-side, never trusted from the client.
export function computeLineTotal(quantity: number, unitPrice: number): number {
  return round2(quantity * unitPrice);
}

export function computeItems(items: LineItemInput[]): ComputedLineItem[] {
  return items.map((item) => ({
    ...item,
    line_total: computeLineTotal(item.quantity, item.unit_price),
  }));
}

export function computeSubtotal(items: ComputedLineItem[]): number {
  return round2(items.reduce((sum, item) => sum + item.line_total, 0));
}

export function computeTotalAmount(subtotal: number, marginPct: number): number {
  return round2(subtotal * (1 + marginPct / 100));
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export async function nextQuoteRef(db: D1Database): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `Q-${year}-`;
  const row = await db
    .prepare(
      `SELECT ref FROM quotes WHERE ref LIKE ?1 ORDER BY CAST(SUBSTR(ref, LENGTH(?2) + 1) AS INTEGER) DESC LIMIT 1`
    )
    .bind(`${prefix}%`, prefix)
    .first<{ ref: string }>();

  let next = 1;
  if (row?.ref) {
    const n = parseInt(row.ref.slice(prefix.length), 10);
    if (!Number.isNaN(n)) next = n + 1;
  }
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export async function nextCustomerRefId(db: D1Database): Promise<string> {
  const prefix = "CUST-";
  const row = await db
    .prepare(
      `SELECT ref_id FROM customers WHERE ref_id LIKE ?1 ORDER BY CAST(SUBSTR(ref_id, LENGTH(?1) + 1) AS INTEGER) DESC LIMIT 1`
    )
    .bind(`${prefix}%`)
    .first<{ ref_id: string }>();

  let next = 1;
  if (row?.ref_id) {
    const n = parseInt(row.ref_id.slice(prefix.length), 10);
    if (!Number.isNaN(n)) next = n + 1;
  }
  return `${prefix}${String(next).padStart(4, "0")}`;
}
