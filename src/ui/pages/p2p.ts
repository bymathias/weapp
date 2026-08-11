import { html, raw } from "hono/html";
import { layout } from "../layout";
import { docFlowPanel, money, statusBadge } from "./shared";
import type { FlowEntry, Material, PoItem, PurchaseOrder, PurchaseOrderWithItems, Vendor } from "../../types";
import type { GoodsReceiptListRow, PurchaseOrderListRow, SupplierInvoiceListRow } from "../../db/p2p";
import type { GoodsReceiptWithItems, SupplierInvoiceWithItems } from "../../types";

function materialLabel(materialsById: Map<number, Material>, materialId: number): string {
  const m = materialsById.get(materialId);
  return m ? `${m.material_code} — ${m.description}` : `Material #${materialId}`;
}

// Purchase Orders --------------------------------------------------------------

export function purchaseOrdersListPage(rows: PurchaseOrderListRow[]) {
  const body = rows
    .map(
      (po) => html`<tr class="clickable-row" data-testid="po-row" data-href="/purchase-orders/${po.po_number}">
        <td><a class="link" data-testid="po-link" href="/purchase-orders/${po.po_number}">${po.po_number}</a></td>
        <td>${po.vendor_name}</td>
        <td>${statusBadge(po.status, `po-status-${po.po_number}`)}</td>
        <td>${po.created_at.slice(0, 10)}</td>
      </tr>`
    )
    .join("");

  return layout(
    "Purchase Orders",
    html`<div class="page-header">
        <div>
          <h1>Purchase Orders</h1>
          <p class="muted">Purchase-to-Pay documents.</p>
        </div>
        <a class="btn" id="new-po-btn" data-testid="new-po-btn" href="/purchase-orders/new">New Purchase Order</a>
      </div>
      <div class="panel">
        <table id="po-table" data-testid="po-table">
          <thead>
            <tr><th>PO Number</th><th>Vendor</th><th>Status</th><th>Created</th></tr>
          </thead>
          <tbody>${raw(body || `<tr><td colspan="4" class="muted">No purchase orders yet.</td></tr>`)}</tbody>
        </table>
      </div>`,
    { loggedIn: true }
  );
}

export function purchaseOrderDetailPage(
  po: PurchaseOrderWithItems,
  vendor: Vendor,
  materialsById: Map<number, Material>,
  flow: FlowEntry[]
) {
  const total = po.items.reduce((s, i) => s + i.line_total, 0);
  const rows = po.items
    .map(
      (item) => html`<tr data-testid="po-item-row">
        <td>${materialLabel(materialsById, item.material_id)}</td>
        <td>${item.qty}</td>
        <td>${money(item.price)}</td>
        <td>${money(item.line_total)}</td>
      </tr>`
    )
    .join("");

  return layout(
    `PO ${po.po_number}`,
    html`<h1 id="po-number" data-testid="po-number">${po.po_number}</h1>
      <p class="muted">${vendor.name} (${vendor.ref_id}) · ${statusBadge(po.status, "po-status-badge")}</p>

      <div class="actions-row">
        <a class="btn" id="btn-post-gr" data-testid="btn-post-gr" href="/goods-receipts/new?po_number=${po.po_number}">Post Goods Receipt</a>
        <a class="btn secondary" id="btn-create-invoice" data-testid="btn-create-invoice" href="/supplier-invoices/new?po_number=${po.po_number}">Create Supplier Invoice</a>
        <a class="btn secondary" id="back-btn" data-testid="back-btn" href="/purchase-orders">Back to list</a>
      </div>

      <h2>Line Items</h2>
      <div class="panel">
        <table id="po-items-table" data-testid="po-items-table">
          <thead><tr><th>Material</th><th>Qty</th><th>Price</th><th>Line Total</th></tr></thead>
          <tbody>${raw(rows)}</tbody>
        </table>
        <div class="totals">
          <div class="box"><div class="label">Total</div><div class="value" id="po-total" data-testid="po-total">${money(total)}</div></div>
        </div>
      </div>

      ${docFlowPanel(flow)}`,
    { loggedIn: true }
  );
}

function poItemRowHtml(materials: Material[]) {
  const options = materials
    .map((m) => `<option value="${m.material_code}" data-price="${m.standard_price}">${m.material_code} — ${m.description}</option>`)
    .join("");
  const price = materials[0]?.standard_price ?? 0;
  return html`<tr class="item-row" data-testid="po-item-row">
    <td><select name="material_code[]" class="item-material" data-testid="po-item-material" required>${raw(options)}</select></td>
    <td><input type="number" name="qty[]" class="item-qty" data-testid="po-item-qty" min="1" step="1" value="1" required /></td>
    <td><input type="number" name="price[]" class="item-price" data-testid="po-item-price" min="0" step="0.01" value="${price}" required /></td>
    <td class="item-line-total" data-testid="po-item-line-total">$0.00</td>
    <td><button type="button" class="btn secondary remove-row-btn" data-testid="remove-row-btn">Remove</button></td>
  </tr>`;
}

export function newPurchaseOrderPage(vendors: Vendor[], materials: Material[], opts: { error?: string } = {}) {
  const vendorOptions = vendors.map((v) => `<option value="${v.ref_id}">${v.name} (${v.ref_id})</option>`).join("");

  return layout(
    "New Purchase Order",
    html`<h1>New Purchase Order</h1>
      ${opts.error ? html`<div class="error" id="po-form-error" data-testid="po-form-error">${opts.error}</div>` : ""}
      <form id="po-form" data-testid="po-form" method="post" action="/purchase-orders/new">
        <div class="panel">
          <div class="field" style="max-width:400px">
            <label for="vendor_ref">Vendor</label>
            <select id="vendor_ref" name="vendor_ref" data-testid="po-vendor" required>${raw(vendorOptions)}</select>
          </div>
        </div>

        <h2>Line Items</h2>
        <div class="panel">
          <table id="items-table" class="items-table" data-testid="po-items-table">
            <thead>
              <tr><th style="width:45%">Material</th><th style="width:15%">Qty</th><th style="width:18%">Price</th><th style="width:15%">Line Total</th><th style="width:7%"></th></tr>
            </thead>
            <tbody id="items-table-body"></tbody>
          </table>
          <button type="button" class="btn secondary" id="add-row-btn" data-testid="add-row-btn">+ Add line item</button>
          <div class="totals">
            <div class="box"><div class="label">Subtotal</div><div class="value" id="subtotal-display" data-testid="po-subtotal-display">$0.00</div></div>
          </div>
        </div>

        <div class="actions-row">
          <button type="submit" class="btn" id="save-po-btn" data-testid="save-po-btn">Create Purchase Order</button>
          <a class="btn secondary" href="/purchase-orders" id="cancel-btn" data-testid="cancel-btn">Cancel</a>
        </div>
      </form>

      <template id="row-template">${poItemRowHtml(materials)}</template>
      <script>${raw(poFormScript())}</script>`,
    { loggedIn: true }
  );
}

function poFormScript(): string {
  return `
    (function () {
      var tbody = document.getElementById('items-table-body');
      var template = document.getElementById('row-template');
      var subtotalEl = document.getElementById('subtotal-display');
      function fmt(n) { return '$' + n.toFixed(2); }
      function recalc() {
        var subtotal = 0;
        tbody.querySelectorAll('.item-row').forEach(function (row) {
          var qty = parseFloat(row.querySelector('.item-qty').value) || 0;
          var price = parseFloat(row.querySelector('.item-price').value) || 0;
          var lt = qty * price;
          row.querySelector('.item-line-total').textContent = fmt(lt);
          subtotal += lt;
        });
        subtotalEl.textContent = fmt(subtotal);
      }
      function wireRow(row) {
        row.querySelectorAll('.item-qty, .item-price').forEach(function (input) {
          input.addEventListener('input', recalc);
        });
        row.querySelector('.item-material').addEventListener('change', function (e) {
          var opt = e.target.options[e.target.selectedIndex];
          row.querySelector('.item-price').value = opt.getAttribute('data-price');
          recalc();
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

// Goods Receipts -----------------------------------------------------------------

export function goodsReceiptsListPage(rows: GoodsReceiptListRow[]) {
  const body = rows
    .map(
      (gr) => html`<tr class="clickable-row" data-testid="gr-row" data-href="/goods-receipts/${gr.gr_number}">
        <td><a class="link" data-testid="gr-link" href="/goods-receipts/${gr.gr_number}">${gr.gr_number}</a></td>
        <td><a class="link" href="/purchase-orders/${gr.po_number}">${gr.po_number}</a></td>
        <td>${statusBadge(gr.status, `gr-status-${gr.gr_number}`)}</td>
        <td>${gr.created_at.slice(0, 10)}</td>
      </tr>`
    )
    .join("");

  return layout(
    "Goods Receipts",
    html`<div class="page-header">
        <div>
          <h1>Goods Receipts</h1>
          <p class="muted">Posted against purchase orders — open a PO to post one.</p>
        </div>
      </div>
      <div class="panel">
        <table id="gr-table" data-testid="gr-table">
          <thead><tr><th>GR Number</th><th>PO Number</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>${raw(body || `<tr><td colspan="4" class="muted">No goods receipts yet.</td></tr>`)}</tbody>
        </table>
      </div>`,
    { loggedIn: true }
  );
}

export function goodsReceiptDetailPage(
  gr: GoodsReceiptWithItems,
  po: PurchaseOrder,
  poItemsById: Map<number, PoItem>,
  materialsById: Map<number, Material>,
  flow: FlowEntry[]
) {
  const rows = gr.items
    .map((item) => {
      const poItem = poItemsById.get(item.po_item_id);
      return html`<tr data-testid="gr-item-row">
        <td>${poItem ? materialLabel(materialsById, poItem.material_id) : `PO item #${item.po_item_id}`}</td>
        <td>${item.qty_received}</td>
      </tr>`;
    })
    .join("");

  return layout(
    `GR ${gr.gr_number}`,
    html`<h1 id="gr-number" data-testid="gr-number">${gr.gr_number}</h1>
      <p class="muted">Against PO <a class="link" href="/purchase-orders/${po.po_number}">${po.po_number}</a> · ${statusBadge(gr.status, "gr-status-badge")}</p>

      <div class="actions-row">
        <a class="btn secondary" id="back-btn" data-testid="back-btn" href="/goods-receipts">Back to list</a>
      </div>

      <h2>Line Items</h2>
      <div class="panel">
        <table id="gr-items-table" data-testid="gr-items-table">
          <thead><tr><th>Material</th><th>Qty Received</th></tr></thead>
          <tbody>${raw(rows)}</tbody>
        </table>
      </div>

      ${docFlowPanel(flow)}`,
    { loggedIn: true }
  );
}

export function newGoodsReceiptPage(po: PurchaseOrderWithItems, materialsById: Map<number, Material>, opts: { error?: string } = {}) {
  const rows = po.items
    .map(
      (item) => html`<tr data-testid="gr-item-row">
        <td>${materialLabel(materialsById, item.material_id)}</td>
        <td>${item.qty}</td>
        <td>
          <input type="hidden" name="po_item_id[]" value="${item.id}" />
          <input type="number" name="qty_received[]" class="item-qty-received" data-testid="gr-item-qty-received" min="0" step="1" value="${item.qty}" required />
        </td>
      </tr>`
    )
    .join("");

  return layout(
    "New Goods Receipt",
    html`<h1>New Goods Receipt</h1>
      <p class="muted">Against Purchase Order <strong>${po.po_number}</strong></p>
      ${opts.error ? html`<div class="error" id="gr-form-error" data-testid="gr-form-error">${opts.error}</div>` : ""}
      <form id="gr-form" data-testid="gr-form" method="post" action="/goods-receipts/new">
        <input type="hidden" name="po_number" value="${po.po_number}" />
        <div class="panel">
          <table id="gr-items-table" data-testid="gr-items-table">
            <thead><tr><th>Material</th><th>PO Qty</th><th>Qty Received</th></tr></thead>
            <tbody>${raw(rows)}</tbody>
          </table>
        </div>
        <div class="actions-row">
          <button type="submit" class="btn" id="save-gr-btn" data-testid="save-gr-btn">Post Goods Receipt</button>
          <a class="btn secondary" href="/purchase-orders/${po.po_number}" id="cancel-btn" data-testid="cancel-btn">Cancel</a>
        </div>
      </form>`,
    { loggedIn: true }
  );
}

// Supplier Invoices ---------------------------------------------------------------

export function supplierInvoicesListPage(rows: SupplierInvoiceListRow[]) {
  const body = rows
    .map(
      (si) => html`<tr class="clickable-row" data-testid="si-row" data-href="/supplier-invoices/${si.inv_number}">
        <td><a class="link" data-testid="si-link" href="/supplier-invoices/${si.inv_number}">${si.inv_number}</a></td>
        <td>${si.vendor_name}</td>
        <td><a class="link" href="/purchase-orders/${si.po_number}">${si.po_number}</a></td>
        <td>${money(si.amount)}</td>
        <td>${statusBadge(si.status, `si-status-${si.inv_number}`)}</td>
        <td>${si.created_at.slice(0, 10)}</td>
      </tr>`
    )
    .join("");

  return layout(
    "Supplier Invoices",
    html`<div class="page-header">
        <div>
          <h1>Supplier Invoices</h1>
          <p class="muted">Posted against purchase orders — open a PO to create one.</p>
        </div>
      </div>
      <div class="panel">
        <table id="si-table" data-testid="si-table">
          <thead><tr><th>Invoice</th><th>Vendor</th><th>PO Number</th><th>Amount</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>${raw(body || `<tr><td colspan="6" class="muted">No supplier invoices yet.</td></tr>`)}</tbody>
        </table>
      </div>`,
    { loggedIn: true }
  );
}

export function supplierInvoiceDetailPage(
  si: SupplierInvoiceWithItems,
  vendor: Vendor,
  po: PurchaseOrder,
  poItemsById: Map<number, PoItem>,
  materialsById: Map<number, Material>,
  flow: FlowEntry[]
) {
  const rows = si.items
    .map((item) => {
      const poItem = poItemsById.get(item.po_item_id);
      return html`<tr data-testid="si-item-row">
        <td>${poItem ? materialLabel(materialsById, poItem.material_id) : `PO item #${item.po_item_id}`}</td>
        <td>${item.qty}</td>
        <td>${money(item.price)}</td>
        <td>${money(item.line_total)}</td>
      </tr>`;
    })
    .join("");

  return layout(
    `Invoice ${si.inv_number}`,
    html`<h1 id="si-number" data-testid="si-number">${si.inv_number}</h1>
      <p class="muted">
        ${vendor.name} (${vendor.ref_id}) · PO <a class="link" href="/purchase-orders/${po.po_number}">${po.po_number}</a> ·
        ${statusBadge(si.status, "si-status-badge")}
      </p>

      ${si.status === "Blocked"
        ? html`<div class="block-banner" id="block-reason-banner" data-testid="block-reason-banner">Blocked: ${si.block_reason}</div>`
        : ""}
      ${si.status === "Paid"
        ? html`<div class="locked-banner" id="paid-locked-banner" data-testid="paid-locked-banner">This invoice is Paid and is locked.</div>`
        : ""}

      <div class="actions-row">
        ${si.status === "Invoiced"
          ? html`<form method="post" action="/supplier-invoices/${si.inv_number}/match"><button type="submit" class="btn" id="btn-match" data-testid="btn-match">Match</button></form>`
          : ""}
        ${si.status === "Blocked"
          ? html`<form method="post" action="/supplier-invoices/${si.inv_number}/release"><button type="submit" class="btn" id="btn-release" data-testid="btn-release">Release</button></form>`
          : ""}
        ${si.status === "Matched" || si.status === "Released"
          ? html`<form method="post" action="/supplier-invoices/${si.inv_number}/pay"><button type="submit" class="btn" id="btn-pay" data-testid="btn-pay">Pay</button></form>`
          : ""}
        <a class="btn secondary" id="back-btn" data-testid="back-btn" href="/supplier-invoices">Back to list</a>
      </div>

      <h2>Line Items</h2>
      <div class="panel">
        <table id="si-items-table" data-testid="si-items-table">
          <thead><tr><th>Material</th><th>Qty</th><th>Price</th><th>Line Total</th></tr></thead>
          <tbody>${raw(rows)}</tbody>
        </table>
        <div class="totals">
          <div class="box"><div class="label">Amount</div><div class="value" id="si-amount" data-testid="si-amount">${money(si.amount)}</div></div>
        </div>
      </div>

      ${docFlowPanel(flow)}`,
    { loggedIn: true }
  );
}

export function newSupplierInvoicePage(po: PurchaseOrderWithItems, materialsById: Map<number, Material>, opts: { error?: string } = {}) {
  const rows = po.items
    .map(
      (item) => html`<tr class="item-row" data-testid="si-item-row">
        <td>
          ${materialLabel(materialsById, item.material_id)}
          <input type="hidden" name="po_item_id[]" value="${item.id}" />
        </td>
        <td><input type="number" name="qty[]" class="item-qty" data-testid="si-item-qty" min="1" step="1" value="${item.qty}" required /></td>
        <td><input type="number" name="price[]" class="item-price" data-testid="si-item-price" min="0" step="0.01" value="${item.price}" required /></td>
        <td class="item-line-total" data-testid="si-item-line-total">${money(item.line_total)}</td>
      </tr>`
    )
    .join("");
  const initialAmount = po.items.reduce((s, i) => s + i.line_total, 0);

  return layout(
    "New Supplier Invoice",
    html`<h1>New Supplier Invoice</h1>
      <p class="muted">Against Purchase Order <strong>${po.po_number}</strong>. Adjust qty/price to simulate a match exception.</p>
      ${opts.error ? html`<div class="error" id="si-form-error" data-testid="si-form-error">${opts.error}</div>` : ""}
      <form id="si-form" data-testid="si-form" method="post" action="/supplier-invoices/new">
        <input type="hidden" name="po_number" value="${po.po_number}" />
        <div class="panel">
          <table id="items-table" class="items-table" data-testid="si-items-table">
            <thead><tr><th style="width:45%">Material</th><th style="width:15%">Qty</th><th style="width:18%">Price</th><th style="width:15%">Line Total</th></tr></thead>
            <tbody id="items-table-body">${raw(rows)}</tbody>
          </table>
          <div class="totals">
            <div class="box"><div class="label">Amount</div><div class="value" id="amount-display" data-testid="si-amount-display">${money(initialAmount)}</div></div>
          </div>
        </div>
        <div class="actions-row">
          <button type="submit" class="btn" id="save-si-btn" data-testid="save-si-btn">Create Supplier Invoice</button>
          <a class="btn secondary" href="/purchase-orders/${po.po_number}" id="cancel-btn" data-testid="cancel-btn">Cancel</a>
        </div>
      </form>
      <script>${raw(siFormScript())}</script>`,
    { loggedIn: true }
  );
}

function siFormScript(): string {
  return `
    (function () {
      var tbody = document.getElementById('items-table-body');
      var amountEl = document.getElementById('amount-display');
      function fmt(n) { return '$' + n.toFixed(2); }
      function recalc() {
        var amount = 0;
        tbody.querySelectorAll('.item-row').forEach(function (row) {
          var qty = parseFloat(row.querySelector('.item-qty').value) || 0;
          var price = parseFloat(row.querySelector('.item-price').value) || 0;
          var lt = qty * price;
          row.querySelector('.item-line-total').textContent = fmt(lt);
          amount += lt;
        });
        amountEl.textContent = fmt(amount);
      }
      tbody.querySelectorAll('.item-qty, .item-price').forEach(function (input) {
        input.addEventListener('input', recalc);
      });
    })();
  `;
}
