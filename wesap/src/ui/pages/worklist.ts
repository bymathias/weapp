import { html, raw } from "hono/html";
import { layout } from "../layout";
import type { WorklistItem } from "../../types";

const KIND_LABEL: Record<WorklistItem["kind"], string> = {
  "blocked-invoice": "AP Block",
  "credit-blocked-so": "Credit Block",
  "delivery-due": "Delivery Due",
  "unpaid-billing": "AR Open",
};

export function worklistPage(items: WorklistItem[]) {
  const rows = items
    .map(
      (item) => html`<div class="worklist-item" data-testid="worklist-item">
        <div>
          <span class="worklist-kind" data-testid="worklist-item-kind">${KIND_LABEL[item.kind]}</span>
          <div class="worklist-title" data-testid="worklist-item-title">${item.title}</div>
          <div class="worklist-detail" data-testid="worklist-item-detail">${item.detail}</div>
        </div>
        <a class="btn secondary" data-testid="worklist-item-link" href="${item.href}">Open</a>
      </div>`
    )
    .join("");

  return layout(
    "Worklist",
    html`<div class="page-header">
        <div>
          <h1>Worklist (${items.length})</h1>
          <p class="muted">Items needing action across both processes.</p>
        </div>
      </div>
      <div class="panel" id="worklist-panel" data-testid="worklist-panel">
        ${items.length === 0 ? html`<p class="muted" data-testid="worklist-empty">Nothing needs attention right now.</p>` : raw(rows)}
      </div>`,
    { loggedIn: true, active: "worklist" }
  );
}
