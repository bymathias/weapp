import { html } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";

const STYLE = `
  :root {
    --border: #d8dee6;
    --bg: #f6f7f9;
    --panel: #ffffff;
    --text: #1c2430;
    --muted: #5c6773;
    --accent: #1f4788;
    --accent-bg: #e8eef8;
    --danger: #9c2b2b;
    --danger-bg: #fbe9e9;
    --ok: #1f7a4c;
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
    padding: 14px 24px;
    background: var(--panel);
    border-bottom: 1px solid var(--border);
  }
  header.topbar a.brand { font-weight: 700; font-size: 18px; color: var(--accent); text-decoration: none; }
  header.topbar nav a { color: var(--muted); text-decoration: none; margin-left: 16px; font-size: 14px; }
  main { max-width: 1000px; margin: 0 auto; padding: 24px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 17px; margin: 24px 0 10px; }
  .muted { color: var(--muted); }
  .panel { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 20px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; }
  table th, table td { text-align: left; padding: 9px 10px; border-bottom: 1px solid var(--border); font-size: 14px; }
  table th { color: var(--muted); font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.03em; }
  table tr:last-child td { border-bottom: none; }
  a.link { color: var(--accent); text-decoration: none; font-weight: 600; }
  a.link:hover { text-decoration: underline; }
  .btn {
    display: inline-block;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 9px 16px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
  }
  .btn.secondary { background: var(--panel); color: var(--accent); border: 1px solid var(--accent); }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .badge { display: inline-block; padding: 3px 9px; border-radius: 999px; font-size: 12px; font-weight: 600; }
  .badge.Draft { background: #eef0f3; color: #4a5361; }
  .badge.Sent { background: var(--accent-bg); color: var(--accent); }
  .badge.Won { background: #e5f5ec; color: var(--ok); }
  .badge.Lost { background: var(--danger-bg); color: var(--danger); }
  .locked-banner {
    background: var(--danger-bg);
    color: var(--danger);
    border: 1px solid #f0caca;
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
    border-radius: 6px;
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
  .error { background: var(--danger-bg); color: var(--danger); border: 1px solid #f0caca; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 14px; }
  .login-wrap { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .login-card { width: 340px; }
  .actions-row { display: flex; gap: 10px; align-items: center; margin-top: 18px; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
`;

export function layout(
  title: string,
  body: HtmlEscapedString | Promise<HtmlEscapedString> | string,
  opts: { loggedIn?: boolean } = {}
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
        <a class="brand" href="/" id="nav-home">WeCPQ</a>
        <nav>
          <a href="/api-docs" id="nav-api-docs" data-testid="nav-api-docs">API Docs</a>
          <a href="/logout" id="nav-logout" data-testid="nav-logout">Log out</a>
        </nav>
      </header>`
    : ""}
  <main>${body}</main>
</body>
</html>`;
}
