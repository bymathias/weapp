import type { Payment, PaymentDirection, PaymentRefType } from "../types";
import { nextDocNumber } from "../lib/numbering";
import { recordFlow } from "../lib/flow";
import { getSupplierInvoiceByNumber } from "./p2p";
import { getBillingByNumber } from "./o2c";

export interface PaymentListRow extends Payment {
  ref_number: string;
  party_name: string;
}

async function resolveRefAndParty(db: D1Database, refType: PaymentRefType, refId: number): Promise<{ ref_number: string; party_name: string }> {
  const row =
    refType === "supplier_invoice"
      ? await db
          .prepare(`SELECT si.inv_number as ref_number, v.name as party_name FROM supplier_invoices si JOIN vendors v ON v.id = si.vendor_id WHERE si.id = ?1`)
          .bind(refId)
          .first<{ ref_number: string; party_name: string }>()
      : await db
          .prepare(`SELECT bd.bill_number as ref_number, c.name as party_name FROM billing_documents bd JOIN customers c ON c.id = bd.customer_id WHERE bd.id = ?1`)
          .bind(refId)
          .first<{ ref_number: string; party_name: string }>();
  return row ?? { ref_number: "", party_name: "" };
}

// direction omitted -> all payments (both AP/"out" and AR/"in").
export async function listPayments(db: D1Database, direction?: PaymentDirection): Promise<PaymentListRow[]> {
  const { results } = await db
    .prepare(
      `SELECT p.*,
         CASE WHEN p.ref_type = 'supplier_invoice' THEN si.inv_number ELSE bd.bill_number END AS ref_number,
         CASE WHEN p.ref_type = 'supplier_invoice' THEN v.name ELSE c.name END AS party_name
       FROM payments p
       LEFT JOIN supplier_invoices si ON p.ref_type = 'supplier_invoice' AND si.id = p.ref_id
       LEFT JOIN vendors v ON v.id = si.vendor_id
       LEFT JOIN billing_documents bd ON p.ref_type = 'billing_document' AND bd.id = p.ref_id
       LEFT JOIN customers c ON c.id = bd.customer_id
       WHERE ?1 IS NULL OR p.direction = ?1
       ORDER BY p.created_at DESC, p.id DESC`
    )
    .bind(direction ?? null)
    .all<PaymentListRow>();
  return results ?? [];
}

export async function getPaymentByNumber(db: D1Database, payNumber: string): Promise<PaymentListRow | null> {
  const p = await db.prepare(`SELECT * FROM payments WHERE pay_number = ?1`).bind(payNumber).first<Payment>();
  if (!p) return null;
  return { ...p, ...(await resolveRefAndParty(db, p.ref_type, p.ref_id)) };
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
