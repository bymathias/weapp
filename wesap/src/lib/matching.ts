import type { PoItem } from "../types";

export const MATCH_TOLERANCE = 0.05; // ±5% on price and qty

export interface MatchResult {
  status: "Matched" | "Blocked";
  block_reason: string | null;
}

function withinTolerance(actual: number, expected: number): boolean {
  if (expected === 0) return actual === 0;
  return Math.abs(actual - expected) <= expected * MATCH_TOLERANCE;
}

// Real 3-way match: PO vs Goods Receipt vs Invoice. No goods receipt on the
// PO at all means there's nothing to 3-way match against, so the invoice is
// blocked outright rather than falling back to a 2-way (PO vs Invoice)
// match. Stops at the first failing line — block_reason describes just
// that one line, not every mismatch.
export async function evaluateMatch(
  db: D1Database,
  poId: number,
  siItems: { po_item_id: number; qty: number; price: number }[]
): Promise<MatchResult> {
  const { results: poItems } = await db.prepare(`SELECT * FROM po_items WHERE po_id = ?1`).bind(poId).all<PoItem>();
  const poItemById = new Map((poItems ?? []).map((i) => [i.id, i]));

  const { results: grRows } = await db
    .prepare(
      `SELECT gi.po_item_id as po_item_id, SUM(gi.qty_received) as received
       FROM gr_items gi JOIN goods_receipts gr ON gr.id = gi.gr_id
       WHERE gr.po_id = ?1 GROUP BY gi.po_item_id`
    )
    .bind(poId)
    .all<{ po_item_id: number; received: number }>();
  const receivedByPoItem = new Map((grRows ?? []).map((r) => [r.po_item_id, r.received]));

  if (receivedByPoItem.size === 0) {
    return { status: "Blocked", block_reason: "No goods receipt posted." };
  }

  for (let idx = 0; idx < siItems.length; idx++) {
    const si = siItems[idx];
    const line = idx + 1;
    const poItem = poItemById.get(si.po_item_id);
    if (!poItem) {
      return { status: "Blocked", block_reason: `Line ${line}: no matching PO line` };
    }

    if (!withinTolerance(si.price, poItem.price)) {
      return {
        status: "Blocked",
        block_reason: `Line ${line}: invoice price ${si.price.toFixed(2)} vs PO price ${poItem.price.toFixed(2)} exceeds ${MATCH_TOLERANCE * 100}% tolerance`,
      };
    }

    const received = receivedByPoItem.get(si.po_item_id) ?? 0;
    if (!withinTolerance(si.qty, received)) {
      return {
        status: "Blocked",
        block_reason: `Quantity mismatch: invoiced ${si.qty} vs ${received} received`,
      };
    }
  }

  return { status: "Matched", block_reason: null };
}
