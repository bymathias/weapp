# WeApp — WeCPQ + WeSAP demo

Two demo apps built to be automated by UiPath (UI and API), used together to
demo Quotation, Order-to-Cash and Purchase-to-Pay with a Robot / Agent /
People handler model.

| App | What it is | Live | README |
|---|---|---|---|
| `wecpq/` | Configure-Price-Quote: customers, quotes, quote PDFs | https://wecpq.wtld.me | [wecpq/README.md](wecpq/README.md) |
| `wesap/` | SAP-lookalike ERP: P2P and O2C document chains | https://wesap.wtld.me | [wesap/README.md](wesap/README.md) |

Both are Cloudflare Workers (Hono + D1), deployed independently, each with its
own D1 database and demo credentials.

## How they connect

The apps never call each other. They are linked by:

- **The demo flow** — a Won quote in WeCPQ, the customer's PO matched against
  it (in UiPath), then `POST /api/sales-orders` in WeSAP carrying
  `customer_ref`, `source_quote_ref` and `customer_po_number`.
- **Multi-PO intake** — one email can carry several POs, and one PO can
  cover several quotes. The flow creates **one WeSAP sales order per
  PO–quote pair** (`customer_po_number` + `source_quote_ref`):
  - WeCPQ (UI): the bot searches and opens the quote, then uses Download PDF
    (`/api/quotes/{ref}/pdf?download=1`). The PDF shows customer prices per
    line, currency, validity and payment terms, and paginates without
    truncating, for IXP extraction.
  - WeSAP (API): `GET /api/sales-orders?customer_po_number=…&source_quote_ref=…`
    to look up, `GET /api/sales-orders/ordered-quantities?source_quote_ref=…`
    for quantities already ordered per quote line, then `POST
    /api/sales-orders` (with `quote_sku` per line and `intake_case_id`). A
    retry for an existing pair returns **409** `{error: "duplicate",
    so_number}` and creates nothing. `POST /api/sales-orders/{so}/reject`
    rejects an order (frees the pair, credit exposure and ordered quantities).
- **Shared data** — `demo/demo-seed-data.json` is the single source of truth.
  Customers share `ref_id`s across both apps, and every seeded sales order
  references a WeCPQ quote. Each app's `scripts/gen-seed.mjs` generates its
  own `seed.sql` / `reset.sql` slice from it.

`demo/customer-pos/` holds the customer Purchase Orders the bot ingests in
the Order-to-Cash scenarios. They are generated from
`demo_inputs.customer_pos` (one PO per file) and
`demo_inputs.customer_po_bundles` (several POs in one file) in the dataset,
and are meant to be dropped into the bot's mailbox during a demo. The field
format is documented in the header of `demo/gen-customer-pos.mjs`.

| File | PO | Quote(s) | Expected outcome |
|---|---|---|---|
| `PO_Meridian_Q-2026-0005.pdf` | MIG-PO-2026-0457 | Q-2026-0005 | Clean match (€15,950) → SO straight through |
| `PO_Vertex_Q-2026-0009.pdf` | VSL-PO-71208 | Q-2026-0009 | Price mismatch (Falcon Complete 110 vs 100.30) + FortiCare line with no material → Agent → People |
| `PO_Ironclad_Q-2026-0015.pdf` | ICP-2026-PO-0311 | Q-2026-0015 | Qty 30 vs 28, then Blocked (Credit) (> €40,000) |
| `PO_Beacon_Q-2026-0023_A.pdf` / `_B.pdf` | BSG-PO-2026-1041 / -1042 | Q-2026-0023 | Split order, clean: A + B = quoted quantities → two SOs |
| `PO_Beacon_Q-2026-0023_C.pdf` | BSG-PO-2026-1057 | Q-2026-0023 | Split order, over-ordered: A + C exceeds the quote → Agent → People |
| `PO_Beacon_Q-2026-0023_A+B.pdf` | BSG-PO-2026-1041 + -1042 | Q-2026-0023 | Two POs in one PDF → two SOs; re-processing → 409 duplicate |
| `PO_Onyx_Q-2026-0021+0022.pdf` | ONX-PO-2026-0193 | Q-2026-0021, Q-2026-0022 | One PO, two quotes (quote ref per line) → two SOs |
| `PO_Kestrel_Q-2026-0024.pdf` | KD-PO-5523 | Q-2026-0024 | Quote expired 2026-07-15 → Agent → People |

Changes to existing scenario figures and the full list of new scenarios
and API changes are in [`docs/CHANGES-multi-po.md`](docs/CHANGES-multi-po.md).

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
npm run po:gen           # regenerate the customer PO PDFs in demo/customer-pos/
npm run deploy           # deploy both
```

Per-app commands: `npm run <script> -w wecpq` (or `-w wesap`), e.g.
`npm run db:migrate:local -w wesap`.

After editing `demo/demo-seed-data.json`, run `npm run seed:gen` and commit
the regenerated SQL alongside it.

## Migrations (live databases)

`schema.sql` is the full schema for fresh installs. To upgrade a live
database without dropping it, apply the additive migrations in order, then
run the data reset to load the current demo data:

- WeCPQ: `migrations/0001_add_quote_terms.sql` (`npm run db:migrate-quote-terms:remote -w wecpq`)
- WeSAP: `migrations/0003_so_po_quote_unique.sql`,
  `0004_add_so_item_quote_sku.sql`, `0005_so_reject_case_billing_quote.sql`
  (`npm run db:migrate-so-po-quote-unique:remote -w wesap`, then
  `db:migrate-so-item-quote-sku:remote`, then `db:migrate-so-reject-case:remote`)
