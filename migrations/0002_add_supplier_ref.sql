-- Supplier Ref: the vendor's own invoice number (e.g. FTNT-2026-4471),
-- captured on Register Supplier Invoice. Additive/incremental — run
-- against an existing database, does not drop or recreate any table.
-- schema.sql already has this column for fresh installs; this file is
-- for applying the same change to a live DB. Existing rows keep NULL.

ALTER TABLE supplier_invoices ADD COLUMN supplier_ref TEXT;
