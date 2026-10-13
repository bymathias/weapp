// Business rules — always computed server-side, never trusted from the client.

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computeLineTotal(qty: number, price: number): number {
  return round2(qty * price);
}

export function sumLineTotals(items: { line_total: number }[]): number {
  return round2(items.reduce((sum, item) => sum + item.line_total, 0));
}
