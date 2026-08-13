-- WeCPQ data reset — wipes all data tables and reseeds from the shared
-- demo dataset (./seed/demo-seed-data.json). Data rows only: no DROP/CREATE/ALTER.
-- Safe to run repeatedly: fixed IDs/refs make this idempotent.
--
-- Run against the deployed DB:
--   wrangler d1 execute <wecpq_db> --remote --file ./reset.sql

PRAGMA defer_foreign_keys=TRUE;
BEGIN;

DELETE FROM quote_items;
DELETE FROM quotes;
DELETE FROM customers;
DELETE FROM sqlite_sequence;

-- Customers (from demo-seed-data.json .customers; credit_limit dropped, WeSAP-only)
INSERT INTO customers (id, name, ref_id, industry, country, account_owner) VALUES
  (1, 'Northbridge Systems', 'CUST-0001', 'MSP', 'United States', 'Alice Turner'),
  (2, 'Datapoint Solutions', 'CUST-0002', 'SaaS', 'United Kingdom', 'Ben Carter'),
  (3, 'Meridian IT Group', 'CUST-0003', 'Systems Integration', 'Germany', 'Clara Nguyen'),
  (4, 'Cirrus Cloud Services', 'CUST-0004', 'Cloud Hosting', 'Canada', 'David Kim'),
  (5, 'Vertex Software Labs', 'CUST-0005', 'SaaS', 'Ireland', 'Emma Ross'),
  (6, 'Harbor Networks', 'CUST-0006', 'Cybersecurity Reseller', 'Australia', 'Frank Lopez'),
  (7, 'Solstice Data Group', 'CUST-0007', 'MSP', 'Netherlands', 'Grace Patel'),
  (8, 'Apex Managed IT', 'CUST-0008', 'MSP', 'United States', 'Henry Wall'),
  (9, 'Ironclad Security Partners', 'CUST-0009', 'Cybersecurity Reseller', 'France', 'Clara Nguyen'),
  (10, 'Blue Harbor Analytics', 'CUST-0010', 'Data Analytics', 'Italy', 'Emma Ross'),
  (11, 'Northwind Technologies', 'CUST-0011', 'IT Consulting', 'Poland', 'Ben Carter'),
  (12, 'Silverline Cloud Co', 'CUST-0012', 'Cloud Hosting', 'Portugal', 'David Kim'),
  (13, 'Kestrel Digital', 'CUST-0013', 'Digital Services', 'United Kingdom', 'Alice Turner'),
  (14, 'Onyx Infrastructure', 'CUST-0014', 'Systems Integration', 'Germany', 'Frank Lopez'),
  (15, 'Beacon Systems Group', 'CUST-0015', 'Managed Security', 'Netherlands', 'Grace Patel');

-- Quotes (from demo-seed-data.json .wecpq.quotes)
INSERT INTO quotes (id, ref, customer_id, vendor, status, margin_pct, subtotal, total_amount) VALUES
  (1, 'Q-2026-0001', 1, 'Fortinet', 'Won', 15, 4600, 5290.0),
  (2, 'Q-2026-0002', 1, 'Cisco', 'Draft', 20, 12600, 15120.0),
  (3, 'Q-2026-0003', 2, 'Microsoft', 'Won', 12, 3450, 3864.0),
  (4, 'Q-2026-0004', 2, 'Zscaler', 'Sent', 15, 12000, 13800.0),
  (5, 'Q-2026-0005', 3, 'Palo Alto Networks', 'Won', 10, 14500, 15950.0),
  (6, 'Q-2026-0006', 3, 'Veeam', 'Draft', 25, 6900, 8625.0),
  (7, 'Q-2026-0007', 4, 'Zscaler', 'Won', 15, 16000, 18400.0),
  (8, 'Q-2026-0008', 4, 'Check Point', 'Lost', 20, 4900, 5880.0),
  (9, 'Q-2026-0009', 5, 'CrowdStrike', 'Won', 18, 8950, 10561.0),
  (10, 'Q-2026-0010', 5, 'Microsoft', 'Draft', 30, 1710, 2223.0),
  (11, 'Q-2026-0011', 6, 'CrowdStrike', 'Won', 15, 13000, 14950.0),
  (12, 'Q-2026-0012', 6, 'Cisco', 'Sent', 18, 6600, 7788.0),
  (13, 'Q-2026-0013', 7, 'Veeam', 'Won', 14, 51000, 58140.0),
  (14, 'Q-2026-0014', 8, 'Check Point', 'Sent', 20, 5880, 7056.0),
  (15, 'Q-2026-0015', 9, 'Palo Alto Networks', 'Won', 16, 62700, 72732.0),
  (16, 'Q-2026-0016', 10, 'Zscaler', 'Sent', 15, 12600, 14490.0),
  (17, 'Q-2026-0017', 12, 'Fortinet', 'Won', 12, 10750, 12040.0),
  (18, 'Q-2026-0018', 14, 'Cisco', 'Draft', 18, 20100, 23718.0),
  (19, 'Q-2026-0019', 13, 'Microsoft', 'Lost', 16, 5130, 5950.8),
  (20, 'Q-2026-0020', 11, 'Check Point', 'Sent', 17, 6600, 7722.0);

-- Quote line items (from demo-seed-data.json .wecpq.quote_items)
INSERT INTO quote_items (id, quote_id, sku, description, quantity, unit_price, line_total) VALUES
  (1, 1, 'FG-100F', 'FortiGate 100F Firewall Appliance', 2, 1850, 3700),
  (2, 1, 'FC-247-1Y', 'FortiCare 24x7 Support (1yr)', 2, 450, 900),
  (3, 2, 'C9300-24T', 'Cisco Catalyst 9300 Switch', 3, 4200, 12600),
  (4, 3, 'M365-E5-ANN', 'Microsoft 365 E5 License (annual)', 50, 57, 2850),
  (5, 3, 'MDE-P2', 'Microsoft Defender for Endpoint P2', 50, 12, 600),
  (6, 4, 'ZIA-BIZ-ANN', 'Zscaler Internet Access Business (per user, annual)', 150, 42, 6300),
  (7, 4, 'ZPA-BIZ-ANN', 'Zscaler Private Access Business (per user, annual)', 150, 38, 5700),
  (8, 5, 'PA-440', 'PA-440 Next-Gen Firewall', 4, 2100, 8400),
  (9, 5, 'PA-TP-1Y', 'Threat Prevention Subscription (1yr)', 4, 650, 2600),
  (10, 5, 'PS-DEPLOY', 'Professional Services - Deployment', 20, 175, 3500),
  (11, 6, 'VBR-ENT-PLUS', 'Veeam Backup & Replication Enterprise Plus (per socket)', 6, 1150, 6900),
  (12, 7, 'ZIA-BIZ-ANN', 'Zscaler Internet Access Business (per user, annual)', 200, 42, 8400),
  (13, 7, 'PS-MIGRATE', 'Deployment & Migration Services', 40, 190, 7600),
  (14, 8, 'CP-QS1590', 'Check Point Quantum Spark 1590 Appliance', 5, 980, 4900),
  (15, 9, 'CS-FAL-COMPLETE', 'CrowdStrike Falcon Complete (per endpoint, annual)', 100, 85, 8500),
  (16, 9, 'FC-247-1Y', 'FortiCare 24x7 Support (1yr)', 1, 450, 450),
  (17, 10, 'M365-E5-ANN', 'Microsoft 365 E5 License (annual)', 30, 57, 1710),
  (18, 11, 'CS-FAL-XDR', 'CrowdStrike Falcon Insight XDR (annual, per endpoint)', 200, 65, 13000),
  (19, 12, 'MX85-HW', 'Cisco Meraki MX85 Security Appliance', 4, 1650, 6600),
  (20, 13, 'VBR-ENT-PLUS', 'Veeam Backup & Replication Enterprise Plus (per socket)', 40, 1150, 46000),
  (21, 13, 'PS-ONBOARD', 'Onboarding & Training Services', 25, 200, 5000),
  (22, 14, 'CP-QS1590', 'Check Point Quantum Spark 1590 Appliance', 6, 980, 5880),
  (23, 15, 'PA-440', 'PA-440 Next-Gen Firewall', 28, 2100, 58800),
  (24, 15, 'PA-TP-1Y', 'Threat Prevention Subscription (1yr)', 6, 650, 3900),
  (25, 16, 'ZIA-BIZ-ANN', 'Zscaler Internet Access Business (per user, annual)', 300, 42, 12600),
  (26, 17, 'FG-100F', 'FortiGate 100F Firewall Appliance', 3, 1850, 5550),
  (27, 17, 'FAZ-200G', 'FortiAnalyzer 200G', 1, 5200, 5200),
  (28, 18, 'C9300-24T', 'Cisco Catalyst 9300 Switch', 4, 4200, 16800),
  (29, 18, 'MX85-HW', 'Cisco Meraki MX85 Security Appliance', 2, 1650, 3300),
  (30, 19, 'M365-E5-ANN', 'Microsoft 365 E5 License (annual)', 90, 57, 5130),
  (31, 20, 'CP-HARM-EP', 'Check Point Harmony Endpoint (per seat, annual)', 120, 55, 6600);


COMMIT;
