# WeSAP

A lightweight SAP-lookalike ERP demo app built on Cloudflare Workers, Hono,
and D1. It exists to be automated: a Fiori-style server-rendered UI with
stable `id`/`name`/`data-testid` attributes for UI automation (e.g. UiPath),
and a bearer-protected REST API documented with OpenAPI/Swagger for
API-based automation.

WeSAP is the twin of [WeCPQ](https://github.com/) (a Configure-Price-Quote
demo app) — same stack, same conventions — and the two are meant to be used
together in a single demo, PO-driven: WeCPQ produces a Won quote, the
customer sends back their own Purchase Order referencing it, and a UiPath
bot/agent reads both, matches the customer PO against the WeCPQ quote, and
calls WeSAP's `POST /api/sales-orders` with the matched `customer_po_number`
and `source_quote_ref` to create the sales order. **The PO-vs-quote match
itself happens upstream, in the UiPath layer — WeSAP only captures and
carries the two references** (order → delivery → billing/invoice) so the
customer's invoice can always be traced back to their PO. **WeSAP's customer
master data mirrors WeCPQ's exactly (same names and `ref_id`s)**, so the
bridge always resolves the same customer on both sides.

## Stack

- Cloudflare Workers + [Hono](https://hono.dev)
- Cloudflare D1 (SQLite)
- `@hono/zod-openapi` + Swagger UI for API docs
- Hand-rolled Fiori-style CSS (no UI5 Web Components dependency)

## Credentials

Local defaults (from `.dev.vars.example`):

| Surface | Values |
|---|---|
| UI login (`/login`) | `admin` / `demo123` |
| API OAuth2 client credentials (`POST /oauth/token`) | `client_id=wesap-demo-client`, `client_secret=wesap-demo-secret` |

`UI_USERNAME` and `OAUTH_CLIENT_ID` are plain `[vars]` in `wrangler.toml`.
`SESSION_SECRET`, `UI_PASSWORD` and `OAUTH_CLIENT_SECRET` are secrets: read
from `.dev.vars` locally (gitignored) and set with `wrangler secret put` on the
deployed Worker, so the deployed values never appear in this repo.

## Project layout

```
schema.sql          D1 table definitions (master data, P2P docs, O2C docs, doc_flow)
seed.sql             deterministic demo data spanning both processes
migrations/          incremental ALTER TABLE migrations for an existing DB
                       (schema.sql already has the full current schema for
                       fresh installs — these are for applying the same
                       change to a live DB without dropping/reseeding it)
src/
  index.ts           app entrypoint — mounts oauth, api, ui routers
  types.ts            shared Env/domain types
  lib/                totals math, numbering, matching, credit check, doc flow,
                       session cookies, bearer tokens
  db/                  D1 access layer, split by domain (master/p2p/o2c/payments/worklist)
  api/                 zod-openapi routes, schemas, /oauth/token
  ui/                  server-rendered pages (launchpad, list reports, object pages, worklist)
```

## Local development

Install dependencies and create your local secrets file:

```sh
npm install
cp .dev.vars.example .dev.vars
```

Create the local D1 database and load schema + seed data:

```sh
npm run db:migrate:local
npm run db:seed:local
```

Run the dev server:

```sh
npm run dev
```

This starts `wrangler dev` (Miniflare) on `http://localhost:8787`. Log in at
`/login` with `admin` / `demo123`.

> If `wrangler dev` needs to bind IPv6 and your environment doesn't support
> it, run `wrangler dev --ip 127.0.0.1` instead.

## Deploying to Cloudflare

1. Create the D1 database in your Cloudflare account:

   ```sh
   npx wrangler d1 create wesap
   ```

   Copy the returned `database_id` into `wrangler.toml` under
   `[[d1_databases]]` (replace `REPLACE_WITH_YOUR_D1_DATABASE_ID`).

2. Apply schema and seed data to the remote database:

   ```sh
   npm run db:migrate:remote
   npm run db:seed:remote
   ```

3. Set the secrets (use strong random values, not the local defaults):

   ```sh
   npx wrangler secret put SESSION_SECRET
   npx wrangler secret put UI_PASSWORD
   npx wrangler secret put OAUTH_CLIENT_SECRET
   ```

4. Deploy:

   ```sh
   npm run deploy
   ```

## GitHub → Cloudflare auto-deploy

1. Push this repo to GitHub.
2. In the Cloudflare dashboard: **Workers & Pages → Create → Workers →
   Connect to Git**, pick the repo/branch.
3. Build command: `npm install` (Wrangler deploy is handled by Cloudflare's
   Workers Builds integration using `wrangler.toml`).
4. Add the D1 binding in the Cloudflare dashboard build settings if it isn't
   picked up automatically from `wrangler.toml`.
5. Every push to the connected branch redeploys automatically.

## API usage

1. Get a bearer token:

   ```sh
   curl -X POST http://localhost:8787/oauth/token \
     -d grant_type=client_credentials \
     -d client_id=wesap-demo-client \
     -d client_secret=wesap-demo-secret
   ```

2. Call the API with it:

   ```sh
   curl http://localhost:8787/api/sales-orders \
     -H "Authorization: Bearer <access_token>"
   ```

3. Explore/try endpoints interactively at `/api-docs` (Swagger UI); the raw
   spec is at `/openapi.json` — point a UiPath connector generator at it.

Tokens expire after 1 hour.

### The WeCPQ → UiPath → WeSAP bridge (PO-driven)

`POST /api/sales-orders` is the bridge target — called once the UiPath bot
has matched the customer's PO against the WeCPQ quote. Given `customer_ref`,
`items[]`, `customer_po_number` (required — a PO-driven order must carry
one), and `source_quote_ref`, it computes totals server-side, runs the
credit-limit check, and returns the created sales order, carrying both
references through to delivery and billing:

```sh
curl -X POST http://localhost:8787/api/sales-orders \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_ref": "CUST-0008",
    "customer_po_number": "PO-APEX-2026-056",
    "source_quote_ref": "Q-2026-0009",
    "items": [{ "description": "Onboarding Services", "qty": 10, "unit_price": 500 }]
  }'
```

Because WeSAP's customers use the same `ref_id`s as WeCPQ's, a UiPath bot
reading a Won quote from WeCPQ can pass its `customer.ref_id` straight
through as `customer_ref` here. The PO-vs-quote match itself is out of scope
for WeSAP — it belongs to the UiPath automation layer, which supplies the
already-matched `customer_po_number` and `source_quote_ref`.

## Business rules

- All amounts/line totals are computed **server-side** on create — client-sent
  totals are always ignored.
- **Matching** (`POST /api/supplier-invoices/:number/match`): 2-way (PO vs.
  Invoice) if no goods receipt exists yet for the PO, 3-way (PO vs. GR vs.
  Invoice) once one does. Tolerance is ±5% on price and qty; anything outside
  it sets the invoice to `Blocked` with a `block_reason`. `Release` clears the
  block (→ `Released`); a Matched or Released invoice can then be Paid.
- **Credit check** (on `POST /api/sales-orders`): if a customer's open O2C
  exposure (sum of their non-`Paid` sales orders) plus the new order's total
  would exceed their `credit_limit`, the order is created as
  `Blocked (Credit)`. `POST /api/sales-orders/:number/release-credit` clears
  the block.
- **Locking**: once a supplier invoice or billing document is `Paid`
  (cascading to `Paid` on the linked sales order too), it is read-only — the
  UI disables its actions and the API's action routes return `409`.
- **Document flow**: every follow-on document (GR, invoice, delivery, billing
  doc, payment) links back to its predecessor via `doc_flow`, surfaced as a
  panel on every object page and via `GET /api/{object}/:number/flow`.

### Status arcs

- Purchase Order: `Open → Received → Invoiced`
- Supplier Invoice: `Invoiced → Matched | Blocked → Released → Paid`
- Sales Order: `Open → Blocked (Credit) | Released → Delivered → Billed → Paid`
- Goods Receipt / Delivery: `Posted` (single-status once posted)
- Billing Document: `Open → Paid`

## Seed data

`seed.sql` creates the 8 WeCPQ-matching customers (`CUST-0001`…`CUST-0008`,
each with a `credit_limit`), 8 vendors (`VEND-0001`…), 10 materials
(`MAT-0001`…), and a spread of documents across both processes, including:

- A **pre-blocked supplier invoice** (`5100000002`, price >5% over its PO)
  ready to demo Release → Pay.
- A customer (Apex Managed IT, `CUST-0008`) sitting near their credit limit
  (27,500 of a 30,000 limit) — any new sales order over 2,500 trips
  `Blocked (Credit)`, ideal for the WeCPQ bridge demo.
- A second **pre-blocked sales order** (`1000000006`, already over its
  customer's limit) ready to demo Release Credit directly.
- Clean happy-path documents through to `Paid` in both P2P and O2C, plus a
  couple of open documents (`4500000004`, `4500000006`) left untouched for
  walking the full cycle live.

Re-running `db:migrate:local`/`remote` drops and recreates the schema, so
re-seeding always yields the same data.
