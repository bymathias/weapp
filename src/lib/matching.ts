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

// 2-way (PO vs Invoice) if the PO has no goods receipt yet; 3-way (PO vs GR
// vs Invoice) once one exists — same tolerance either way.
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
  const hasGR = receivedByPoItem.size > 0;

  const reasons: string[] = [];
  siItems.forEach((si, idx) => {
    const line = idx + 1;
    const poItem = poItemById.get(si.po_item_id);
    if (!poItem) {
      reasons.push(`Line ${line}: no matching PO line`);
      return;
    }
    if (!withinTolerance(si.price, poItem.price)) {
      reasons.push(
        `Line ${line}: invoice price ${si.price.toFixed(2)} vs PO price ${poItem.price.toFixed(2)} exceeds ${MATCH_TOLERANCE * 100}% tolerance`
      );
    }
    if (!withinTolerance(si.qty, poItem.qty)) {
      reasons.push(`Line ${line}: invoice qty ${si.qty} vs PO qty ${poItem.qty} exceeds ${MATCH_TOLERANCE * 100}% tolerance`);
    }
    if (hasGR) {
      const received = receivedByPoItem.get(si.po_item_id) ?? 0;
      if (!withinTolerance(si.qty, received)) {
        reasons.push(
          `Line ${line}: invoice qty ${si.qty} vs goods receipt qty ${received} exceeds ${MATCH_TOLERANCE * 100}% tolerance`
        );
      }
    }
  });

  if (reasons.length > 0) {
    return { status: "Blocked", block_reason: reasons.join("; ") };
  }
  return { status: "Matched", block_reason: null };
}
