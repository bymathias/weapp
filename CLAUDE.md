# CLAUDE.md

Monorepo (npm workspaces) for two UiPath demo apps: `wecpq/` (CPQ) and
`wesap/` (SAP-lookalike ERP). See `README.md` for the demo flow and
`wecpq/CLAUDE.md` for app architecture — WeSAP follows the same conventions.

- The apps never call each other; they are linked only through the shared
  dataset and the UiPath flow (WeCPQ Won quote → customer PO → WeSAP sales
  order).
- `demo/demo-seed-data.json` is the single source of truth for demo data.
  Never hand-edit `seed.sql`/`reset.sql`; edit the JSON and run
  `npm run seed:gen`. Customer `ref_id`s must stay identical across both apps.
- `docs/` holds the scenario guide and process manuals — the seeded data must
  keep matching the scenarios described there.
- Each app deploys independently (own `wrangler.toml`, D1 database,
  credentials). Run app scripts with `npm run <script> -w <app>`.
- No test suite; `npm run typecheck` checks both apps.
