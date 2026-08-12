-- Seed data for WeCPQ demo. Assumes a fresh schema (autoincrement starts at 1).

INSERT INTO customers (name, ref_id, industry, country, account_owner) VALUES
  ('Northbridge Systems', 'CUST-0001', 'MSP', 'United States', 'Alice Turner'),
  ('Datapoint Solutions', 'CUST-0002', 'SaaS', 'United Kingdom', 'Ben Carter'),
  ('Meridian IT Group', 'CUST-0003', 'Systems Integration', 'Germany', 'Clara Nguyen'),
  ('Cirrus Cloud Services', 'CUST-0004', 'Cloud Hosting', 'Canada', 'David Kim'),
  ('Vertex Software Labs', 'CUST-0005', 'SaaS', 'Ireland', 'Emma Ross'),
  ('Harbor Networks', 'CUST-0006', 'Cybersecurity Reseller', 'Australia', 'Frank Lopez'),
  ('Solstice Data Group', 'CUST-0007', 'MSP', 'Netherlands', 'Grace Patel'),
  ('Apex Managed IT', 'CUST-0008', 'MSP', 'United States', 'Henry Wall');

-- Northbridge Systems (customer_id 1)
INSERT INTO quotes (ref, customer_id, vendor, status, margin_pct, subtotal, total_amount) VALUES
  ('Q-2026-0001', 1, 'Fortinet', 'Won', 15, 4600.00, 5290.00),
  ('Q-2026-0002', 1, 'Cisco', 'Draft', 20, 12600.00, 15120.00);

-- Datapoint Solutions (customer_id 2)
INSERT INTO quotes (ref, customer_id, vendor, status, margin_pct, subtotal, total_amount) VALUES
  ('Q-2026-0003', 2, 'Microsoft', 'Sent', 12, 3450.00, 3864.00),
  ('Q-2026-0004', 2, 'CrowdStrike', 'Lost', 18, 6500.00, 7670.00);

-- Meridian IT Group (customer_id 3)
INSERT INTO quotes (ref, customer_id, vendor, status, margin_pct, subtotal, total_amount) VALUES
  ('Q-2026-0005', 3, 'Palo Alto Networks', 'Won', 10, 14500.00, 15950.00),
  ('Q-2026-0006', 3, 'Veeam', 'Draft', 25, 9200.00, 11500.00);

-- Cirrus Cloud Services (customer_id 4)
INSERT INTO quotes (ref, customer_id, vendor, status, margin_pct, subtotal, total_amount) VALUES
  ('Q-2026-0007', 4, 'Zscaler', 'Sent', 15, 16000.00, 18400.00),
  ('Q-2026-0008', 4, 'Check Point', 'Lost', 20, 4900.00, 5880.00);

-- Vertex Software Labs (customer_id 5)
INSERT INTO quotes (ref, customer_id, vendor, status, margin_pct, subtotal, total_amount) VALUES
  ('Q-2026-0009', 5, 'Microsoft', 'Draft', 30, 7150.00, 9295.00),
  ('Q-2026-0010', 5, 'Fortinet', 'Won', 12, 5200.00, 5824.00);

-- Harbor Networks (customer_id 6)
INSERT INTO quotes (ref, customer_id, vendor, status, margin_pct, subtotal, total_amount) VALUES
  ('Q-2026-0011', 6, 'CrowdStrike', 'Sent', 15, 17000.00, 19550.00),
  ('Q-2026-0012', 6, 'Cisco', 'Draft', 18, 9900.00, 11682.00);

-- Solstice Data Group (customer_id 7)
INSERT INTO quotes (ref, customer_id, vendor, status, margin_pct, subtotal, total_amount) VALUES
  ('Q-2026-0013', 7, 'Veeam', 'Lost', 22, 10080.00, 12297.60),
  ('Q-2026-0014', 7, 'Palo Alto Networks', 'Sent', 14, 4250.00, 4845.00);

-- Apex Managed IT (customer_id 8)
INSERT INTO quotes (ref, customer_id, vendor, status, margin_pct, subtotal, total_amount) VALUES
  ('Q-2026-0015', 8, 'Check Point', 'Draft', 20, 8760.00, 10512.00),
  ('Q-2026-0016', 8, 'Zscaler', 'Won', 16, 22100.00, 25636.00);

-- Line items (quote_id matches insertion order above, 1..16)
INSERT INTO quote_items (quote_id, sku, description, quantity, unit_price, line_total) VALUES
  (1, 'FG-100F', 'FortiGate 100F Firewall Appliance', 2, 1850.00, 3700.00),
  (1, 'FC-247-1Y', 'FortiCare 24x7 Support (1yr)', 2, 450.00, 900.00),

  (2, 'C9300-24T', 'Cisco Catalyst 9300 Switch', 3, 4200.00, 12600.00),

  (3, 'M365-E5-ANN', 'Microsoft 365 E5 License (annual)', 50, 57.00, 2850.00),
  (3, 'MDE-P2', 'Microsoft Defender for Endpoint P2', 50, 12.00, 600.00),

  (4, 'CS-FAL-XDR', 'CrowdStrike Falcon Insight XDR (annual, per endpoint)', 100, 65.00, 6500.00),

  (5, 'PA-440', 'PA-440 Next-Gen Firewall', 4, 2100.00, 8400.00),
  (5, 'PA-TP-1Y', 'Threat Prevention Subscription (1yr)', 4, 650.00, 2600.00),
  (5, 'PS-DEPLOY', 'Professional Services - Deployment', 20, 175.00, 3500.00),

  (6, 'VBR-ENT-PLUS', 'Veeam Backup & Replication Enterprise Plus (per socket)', 8, 1150.00, 9200.00),

  (7, 'ZIA-BIZ-ANN', 'Zscaler Internet Access Business (per user, annual)', 200, 42.00, 8400.00),
  (7, 'ZPA-BIZ-ANN', 'Zscaler Private Access Business (per user, annual)', 200, 38.00, 7600.00),

  (8, 'CP-QS1590', 'Check Point Quantum Spark 1590 Appliance', 5, 980.00, 4900.00),

  (9, 'AZ-D4SV5-1Y', 'Microsoft Azure Reserved Instance - D4s v5 (1yr)', 10, 620.00, 6200.00),
  (9, 'AZ-BACKUP-TB', 'Azure Backup Storage (per TB, annual)', 10, 95.00, 950.00),

  (10, 'FAZ-200G', 'FortiAnalyzer 200G', 1, 5200.00, 5200.00),

  (11, 'CS-FAL-COMPLETE', 'CrowdStrike Falcon Complete (per endpoint, annual)', 150, 85.00, 12750.00),
  (11, 'CS-FAL-DISCOVER', 'CrowdStrike Falcon Discover', 150, 15.00, 2250.00),
  (11, 'PS-ONBOARD', 'Onboarding & Training Services', 10, 200.00, 2000.00),

  (12, 'MX85-HW', 'Cisco Meraki MX85 Security Appliance', 6, 1650.00, 9900.00),

  (13, 'VONE-MON', 'Veeam ONE Monitoring (per socket)', 6, 480.00, 2880.00),
  (13, 'VB365-ANN', 'Veeam Backup for Microsoft 365 (per user, annual)', 300, 24.00, 7200.00),

  (14, 'PRISMA-ENT', 'Prisma Cloud Enterprise Edition (per credit)', 500, 8.50, 4250.00),

  (15, 'CP-HARM-EP', 'Check Point Harmony Endpoint (per seat, annual)', 120, 55.00, 6600.00),
  (15, 'CP-HARM-EMAIL', 'Check Point Harmony Email & Collaboration', 120, 18.00, 2160.00),

  (16, 'ZIA-TRANS-ANN', 'Zscaler Internet Access Transformation (per user, annual)', 250, 48.00, 12000.00),
  (16, 'ZDX', 'Zscaler Digital Experience', 250, 10.00, 2500.00),
  (16, 'PS-MIGRATE', 'Deployment & Migration Services', 40, 190.00, 7600.00);
