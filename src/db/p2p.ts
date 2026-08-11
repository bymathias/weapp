import type {
  GoodsReceipt,
  GoodsReceiptWithItems,
  GrItem,
  PoItem,
  PurchaseOrder,
  PurchaseOrderWithItems,
  SiItem,
  SupplierInvoice,
  SupplierInvoiceWithItems,
} from "../types";
import { computeLineTotal, sumLineTotals } from "../lib/totals";
import { nextDocNumber } from "../lib/numbering";
import { evaluateMatch } from "../lib/matching";
import { recordFlow } from "../lib/flow";

// Purchase Orders -------------------------------------------------------------

export interface PurchaseOrderListRow extends PurchaseOrder {
  vendor_name: string;
  vendor_ref_id: string;
}

export async function listPurchaseOrders(db: D1Database): Promise<PurchaseOrderListRow[]> {
  const { results } = await db
    .prepare(
      `SELECT po.*, v.name as vendor_name, v.ref_id as vendor_ref_id
       FROM purchase_orders po JOIN vendors v ON v.id = po.vendor_id
       ORDER BY po.created_at DESC, po.id DESC`
    )
    .all<PurchaseOrderListRow>();
  return results ?? [];
}

export async function getPurchaseOrderByNumber(db: D1Database, poNumber: string): Promise<PurchaseOrderWithItems | null> {
  const po = await db.prepare(`SELECT * FROM purchase_orders WHERE po_number = ?1`).bind(poNumber).first<PurchaseOrder>();
  if (!po) return null;
  const { results } = await db.prepare(`SELECT * FROM po_items WHERE po_id = ?1 ORDER BY id`).bind(po.id).all<PoItem>();
  return { ...po, items: results ?? [] };
}

export async function getPurchaseOrder(db: D1Database, id: number): Promise<PurchaseOrderWithItems | null> {
  const po = await db.prepare(`SELECT * FROM purchase_orders WHERE id = ?1`).bind(id).first<PurchaseOrder>();
  if (!po) return null;
  const { results } = await db.prepare(`SELECT * FROM po_items WHERE po_id = ?1 ORDER BY id`).bind(po.id).all<PoItem>();
  return { ...po, items: results ?? [] };
}

export interface CreatePoItemInput {
  material_id: number;
  qty: number;
  price: number;
}

export async function createPurchaseOrder(
  db: D1Database,
  vendorId: number,
  items: CreatePoItemInput[]
): Promise<PurchaseOrderWithItems> {
  const poNumber = await nextDocNumber(db, "purchase_orders", "po_number", 4500000001);

  const result = await db
    .prepare(`INSERT INTO purchase_orders (po_number, vendor_id, status) VALUES (?1, ?2, 'Open')`)
    .bind(poNumber, vendorId)
    .run();
  const poId = result.meta.last_row_id as number;

  for (const item of items) {
    const lineTotal = computeLineTotal(item.qty, item.price);
    await db
      .prepare(`INSERT INTO po_items (po_id, material_id, qty, price, line_total) VALUES (?1, ?2, ?3, ?4, ?5)`)
      .bind(poId, item.material_id, item.qty, item.price, lineTotal)
      .run();
  }

  return (await getPurchaseOrderByNumber(db, poNumber))!;
}

// Goods Receipts ----------------------------------------------------------------

export interface GoodsReceiptListRow extends GoodsReceipt {
  po_number: string;
}

export async function listGoodsReceipts(db: D1Database): Promise<GoodsReceiptListRow[]> {
  const { results } = await db
    .prepare(
      `SELECT gr.*, po.po_number as po_number
       FROM goods_receipts gr JOIN purchase_orders po ON po.id = gr.po_id
       ORDER BY gr.created_at DESC, gr.id DESC`
    )
    .all<GoodsReceiptListRow>();
  return results ?? [];
}

export async function getGoodsReceiptByNumber(db: D1Database, grNumber: string): Promise<GoodsReceiptWithItems | null> {
  const gr = await db.prepare(`SELECT * FROM goods_receipts WHERE gr_number = ?1`).bind(grNumber).first<GoodsReceipt>();
  if (!gr) return null;
  const { results } = await db.prepare(`SELECT * FROM gr_items WHERE gr_id = ?1 ORDER BY id`).bind(gr.id).all<GrItem>();
  return { ...gr, items: results ?? [] };
}

export interface CreateGrItemInput {
  po_item_id: number;
  qty_received: number;
}

export async function createGoodsReceipt(db: D1Database, poId: number, items: CreateGrItemInput[]): Promise<GoodsReceiptWithItems> {
  const grNumber = await nextDocNumber(db, "goods_receipts", "gr_number", 5000000001);

  const result = await db
    .prepare(`INSERT INTO goods_receipts (gr_number, po_id, status) VALUES (?1, ?2, 'Posted')`)
    .bind(grNumber, poId)
    .run();
  const grId = result.meta.last_row_id as number;

  for (const item of items) {
    await db
      .prepare(`INSERT INTO gr_items (gr_id, po_item_id, qty_received) VALUES (?1, ?2, ?3)`)
      .bind(grId, item.po_item_id, item.qty_received)
      .run();
  }

  await db
    .prepare(`UPDATE purchase_orders SET status = CASE WHEN status = 'Open' THEN 'Received' ELSE status END WHERE id = ?1`)
    .bind(poId)
    .run();

  await recordFlow(db, "purchase_order", poId, "goods_receipt", grId);

  return (await getGoodsReceiptByNumber(db, grNumber))!;
}

// Supplier Invoices ------------------------------------------------------------

export interface SupplierInvoiceListRow extends SupplierInvoice {
  vendor_name: string;
  po_number: string;
}

export async function listSupplierInvoices(db: D1Database): Promise<SupplierInvoiceListRow[]> {
  const { results } = await db
    .prepare(
      `SELECT si.*, v.name as vendor_name, po.po_number as po_number
       FROM supplier_invoices si
       JOIN vendors v ON v.id = si.vendor_id
       JOIN purchase_orders po ON po.id = si.po_id
       ORDER BY si.created_at DESC, si.id DESC`
    )
    .all<SupplierInvoiceListRow>();
  return results ?? [];
}

export async function getSupplierInvoiceByNumber(db: D1Database, invNumber: string): Promise<SupplierInvoiceWithItems | null> {
  const si = await db.prepare(`SELECT * FROM supplier_invoices WHERE inv_number = ?1`).bind(invNumber).first<SupplierInvoice>();
  if (!si) return null;
  const { results } = await db.prepare(`SELECT * FROM si_items WHERE si_id = ?1 ORDER BY id`).bind(si.id).all<SiItem>();
  return { ...si, items: results ?? [] };
}

export interface CreateSiItemInput {
  po_item_id: number;
  qty: number;
  price: number;
}

export async function createSupplierInvoice(
  db: D1Database,
  poId: number,
  vendorId: number,
  items: CreateSiItemInput[]
): Promise<SupplierInvoiceWithItems> {
  const invNumber = await nextDocNumber(db, "supplier_invoices", "inv_number", 5100000001);
  const computedItems = items.map((item) => ({ ...item, line_total: computeLineTotal(item.qty, item.price) }));
  const amount = sumLineTotals(computedItems);

  const result = await db
    .prepare(`INSERT INTO supplier_invoices (inv_number, po_id, vendor_id, amount, status) VALUES (?1, ?2, ?3, ?4, 'Invoiced')`)
    .bind(invNumber, poId, vendorId, amount)
    .run();
  const siId = result.meta.last_row_id as number;

  for (const item of computedItems) {
    await db
      .prepare(`INSERT INTO si_items (si_id, po_item_id, qty, price, line_total) VALUES (?1, ?2, ?3, ?4, ?5)`)
      .bind(siId, item.po_item_id, item.qty, item.price, item.line_total)
      .run();
  }

  await db.prepare(`UPDATE purchase_orders SET status = 'Invoiced' WHERE id = ?1`).bind(poId).run();

  await recordFlow(db, "purchase_order", poId, "supplier_invoice", siId);

  return (await getSupplierInvoiceByNumber(db, invNumber))!;
}

export async function matchSupplierInvoice(db: D1Database, invNumber: string): Promise<SupplierInvoiceWithItems> {
  const existing = await getSupplierInvoiceByNumber(db, invNumber);
  if (!existing) throw new Error("not_found");
  if (existing.status === "Paid") throw new Error("locked");

  const result = await evaluateMatch(db, existing.po_id, existing.items);

  await db
    .prepare(`UPDATE supplier_invoices SET status = ?1, block_reason = ?2 WHERE id = ?3`)
    .bind(result.status, result.block_reason, existing.id)
    .run();

  return (await getSupplierInvoiceByNumber(db, invNumber))!;
}

export async function releaseSupplierInvoice(db: D1Database, invNumber: string): Promise<SupplierInvoiceWithItems> {
  const existing = await getSupplierInvoiceByNumber(db, invNumber);
  if (!existing) throw new Error("not_found");
  if (existing.status === "Paid") throw new Error("locked");
  if (existing.status !== "Blocked") throw new Error("invalid_state");

  await db.prepare(`UPDATE supplier_invoices SET status = 'Released' WHERE id = ?1`).bind(existing.id).run();

  return (await getSupplierInvoiceByNumber(db, invNumber))!;
}
