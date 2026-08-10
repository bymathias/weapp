import { html, raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";

export const ICONS = {
  logo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><path d="M14 2v5h5"/><path d="M8 13h8M8 17h5"/></svg>`,
  dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`,
  customers: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20c0-3.3 2.6-5.5 5.5-5.5s5.5 2.2 5.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M15.7 14.7c2.4.4 3.9 2.2 3.9 5.3"/></svg>`,
  quotes: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><path d="M14 2v5h5"/><path d="M8 13h8M8 17h5"/></svg>`,
  won: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.3 2.3L15.5 9.5"/></svg>`,
  sent: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 3L11 13"/><path d="M21 3l-7 18-4-8-8-4 19-6z"/></svg>`,
  lost: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>`,
};

const STYLE = `
  :root {
    --border: #e5e7f0;
    --bg: #f5f5fb;
    --panel: #ffffff;
    --text: #12141c;
    --muted: #6b7280;
    --accent: #4f46e5;
    --accent-bg: #eef2ff;
    --danger: #dc2626;
    --danger-bg: #fee2e2;
    --ok: #16a34a;
    --ok-bg: #dcfce7;
    --warn: #d97706;
    --warn-bg: #fef3c7;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, Segoe UI, Helvetica, Arial, sans-serif;
    background: var(--bg);
    color: var(--text);
  }
  header.topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 28px;
    background: var(--panel);
    border-bottom: 1px solid var(--border);
  }
  header.topbar a.brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 18px; color: var(--text); text-decoration: none; }
  .brand-icon { width: 34px; height: 34px; border-radius: 9px; background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .brand-icon svg { width: 19px; height: 19px; }
  nav.pillnav { display: flex; gap: 4px; }
  .pillnav a { display: flex; align-items: center; gap: 7px; padding: 8px 16px; border-radius: 9999px; color: var(--muted); text-decoration: none; font-size: 14px; font-weight: 600; }
  .pillnav a svg { width: 16px; height: 16px; }
  .pillnav a.active { background: var(--accent-bg); color: var(--accent); }
  .topbar .right { display: flex; align-items: center; gap: 18px; }
  .topbar .right a.textlink { color: var(--muted); font-size: 14px; text-decoration: none; font-weight: 600; }
  .topbar .right a.textlink:hover { color: var(--text); }
  .avatar { width: 34px; height: 34px; border-radius: 50%; background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; }
  main { max-width: 1100px; margin: 0 auto; padding: 28px 24px; }
  h1 { font-size: 26px; font-weight: 800; letter-spacing: -0.01em; margin: 0 0 4px; }
  h2 { font-size: 15px; font-weight: 700; margin: 24px 0 12px; }
  .muted { color: var(--muted); }
  .panel { background: var(--panel); border: 1px solid var(--border); border-radius: 14px; padding: 20px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; }
  table th, table td { text-align: left; padding: 10px; border-bottom: 1px solid var(--border); font-size: 14px; }
  table th { color: var(--muted); font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
  table tr:last-child td { border-bottom: none; }
  a.link { color: var(--accent); text-decoration: none; font-weight: 600; }
  a.link:hover { text-decoration: underline; }
  .btn {
    display: inline-block;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 9px 16px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
  }
  .btn.secondary { background: var(--panel); color: var(--accent); border: 1px solid var(--accent); }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
  .badge.Draft { background: #f1f5f9; color: #475569; }
  .badge.Sent { background: var(--accent-bg); color: var(--accent); }
  .badge.Won { background: var(--ok-bg); color: var(--ok); }
  .badge.Lost { background: var(--danger-bg); color: var(--danger); }
  .locked-banner {
    background: var(--danger-bg);
    color: var(--danger);
    border: 1px solid #f3c5c5;
    border-radius: 8px;
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
    border-radius: 8px;
    font-size: 14px;
    background: #fff;
    color: var(--text);
  }
  input:disabled, select:disabled { background: #f1f2f4; color: var(--muted); }
  .row-grid { display: grid; grid-template-columns: 1fr; gap: 14px; margin-bottom: 14px; }
  .items-table input { padding: 6px 8px; }
  .items-table td { vertical-align: middle; }
  .totals { display: flex; justify-content: flex-end; gap: 32px; margin-top: 14px; }
  .totals .box { text-align: right; }
  .totals .box .label { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.03em; }
  .totals .box .value { font-size: 18px; font-weight: 700; }
  .error { background: var(--danger-bg); color: var(--danger); border: 1px solid #f3c5c5; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; font-size: 14px; }
  .login-wrap { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .login-card { width: 340px; }
  .actions-row { display: flex; gap: 10px; align-items: center; margin-top: 18px; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

  .page-header { margin-bottom: 24px; }
  .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
  .stat-card { background: var(--panel); border: 1px solid var(--border); border-radius: 14px; padding: 20px; display: flex; align-items: center; gap: 16px; }
  .stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .stat-icon svg { width: 24px; height: 24px; }
  .stat-icon.indigo { background: var(--accent-bg); color: var(--accent); }
  .stat-icon.green { background: var(--ok-bg); color: var(--ok); }
  .stat-icon.amber { background: var(--warn-bg); color: var(--warn); }
  .stat-icon.red { background: var(--danger-bg); color: var(--danger); }
  .stat-value { font-size: 26px; font-weight: 800; line-height: 1.1; }
  .stat-label { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }

  .dash-quotes-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin: 24px 0 12px; }
  .dash-quotes-header h2 { margin: 0; }
  .search-form { display: flex; gap: 8px; align-items: center; }
  .search-form input[type=text] { width: 300px; }
  .pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 18px; }

  @media (max-width: 900px) {
    .stat-grid { grid-template-columns: repeat(2, 1fr); }
    .search-form input[type=text] { width: 200px; }
  }
`;

export function layout(
  title: string,
  body: HtmlEscapedString | Promise<HtmlEscapedString> | string,
  opts: { loggedIn?: boolean; active?: "dashboard" | "customers" } = {}
) {
  return html`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} · WeCPQ</title>
  <style>${STYLE}</style>
</head>
<body>
  ${opts.loggedIn
    ? html`<header class="topbar">
        <a class="brand" href="/" id="nav-home">
          <span class="brand-icon">${raw(ICONS.logo)}</span>
          WeCPQ
        </a>
        <nav class="pillnav">
          <a href="/" id="nav-dashboard" data-testid="nav-dashboard" class="${opts.active === "dashboard" ? "active" : ""}">${raw(ICONS.dashboard)} Dashboard</a>
          <a href="/customers" id="nav-customers" data-testid="nav-customers" class="${opts.active === "customers" ? "active" : ""}">${raw(ICONS.customers)} Customers</a>
        </nav>
        <div class="right">
          <a href="/api-docs" id="nav-api-docs" data-testid="nav-api-docs" class="textlink">API Docs</a>
          <a href="/logout" id="nav-logout" data-testid="nav-logout" class="textlink">Log out</a>
          <span class="avatar" id="nav-avatar" data-testid="nav-avatar">A</span>
        </div>
      </header>`
    : ""}
  <main>${body}</main>
</body>
</html>`;
}
