-- Quote-line traceability: the WeCPQ quote line SKU each sales order line
-- came from (powers GET /api/sales-orders/ordered-quantities).
-- Additive/incremental — run against an existing database, does not drop
-- or recreate any table. schema.sql already has this column for fresh
-- installs; this file is for applying the same change to a live DB.

ALTER TABLE so_items ADD COLUMN quote_sku TEXT;

-- Backfill the existing seeded sales order lines so demo data stays
-- consistent with seed.sql without a full reseed.
UPDATE so_items SET quote_sku = 'FG-100F' WHERE so_id = (SELECT id FROM sales_orders WHERE so_number = '1000000001') AND description = 'FortiGate 100F Firewall Appliance';
UPDATE so_items SET quote_sku = 'FC-247-1Y' WHERE so_id = (SELECT id FROM sales_orders WHERE so_number = '1000000001') AND description = 'FortiCare 24x7 Support (1yr)';
UPDATE so_items SET quote_sku = 'M365-E5-ANN' WHERE so_id = (SELECT id FROM sales_orders WHERE so_number = '1000000002') AND description = 'Microsoft 365 E5 License (annual)';
UPDATE so_items SET quote_sku = 'MDE-P2' WHERE so_id = (SELECT id FROM sales_orders WHERE so_number = '1000000002') AND description = 'Microsoft Defender for Endpoint P2';
UPDATE so_items SET quote_sku = 'ZIA-BIZ-ANN' WHERE so_id = (SELECT id FROM sales_orders WHERE so_number = '1000000003') AND description = 'Zscaler Internet Access Business (per user, annual)';
UPDATE so_items SET quote_sku = 'PS-MIGRATE' WHERE so_id = (SELECT id FROM sales_orders WHERE so_number = '1000000003') AND description = 'Deployment & Migration Services';
UPDATE so_items SET quote_sku = 'CS-FAL-XDR' WHERE so_id = (SELECT id FROM sales_orders WHERE so_number = '1000000004') AND description = 'CrowdStrike Falcon Insight XDR (annual, per endpoint)';
UPDATE so_items SET quote_sku = 'VBR-ENT-PLUS' WHERE so_id = (SELECT id FROM sales_orders WHERE so_number = '1000000005') AND description = 'Veeam Backup & Replication Enterprise Plus (per socket)';
UPDATE so_items SET quote_sku = 'PS-ONBOARD' WHERE so_id = (SELECT id FROM sales_orders WHERE so_number = '1000000005') AND description = 'Onboarding & Training Services';
UPDATE so_items SET quote_sku = 'FG-100F' WHERE so_id = (SELECT id FROM sales_orders WHERE so_number = '1000000006') AND description = 'FortiGate 100F Firewall Appliance';
UPDATE so_items SET quote_sku = 'FAZ-200G' WHERE so_id = (SELECT id FROM sales_orders WHERE so_number = '1000000006') AND description = 'FortiAnalyzer 200G';
