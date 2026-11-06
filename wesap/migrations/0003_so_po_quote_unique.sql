-- Multi-PO intake: at most one non-Rejected sales order per customer PO +
-- WeCPQ quote pair, so a retried UiPath call can't create a duplicate order
-- (POST /api/sales-orders returns 409 instead). Additive/incremental — run
-- against an existing database, does not drop or recreate any table.
-- schema.sql already has this index for fresh installs. Fails if the live
-- DB already holds duplicate pairs (the seeded data has none).

CREATE UNIQUE INDEX idx_so_po_quote ON sales_orders(customer_po_number, source_quote_ref) WHERE status != 'Rejected' AND customer_po_number IS NOT NULL AND source_quote_ref IS NOT NULL;
