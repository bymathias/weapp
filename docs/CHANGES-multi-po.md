# Multi-PO / multi-quote support: changes for the PDF guides

Input for updating `docs/WeCPQ-WeSAP-Demo-Scenarios-Guide.pdf`,
`…-Manual-As-Is-Processes-and-Exceptions.pdf` and
`…-Process-Automation-Playbook.pdf` (not generated from this repo). Source
of truth for all figures: `demo/demo-seed-data.json`.

## 1. Changed figures in existing scenarios

**Why they changed:** quotes now show **customer prices per line**: the
margin is applied to each line (`sell_unit_price = round2(unit_price × (1 +
margin_pct/100))`), and `total_amount` is the sum of the customer line
totals. The customer-facing quote PDF no longer shows the cost subtotal or a
margin line, so customer POs now repeat the customer prices and the margin
reaches the sales order. No stored quote total changed (per-line rounding
gives the same totals for every seeded quote).

### Scenario figures

| Scenario | Figure | Old | New |
|---|---|---|---|
| MATCH (live bridge, clean): Meridian Q-2026-0005 | Value / sample PO total (MIG-PO-2026-0457) | €14,500 | **€15,950** (= quote total; still within the €80,000 limit) |
| | PO unit prices: PA-440 / Threat Prevention / Prof. Services | 2,100 / 650 / 175 | **2,310 / 715 / 192.50** |
| MISMATCH (agent): Vertex Q-2026-0009 | Falcon Complete, PO vs quote | 110 vs 85 | **110 vs 100.30** (still a price mismatch) |
| | FortiCare line on the PO | 450 | **531** (= quote customer price; still no WeSAP material) |
| | Sample PO total (VSL-PO-71208) | €11,450 | **€11,531** |
| MISMATCH + CREDIT BLOCK: Ironclad Q-2026-0015 | PO unit prices: PA-440 / Threat Prevention | 2,100 / 650 | **2,436 / 754** |
| | Sample PO total (ICP-2026-PO-0311, 30 firewalls) | €66,900 | **€77,604** |
| | Order value as quoted (28 firewalls) | €58,800 (guide) | **€72,732**; still exceeds the €40,000 limit → Blocked (Credit) |
| BLOCKED (credit, pre-seeded): SO 1000000005 Solstice | Order vs limit | €51,000 vs €45,000 | **€58,140 vs €45,000** (still Blocked (Credit) on load) |
| MATCH (completed): SO 1000000001 Northbridge | SO total / billing 9000000001 / payment 7000000002 | €4,600 | **€5,290** |
| Baseline: SO 1000000002 Datapoint (Delivered) | SO total | €3,450 | **€3,864** |
| Baseline: SO 1000000003 Cirrus (Billed) | SO total / billing 9000000002 | €16,000 | **€18,400** |
| Baseline: SO 1000000004 Harbor (Open) | SO total | €13,000 | **€14,950** |
| Baseline: SO 1000000006 Silverline (Delivered) | SO total | €10,750 | **€12,040** |

The quote totals themselves are unchanged (e.g. Q-2026-0005 is still
€15,950, Q-2026-0015 €72,732). On the quote PDF the line prices now show the
customer prices, and the "Subtotal" and "Margin (x%)" lines are gone: only
"Total (EUR)" remains.

Seeded SO line prices now equal their source quote's customer prices, and
every seeded SO line carries the `quote_sku` of its quote line. No credit
limit was changed. P2P scenarios (PO/GR/invoice 4500000001…, 5100000002,
5100000004, …) are unchanged.

### New quote fields on existing quotes

- Every quote now shows **Currency** (all seeded: EUR), **Valid Until** and
  **Payment Terms**, on the quote page and in the quote PDF header.
- Seeded quotes now have fixed creation dates (2026-09-01 … 2026-09-29, in
  ref order) and a validity of 90 days (Q-2026-0005 valid until
  2026-12-06, Q-2026-0009 until 2026-12-12, Q-2026-0015 until 2026-12-21).
  **Demos after those dates will show these quotes as expired.**
- Payment terms match the sample POs: Meridian Net 30, Vertex Net 45,
  Ironclad Net 30.

### UI changes the guides may show

- WeCPQ quote page: terms line (Currency · Valid until [Expired badge] ·
  Payment terms), two new last columns "Customer Unit Price" / "Customer
  Line Total". **Download PDF** now downloads the file (no new tab).
- WeCPQ quote form: Currency, Payment Terms and Valid Until fields.
- WeSAP sales order page: "Intake Case" facet, "Quote SKU" last column, a
  **Reject** action (reason + button) for Open / Blocked (Credit) orders,
  and a Rejected banner with the reason. **Download PDF** downloads.
- WeSAP billing: "Source Quote" facet and last list column.
- WeSAP purchase order page: **Download PDF** downloads.
- All PDFs: long text wraps, long documents paginate with "Page n of N".

## 2. New scenarios

All quotes below are **Won with no sales order** on load. One WeSAP sales
order is created per **PO–quote pair**.

| Type / handler | Trigger records | Expected outcome |
|---|---|---|
| SPLIT ORDER, clean / Robot | Q-2026-0023 (Beacon Systems Group, CUST-0015, CrowdStrike: 200 × CS-FAL-PREV @ €51.75, 100 × CS-FAL-ITP @ €66.70 = €17,020; limit €50,000). POs `PO_Beacon_Q-2026-0023_A.pdf` (BSG-PO-2026-1041: 120 + 60 = €10,212) and `_B.pdf` (BSG-PO-2026-1042: 80 + 40 = €6,808) | Two SOs (BSG-PO-2026-1041 + Q-2026-0023, BSG-PO-2026-1042 + Q-2026-0023), both Open. A + B equal the quoted quantities exactly; `ordered-quantities` = 200 / 100 |
| SPLIT ORDER, over-ordered / Agent → People | Q-2026-0023 + `PO_Beacon_Q-2026-0023_C.pdf` (BSG-PO-2026-1057: 100 + 50 = €8,510) | After A: A + C = 220 / 110 vs 200 / 100 quoted. Agent reads `GET /api/sales-orders/ordered-quantities?source_quote_ref=Q-2026-0023`, flags the excess and hands over to a person. Credit is not the blocker |
| MULTI-PO PDF / Robot (idempotent) | `PO_Beacon_Q-2026-0023_A+B.pdf`: BSG-PO-2026-1041 and BSG-PO-2026-1042 in one file (one page each) | Bot extracts both POs and creates two SOs. If they already exist (e.g. the single files were processed first), each call returns **409 duplicate** with the existing `so_number`, and nothing is created twice |
| 1 PO → 2 QUOTES / Robot | Q-2026-0021 (Onyx Infrastructure, CUST-0014, Fortinet, €26,790) + Q-2026-0022 (Onyx, Microsoft, €8,870.40); `PO_Onyx_Q-2026-0021+0022.pdf` (ONX-PO-2026-0193, Net 45, a quote ref on every line, €35,660.40) | Two SOs: ONX-PO-2026-0193 + Q-2026-0021 and ONX-PO-2026-0193 + Q-2026-0022, both Open (€35,660.40 within the €85,000 limit) |
| EXPIRED QUOTE / Agent → People | Q-2026-0024 (Kestrel Digital, CUST-0013, Veeam, €4,389.60, created 2026-06-15, **valid until 2026-07-15**); `PO_Kestrel_Q-2026-0024.pdf` (KD-PO-5523, dated 2026-10-28, prices and quantities match) | Agent flags the expired quote; a person re-quotes or approves the old prices. No SO until then |

## 3. API changes (all backward compatible)

### WeSAP

- `GET /api/sales-orders`: optional exact-match query filters
  `customer_po_number`, `source_quote_ref`, `customer_ref` (customer
  `ref_id`), `status`, `intake_case_id` (AND-combined). No params = previous
  behaviour.
- `POST /api/sales-orders`:
  - New optional `intake_case_id` (UiPath Case ID) and per-item `quote_sku`.
  - New **409** `{ "error": "duplicate", "message", "so_number" }` when a
    non-Rejected SO already exists for the same `customer_po_number` +
    `source_quote_ref` (also enforced by the unique index `idx_so_po_quote`).
  - The UI "New Sales Order" form applies the same rule and shows an error.
- New `GET /api/sales-orders/ordered-quantities?source_quote_ref=…`:
  `{ source_quote_ref, lines: [{ quote_sku, ordered_qty }], unlinked_qty,
  sales_orders: [{ so_number, customer_po_number, status }] }` over
  non-Rejected orders.
- New `POST /api/sales-orders/{so_number}/reject`, optional body
  `{ "reason" }`. Allowed from `Open` / `Blocked (Credit)`; otherwise `400
  invalid_state`, or `409 locked` if Paid.
- Sales order status enum gains **`Rejected`**. Sales orders gain
  `reject_reason` and `intake_case_id` (nullable). SO items gain `quote_sku`
  (nullable). Billing documents gain `source_quote_ref` (nullable, copied
  from the SO).
- Credit exposure now excludes `Rejected` orders. `Blocked (Credit)` orders
  still count.
- `GET /api/sales-orders/{so_number}/pdf` and
  `GET /api/purchase-orders/{po_number}/pdf`: optional `?download=1` →
  `Content-Disposition: attachment` (default stays `inline`).

### WeCPQ

- Quotes gain `currency` (`EUR` | `USD` | `GBP`), `valid_until` (ISO date)
  and `payment_terms`. These are always returned, and optional on create
  (defaults: EUR, created date + 30 days, Net 30) and on update (omitted =
  unchanged).
- Quote items gain the computed `sell_unit_price` and `sell_line_total`.
  `total_amount` = sum of `sell_line_total`; `subtotal` stays the cost
  subtotal.
- `GET /api/quotes/{ref}/pdf`: optional `?download=1` → attachment. The PDF
  shows the customer prices and only the Total, has currency / valid until /
  payment terms in the header, and paginates without truncation.

### Database / deployment

- WeCPQ `migrations/0001_add_quote_terms.sql`.
- WeSAP `migrations/0003_so_po_quote_unique.sql`,
  `0004_add_so_item_quote_sku.sql`, `0005_so_reject_case_billing_quote.sql`
  (rebuilds `sales_orders` for the new status CHECK).
- After migrating a live DB, run the data reset to load the new figures and
  quotes.
