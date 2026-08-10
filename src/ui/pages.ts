import { html, raw } from "hono/html";
import { layout, ICONS } from "./layout";
import type { Customer, Quote, QuoteStatus, QuoteWithItems } from "../types";
import type { DashboardStats, QuoteListResult } from "../db/queries";

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

export function dashboardPage(stats: DashboardStats, quoteList: QuoteListResult, search: string) {
  const rows = quoteList.quotes
    .map(
      (q) => html`<tr id="quote-row-${q.ref}" data-testid="quote-row">
        <td><a class="link" data-testid="quote-link" href="/quotes/${q.ref}">${q.ref}</a></td>
        <td><a class="link" data-testid="quote-customer-link" href="/customers/${q.customer_id}">${q.customer_name}</a></td>
        <td data-testid="quote-customer-ref-id">${q.customer_ref_id}</td>
        <td>${q.vendor}</td>
        <td><span class="badge ${q.status}">${q.status}</span></td>
        <td>$${q.total_amount.toFixed(2)}</td>
        <td>${q.created_at.slice(0, 10)}</td>
      </tr>`
    )
    .join("");

  const emptyMessage = search ? "No quotes match your search." : "No quotes yet.";
  const totalPages = Math.max(1, Math.ceil(quoteList.total / quoteList.pageSize));
  const qParam = search ? `q=${encodeURIComponent(search)}&` : "";
  const prevHref = `/?${qParam}page=${quoteList.page - 1}`;
  const nextHref = `/?${qParam}page=${quoteList.page + 1}`;

  return layout(
    "Dashboard",
    html`<div class="page-header">
        <h1>Dashboard</h1>
        <p class="muted">Overview of your quote pipeline.</p>
      </div>

      <div class="stat-grid" id="dashboard-stats" data-testid="dashboard-stats">
        <div class="stat-card" data-testid="stat-total-quotes">
          <span class="stat-icon indigo">${raw(ICONS.quotes)}</span>
          <div><div class="stat-value">${stats.totalQuotes}</div><div class="stat-label">Total Quotes</div></div>
        </div>
        <div class="stat-card" data-testid="stat-won">
          <span class="stat-icon green">${raw(ICONS.won)}</span>
          <div><div class="stat-value">${stats.wonCount}</div><div class="stat-label">Won</div></div>
        </div>
        <div class="stat-card" data-testid="stat-sent">
          <span class="stat-icon amber">${raw(ICONS.sent)}</span>
          <div><div class="stat-value">${stats.sentCount}</div><div class="stat-label">Sent</div></div>
        </div>
        <div class="stat-card" data-testid="stat-lost">
          <span class="stat-icon red">${raw(ICONS.lost)}</span>
          <div><div class="stat-value">${stats.lostCount}</div><div class="stat-label">Lost</div></div>
        </div>
      </div>

      <div class="dash-quotes-header">
        <h2>Quotes</h2>
        <form id="quote-search-form" data-testid="quote-search-form" method="get" action="/" class="search-form">
          <input
            type="text"
            id="quote-search-input"
            name="q"
            data-testid="quote-search-input"
            placeholder="Search by quote ref, customer name, or ID"
            value="${search}"
          />
          <button type="submit" class="btn" id="quote-search-submit" data-testid="quote-search-submit">Search</button>
          ${search
            ? html`<a class="btn secondary" id="quote-search-clear" data-testid="quote-search-clear" href="/">Clear</a>`
            : ""}
        </form>
      </div>

      <div class="panel">
        <table id="all-quotes-table" data-testid="all-quotes-table">
          <thead>
            <tr>
              <th>Ref</th>
              <th>Customer</th>
              <th>Customer ID</th>
              <th>Vendor</th>
              <th>Status</th>
              <th>Total</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>${raw(rows || `<tr><td colspan="7" class="muted">${emptyMessage}</td></tr>`)}</tbody>
        </table>

        <div class="pagination" id="quotes-pagination" data-testid="quotes-pagination">
          ${quoteList.page > 1
            ? html`<a class="btn secondary" id="pagination-prev" data-testid="pagination-prev" href="${prevHref}">Previous</a>`
            : html`<span class="btn secondary" aria-disabled="true" style="opacity:0.5;pointer-events:none">Previous</span>`}
          <span class="muted" id="pagination-info" data-testid="pagination-info">Page ${quoteList.page} of ${totalPages} (${quoteList.total} quotes)</span>
          ${quoteList.page < totalPages
            ? html`<a class="btn secondary" id="pagination-next" data-testid="pagination-next" href="${nextHref}">Next</a>`
            : html`<span class="btn secondary" aria-disabled="true" style="opacity:0.5;pointer-events:none">Next</span>`}
        </div>
      </div>`,
    { loggedIn: true, active: "dashboard" }
  );
}

export function customersPage(customers: Customer[]) {
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
    "Customers",
    html`<div class="page-header">
        <h1>Customers</h1>
        <p class="muted">All accounts in WeCPQ.</p>
      </div>
      <div class="actions-row" style="margin-bottom:16px">
        <a class="btn" id="new-customer-btn" data-testid="new-customer-btn" href="/customers/new">+ New Customer</a>
      </div>
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
    { loggedIn: true, active: "customers" }
  );
}

export function newCustomerPage(opts: { error?: string } = {}) {
  return layout(
    "New Customer",
    html`<div class="page-header">
        <h1>New Customer</h1>
        <p class="muted">Add an account to WeCPQ.</p>
      </div>
      <div class="panel">
        ${opts.error ? html`<div class="error" id="customer-form-error" data-testid="customer-form-error">${opts.error}</div>` : ""}
        <form id="customer-form" data-testid="customer-form" method="post" action="/customers/new">
          <div class="field">
            <label for="name">Name</label>
            <input type="text" id="name" name="name" data-testid="customer-name-input" required />
          </div>
          <div class="two-col">
            <div class="field">
              <label for="industry">Industry</label>
              <input type="text" id="industry" name="industry" data-testid="customer-industry-input" required />
            </div>
            <div class="field">
              <label for="country">Country</label>
              <input type="text" id="country" name="country" data-testid="customer-country-input" required />
            </div>
          </div>
          <div class="field">
            <label for="account_owner">Account Owner</label>
            <input type="text" id="account_owner" name="account_owner" data-testid="customer-account-owner-input" required />
          </div>
          <div class="actions-row">
            <button type="submit" class="btn" id="customer-form-submit" data-testid="customer-form-submit">Save Customer</button>
            <a class="btn secondary" id="customer-form-cancel" data-testid="customer-form-cancel" href="/customers">Cancel</a>
          </div>
        </form>
      </div>`,
    { loggedIn: true, active: "customers" }
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
    { loggedIn: true, active: "customers" }
  );
}

const VENDORS = ["Fortinet", "Cisco", "Palo Alto Networks", "Check Point", "CrowdStrike", "Microsoft", "Veeam", "Zscaler"];
const STATUSES: QuoteStatus[] = ["Draft", "Sent", "Won", "Lost"];

interface QuoteFormItem {
  description: string;
  quantity: number;
  unit_price: number;
}

interface QuoteFormPageOptions {
  pageTitle: string;
  heading: string;
  customer: Customer;
  formAction: string;
  cancelHref: string;
  submitLabel: string;
  initialVendor: string;
  initialStatus: QuoteStatus;
  initialMarginPct: number;
  initialItems: QuoteFormItem[];
  includeCustomerIdField?: boolean;
  error?: string;
}

// Shared by the "New Quote" and "Edit Quote" pages — same field layout, same
// add/remove line-item grid and live-totals script, different initial values
// and submit target.
function quoteFormPage(opts: QuoteFormPageOptions) {
  const vendorOptions = VENDORS.map(
    (v) => `<option value="${v}"${v === opts.initialVendor ? " selected" : ""}>${v}</option>`
  ).join("");
  const statusOptions = STATUSES.map(
    (s) => `<option value="${s}"${s === opts.initialStatus ? " selected" : ""}>${s}</option>`
  ).join("");
  const initialRows = opts.initialItems.map((item) => itemRowHtml(item)).join("");

  return layout(
    opts.pageTitle,
    html`<h1>${opts.heading}</h1>
      <p class="muted">for <strong id="quote-customer-name">${opts.customer.name}</strong> (${opts.customer.ref_id})</p>

      ${opts.error ? html`<div class="error" id="quote-form-error" data-testid="quote-form-error">${opts.error}</div>` : ""}

      <form id="quote-form" data-testid="quote-form" method="post" action="${opts.formAction}">
        ${opts.includeCustomerIdField
          ? html`<input type="hidden" name="customer_id" id="customer_id" value="${opts.customer.id}" />`
          : ""}

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
            <input type="number" id="margin_pct" name="margin_pct" data-testid="quote-margin" value="${opts.initialMarginPct}" min="0" step="0.1" required />
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
            <tbody id="items-table-body">${raw(initialRows)}</tbody>
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
          <button type="submit" class="btn" id="save-quote-btn" data-testid="save-quote-btn">${opts.submitLabel}</button>
          <a class="btn secondary" href="${opts.cancelHref}" id="cancel-btn" data-testid="cancel-btn">Cancel</a>
        </div>
      </form>

      <template id="row-template">${itemRowHtml()}</template>

      <script>${raw(quoteFormScript())}</script>`,
    { loggedIn: true, active: "customers" }
  );
}

function itemRowHtml(item?: QuoteFormItem) {
  const description = item?.description ?? "";
  const quantity = item?.quantity ?? 1;
  const unitPrice = item?.unit_price ?? 0;
  const lineTotal = item ? item.quantity * item.unit_price : 0;
  return html`<tr class="item-row" data-testid="item-row">
        <td><input type="text" name="description[]" class="item-description" data-testid="item-description" value="${description}" required /></td>
        <td><input type="number" name="quantity[]" class="item-quantity" data-testid="item-quantity" min="1" step="1" value="${quantity}" required /></td>
        <td><input type="number" name="unit_price[]" class="item-unit-price" data-testid="item-unit-price" min="0" step="0.01" value="${unitPrice}" required /></td>
        <td class="item-line-total" data-testid="item-line-total">$${lineTotal.toFixed(2)}</td>
        <td><button type="button" class="btn secondary remove-row-btn" data-testid="remove-row-btn">Remove</button></td>
      </tr>`;
}

export function newQuotePage(customer: Customer, opts: { error?: string } = {}) {
  return quoteFormPage({
    pageTitle: "New Quote",
    heading: "New Quote",
    customer,
    formAction: "/quotes/new",
    cancelHref: `/customers/${customer.id}`,
    submitLabel: "Save Quote",
    initialVendor: VENDORS[0],
    initialStatus: "Draft",
    initialMarginPct: 15,
    initialItems: [],
    includeCustomerIdField: true,
    error: opts.error,
  });
}

export function editQuotePage(customer: Customer, quote: QuoteWithItems, opts: { error?: string } = {}) {
  return quoteFormPage({
    pageTitle: "Edit Quote",
    heading: `Edit ${quote.ref}`,
    customer,
    formAction: `/quotes/${quote.ref}/edit`,
    cancelHref: `/quotes/${quote.ref}`,
    submitLabel: "Save Changes",
    initialVendor: quote.vendor,
    initialStatus: quote.status,
    initialMarginPct: quote.margin_pct,
    initialItems: quote.items.map((i) => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price })),
    error: opts.error,
  });
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

      function wireRow(row) {
        row.querySelectorAll('input').forEach(function (input) {
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
      marginEl.addEventListener('input', recalc);

      var existingRows = tbody.querySelectorAll('.item-row');
      if (existingRows.length === 0) {
        addRow();
      } else {
        existingRows.forEach(wireRow);
        recalc();
      }
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
        ${isWon
          ? ""
          : html`<a class="btn" id="edit-quote-btn" data-testid="edit-quote-btn" href="/quotes/${quote.ref}/edit">Edit Quote</a>`}
        <a class="btn secondary" id="download-pdf-btn" data-testid="download-pdf-btn" href="/api/quotes/${quote.ref}/pdf" target="_blank" rel="noopener">Download PDF</a>
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
    { loggedIn: true, active: "customers" }
  );
}
