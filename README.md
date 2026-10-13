# WeApp — WeCPQ + WeSAP demo

Two demo apps built to be automated by UiPath (UI and API), used together to
demo Quotation, Order-to-Cash and Purchase-to-Pay with a Robot / Agent /
People handler model.

| App | What it is | README |
|---|---|---|
| `wecpq/` | Configure-Price-Quote: customers, quotes, quote PDFs | [wecpq/README.md](wecpq/README.md) |
| `wesap/` | SAP-lookalike ERP: P2P and O2C document chains | [wesap/README.md](wesap/README.md) |

Both are Cloudflare Workers (Hono + D1), deployed independently, each with its
own D1 database and demo credentials.

## How they connect

The apps never call each other. They are linked by:

- **The demo flow** — a Won quote in WeCPQ, the customer's PO matched against
  it (in UiPath), then `POST /api/sales-orders` in WeSAP carrying
  `customer_ref`, `source_quote_ref` and `customer_po_number`.
- **Shared data** — `demo/demo-seed-data.json` is the single source of truth.
  Customers share `ref_id`s across both apps, and every seeded sales order
  references a WeCPQ quote. Each app's `scripts/gen-seed.mjs` generates its
  own `seed.sql` / `reset.sql` slice from it.

## Docs

- `docs/WeCPQ-WeSAP-Demo-Scenarios-Guide.pdf` — every seeded scenario and how
  to run it on stage
- `docs/WeCPQ-WeSAP-Manual-As-Is-Processes-and-Exceptions.pdf` — roles,
  steps and exceptions per process
- `docs/WeCPQ-WeSAP-Process-Automation-Playbook.pdf` — as-is vs to-be flows

## Commands

```sh
npm install              # installs both workspaces
npm run dev:cpq          # WeCPQ on :8787
npm run dev:sap          # WeSAP on :8788
npm run typecheck        # both apps
npm run seed:gen         # regenerate both apps' seed.sql/reset.sql from demo/
npm run reset            # reset both remote D1 databases to the demo state
npm run deploy           # deploy both
```

Per-app commands: `npm run <script> -w wecpq` (or `-w wesap`), e.g.
`npm run db:migrate:local -w wesap`.

After editing `demo/demo-seed-data.json`, run `npm run seed:gen` and commit
the regenerated SQL alongside it.
