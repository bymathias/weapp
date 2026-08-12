import { html, raw } from "hono/html";
import { layout } from "../layout";
import { filterBar } from "./shared";
import type { Customer } from "../../types";

export function customersListPage(customers: Customer[]) {
  const body = customers
    .map(
      (cust) => html`<tr id="customer-row-${cust.ref_id}" data-testid="customer-row">
        <td>${cust.ref_id}</td>
        <td>${cust.name}</td>
        <td>${cust.industry}</td>
        <td>${cust.country}</td>
        <td>${cust.account_owner}</td>
        <td>$${cust.credit_limit.toFixed(2)}</td>
      </tr>`
    )
    .join("");

  return layout(
    "Customers",
    html`<div class="page-header">
        <div>
          <h1>Customers (${customers.length})</h1>
          <p class="muted">Customer master data.</p>
        </div>
        <a class="btn" id="new-customer-btn" data-testid="new-customer-btn" href="/customers/new">New Customer</a>
      </div>
      ${filterBar("customers-table")}
      <div class="panel">
        <table id="customers-table" data-testid="customers-table">
          <thead>
            <tr><th>Ref ID</th><th>Name</th><th>Industry</th><th>Country</th><th>Account Owner</th><th>Credit Limit</th></tr>
          </thead>
          <tbody>${raw(body || `<tr><td colspan="6" class="muted">No customers yet.</td></tr>`)}</tbody>
        </table>
      </div>`,
    { loggedIn: true }
  );
}

export function newCustomerPage(opts: { error?: string; values?: Record<string, string> } = {}) {
  const v = opts.values ?? {};
  return layout(
    "New Customer",
    html`<h1>New Customer</h1>
      ${opts.error ? html`<div class="error" id="customer-form-error" data-testid="customer-form-error">${opts.error}</div>` : ""}
      <form id="customer-form" data-testid="customer-form" method="post" action="/customers/new">
        <div class="panel">
          <div class="field" style="max-width:400px">
            <label for="name">Name</label>
            <input type="text" id="name" name="name" data-testid="customer-name" value="${v.name ?? ""}" required />
          </div>
          <div class="field" style="max-width:400px">
            <label for="industry">Industry</label>
            <input type="text" id="industry" name="industry" data-testid="customer-industry" value="${v.industry ?? ""}" required />
          </div>
          <div class="field" style="max-width:400px">
            <label for="country">Country</label>
            <input type="text" id="country" name="country" data-testid="customer-country" value="${v.country ?? ""}" required />
          </div>
          <div class="field" style="max-width:400px">
            <label for="account_owner">Account Owner</label>
            <input type="text" id="account_owner" name="account_owner" data-testid="customer-account-owner" value="${v.account_owner ?? ""}" required />
          </div>
          <div class="field" style="max-width:400px">
            <label for="credit_limit">Credit Limit</label>
            <input type="number" id="credit_limit" name="credit_limit" data-testid="customer-credit-limit" value="${v.credit_limit ?? "0"}" min="0" step="0.01" required />
          </div>
        </div>

        <div class="actions-row">
          <button type="submit" class="btn" id="save-customer-btn" data-testid="save-customer-btn">Create Customer</button>
          <a class="btn transparent" href="/customers" id="cancel-btn" data-testid="cancel-btn">Cancel</a>
        </div>
      </form>`,
    { loggedIn: true }
  );
}
