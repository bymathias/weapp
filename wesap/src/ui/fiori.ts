// SAP Fiori "Belize" design tokens + component styles, shared by every
// server-rendered page via layout(). Visual/CSS only — no markup here
// depends on this file, and no id/name/data-testid attribute lives here.
export const FIORI_CSS = `
  :root {
    --brand: #0a6ed1;
    --brand-hover: #085cab;
    --shell-bg: #354a5f;
    --shell-text: #ffffff;
    --text: #32363a;
    --text-secondary: #6a6d70;
    --bg: #f7f7f7;
    --card-bg: #ffffff;
    --border: #e5e5e5;
    --table-header-bg: #f2f2f2;
    --row-selected: #e5f0fa;
    --success: #107e3e;
    --success-bg: #e7f5ec;
    --warning: #e9730c;
    --warning-bg: #fdf1e3;
    --error: #bb0000;
    --error-bg: #fbeaea;
    --info: #0a6ed1;
    --neutral: #6a6d70;
    --radius: 0.25rem;
    --shell-height: 2.75rem;

    /* Back-compat aliases so any un-migrated reference still resolves. */
    --accent: var(--brand);
    --accent-bg: #e8f2fc;
    --panel: var(--card-bg);
    --muted: var(--text-secondary);
    --ok: var(--success);
    --ok-bg: var(--success-bg);
    --warn: var(--warning);
    --warn-bg: var(--warning-bg);
    --danger: var(--error);
    --danger-bg: var(--error-bg);
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    font-family: "72", "72full", Arial, Helvetica, sans-serif;
    font-size: 0.875rem;
    line-height: 1.35;
    background: var(--bg);
    color: var(--text);
  }

  /* Shell bar --------------------------------------------------------------- */
  header.topbar {
    position: sticky;
    top: 0;
    z-index: 20;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--shell-height);
    padding: 0 1rem;
    background: var(--shell-bg);
    color: var(--shell-text);
  }
  header.topbar a.brand { display: flex; align-items: center; gap: 0.6rem; font-weight: 700; font-size: 1.125rem; color: #fff; text-decoration: none; letter-spacing: -0.01em; }
  .brand-icon { width: 1.75rem; height: 1.75rem; border-radius: var(--radius); background: rgba(255,255,255,0.15); color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .brand-icon svg { width: 1.05rem; height: 1.05rem; }
  nav.pillnav { display: flex; gap: 0.15rem; }
  .pillnav a { display: flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.75rem; border-radius: var(--radius); color: rgba(255,255,255,0.75); text-decoration: none; font-size: 0.8125rem; font-weight: 600; }
  .pillnav a svg { width: 0.95rem; height: 0.95rem; }
  .pillnav a:hover { background: rgba(255,255,255,0.08); color: #fff; }
  .pillnav a.active { background: rgba(255,255,255,0.18); color: #fff; }
  .topbar .right { display: flex; align-items: center; gap: 1rem; }
  .topbar .right a.textlink { color: rgba(255,255,255,0.75); font-size: 0.8125rem; text-decoration: none; font-weight: 600; }
  .topbar .right a.textlink:hover { color: #fff; }
  .avatar { width: 1.75rem; height: 1.75rem; border-radius: 50%; background: var(--brand); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; flex-shrink: 0; }

  main { max-width: 1400px; margin: 0 auto; padding: 1.25rem 1.25rem 5rem; flex: 1 0 auto; width: 100%; }
  main.main-bare { max-width: none; padding: 0; display: flex; }
  footer.site-footer {
    flex-shrink: 0;
    border-top: 1px solid var(--border);
    background: var(--card-bg);
    padding: 0.75rem 1.25rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    font-size: 0.75rem;
    color: var(--text-secondary);
  }
  footer.site-footer a { color: var(--brand); text-decoration: none; font-weight: 600; }
  footer.site-footer a:hover { text-decoration: underline; }

  h1 { font-size: 1.375rem; font-weight: 600; letter-spacing: -0.005em; margin: 0 0 0.2rem; color: var(--text); }
  h2 { font-size: 1rem; font-weight: 700; margin: 1.5rem 0 0.75rem; color: var(--text); }
  .muted { color: var(--text-secondary); }
  .panel { background: var(--card-bg); border: 1px solid var(--border); border-radius: var(--radius); padding: 1rem 1.125rem; margin-bottom: 1rem; }

  /* Compact tables ------------------------------------------------------------ */
  table { width: 100%; border-collapse: collapse; }
  table th, table td { text-align: left; padding: 0.4375rem 0.625rem; border-bottom: 1px solid var(--border); font-size: 0.8125rem; }
  table th { background: var(--table-header-bg); color: var(--text-secondary); font-weight: 700; font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.04em; }
  table tr:last-child td { border-bottom: none; }
  table tr.clickable-row { cursor: pointer; }
  table tr.clickable-row:hover { background: var(--row-selected); }
  a.link { color: var(--brand); text-decoration: none; font-weight: 600; }
  a.link:hover { text-decoration: underline; }

  /* Buttons — Emphasized (.btn), Default (.btn.secondary), Transparent (.btn.transparent) */
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    background: var(--brand);
    color: #fff;
    border: 1px solid var(--brand);
    border-radius: var(--radius);
    padding: 0.3rem 0.75rem;
    font-family: inherit;
    font-size: 0.8125rem;
    font-weight: 600;
    line-height: 1.4;
    cursor: pointer;
    text-decoration: none;
  }
  .btn:hover { background: var(--brand-hover); border-color: var(--brand-hover); }
  .btn.secondary { background: var(--card-bg); color: var(--brand); border: 1px solid var(--brand); }
  .btn.secondary:hover { background: var(--accent-bg); }
  .btn.transparent { background: transparent; color: var(--brand); border: 1px solid transparent; padding: 0.3rem 0.5rem; }
  .btn.transparent:hover { background: var(--accent-bg); }
  .btn.danger { background: var(--error); border-color: var(--error); }
  .btn.danger:hover { background: #950000; border-color: #950000; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Status as semantic text, not a filled pill ------------------------------- */
  .badge { display: inline-flex; align-items: center; gap: 0.35rem; background: none; padding: 0; border-radius: 0; font-size: 0.8125rem; font-weight: 600; }
  .badge::before { content: ""; display: inline-block; width: 0.5rem; height: 0.5rem; border-radius: 50%; background: currentColor; flex-shrink: 0; }
  .badge.neutral { color: var(--neutral); }
  .badge.ok { color: var(--success); }
  .badge.warn { color: var(--warning); }
  .badge.danger { color: var(--error); }

  .locked-banner {
    background: var(--error-bg);
    color: var(--error);
    border: 1px solid #f0c9c9;
    border-radius: var(--radius);
    padding: 0.6rem 0.85rem;
    margin-bottom: 1rem;
    font-weight: 600;
    font-size: 0.8125rem;
  }
  .block-banner {
    background: var(--warning-bg);
    color: var(--warning);
    border: 1px solid #f4dab3;
    border-radius: var(--radius);
    padding: 0.6rem 0.85rem;
    margin-bottom: 1rem;
    font-weight: 600;
    font-size: 0.8125rem;
  }

  /* Compact forms -------------------------------------------------------------- */
  form .field { margin-bottom: 0.75rem; }
  label { display: block; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem; color: var(--text-secondary); }
  input[type=text], input[type=number], input[type=password], input[type=search], select {
    width: 100%;
    padding: 0.35rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    font-family: inherit;
    font-size: 0.8125rem;
    background: #fff;
    color: var(--text);
  }
  input:disabled, select:disabled { background: #f1f2f4; color: var(--text-secondary); }
  .row-grid { display: grid; grid-template-columns: 1fr; gap: 0.75rem; margin-bottom: 0.75rem; }
  .items-table input, .items-table select { padding: 0.25rem 0.4rem; }
  .items-table td { vertical-align: middle; }
  .totals { display: flex; justify-content: flex-end; gap: 1.75rem; margin-top: 0.75rem; }
  .totals .box { text-align: right; }
  .totals .box .label { font-size: 0.6875rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.03em; }
  .totals .box .value { font-size: 1.125rem; font-weight: 700; }
  .error { background: var(--error-bg); color: var(--error); border: 1px solid #f0c9c9; border-radius: var(--radius); padding: 0.6rem 0.85rem; margin-bottom: 1rem; font-size: 0.8125rem; }

  .login-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; width: 100%; background: var(--shell-bg); }
  .login-brand { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; }
  .login-brand .brand-icon-lg { width: 3.5rem; height: 3.5rem; border-radius: 0.75rem; background: var(--brand); color: #fff; display: flex; align-items: center; justify-content: center; }
  .login-brand .brand-icon-lg svg { width: 1.9rem; height: 1.9rem; }
  .login-brand h1 { margin: 0; color: #fff; }
  .login-card { width: 21rem; }
  .login-subtitle { text-align: center; margin-top: 0; }

  /* Object-page footer action bar --------------------------------------------- */
  .actions-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    justify-content: flex-end;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 0.6rem 1.5rem;
    background: var(--card-bg);
    border-top: 1px solid var(--border);
    box-shadow: 0 -2px 6px rgba(0,0,0,0.06);
    flex-wrap: wrap;
    z-index: 30;
  }
  .actions-row form { display: inline-block; margin: 0; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }

  .not-found { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 5rem 1.25rem; gap: 0.4rem; }
  .not-found .not-found-icon { width: 4rem; height: 4rem; border-radius: 1rem; background: var(--accent-bg); color: var(--brand); display: flex; align-items: center; justify-content: center; margin-bottom: 0.6rem; }
  .not-found .not-found-icon svg { width: 2rem; height: 2rem; }
  .not-found h1 { margin: 0; }
  .not-found p { margin: 0 0 1rem; }

  .page-header { margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }

  /* List Report filter-bar ----------------------------------------------------- */
  .filter-bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.6rem 0.75rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }
  .filter-bar input[type=search] { max-width: 18rem; flex: 1 1 12rem; }
  .filter-bar .filter-bar-label { font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.04em; }

  /* Object-page header: key facets --------------------------------------------- */
  .object-header { margin-bottom: 1rem; }
  .object-title-row { display: flex; align-items: baseline; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.6rem; }
  .facets-row { display: flex; gap: 1.75rem; flex-wrap: wrap; }
  .facet { display: flex; flex-direction: column; gap: 0.15rem; }
  .facet .facet-label { font-size: 0.6875rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.04em; }
  .facet .facet-value { font-size: 0.8125rem; color: var(--text); }

  /* Anchor bar ------------------------------------------------------------------ */
  .anchor-bar {
    position: sticky;
    top: var(--shell-height);
    z-index: 10;
    display: flex;
    gap: 1.25rem;
    background: var(--bg);
    border-bottom: 1px solid var(--border);
    padding: 0.5rem 0 0.5rem;
    margin-bottom: 1rem;
  }
  .anchor-bar a { color: var(--text-secondary); text-decoration: none; font-size: 0.8125rem; font-weight: 700; padding-bottom: 0.35rem; border-bottom: 2px solid transparent; }
  .anchor-bar a:hover { color: var(--brand); }

  /* Launchpad -------------------------------------------------------------------- */
  #launchpad-tiles { display: grid; grid-template-columns: 1fr; gap: 1.75rem; align-items: start; }
  .tile-group { margin-bottom: 0; }
  .tile-group-header { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); margin-bottom: 0.6rem; }
  .tile-grid { display: grid; grid-template-columns: repeat(auto-fill, 11rem); gap: 1rem; }
  .tile {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    padding: 0.9rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 0.6rem;
    text-decoration: none;
    color: var(--text);
    width: 11rem;
    height: 7rem;
    transition: box-shadow 0.15s, border-color 0.15s;
  }
  .tile:hover { box-shadow: 0 4px 12px rgba(10,110,209,0.18); border-color: var(--brand); }
  .tile-icon { width: 2rem; height: 2rem; border-radius: var(--radius); background: var(--accent-bg); color: var(--brand); display: flex; align-items: center; justify-content: center; }
  .tile-icon svg { width: 1.2rem; height: 1.2rem; }
  .tile-title { font-size: 0.9375rem; font-weight: 700; }
  .tile-sub { font-size: 0.75rem; color: var(--text-secondary); }
  .tile.worklist-tile .tile-icon { background: var(--warning-bg); color: var(--warning); }

  /* Document flow panel ----------------------------------------------------------- */
  .flow-list { display: flex; flex-direction: column; gap: 0; }
  .flow-item { display: flex; align-items: center; justify-content: space-between; padding: 0.55rem 0; border-bottom: 1px solid var(--border); font-size: 0.8125rem; }
  .flow-item:last-child { border-bottom: none; }
  .flow-item .flow-type { color: var(--text-secondary); font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700; width: 10rem; flex-shrink: 0; }

  /* Worklist ------------------------------------------------------------------------ */
  .worklist-item { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border); gap: 1rem; }
  .worklist-item:last-child { border-bottom: none; }
  .worklist-item .worklist-title { font-weight: 700; font-size: 0.8125rem; }
  .worklist-item .worklist-detail { font-size: 0.75rem; color: var(--text-secondary); }
  .worklist-kind { font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; padding: 0.15rem 0.5rem; border-radius: var(--radius); background: var(--accent-bg); color: var(--brand); flex-shrink: 0; }

  @media (min-width: 1100px) {
    #launchpad-tiles { grid-template-columns: repeat(2, 1fr); gap: 1.75rem 2.5rem; }
  }
  @media (max-width: 1100px) {
    .tile-grid { grid-template-columns: repeat(auto-fill, 11rem); }
  }
  @media (max-width: 640px) {
    .tile-grid { grid-template-columns: 1fr; }
    .tile { width: 100%; }
    .two-col { grid-template-columns: 1fr; }
  }
`;
