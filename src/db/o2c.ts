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

export async function listSalesOrders(db: D1Database): Promise<SalesOrderListRow[]> {
  const { results } = await db
    .prepare(
      `SELECT so.*, c.name as customer_name, c.ref_id as customer_ref_id
       FROM sales_orders so JOIN customers c ON c.id = so.customer_id
       ORDER BY so.created_at DESC, so.id DESC`
    )
    .all<SalesOrderListRow>();
  return results ?? [];
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
}

export async function createSalesOrder(
  db: D1Database,
  customerId: number,
  items: CreateSoItemInput[],
  sourceQuoteRef: string | null
): Promise<SalesOrderWithItems> {
  const customer = await getCustomer(db, customerId);
  if (!customer) throw new Error("not_found");

  const computedItems = items.map((item) => ({ ...item, line_total: computeLineTotal(item.qty, item.unit_price) }));
  const totalAmount = sumLineTotals(computedItems);

  const credit = await checkCreditLimit(db, customerId, totalAmount, customer.credit_limit);
  const status = credit.blocked ? "Blocked (Credit)" : "Open";

  const soNumber = await nextDocNumber(db, "sales_orders", "so_number", 1000000001);

  const result = await db
    .prepare(
      `INSERT INTO sales_orders (so_number, customer_id, status, source_quote_ref, total_amount)
       VALUES (?1, ?2, ?3, ?4, ?5)`
    )
    .bind(soNumber, customerId, status, sourceQuoteRef, totalAmount)
    .run();
  const soId = result.meta.last_row_id as number;

  for (const item of computedItems) {
    await db
      .prepare(
        `INSERT INTO so_items (so_id, description, qty, unit_price, line_total, material_code)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
      )
      .bind(soId, item.description, item.qty, item.unit_price, item.line_total, item.material_code ?? null)
      .run();
  }

  return (await getSalesOrderByNumber(db, soNumber))!;
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
    .prepare(`INSERT INTO billing_documents (bill_number, so_id, customer_id, amount, status) VALUES (?1, ?2, ?3, ?4, 'Open')`)
    .bind(billNumber, so.id, so.customer_id, so.total_amount)
    .run();
  const billId = result.meta.last_row_id as number;

  await db.prepare(`UPDATE sales_orders SET status = 'Billed' WHERE id = ?1`).bind(so.id).run();

  await recordFlow(db, "sales_order", so.id, "billing_document", billId);

  return (await getBillingByNumber(db, billNumber))!;
}
