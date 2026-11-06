import type { BillingDocument, Delivery, SalesOrder, SalesOrderWithItems, SoItem } from "../types";
import { computeLineTotal, sumLineTotals } from "../lib/totals";
import { nextDocNumber } from "../lib/numbering";
import { checkCreditLimit } from "../lib/credit";
import { recordFlow } from "../lib/flow";
import { getCustomer, getMaterialByCode, adjustMaterialStock } from "./master";

// Sales Orders --------------------------------------------------------------

export interface SalesOrderListRow extends SalesOrder {
  customer_name: string;
  customer_ref_id: string;
}

export interface SalesOrderFilters {
  customer_po_number?: string;
  source_quote_ref?: string;
  customer_ref?: string;
  status?: string;
}

export async function listSalesOrders(db: D1Database, filters: SalesOrderFilters = {}): Promise<SalesOrderListRow[]> {
  const columns: Record<keyof SalesOrderFilters, string> = {
    customer_po_number: "so.customer_po_number",
    source_quote_ref: "so.source_quote_ref",
    customer_ref: "c.ref_id",
    status: "so.status",
  };
  const conditions: string[] = [];
  const params: string[] = [];
  for (const [key, column] of Object.entries(columns) as [keyof SalesOrderFilters, string][]) {
    const value = filters[key];
    if (value === undefined || value === "") continue;
    params.push(value);
    conditions.push(`${column} = ?${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const { results } = await db
    .prepare(
      `SELECT so.*, c.name as customer_name, c.ref_id as customer_ref_id
       FROM sales_orders so JOIN customers c ON c.id = so.customer_id
       ${where}
       ORDER BY so.created_at DESC, so.id DESC`
    )
    .bind(...params)
    .all<SalesOrderListRow>();
  return results ?? [];
}

export class DuplicateSalesOrderError extends Error {
  constructor(public soNumber: string) {
    super("duplicate");
  }
}

// One non-Rejected sales order per (customer PO, source quote) pair, so a
// retried bot call can't create the same order twice.
export async function findActiveSalesOrderByPoAndQuote(
  db: D1Database,
  customerPoNumber: string,
  sourceQuoteRef: string
): Promise<string | null> {
  const row = await db
    .prepare(
      `SELECT so_number FROM sales_orders
       WHERE customer_po_number = ?1 AND source_quote_ref = ?2 AND status != 'Rejected'
       ORDER BY id LIMIT 1`
    )
    .bind(customerPoNumber, sourceQuoteRef)
    .first<{ so_number: string }>();
  return row?.so_number ?? null;
}

export async function getSalesOrderByNumber(db: D1Database, soNumber: string): Promise<SalesOrderWithItems | null> {
  const so = await db.prepare(`SELECT * FROM sales_orders WHERE so_number = ?1`).bind(soNumber).first<SalesOrder>();
  if (!so) return null;
  const { results } = await db.prepare(`SELECT * FROM so_items WHERE so_id = ?1 ORDER BY id`).bind(so.id).all<SoItem>();
  return { ...so, items: results ?? [] };
}

export async function getSalesOrder(db: D1Database, id: number): Promise<SalesOrderWithItems | null> {
  const so = await db.prepare(`SELECT * FROM sales_orders WHERE id = ?1`).bind(id).first<SalesOrder>();
  if (!so) return null;
  const { results } = await db.prepare(`SELECT * FROM so_items WHERE so_id = ?1 ORDER BY id`).bind(so.id).all<SoItem>();
  return { ...so, items: results ?? [] };
}

export interface CreateSoItemInput {
  description: string;
  qty: number;
  unit_price: number;
  material_code?: string | null;
  quote_sku?: string | null;
}

export async function createSalesOrder(
  db: D1Database,
  customerId: number,
  items: CreateSoItemInput[],
  sourceQuoteRef: string | null,
  customerPoNumber: string
): Promise<SalesOrderWithItems> {
  const customer = await getCustomer(db, customerId);
  if (!customer) throw new Error("not_found");

  if (sourceQuoteRef) {
    const existing = await findActiveSalesOrderByPoAndQuote(db, customerPoNumber, sourceQuoteRef);
    if (existing) throw new DuplicateSalesOrderError(existing);
  }

  const computedItems = items.map((item) => ({ ...item, line_total: computeLineTotal(item.qty, item.unit_price) }));
  const totalAmount = sumLineTotals(computedItems);

  const credit = await checkCreditLimit(db, customerId, totalAmount, customer.credit_limit);
  const status = credit.blocked ? "Blocked (Credit)" : "Open";

  const soNumber = await nextDocNumber(db, "sales_orders", "so_number", 1000000001);

  let result: D1Result;
  try {
    result = await db
      .prepare(
        `INSERT INTO sales_orders (so_number, customer_id, status, source_quote_ref, customer_po_number, total_amount)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
      )
      .bind(soNumber, customerId, status, sourceQuoteRef, customerPoNumber, totalAmount)
      .run();
  } catch (err) {
    // A concurrent request for the same pair won the race past the check above.
    const existing = sourceQuoteRef ? await findActiveSalesOrderByPoAndQuote(db, customerPoNumber, sourceQuoteRef) : null;
    if (existing) throw new DuplicateSalesOrderError(existing);
    throw err;
  }
  const soId = result.meta.last_row_id as number;

  for (const item of computedItems) {
    await db
      .prepare(
        `INSERT INTO so_items (so_id, description, qty, unit_price, line_total, material_code, quote_sku)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
      )
      .bind(soId, item.description, item.qty, item.unit_price, item.line_total, item.material_code ?? null, item.quote_sku ?? null)
      .run();
  }

  return (await getSalesOrderByNumber(db, soNumber))!;
}

export interface OrderedQuantities {
  source_quote_ref: string;
  lines: { quote_sku: string; ordered_qty: number }[];
  unlinked_qty: number;
  sales_orders: { so_number: string; customer_po_number: string | null; status: SalesOrder["status"] }[];
}

// Quantity already ordered per quote line across the quote's non-Rejected
// sales orders — lets the intake process spot split orders that over-order.
export async function getOrderedQuantities(db: D1Database, sourceQuoteRef: string): Promise<OrderedQuantities> {
  const { results: orders } = await db
    .prepare(
      `SELECT so_number, customer_po_number, status FROM sales_orders
       WHERE source_quote_ref = ?1 AND status != 'Rejected' ORDER BY id`
    )
    .bind(sourceQuoteRef)
    .all<OrderedQuantities["sales_orders"][number]>();
  const { results: sums } = await db
    .prepare(
      `SELECT i.quote_sku as quote_sku, SUM(i.qty) as qty
       FROM so_items i JOIN sales_orders so ON so.id = i.so_id
       WHERE so.source_quote_ref = ?1 AND so.status != 'Rejected'
       GROUP BY i.quote_sku ORDER BY MIN(i.id)`
    )
    .bind(sourceQuoteRef)
    .all<{ quote_sku: string | null; qty: number }>();
  const rows = sums ?? [];
  return {
    source_quote_ref: sourceQuoteRef,
    lines: rows.filter((r) => r.quote_sku !== null).map((r) => ({ quote_sku: r.quote_sku!, ordered_qty: r.qty })),
    unlinked_qty: rows.find((r) => r.quote_sku === null)?.qty ?? 0,
    sales_orders: orders ?? [],
  };
}

export async function releaseCreditBlock(db: D1Database, soNumber: string): Promise<SalesOrderWithItems> {
  const existing = await getSalesOrderByNumber(db, soNumber);
  if (!existing) throw new Error("not_found");
  if (existing.status === "Paid") throw new Error("locked");
  if (existing.status !== "Blocked (Credit)") throw new Error("invalid_state");

  await db.prepare(`UPDATE sales_orders SET status = 'Released' WHERE id = ?1`).bind(existing.id).run();

  return (await getSalesOrderByNumber(db, soNumber))!;
}

// Deliveries ------------------------------------------------------------------

export interface DeliveryListRow extends Delivery {
  so_number: string;
  customer_name: string;
}

export async function listDeliveries(db: D1Database): Promise<DeliveryListRow[]> {
  const { results } = await db
    .prepare(
      `SELECT d.*, so.so_number as so_number, c.name as customer_name
       FROM deliveries d
       JOIN sales_orders so ON so.id = d.so_id
       JOIN customers c ON c.id = so.customer_id
       ORDER BY d.created_at DESC, d.id DESC`
    )
    .all<DeliveryListRow>();
  return results ?? [];
}

export async function getDeliveryByNumber(db: D1Database, dlvNumber: string): Promise<Delivery | null> {
  return (await db.prepare(`SELECT * FROM deliveries WHERE dlv_number = ?1`).bind(dlvNumber).first<Delivery>()) ?? null;
}

// Deducts stock for lines with a material_code, then marks the SO Delivered.
export async function createDelivery(db: D1Database, soNumber: string): Promise<Delivery> {
  const so = await getSalesOrderByNumber(db, soNumber);
  if (!so) throw new Error("not_found");
  if (so.status === "Paid") throw new Error("locked");
  if (so.status !== "Open" && so.status !== "Released") throw new Error("invalid_state");

  const dlvNumber = await nextDocNumber(db, "deliveries", "dlv_number", 8000000001);

  const result = await db
    .prepare(`INSERT INTO deliveries (dlv_number, so_id, status) VALUES (?1, ?2, 'Posted')`)
    .bind(dlvNumber, so.id)
    .run();
  const dlvId = result.meta.last_row_id as number;

  for (const item of so.items) {
    if (!item.material_code) continue;
    const material = await getMaterialByCode(db, item.material_code);
    if (material) await adjustMaterialStock(db, material.id, -item.qty);
  }

  await db.prepare(`UPDATE sales_orders SET status = 'Delivered' WHERE id = ?1`).bind(so.id).run();

  await recordFlow(db, "sales_order", so.id, "delivery", dlvId);

  return (await getDeliveryByNumber(db, dlvNumber))!;
}

// Billing Documents --------------------------------------------------------------

export interface BillingListRow extends BillingDocument {
  so_number: string;
  customer_name: string;
}

export async function listBillingDocuments(db: D1Database): Promise<BillingListRow[]> {
  const { results } = await db
    .prepare(
      `SELECT b.*, so.so_number as so_number, c.name as customer_name
       FROM billing_documents b
       JOIN sales_orders so ON so.id = b.so_id
       JOIN customers c ON c.id = b.customer_id
       ORDER BY b.created_at DESC, b.id DESC`
    )
    .all<BillingListRow>();
  return results ?? [];
}

export async function getBillingByNumber(db: D1Database, billNumber: string): Promise<BillingDocument | null> {
  return (await db.prepare(`SELECT * FROM billing_documents WHERE bill_number = ?1`).bind(billNumber).first<BillingDocument>()) ?? null;
}

export async function createBilling(db: D1Database, soNumber: string): Promise<BillingDocument> {
  const so = await getSalesOrderByNumber(db, soNumber);
  if (!so) throw new Error("not_found");
  if (so.status === "Paid") throw new Error("locked");
  if (so.status !== "Delivered") throw new Error("invalid_state");

  const billNumber = await nextDocNumber(db, "billing_documents", "bill_number", 9000000001);

  const result = await db
    .prepare(
      `INSERT INTO billing_documents (bill_number, so_id, customer_id, amount, status, customer_po_number)
       VALUES (?1, ?2, ?3, ?4, 'Open', ?5)`
    )
    .bind(billNumber, so.id, so.customer_id, so.total_amount, so.customer_po_number)
    .run();
  const billId = result.meta.last_row_id as number;

  await db.prepare(`UPDATE sales_orders SET status = 'Billed' WHERE id = ?1`).bind(so.id).run();

  await recordFlow(db, "sales_order", so.id, "billing_document", billId);

  return (await getBillingByNumber(db, billNumber))!;
}
