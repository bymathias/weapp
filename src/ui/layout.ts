import { html, raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import { FIORI_CSS } from "./fiori";

export const ICONS = {
  logo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`,
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>`,
  worklist: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>`,
  po: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><path d="M14 2v5h5"/><path d="M8 13h8M8 17h5"/></svg>`,
  gr: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>`,
  si: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h10M7 17h6"/></svg>`,
  so: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.5 12.5A2 2 0 0 0 9.5 17h8a2 2 0 0 0 2-1.6L21 7H6"/></svg>`,
  delivery: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="7" width="15" height="11" rx="1"/><path d="M16 10h4l3 3v5h-7z"/><circle cx="6" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/></svg>`,
  billing: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/></svg>`,
  flow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="6" r="2.5"/><circle cx="19" cy="12" r="2.5"/><circle cx="5" cy="18" r="2.5"/><path d="M7.3 7.3L16.7 10.7M16.7 13.3L7.3 16.7"/></svg>`,
  customer: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  notFound: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M21 21l-4.35-4.35"/><path d="M8.5 8.5l4 4M12.5 8.5l-4 4"/></svg>`,
};

const NAV_ITEMS: { key: "launchpad" | "customers"; href: string; icon: string; label: string; testid: string }[] = [
  { key: "launchpad", href: "/", icon: ICONS.home, label: "Home", testid: "nav-home" },
  { key: "customers", href: "/customers", icon: ICONS.customer, label: "Customers", testid: "nav-customers" },
];

export function layout(
  title: string,
  body: HtmlEscapedString | Promise<HtmlEscapedString> | string,
  opts: { loggedIn?: boolean; active?: "launchpad" | "worklist" | "customers" } = {}
) {
  return html`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} · WeSAP</title>
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230a6ed1'/%3E%3Crect x='5' y='5' width='9' height='9' rx='2' fill='%23fff'/%3E%3Crect x='18' y='5' width='9' height='9' rx='2' fill='%23fff'/%3E%3Crect x='5' y='18' width='9' height='9' rx='2' fill='%23fff'/%3E%3Crect x='18' y='18' width='9' height='9' rx='2' fill='%23fff'/%3E%3C/svg%3E" />
  <style>${raw(FIORI_CSS)}</style>
</head>
<body>
  ${opts.loggedIn
    ? html`<header class="topbar">
        <a class="brand" href="/" id="nav-brand" data-testid="nav-brand">
          <span class="brand-icon">${raw(ICONS.logo)}</span>
          WeSAP
        </a>
        <nav class="pillnav">
          ${raw(
            NAV_ITEMS.map(
              (item) =>
                `<a href="${item.href}" id="${item.testid}" data-testid="${item.testid}" class="${item.key === opts.active ? "active" : ""}">${item.icon} ${item.label}</a>`
            ).join("")
          )}
        </nav>
        <div class="right">
          <a href="/logout" id="nav-logout" data-testid="nav-logout" class="textlink">Log out</a>
          <span class="avatar" id="nav-avatar" data-testid="nav-avatar">A</span>
        </div>
      </header>`
    : ""}
  <main class="${opts.loggedIn ? "" : "main-bare"}">${body}</main>
  <footer class="site-footer">
    <span id="footer-tagline" data-testid="footer-tagline">WeSAP — an SAP-lookalike ERP demo site for UI and API automation testing.</span>
    <a href="/api-docs" id="footer-api-docs" data-testid="footer-api-docs">API Docs</a>
  </footer>
  ${opts.loggedIn
    ? html`<script>
        document.addEventListener('click', function (e) {
          var row = e.target.closest('tr[data-href]');
          if (row && !e.target.closest('a, button')) {
            window.location = row.getAttribute('data-href');
          }
        });

        // List Report filter-bar: client-side row filter, no backend involved.
        document.querySelectorAll('.filter-bar[data-target]').forEach(function (bar) {
          var table = document.getElementById(bar.getAttribute('data-target'));
          var input = bar.querySelector('input[type=search]');
          var goBtn = bar.querySelector('.filter-go-btn');
          if (!table || !input) return;
          function applyFilter() {
            var q = input.value.trim().toLowerCase();
            table.querySelectorAll('tbody tr').forEach(function (row) {
              row.style.display = !q || row.textContent.toLowerCase().indexOf(q) !== -1 ? '' : 'none';
            });
          }
          input.addEventListener('input', applyFilter);
          if (goBtn) goBtn.addEventListener('click', applyFilter);
        });
      </script>`
    : ""}
</body>
</html>`;
}
