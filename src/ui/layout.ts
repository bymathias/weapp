import { html, raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";

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

const STYLE = `
  :root {
    --border: #e5e7f0;
    --bg: #f5f5fb;
    --panel: #ffffff;
    --text: #12141c;
    --muted: #6b7280;
    --accent: #0a6ed1;
    --accent-bg: #e8f2fc;
    --danger: #bb0000;
    --danger-bg: #fbeaea;
    --ok: #107e3e;
    --ok-bg: #e6f3ea;
    --warn: #b45f06;
    --warn-bg: #fdf1e3;
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    font-family: "72", -apple-system, Segoe UI, Helvetica, Arial, sans-serif;
    background: var(--bg);
    color: var(--text);
  }
  header.topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 24px;
    background: #1a2733;
    color: #fff;
  }
  header.topbar a.brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 18px; color: #fff; text-decoration: none; letter-spacing: -0.01em; }
  .brand-icon { width: 32px; height: 32px; border-radius: 7px; background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .brand-icon svg { width: 18px; height: 18px; }
  nav.pillnav { display: flex; gap: 4px; }
  .pillnav a { display: flex; align-items: center; gap: 7px; padding: 8px 16px; border-radius: 9999px; color: #cfd8e3; text-decoration: none; font-size: 14px; font-weight: 600; }
  .pillnav a svg { width: 16px; height: 16px; }
  .pillnav a.active { background: rgba(255,255,255,0.15); color: #fff; }
  .topbar .right { display: flex; align-items: center; gap: 18px; }
  .topbar .right a.textlink { color: #cfd8e3; font-size: 14px; text-decoration: none; font-weight: 600; }
  .topbar .right a.textlink:hover { color: #fff; }
  .avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; }
  main { max-width: 1400px; margin: 0 auto; padding: 28px 24px; flex: 1 0 auto; width: 100%; }
  main.main-bare { max-width: none; padding: 0; display: flex; }
  footer.site-footer {
    flex-shrink: 0;
    border-top: 1px solid var(--border);
    background: var(--panel);
    padding: 16px 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    font-size: 13px;
    color: var(--muted);
  }
  footer.site-footer a { color: var(--accent); text-decoration: none; font-weight: 600; }
  footer.site-footer a:hover { text-decoration: underline; }
  h1 { font-size: 24px; font-weight: 700; letter-spacing: -0.01em; margin: 0 0 4px; }
  h2 { font-size: 15px; font-weight: 700; margin: 24px 0 12px; }
  .muted { color: var(--muted); }
  .panel { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 20px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; }
  table th, table td { text-align: left; padding: 10px; border-bottom: 1px solid var(--border); font-size: 14px; }
  table th { color: var(--muted); font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
  table tr:last-child td { border-bottom: none; }
  table tr.clickable-row { cursor: pointer; }
  table tr.clickable-row:hover { background: var(--accent-bg); }
  a.link { color: var(--accent); text-decoration: none; font-weight: 600; }
  a.link:hover { text-decoration: underline; }
  .btn {
    display: inline-block;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 4px;
    padding: 9px 16px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
  }
  .btn.secondary { background: var(--panel); color: var(--accent); border: 1px solid var(--accent); }
  .btn.danger { background: var(--danger); }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
  .badge.neutral { background: #f1f5f9; color: #475569; }
  .badge.ok { background: var(--ok-bg); color: var(--ok); }
  .badge.warn { background: var(--warn-bg); color: var(--warn); }
  .badge.danger { background: var(--danger-bg); color: var(--danger); }
  .locked-banner {
    background: var(--danger-bg);
    color: var(--danger);
    border: 1px solid #f0c9c9;
    border-radius: 6px;
    padding: 10px 14px;
    margin-bottom: 16px;
    font-weight: 600;
    font-size: 14px;
  }
  .block-banner {
    background: var(--warn-bg);
    color: var(--warn);
    border: 1px solid #f0dcb5;
    border-radius: 6px;
    padding: 10px 14px;
    margin-bottom: 16px;
    font-weight: 600;
    font-size: 14px;
  }
  form .field { margin-bottom: 14px; }
  label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 5px; color: var(--muted); }
  input[type=text], input[type=number], input[type=password], select {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: 4px;
    font-size: 14px;
    background: #fff;
    color: var(--text);
  }
  input:disabled, select:disabled { background: #f1f2f4; color: var(--muted); }
  .row-grid { display: grid; grid-template-columns: 1fr; gap: 14px; margin-bottom: 14px; }
  .items-table input, .items-table select { padding: 6px 8px; }
  .items-table td { vertical-align: middle; }
  .totals { display: flex; justify-content: flex-end; gap: 32px; margin-top: 14px; }
  .totals .box { text-align: right; }
  .totals .box .label { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.03em; }
  .totals .box .value { font-size: 18px; font-weight: 700; }
  .error { background: var(--danger-bg); color: var(--danger); border: 1px solid #f0c9c9; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 14px; }
  .login-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; width: 100%; background: #1a2733; }
  .login-brand { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-bottom: 24px; }
  .login-brand .brand-icon-lg { width: 56px; height: 56px; border-radius: 12px; background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; }
  .login-brand .brand-icon-lg svg { width: 30px; height: 30px; }
  .login-brand h1 { margin: 0; color: #fff; }
  .login-card { width: 340px; }
  .login-subtitle { text-align: center; margin-top: 0; }
  .actions-row { display: flex; gap: 10px; align-items: center; margin: 18px 0; flex-wrap: wrap; }
  .actions-row form { display: inline-block; margin: 0; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

  .not-found { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 80px 20px; gap: 6px; }
  .not-found .not-found-icon { width: 64px; height: 64px; border-radius: 16px; background: var(--accent-bg); color: var(--accent); display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
  .not-found .not-found-icon svg { width: 32px; height: 32px; }
  .not-found h1 { margin: 0; }
  .not-found p { margin: 0 0 16px; }

  .page-header { margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }

  /* Launchpad ------------------------------------------------------------ */
  .tile-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .tile {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    text-decoration: none;
    color: var(--text);
    min-height: 120px;
    transition: box-shadow 0.15s;
  }
  .tile:hover { box-shadow: 0 2px 10px rgba(10,110,209,0.15); border-color: var(--accent); }
  .tile-icon { width: 40px; height: 40px; border-radius: 8px; background: var(--accent-bg); color: var(--accent); display: flex; align-items: center; justify-content: center; }
  .tile-icon svg { width: 22px; height: 22px; }
  .tile-title { font-size: 15px; font-weight: 700; }
  .tile-sub { font-size: 12px; color: var(--muted); }
  .tile.worklist-tile .tile-icon { background: var(--warn-bg); color: var(--warn); }

  /* Document flow panel ---------------------------------------------------- */
  .flow-list { display: flex; flex-direction: column; gap: 0; }
  .flow-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 14px; }
  .flow-item:last-child { border-bottom: none; }
  .flow-item .flow-type { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700; width: 160px; flex-shrink: 0; }

  /* Worklist --------------------------------------------------------------- */
  .worklist-item { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid var(--border); gap: 16px; }
  .worklist-item:last-child { border-bottom: none; }
  .worklist-item .worklist-title { font-weight: 700; font-size: 14px; }
  .worklist-item .worklist-detail { font-size: 13px; color: var(--muted); }
  .worklist-kind { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; padding: 3px 8px; border-radius: 4px; background: var(--accent-bg); color: var(--accent); flex-shrink: 0; }

  @media (max-width: 1100px) {
    .tile-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 640px) {
    .tile-grid { grid-template-columns: 1fr; }
    .two-col { grid-template-columns: 1fr; }
  }
`;

const NAV_ITEMS: { key: "launchpad" | "worklist"; href: string; icon: string; label: string; testid: string }[] = [
  { key: "launchpad", href: "/", icon: ICONS.home, label: "Home", testid: "nav-home" },
  { key: "worklist", href: "/worklist", icon: ICONS.worklist, label: "Worklist", testid: "nav-worklist" },
];

export function layout(
  title: string,
  body: HtmlEscapedString | Promise<HtmlEscapedString> | string,
  opts: { loggedIn?: boolean; active?: "launchpad" | "worklist" } = {}
) {
  return html`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} · WeSAP</title>
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230a6ed1'/%3E%3Crect x='5' y='5' width='9' height='9' rx='2' fill='%23fff'/%3E%3Crect x='18' y='5' width='9' height='9' rx='2' fill='%23fff'/%3E%3Crect x='5' y='18' width='9' height='9' rx='2' fill='%23fff'/%3E%3Crect x='18' y='18' width='9' height='9' rx='2' fill='%23fff'/%3E%3C/svg%3E" />
  <style>${STYLE}</style>
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
      </script>`
    : ""}
</body>
</html>`;
}
