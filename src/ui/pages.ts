import { html, raw } from "hono/html";
import { layout } from "./layout";
import type { Customer, Quote, QuoteWithItems } from "../types";

export function loginPage(opts: { error?: boolean } = {}) {
  return layout(
    "Log in",
    html`<div class="login-wrap">
      <div class="panel login-card">
        <h1>WeCPQ</h1>
        <p class="muted">Sign in to continue</p>
        ${opts.error ? html`<div class="error" id="login-error" data-testid="login-error">Invalid username or password</div>` : ""}
        <form id="login-form" data-testid="login-form" method="post" action="/login">
          <div class="field">
            <label for="username">Username</label>
            <input type="text" id="username" name="username" data-testid="login-username" autocomplete="username" required />
          </div>
          <div class="field">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" data-testid="login-password" autocomplete="current-password" required />
          </div>
          <button type="submit" class="btn" id="login-submit" data-testid="login-submit" style="width:100%">Log in</button>
        </form>
      </div>
    </div>`,
    { loggedIn: false }
  );
}

export function dashboardPage(customers: Customer[]) {
  const rows = customers
    .map(
      (c) => html`<tr id="customer-row-${c.id}" data-testid="customer-row" data-customer-id="${c.id}">
        <td><a class="link" id="customer-link-${c.id}" data-testid="customer-link" href="/customers/${c.id}">${c.name}</a></td>
        <td>${c.ref_id}</td>
        <td>${c.industry}</td>
        <td>${c.country}</td>
        <td>${c.account_owner}</td>
      </tr>`
    )
    .join("");

  return layout(
    "Dashboard",
    html`<h1>Customers</h1>
      <p class="muted">All accounts in WeCPQ.</p>
      <div class="panel">
        <table id="customers-table" data-testid="customers-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Ref ID</th>
              <th>Industry</th>
              <th>Country</th>
              <th>Account Owner</th>
            </tr>
          </thead>
          <tbody id="customers-table-body">${raw(rows)}</tbody>
        </table>
      </div>`,
    { loggedIn: true }
  );
}

export function customerPage(customer: Customer, quotes: Quote[]) {
  const rows = quotes
    .map(
      (q) => html`<tr id="quote-row-${q.id}" data-testid="quote-row" data-quote-ref="${q.ref}">
        <td><a class="link" id="quote-link-${q.id}" data-testid="quote-link" href="/quotes/${q.ref}">${q.ref}</a></td>
        <td>${q.vendor}</td>
        <td>$${q.total_amount.toFixed(2)}</td>
        <td><span class="badge ${q.status}">${q.status}</span></td>
      </tr>`
    )
    .join("");

  return layout(
    "Customer",
    html`<h1 id="customer-name" data-testid="customer-name">${customer.name}</h1>
      <p class="muted">${customer.ref_id} · ${customer.industry} · ${customer.country} · Owner: ${customer.account_owner}</p>

      <div class="actions-row">
        <a class="btn" id="new-quote-btn" data-testid="new-quote-btn" href="/quotes/new?customer_id=${customer.id}">New Quote</a>
      </div>

      <h2>Quotes</h2>
      <div class="panel">
        <table id="quotes-table" data-testid="quotes-table">
          <thead>
            <tr>
              <th>Ref</th>
              <th>Vendor</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="quotes-table-body">
            ${raw(rows || `<tr><td colspan="4" class="muted">No quotes yet.</td></tr>`)}
          </tbody>
        </table>
      </div>`,
    { loggedIn: true }
  );
}

const VENDORS = ["Fortinet", "Cisco", "Palo Alto Networks", "Check Point", "CrowdStrike", "Microsoft", "Veeam", "Zscaler"];
const STATUSES = ["Draft", "Sent", "Won", "Lost"];

export function newQuotePage(customer: Customer, opts: { error?: string } = {}) {
  const vendorOptions = VENDORS.map((v) => `<option value="${v}">${v}</option>`).join("");
  const statusOptions = STATUSES.map((s) => `<option value="${s}"${s === "Draft" ? " selected" : ""}>${s}</option>`).join("");

  return layout(
    "New Quote",
    html`<h1>New Quote</h1>
      <p class="muted">for <strong id="quote-customer-name">${customer.name}</strong> (${customer.ref_id})</p>

      ${opts.error ? html`<div class="error" id="quote-form-error" data-testid="quote-form-error">${opts.error}</div>` : ""}

      <form id="quote-form" data-testid="quote-form" method="post" action="/quotes/new">
        <input type="hidden" name="customer_id" id="customer_id" value="${customer.id}" />

        <div class="panel">
          <div class="two-col">
            <div class="field">
              <label for="vendor">Vendor</label>
              <select id="vendor" name="vendor" data-testid="quote-vendor" required>${raw(vendorOptions)}</select>
            </div>
            <div class="field">
              <label for="status">Status</label>
              <select id="status" name="status" data-testid="quote-status" required>${raw(statusOptions)}</select>
            </div>
          </div>
          <div class="field" style="max-width:200px">
            <label for="margin_pct">Margin %</label>
            <input type="number" id="margin_pct" name="margin_pct" data-testid="quote-margin" value="15" min="0" step="0.1" required />
          </div>
        </div>

        <h2>Line Items</h2>
        <div class="panel">
          <table id="items-table" class="items-table" data-testid="items-table">
            <thead>
              <tr>
                <th style="width:45%">Description</th>
                <th style="width:12%">Qty</th>
                <th style="width:16%">Unit Price</th>
                <th style="width:16%">Line Total</th>
                <th style="width:11%"></th>
              </tr>
            </thead>
            <tbody id="items-table-body"></tbody>
          </table>
          <button type="button" class="btn secondary" id="add-row-btn" data-testid="add-row-btn">+ Add line item</button>

          <div class="totals">
            <div class="box">
              <div class="label">Subtotal</div>
              <div class="value" id="subtotal-display" data-testid="subtotal-display">$0.00</div>
            </div>
            <div class="box">
              <div class="label">Total</div>
              <div class="value" id="total-display" data-testid="total-display">$0.00</div>
            </div>
          </div>
        </div>

        <div class="actions-row">
          <button type="submit" class="btn" id="save-quote-btn" data-testid="save-quote-btn">Save Quote</button>
          <a class="btn secondary" href="/customers/${customer.id}" id="cancel-btn" data-testid="cancel-btn">Cancel</a>
        </div>
      </form>

      <template id="row-template">
        <tr class="item-row" data-testid="item-row">
          <td><input type="text" name="description[]" class="item-description" data-testid="item-description" required /></td>
          <td><input type="number" name="quantity[]" class="item-quantity" data-testid="item-quantity" min="1" step="1" value="1" required /></td>
          <td><input type="number" name="unit_price[]" class="item-unit-price" data-testid="item-unit-price" min="0" step="0.01" value="0" required /></td>
          <td class="item-line-total" data-testid="item-line-total">$0.00</td>
          <td><button type="button" class="btn secondary remove-row-btn" data-testid="remove-row-btn">Remove</button></td>
        </tr>
      </template>

      <script>${raw(quoteFormScript())}</script>`,
    { loggedIn: true }
  );
}

function quoteFormScript(): string {
  return `
    (function () {
      var tbody = document.getElementById('items-table-body');
      var template = document.getElementById('row-template');
      var subtotalEl = document.getElementById('subtotal-display');
      var totalEl = document.getElementById('total-display');
      var marginEl = document.getElementById('margin_pct');

      function fmt(n) { return '$' + n.toFixed(2); }

      function recalc() {
        var subtotal = 0;
        tbody.querySelectorAll('.item-row').forEach(function (row) {
          var qty = parseFloat(row.querySelector('.item-quantity').value) || 0;
          var price = parseFloat(row.querySelector('.item-unit-price').value) || 0;
          var lineTotal = qty * price;
          row.querySelector('.item-line-total').textContent = fmt(lineTotal);
          subtotal += lineTotal;
        });
        var margin = parseFloat(marginEl.value) || 0;
        var total = subtotal * (1 + margin / 100);
        subtotalEl.textContent = fmt(subtotal);
        totalEl.textContent = fmt(total);
      }

      function addRow() {
        var clone = template.content.cloneNode(true);
        tbody.appendChild(clone);
        var row = tbody.lastElementChild;
        row.querySelectorAll('input').forEach(function (input) {
          input.addEventListener('input', recalc);
        });
        row.querySelector('.remove-row-btn').addEventListener('click', function () {
          row.remove();
          recalc();
        });
        recalc();
      }

      document.getElementById('add-row-btn').addEventListener('click', addRow);
      marginEl.addEventListener('input', recalc);

      addRow();
    })();
  `;
}

export function quoteDetailPage(customer: Customer, quote: QuoteWithItems) {
  const isWon = quote.status === "Won";
  const rows = quote.items
    .map(
      (item) => html`<tr id="quote-item-row-${item.id}" data-testid="quote-item-row">
        <td>${item.description}</td>
        <td>${item.quantity}</td>
        <td>$${item.unit_price.toFixed(2)}</td>
        <td>$${item.line_total.toFixed(2)}</td>
      </tr>`
    )
    .join("");

  return layout(
    "Quote " + quote.ref,
    html`<h1 id="quote-ref" data-testid="quote-ref">${quote.ref}</h1>
      <p class="muted">
        ${customer.name} (${customer.ref_id}) · Vendor: ${quote.vendor} ·
        <span class="badge ${quote.status}" id="quote-status-badge" data-testid="quote-status-badge">${quote.status}</span>
      </p>

      ${isWon
        ? html`<div class="locked-banner" id="won-locked-banner" data-testid="won-locked-banner">
            This quote is Won and is locked. It is read-only and cannot be edited.
          </div>`
        : ""}

      <div class="actions-row">
        <a class="btn" id="download-pdf-btn" data-testid="download-pdf-btn" href="/api/quotes/${quote.ref}/pdf" target="_blank" rel="noopener">Download PDF</a>
        <a class="btn secondary" id="back-to-customer-btn" data-testid="back-to-customer-btn" href="/customers/${customer.id}">Back to customer</a>
      </div>

      <h2>Line Items</h2>
      <div class="panel">
        <table id="quote-items-table" data-testid="quote-items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Line Total</th>
            </tr>
          </thead>
          <tbody>${raw(rows)}</tbody>
        </table>

        <div class="totals">
          <div class="box">
            <div class="label">Subtotal</div>
            <div class="value" id="quote-subtotal" data-testid="quote-subtotal">$${quote.subtotal.toFixed(2)}</div>
          </div>
          <div class="box">
            <div class="label">Margin</div>
            <div class="value" id="quote-margin" data-testid="quote-margin">${quote.margin_pct}%</div>
          </div>
          <div class="box">
            <div class="label">Total</div>
            <div class="value" id="quote-total" data-testid="quote-total">$${quote.total_amount.toFixed(2)}</div>
          </div>
        </div>
      </div>`,
    { loggedIn: true }
  );
}
