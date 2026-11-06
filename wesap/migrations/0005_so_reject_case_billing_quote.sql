-- Sales order Rejected status, reject reason and UiPath intake Case ID;
-- source quote ref carried onto billing documents.
--
-- SQLite cannot ALTER a CHECK constraint, so sales_orders is rebuilt
-- (create new, copy, drop old, rename, recreate indexes). so_items,
-- deliveries and billing_documents reference sales_orders by name, so
-- their foreign keys point at the rebuilt table once it is renamed.
-- defer_foreign_keys postpones FK checks to the end of the batch, as D1
-- requires for this pattern (D1 runs the whole --file as one transaction).
-- No data is dropped: every existing row and id is copied as-is.
-- schema.sql already has the full result for fresh installs; this file is
-- for applying the same change to a live DB.

PRAGMA defer_foreign_keys = true;

CREATE TABLE sales_orders_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  so_number TEXT NOT NULL UNIQUE,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  status TEXT NOT NULL CHECK (status IN ('Open', 'Blocked (Credit)', 'Released', 'Delivered', 'Billed', 'Paid', 'Rejected')) DEFAULT 'Open',
  source_quote_ref TEXT,
  customer_po_number TEXT,
  total_amount REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  reject_reason TEXT,
  intake_case_id TEXT
);

INSERT INTO sales_orders_new (id, so_number, customer_id, status, source_quote_ref, customer_po_number, total_amount, created_at)
  SELECT id, so_number, customer_id, status, source_quote_ref, customer_po_number, total_amount, created_at FROM sales_orders;

DROP TABLE sales_orders;
ALTER TABLE sales_orders_new RENAME TO sales_orders;

CREATE INDEX idx_sales_orders_customer_id ON sales_orders(customer_id);
CREATE UNIQUE INDEX idx_so_po_quote ON sales_orders(customer_po_number, source_quote_ref) WHERE status != 'Rejected' AND customer_po_number IS NOT NULL AND source_quote_ref IS NOT NULL;

PRAGMA defer_foreign_keys = false;

ALTER TABLE billing_documents ADD COLUMN source_quote_ref TEXT;

-- Backfill from the sales order each billing document was created from.
UPDATE billing_documents SET source_quote_ref = (SELECT so.source_quote_ref FROM sales_orders so WHERE so.id = billing_documents.so_id);
