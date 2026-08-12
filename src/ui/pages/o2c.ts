import { html, raw } from "hono/html";
import { layout } from "../layout";
import { anchorBar, docFlowPanel, filterBar, money, objectPageHeader, statusBadge } from "./shared";
import type {
  BillingDocument,
  Customer,
  Delivery,
  FlowEntry,
  Material,
  SalesOrder,
  SalesOrderWithItems,
} from "../../types";
import type { BillingListRow, DeliveryListRow, SalesOrderListRow } from "../../db/o2c";

// Sales Orders ----------------------------------------------------------------

export function salesOrdersListPage(rows: SalesOrderListRow[]) {
  const body = rows
    .map(
      (so) => html`<tr class="clickable-row" data-testid="so-row" data-href="/sales-orders/${so.so_number}">
        <td><a class="link" data-testid="so-link" href="/sales-orders/${so.so_number}">${so.so_number}</a></td>
        <td>${so.customer_name}</td>
        <td>${money(so.total_amount)}</td>
        <td>${statusBadge(so.status, `so-status-${so.so_number}`)}</td>
        <td>${so.created_at.slice(0, 10)}</td>
      </tr>`
    )
    .join("");

  return layout(
    "Sales Orders",
    html`<div class="page-header">
        <div>
          <h1>Sales Orders (${rows.length})</h1>
          <p class="muted">Order-to-Cash documents.</p>
        </div>
        <a class="btn" id="new-so-btn" data-testid="new-so-btn" href="/sales-orders/new">New Sales Order</a>
      </div>
      ${filterBar("so-table")}
      <div class="panel">
        <table id="so-table" data-testid="so-table">
          <thead><tr><th>SO Number</th><th>Customer</th><th>Total</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>${raw(body || `<tr><td colspan="5" class="muted">No sales orders yet.</td></tr>`)}</tbody>
        </table>
      </div>`,
    { loggedIn: true }
  );
}

export function salesOrderDetailPage(so: SalesOrderWithItems, customer: Customer, flow: FlowEntry[]) {
  const rows = so.items
    .map(
      (item) => html`<tr data-testid="so-item-row">
        <td>${item.description}${item.material_code ? html` <span class="muted">(${item.material_code})</span>` : ""}</td>
        <td>${item.qty}</td>
        <td>${money(item.unit_price)}</td>
        <td>${money(item.line_total)}</td>
      </tr>`
    )
    .join("");

  const facets = [{ label: "Customer", value: html`${customer.name} (${customer.ref_id})` }];
  if (so.source_quote_ref) {
    facets.push({ label: "Source Quote", value: html`<span data-testid="so-source-quote-ref">${so.source_quote_ref}</span>` });
  }

  return layout(
    `SO ${so.so_number}`,
    html`${objectPageHeader({
        title: so.so_number,
        titleTestid: "so-number",
        status: so.status,
        statusTestid: "so-status-badge",
        facets,
      })}

      ${so.status === "Blocked (Credit)"
        ? html`<div class="block-banner" id="credit-block-banner" data-testid="credit-block-banner">
            Blocked: this order would exceed ${customer.name}'s credit limit of ${money(customer.credit_limit)}.
          </div>`
        : ""}
      ${so.status === "Paid"
        ? html`<div class="locked-banner" id="paid-locked-banner" data-testid="paid-locked-banner">This sales order is Paid and is locked.</div>`
        : ""}

      ${anchorBar([
        { href: "#items-section", label: "Items" },
        { href: "#doc-flow-panel", label: "Document Flow" },
      ])}

      <h2 id="items-section">Line Items</h2>
      <div class="panel">
        <table id="so-items-table" data-testid="so-items-table">
          <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Line Total</th></tr></thead>
          <tbody>${raw(rows)}</tbody>
        </table>
        <div class="totals">
          <div class="box"><div class="label">Total</div><div class="value" id="so-total" data-testid="so-total">${money(so.total_amount)}</div></div>
        </div>
      </div>

      ${docFlowPanel(flow)}

      <div class="actions-row">
        ${so.status === "Blocked (Credit)"
          ? html`<form method="post" action="/sales-orders/${so.so_number}/release-credit"><button type="submit" class="btn" id="btn-release-credit" data-testid="btn-release-credit">Release Credit</button></form>`
          : ""}
        ${so.status === "Open" || so.status === "Released"
          ? html`<form method="post" action="/sales-orders/${so.so_number}/deliver"><button type="submit" class="btn" id="btn-create-delivery" data-testid="btn-create-delivery">Create Delivery</button></form>`
          : ""}
        ${so.status === "Delivered"
          ? html`<form method="post" action="/sales-orders/${so.so_number}/bill"><button type="submit" class="btn" id="btn-bill" data-testid="btn-bill">Bill</button></form>`
          : ""}
        <a class="btn secondary" id="download-pdf-btn" data-testid="download-pdf-btn" href="/api/sales-orders/${so.so_number}/pdf" target="_blank" rel="noopener">Download PDF</a>
        <a class="btn transparent" id="back-btn" data-testid="back-btn" href="/sales-orders">Back to list</a>
      </div>`,
    { loggedIn: true }
  );
}

function soItemRowHtml(materials: Material[]) {
  const options =
    `<option value="">— none —</option>` +
    materials.map((m) => `<option value="${m.material_code}">${m.material_code} — ${m.description}</option>`).join("");
  return html`<tr class="item-row" data-testid="so-item-row">
    <td><input type="text" name="description[]" class="item-description" data-testid="so-item-description" required /></td>
    <td><input type="number" name="qty[]" class="item-qty" data-testid="so-item-qty" min="1" step="1" value="1" required /></td>
    <td><input type="number" name="unit_price[]" class="item-unit-price" data-testid="so-item-unit-price" min="0" step="0.01" value="0" required /></td>
    <td><select name="material_code[]" class="item-material-code" data-testid="so-item-material-code">${raw(options)}</select></td>
    <td class="item-line-total" data-testid="so-item-line-total">$0.00</td>
    <td><button type="button" class="btn secondary remove-row-btn" data-testid="remove-row-btn">Remove</button></td>
  </tr>`;
}

export function newSalesOrderPage(customers: Customer[], materials: Material[], opts: { error?: string } = {}) {
  const customerOptions = customers.map((c) => `<option value="${c.ref_id}">${c.name} (${c.ref_id})</option>`).join("");

  return layout(
    "New Sales Order",
    html`<h1>New Sales Order</h1>
      ${opts.error ? html`<div class="error" id="so-form-error" data-testid="so-form-error">${opts.error}</div>` : ""}
      <form id="so-form" data-testid="so-form" method="post" action="/sales-orders/new">
        <div class="panel">
          <div class="two-col">
            <div class="field">
              <label for="customer_ref">Customer</label>
              <select id="customer_ref" name="customer_ref" data-testid="so-customer" required>${raw(customerOptions)}</select>
            </div>
            <div class="field">
              <label for="source_quote_ref">Source Quote Ref (optional)</label>
              <input type="text" id="source_quote_ref" name="source_quote_ref" data-testid="so-source-quote-ref-input" placeholder="e.g. Q-2026-0011" />
            </div>
          </div>
        </div>

        <h2>Line Items</h2>
        <div class="panel">
          <table id="items-table" class="items-table" data-testid="so-items-table">
            <thead>
              <tr>
                <th style="width:30%">Description</th>
                <th style="width:10%">Qty</th>
                <th style="width:14%">Unit Price</th>
                <th style="width:22%">Material</th>
                <th style="width:14%">Line Total</th>
                <th style="width:10%"></th>
              </tr>
            </thead>
            <tbody id="items-table-body"></tbody>
          </table>
          <button type="button" class="btn secondary" id="add-row-btn" data-testid="add-row-btn">+ Add line item</button>
          <div class="totals">
            <div class="box"><div class="label">Total</div><div class="value" id="total-display" data-testid="so-total-display">$0.00</div></div>
          </div>
        </div>

        <div class="actions-row">
          <button type="submit" class="btn" id="save-so-btn" data-testid="save-so-btn">Create Sales Order</button>
          <a class="btn transparent" href="/sales-orders" id="cancel-btn" data-testid="cancel-btn">Cancel</a>
        </div>
      </form>

      <template id="row-template">${soItemRowHtml(materials)}</template>
      <script>${raw(soFormScript())}</script>`,
    { loggedIn: true }
  );
}

function soFormScript(): string {
  return `
    (function () {
      var tbody = document.getElementById('items-table-body');
      var template = document.getElementById('row-template');
      var totalEl = document.getElementById('total-display');
      function fmt(n) { return '$' + n.toFixed(2); }
      function recalc() {
        var total = 0;
        tbody.querySelectorAll('.item-row').forEach(function (row) {
          var qty = parseFloat(row.querySelector('.item-qty').value) || 0;
          var price = parseFloat(row.querySelector('.item-unit-price').value) || 0;
          var lt = qty * price;
          row.querySelector('.item-line-total').textContent = fmt(lt);
          total += lt;
        });
        totalEl.textContent = fmt(total);
      }
      function wireRow(row) {
        row.querySelectorAll('.item-qty, .item-unit-price').forEach(function (input) {
          input.addEventListener('input', recalc);
        });
        row.querySelector('.remove-row-btn').addEventListener('click', function () {
          row.remove();
          recalc();
        });
      }
      function addRow() {
        var clone = template.content.cloneNode(true);
        tbody.appendChild(clone);
        wireRow(tbody.lastElementChild);
        recalc();
      }
      document.getElementById('add-row-btn').addEventListener('click', addRow);
      var existing = tbody.querySelectorAll('.item-row');
      if (existing.length === 0) { addRow(); } else { existing.forEach(wireRow); recalc(); }
    })();
  `;
}

// Deliveries ------------------------------------------------------------------

export function deliveriesListPage(rows: DeliveryListRow[]) {
  const body = rows
    .map(
      (d) => html`<tr class="clickable-row" data-testid="dlv-row" data-href="/deliveries/${d.dlv_number}">
        <td><a class="link" data-testid="dlv-link" href="/deliveries/${d.dlv_number}">${d.dlv_number}</a></td>
        <td><a class="link" href="/sales-orders/${d.so_number}">${d.so_number}</a></td>
        <td>${d.customer_name}</td>
        <td>${statusBadge(d.status, `dlv-status-${d.dlv_number}`)}</td>
        <td>${d.created_at.slice(0, 10)}</td>
      </tr>`
    )
    .join("");

  return layout(
    "Deliveries",
    html`<div class="page-header">
        <div>
          <h1>Deliveries (${rows.length})</h1>
          <p class="muted">Posted against sales orders — open an SO to create one.</p>
        </div>
      </div>
      ${filterBar("dlv-table")}
      <div class="panel">
        <table id="dlv-table" data-testid="dlv-table">
          <thead><tr><th>Delivery</th><th>SO Number</th><th>Customer</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>${raw(body || `<tr><td colspan="5" class="muted">No deliveries yet.</td></tr>`)}</tbody>
        </table>
      </div>`,
    { loggedIn: true }
  );
}

export function deliveryDetailPage(dlv: Delivery, so: SalesOrderWithItems, customer: Customer, flow: FlowEntry[]) {
  const rows = so.items
    .map(
      (item) => html`<tr data-testid="dlv-item-row">
        <td>${item.description}${item.material_code ? html` <span class="muted">(${item.material_code})</span>` : ""}</td>
        <td>${item.qty}</td>
      </tr>`
    )
    .join("");

  return layout(
    `Delivery ${dlv.dlv_number}`,
    html`${objectPageHeader({
        title: dlv.dlv_number,
        titleTestid: "dlv-number",
        status: dlv.status,
        statusTestid: "dlv-status-badge",
        facets: [
          { label: "Customer", value: html`${customer.name} (${customer.ref_id})` },
          { label: "Sales Order", value: html`<a class="link" href="/sales-orders/${so.so_number}">${so.so_number}</a>` },
        ],
      })}
      ${anchorBar([
        { href: "#items-section", label: "Items" },
        { href: "#doc-flow-panel", label: "Document Flow" },
      ])}

      <h2 id="items-section">Line Items</h2>
      <div class="panel">
        <table id="dlv-items-table" data-testid="dlv-items-table">
          <thead><tr><th>Description</th><th>Qty</th></tr></thead>
          <tbody>${raw(rows)}</tbody>
        </table>
      </div>

      ${docFlowPanel(flow)}

      <div class="actions-row">
        <a class="btn transparent" id="back-btn" data-testid="back-btn" href="/deliveries">Back to list</a>
      </div>`,
    { loggedIn: true }
  );
}

// Billing Documents --------------------------------------------------------------

export function billingListPage(rows: BillingListRow[]) {
  const body = rows
    .map(
      (b) => html`<tr class="clickable-row" data-testid="bill-row" data-href="/billing/${b.bill_number}">
        <td><a class="link" data-testid="bill-link" href="/billing/${b.bill_number}">${b.bill_number}</a></td>
        <td><a class="link" href="/sales-orders/${b.so_number}">${b.so_number}</a></td>
        <td>${b.customer_name}</td>
        <td>${money(b.amount)}</td>
        <td>${statusBadge(b.status, `bill-status-${b.bill_number}`)}</td>
        <td>${b.created_at.slice(0, 10)}</td>
      </tr>`
    )
    .join("");

  return layout(
    "Billing",
    html`<div class="page-header">
        <div>
          <h1>Billing Documents (${rows.length})</h1>
          <p class="muted">Customer invoices — open a delivered SO to bill it.</p>
        </div>
      </div>
      ${filterBar("bill-table")}
      <div class="panel">
        <table id="bill-table" data-testid="bill-table">
          <thead><tr><th>Bill Number</th><th>SO Number</th><th>Customer</th><th>Amount</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>${raw(body || `<tr><td colspan="6" class="muted">No billing documents yet.</td></tr>`)}</tbody>
        </table>
      </div>`,
    { loggedIn: true }
  );
}

export function billingDetailPage(bill: BillingDocument, so: SalesOrder, customer: Customer, flow: FlowEntry[]) {
  return layout(
    `Billing ${bill.bill_number}`,
    html`${objectPageHeader({
        title: bill.bill_number,
        titleTestid: "bill-number",
        status: bill.status,
        statusTestid: "bill-status-badge",
        facets: [
          { label: "Customer", value: html`${customer.name} (${customer.ref_id})` },
          { label: "Sales Order", value: html`<a class="link" href="/sales-orders/${so.so_number}">${so.so_number}</a>` },
        ],
      })}

      ${bill.status === "Paid"
        ? html`<div class="locked-banner" id="paid-locked-banner" data-testid="paid-locked-banner">This billing document is Paid and is locked.</div>`
        : ""}

      ${anchorBar([
        { href: "#amount-section", label: "Amount" },
        { href: "#doc-flow-panel", label: "Document Flow" },
      ])}

      <div class="panel" id="amount-section">
        <div class="totals">
          <div class="box"><div class="label">Amount</div><div class="value" id="bill-amount" data-testid="bill-amount">${money(bill.amount)}</div></div>
        </div>
      </div>

      ${docFlowPanel(flow)}

      <div class="actions-row">
        ${bill.status === "Open"
          ? html`<form method="post" action="/billing/${bill.bill_number}/clear"><button type="submit" class="btn" id="btn-clear" data-testid="btn-clear">Clear</button></form>`
          : ""}
        <a class="btn transparent" id="back-btn" data-testid="back-btn" href="/billing">Back to list</a>
      </div>`,
    { loggedIn: true }
  );
}
