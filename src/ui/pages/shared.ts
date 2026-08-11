import { html, raw } from "hono/html";
import { layout, ICONS } from "../layout";
import type { DocType, FlowEntry } from "../../types";

export function money(n: number): string {
  return "$" + n.toFixed(2);
}

export function statusBadgeClass(status: string): "ok" | "warn" | "danger" | "neutral" {
  if (status.startsWith("Blocked")) return "danger";
  if (["Paid", "Cleared", "Matched", "Released", "Delivered", "Billed", "Posted"].includes(status)) return "ok";
  return "neutral";
}

export function statusBadge(status: string, testid = "status-badge") {
  return html`<span class="badge ${statusBadgeClass(status)}" id="${testid}" data-testid="${testid}">${status}</span>`;
}

const FLOW_HREF: Partial<Record<DocType, (n: string) => string>> = {
  purchase_order: (n) => `/purchase-orders/${n}`,
  goods_receipt: (n) => `/goods-receipts/${n}`,
  supplier_invoice: (n) => `/supplier-invoices/${n}`,
  sales_order: (n) => `/sales-orders/${n}`,
  delivery: (n) => `/deliveries/${n}`,
  billing_document: (n) => `/billing/${n}`,
};

const FLOW_LABEL: Record<DocType, string> = {
  purchase_order: "Purchase Order",
  goods_receipt: "Goods Receipt",
  supplier_invoice: "Supplier Invoice",
  sales_order: "Sales Order",
  delivery: "Delivery",
  billing_document: "Billing Document",
  payment: "Payment",
};

export function docFlowPanel(entries: FlowEntry[]) {
  if (entries.length === 0) {
    return html`<div class="panel" id="doc-flow-panel" data-testid="doc-flow-panel">
      <h2 style="margin-top:0">Document Flow</h2>
      <p class="muted" data-testid="doc-flow-empty">No related documents yet.</p>
    </div>`;
  }

  const rows = entries
    .map((e) => {
      const hrefFn = FLOW_HREF[e.type];
      const inner = hrefFn
        ? html`<a class="link" data-testid="flow-item-link" href="${hrefFn(e.number)}">${e.number}</a>`
        : html`<span data-testid="flow-item-number">${e.number}</span>`;
      return html`<div class="flow-item" data-testid="flow-item">
        <span class="flow-type">${FLOW_LABEL[e.type]}</span>
        ${inner}
        ${statusBadge(e.status, `flow-item-status`)}
      </div>`;
    })
    .join("");

  return html`<div class="panel" id="doc-flow-panel" data-testid="doc-flow-panel">
    <h2 style="margin-top:0">Document Flow</h2>
    <div class="flow-list">${raw(rows)}</div>
  </div>`;
}

export function loginPage(opts: { error?: "missing" | "invalid"; username?: string } = {}) {
  const errorMessage =
    opts.error === "missing"
      ? "Please enter both a username and password."
      : opts.error === "invalid"
        ? "Invalid username or password. Please try again."
        : null;

  return layout(
    "Log in",
    html`<div class="login-wrap">
      <div class="login-brand">
        <span class="brand-icon-lg">${raw(ICONS.logo)}</span>
        <h1 id="login-brand-title">WeSAP</h1>
      </div>
      <div class="panel login-card">
        <p class="muted login-subtitle">Sign in to continue</p>
        ${errorMessage ? html`<div class="error" id="login-error" data-testid="login-error">${errorMessage}</div>` : ""}
        <form id="login-form" data-testid="login-form" method="post" action="/login">
          <div class="field">
            <label for="username">Username</label>
            <input type="text" id="username" name="username" data-testid="login-username" autocomplete="username" value="${opts.username ?? ""}" required />
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

export function notFoundPage(opts: { entity: string; identifier: string }) {
  const title = `${opts.entity} Not Found`;
  const message = `We couldn't find a ${opts.entity.toLowerCase()} with number "${opts.identifier}".`;

  return layout(
    title,
    html`<div class="not-found" id="not-found-page" data-testid="not-found-page">
      <span class="not-found-icon">${raw(ICONS.notFound)}</span>
      <h1>${title}</h1>
      <p class="muted" data-testid="not-found-message">${message}</p>
      <a class="btn" id="back-to-launchpad-btn" data-testid="back-to-launchpad-btn" href="/">Back to Launchpad</a>
    </div>`,
    { loggedIn: true }
  );
}

interface LaunchpadTile {
  href: string;
  icon: string;
  title: string;
  sub: string;
  testid: string;
}

const TILES: LaunchpadTile[] = [
  { href: "/customers", icon: ICONS.customer, title: "Customers", sub: "Master Data", testid: "tile-customers" },
  { href: "/purchase-orders", icon: ICONS.po, title: "Purchase Orders", sub: "Purchase-to-Pay", testid: "tile-purchase-orders" },
  { href: "/goods-receipts", icon: ICONS.gr, title: "Goods Receipts", sub: "Purchase-to-Pay", testid: "tile-goods-receipts" },
  { href: "/supplier-invoices", icon: ICONS.si, title: "Supplier Invoices", sub: "Purchase-to-Pay", testid: "tile-supplier-invoices" },
  { href: "/sales-orders", icon: ICONS.so, title: "Sales Orders", sub: "Order-to-Cash", testid: "tile-sales-orders" },
  { href: "/deliveries", icon: ICONS.delivery, title: "Deliveries", sub: "Order-to-Cash", testid: "tile-deliveries" },
  { href: "/billing", icon: ICONS.billing, title: "Billing", sub: "Order-to-Cash", testid: "tile-billing" },
];

export function launchpadPage(worklistCount: number) {
  const tileHtml = TILES.map(
    (t) => html`<a class="tile" id="${t.testid}" data-testid="${t.testid}" href="${t.href}">
      <span class="tile-icon">${raw(t.icon)}</span>
      <div><div class="tile-title">${t.title}</div><div class="tile-sub">${t.sub}</div></div>
    </a>`
  ).join("");

  return layout(
    "Launchpad",
    html`<div class="page-header">
        <div>
          <h1>WeSAP</h1>
          <p class="muted">Company Code 1000 · WeSAP AG</p>
        </div>
      </div>
      <div class="tile-grid" id="launchpad-tiles" data-testid="launchpad-tiles">
        ${raw(tileHtml)}
        <a class="tile worklist-tile" id="tile-worklist" data-testid="tile-worklist" href="/worklist">
          <span class="tile-icon">${raw(ICONS.worklist)}</span>
          <div>
            <div class="tile-title">Worklist</div>
            <div class="tile-sub" data-testid="worklist-tile-count">${worklistCount} item${worklistCount === 1 ? "" : "s"} need attention</div>
          </div>
        </a>
      </div>`,
    { loggedIn: true, active: "launchpad" }
  );
}
