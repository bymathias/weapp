import type { WorklistItem } from "../types";

// One inbox aggregating everything needing human/bot action across both
// processes: blocked invoices to release, credit-blocked SOs, deliveries
// due, unpaid billing docs.
export async function getWorklist(db: D1Database): Promise<WorklistItem[]> {
  const items: WorklistItem[] = [];

  const { results: blockedInvoices } = await db
    .prepare(
      `SELECT si.inv_number, si.block_reason, v.name as vendor_name
       FROM supplier_invoices si JOIN vendors v ON v.id = si.vendor_id
       WHERE si.status = 'Blocked' ORDER BY si.created_at`
    )
    .all<{ inv_number: string; block_reason: string | null; vendor_name: string }>();
  for (const row of blockedInvoices ?? []) {
    items.push({
      kind: "blocked-invoice",
      title: `Release invoice ${row.inv_number}`,
      detail: `${row.vendor_name} — ${row.block_reason ?? "blocked"}`,
      href: `/supplier-invoices/${row.inv_number}`,
    });
  }

  const { results: blockedSos } = await db
    .prepare(
      `SELECT so.so_number, c.name as customer_name
       FROM sales_orders so JOIN customers c ON c.id = so.customer_id
       WHERE so.status = 'Blocked (Credit)' ORDER BY so.created_at`
    )
    .all<{ so_number: string; customer_name: string }>();
  for (const row of blockedSos ?? []) {
    items.push({
      kind: "credit-blocked-so",
      title: `Release credit block on ${row.so_number}`,
      detail: `${row.customer_name} — exceeds credit limit`,
      href: `/sales-orders/${row.so_number}`,
    });
  }

  const { results: dueSos } = await db
    .prepare(
      `SELECT so.so_number, c.name as customer_name
       FROM sales_orders so JOIN customers c ON c.id = so.customer_id
       WHERE so.status IN ('Open', 'Released') ORDER BY so.created_at`
    )
    .all<{ so_number: string; customer_name: string }>();
  for (const row of dueSos ?? []) {
    items.push({
      kind: "delivery-due",
      title: `Create delivery for ${row.so_number}`,
      detail: `${row.customer_name} — ready to deliver`,
      href: `/sales-orders/${row.so_number}`,
    });
  }

  const { results: unpaidBilling } = await db
    .prepare(
      `SELECT b.bill_number, c.name as customer_name
       FROM billing_documents b JOIN customers c ON c.id = b.customer_id
       WHERE b.status = 'Open' ORDER BY b.created_at`
    )
    .all<{ bill_number: string; customer_name: string }>();
  for (const row of unpaidBilling ?? []) {
    items.push({
      kind: "unpaid-billing",
      title: `Clear billing ${row.bill_number}`,
      detail: `${row.customer_name} — payment outstanding`,
      href: `/billing/${row.bill_number}`,
    });
  }

  return items;
}
