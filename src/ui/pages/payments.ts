import { html, raw } from "hono/html";
import { layout } from "../layout";
import { filterBar, money, statusBadge } from "./shared";
import type { PaymentListRow } from "../../db/payments";

function paymentRow(p: PaymentListRow, rowTestid: string, statusTestidPrefix: string, showCustomerPo: boolean) {
  return html`<tr id="${rowTestid}-${p.pay_number}" data-testid="${rowTestid}">
    <td>${p.pay_number}</td>
    <td>${p.ref_number}</td>
    ${showCustomerPo ? html`<td data-testid="incoming-payment-customer-po-number">${p.customer_po_number ?? "—"}</td>` : ""}
    <td>${p.party_name}</td>
    <td>${money(p.amount)}</td>
    <td>${p.created_at.slice(0, 10)}</td>
    <td>${statusBadge(p.status, `${statusTestidPrefix}-${p.pay_number}`)}</td>
  </tr>`;
}

// Payments (outgoing / P2P): vendor payments, direction = 'out'.
export function outgoingPaymentsListPage(rows: PaymentListRow[]) {
  const body = rows.map((p) => paymentRow(p, "payment-row", "payment-status", false)).join("");

  return layout(
    "Payments",
    html`<div class="page-header">
        <div>
          <h1>Payments (${rows.length})</h1>
          <p class="muted">Outgoing vendor payments — Purchase-to-Pay.</p>
        </div>
      </div>
      ${filterBar("payments-table")}
      <div class="panel">
        <table id="payments-table" data-testid="payments-table">
          <thead>
            <tr><th>Payment</th><th>Supplier Invoice</th><th>Vendor</th><th>Amount</th><th>Date</th><th>Status</th></tr>
          </thead>
          <tbody>${raw(body || `<tr><td colspan="6" class="muted">No payments yet.</td></tr>`)}</tbody>
        </table>
      </div>`,
    { loggedIn: true }
  );
}

// Incoming Payments (O2C): customer receipts, direction = 'in'. The
// filter-bar's client-side row search already covers this column since it
// matches on full row text — no new search logic needed.
export function incomingPaymentsListPage(rows: PaymentListRow[]) {
  const body = rows.map((p) => paymentRow(p, "incoming-payment-row", "incoming-payment-status", true)).join("");

  return layout(
    "Incoming Payments",
    html`<div class="page-header">
        <div>
          <h1>Incoming Payments (${rows.length})</h1>
          <p class="muted">Incoming customer receipts — Order-to-Cash.</p>
        </div>
      </div>
      ${filterBar("incoming-payments-table")}
      <div class="panel">
        <table id="incoming-payments-table" data-testid="incoming-payments-table">
          <thead>
            <tr><th>Payment</th><th>Billing Document</th><th>Customer PO</th><th>Customer</th><th>Amount</th><th>Date</th><th>Status</th></tr>
          </thead>
          <tbody>${raw(body || `<tr><td colspan="7" class="muted">No incoming payments yet.</td></tr>`)}</tbody>
        </table>
      </div>`,
    { loggedIn: true }
  );
}
