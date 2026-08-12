-- PO-driven O2C: carry the customer's own Purchase Order number (and the
-- WeCPQ quote it traces back to) from the sales order through to billing.
-- Additive/incremental — run against an existing database, does not drop
-- or recreate any table. schema.sql already has these columns for fresh
-- installs; this file is for applying the same change to a live DB.

ALTER TABLE sales_orders ADD COLUMN customer_po_number TEXT;
ALTER TABLE billing_documents ADD COLUMN customer_po_number TEXT;

-- Backfill the existing seeded sales orders / billing documents so demo
-- data stays consistent with seed.sql without a full reseed.
UPDATE sales_orders SET customer_po_number = 'PO-NORTHBRIDGE-2026-0142', source_quote_ref = 'Q-2026-0002' WHERE so_number = '1000000001';
UPDATE sales_orders SET customer_po_number = 'DPS-PO-88231', source_quote_ref = 'Q-2026-0004' WHERE so_number = '1000000002';
UPDATE sales_orders SET customer_po_number = 'PO-MERIDIAN-4471', source_quote_ref = 'Q-2026-0006' WHERE so_number = '1000000003';
UPDATE sales_orders SET customer_po_number = 'CCS2026-0219', source_quote_ref = 'Q-2026-0008' WHERE so_number = '1000000004';
UPDATE sales_orders SET customer_po_number = 'APEX-PO-2026-056', source_quote_ref = 'Q-2026-0009' WHERE so_number = '1000000005';
UPDATE sales_orders SET customer_po_number = 'SDG-PO-30187', source_quote_ref = 'Q-2026-0010' WHERE so_number = '1000000006';
UPDATE sales_orders SET customer_po_number = 'HN-2026-PO-0088' WHERE so_number = '1000000007';

UPDATE billing_documents SET customer_po_number = 'PO-NORTHBRIDGE-2026-0142' WHERE bill_number = '9000000001';
UPDATE billing_documents SET customer_po_number = 'CCS2026-0219' WHERE bill_number = '9000000002';
