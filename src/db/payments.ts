import type { Payment, PaymentRefType } from "../types";
import { nextDocNumber } from "../lib/numbering";
import { recordFlow } from "../lib/flow";
import { getSupplierInvoiceByNumber } from "./p2p";
import { getBillingByNumber } from "./o2c";

export interface PaymentListRow extends Payment {
  ref_number: string;
}

async function resolveRefNumber(db: D1Database, refType: PaymentRefType, refId: number): Promise<string> {
  const table = refType === "supplier_invoice" ? "supplier_invoices" : "billing_documents";
  const column = refType === "supplier_invoice" ? "inv_number" : "bill_number";
  const row = await db.prepare(`SELECT ${column} as num FROM ${table} WHERE id = ?1`).bind(refId).first<{ num: string }>();
  return row?.num ?? "";
}

export async function listPayments(db: D1Database): Promise<PaymentListRow[]> {
  const { results } = await db.prepare(`SELECT * FROM payments ORDER BY created_at DESC, id DESC`).all<Payment>();
  const rows: PaymentListRow[] = [];
  for (const p of results ?? []) {
    rows.push({ ...p, ref_number: await resolveRefNumber(db, p.ref_type, p.ref_id) });
  }
  return rows;
}

export async function getPaymentByNumber(db: D1Database, payNumber: string): Promise<PaymentListRow | null> {
  const p = await db.prepare(`SELECT * FROM payments WHERE pay_number = ?1`).bind(payNumber).first<Payment>();
  if (!p) return null;
  return { ...p, ref_number: await resolveRefNumber(db, p.ref_type, p.ref_id) };
}

// Unified Pay/Clear action for both AP (supplier invoice) and AR (billing
// document) sides — direction and amount follow from which one is paid.
export async function createPayment(db: D1Database, refType: PaymentRefType, refNumber: string): Promise<PaymentListRow> {
  if (refType === "supplier_invoice") {
    const si = await getSupplierInvoiceByNumber(db, refNumber);
    if (!si) throw new Error("not_found");
    if (si.status === "Paid") throw new Error("locked");
    if (si.status !== "Matched" && si.status !== "Released") throw new Error("invalid_state");

    const payNumber = await nextDocNumber(db, "payments", "pay_number", 2000000001);
    const result = await db
      .prepare(`INSERT INTO payments (pay_number, ref_type, ref_id, direction, amount, status) VALUES (?1, 'supplier_invoice', ?2, 'out', ?3, 'Cleared')`)
      .bind(payNumber, si.id, si.amount)
      .run();
    const payId = result.meta.last_row_id as number;

    await db.prepare(`UPDATE supplier_invoices SET status = 'Paid' WHERE id = ?1`).bind(si.id).run();
    await recordFlow(db, "supplier_invoice", si.id, "payment", payId);

    return (await getPaymentByNumber(db, payNumber))!;
  }

  const bill = await getBillingByNumber(db, refNumber);
  if (!bill) throw new Error("not_found");
  if (bill.status === "Paid") throw new Error("locked");

  const payNumber = await nextDocNumber(db, "payments", "pay_number", 2000000001);
  const result = await db
    .prepare(`INSERT INTO payments (pay_number, ref_type, ref_id, direction, amount, status) VALUES (?1, 'billing_document', ?2, 'in', ?3, 'Cleared')`)
    .bind(payNumber, bill.id, bill.amount)
    .run();
  const payId = result.meta.last_row_id as number;

  await db.prepare(`UPDATE billing_documents SET status = 'Paid' WHERE id = ?1`).bind(bill.id).run();
  await db.prepare(`UPDATE sales_orders SET status = 'Paid' WHERE id = ?1`).bind(bill.so_id).run();
  await recordFlow(db, "billing_document", bill.id, "payment", payId);

  return (await getPaymentByNumber(db, payNumber))!;
}
