import type { DocType, FlowEntry } from "../types";

const DOC_TABLE: Record<DocType, { table: string; numberCol: string }> = {
  purchase_order: { table: "purchase_orders", numberCol: "po_number" },
  goods_receipt: { table: "goods_receipts", numberCol: "gr_number" },
  supplier_invoice: { table: "supplier_invoices", numberCol: "inv_number" },
  sales_order: { table: "sales_orders", numberCol: "so_number" },
  delivery: { table: "deliveries", numberCol: "dlv_number" },
  billing_document: { table: "billing_documents", numberCol: "bill_number" },
  payment: { table: "payments", numberCol: "pay_number" },
};

export async function recordFlow(db: D1Database, fromType: DocType, fromId: number, toType: DocType, toId: number): Promise<void> {
  await db
    .prepare(`INSERT INTO doc_flow (from_type, from_id, to_type, to_id) VALUES (?1, ?2, ?3, ?4)`)
    .bind(fromType, fromId, toType, toId)
    .run();
}

// BFS the doc_flow graph in both directions from (type, id) and resolve each
// visited node to its human-facing number + current status. Excludes the
// starting node itself — the panel shows *related* documents.
export async function getFlow(db: D1Database, type: DocType, id: number): Promise<FlowEntry[]> {
  const key = (t: DocType, i: number) => `${t}:${i}`;
  const visited = new Set<string>([key(type, id)]);
  const nodes: [DocType, number][] = [];
  const queue: [DocType, number][] = [[type, id]];

  while (queue.length > 0) {
    const [t, i] = queue.shift()!;
    const { results: outEdges } = await db
      .prepare(`SELECT to_type, to_id FROM doc_flow WHERE from_type = ?1 AND from_id = ?2`)
      .bind(t, i)
      .all<{ to_type: DocType; to_id: number }>();
    const { results: inEdges } = await db
      .prepare(`SELECT from_type, from_id FROM doc_flow WHERE to_type = ?1 AND to_id = ?2`)
      .bind(t, i)
      .all<{ from_type: DocType; from_id: number }>();

    for (const e of outEdges ?? []) {
      const k = key(e.to_type, e.to_id);
      if (!visited.has(k)) {
        visited.add(k);
        nodes.push([e.to_type, e.to_id]);
        queue.push([e.to_type, e.to_id]);
      }
    }
    for (const e of inEdges ?? []) {
      const k = key(e.from_type, e.from_id);
      if (!visited.has(k)) {
        visited.add(k);
        nodes.push([e.from_type, e.from_id]);
        queue.push([e.from_type, e.from_id]);
      }
    }
  }

  const entries: FlowEntry[] = [];
  for (const [t, i] of nodes) {
    const meta = DOC_TABLE[t];
    const row = await db
      .prepare(`SELECT ${meta.numberCol} as number, status FROM ${meta.table} WHERE id = ?1`)
      .bind(i)
      .first<{ number: string; status: string }>();
    if (row) entries.push({ type: t, id: i, number: row.number, status: row.status });
  }
  return entries;
}
