-- Seed data for WeSAP demo. Assumes a fresh schema (autoincrement starts at 1).
-- Deterministic insertion order — re-running migrate + this file always
-- yields the same IDs/numbers.

INSERT INTO company_code (code, name) VALUES ('1000', 'WeSAP AG');

-- Customers mirror WeCPQ's seed exactly (same ref_ids) so the WeCPQ -> UiPath
-- -> WeSAP bridge demo resolves the same customer on both sides.
INSERT INTO customers (name, ref_id, industry, country, account_owner, credit_limit) VALUES
  ('Northbridge Systems', 'CUST-0001', 'MSP', 'United States', 'Alice Turner', 60000),
  ('Datapoint Solutions', 'CUST-0002', 'SaaS', 'United Kingdom', 'Ben Carter', 40000),
  ('Meridian IT Group', 'CUST-0003', 'Systems Integration', 'Germany', 'Clara Nguyen', 80000),
  ('Cirrus Cloud Services', 'CUST-0004', 'Cloud Hosting', 'Canada', 'David Kim', 50000),
  ('Vertex Software Labs', 'CUST-0005', 'SaaS', 'Ireland', 'Emma Ross', 35000),
  ('Harbor Networks', 'CUST-0006', 'Cybersecurity Reseller', 'Australia', 'Frank Lopez', 90000),
  ('Solstice Data Group', 'CUST-0007', 'MSP', 'Netherlands', 'Grace Patel', 45000),
  ('Apex Managed IT', 'CUST-0008', 'MSP', 'United States', 'Henry Wall', 30000);

INSERT INTO vendors (name, ref_id) VALUES
  ('Fortinet', 'VEND-0001'),
  ('Cisco', 'VEND-0002'),
  ('Palo Alto Networks', 'VEND-0003'),
  ('Check Point', 'VEND-0004'),
  ('CrowdStrike', 'VEND-0005'),
  ('Microsoft', 'VEND-0006'),
  ('Veeam', 'VEND-0007'),
  ('Zscaler', 'VEND-0008');

-- Each vendor carries 5 materials so the PO form's vendor-scoped material
-- dropdown always has multiple choices.
INSERT INTO materials (material_code, description, vendor_id, standard_price, stock_qty) VALUES
  ('MAT-0001', 'FortiGate 100F Firewall Appliance', 1, 1850.00, 25),
  ('MAT-0002', 'Cisco Catalyst 9300 Switch', 2, 4200.00, 15),
  ('MAT-0003', 'PA-440 Next-Gen Firewall', 3, 2100.00, 20),
  ('MAT-0004', 'Check Point Quantum Spark 1590 Appliance', 4, 980.00, 30),
  ('MAT-0005', 'CrowdStrike Falcon Insight XDR License (per endpoint)', 5, 65.00, 500),
  ('MAT-0006', 'Microsoft 365 E5 License (annual)', 6, 57.00, 1000),
  ('MAT-0007', 'Veeam Backup & Replication Enterprise Plus (per socket)', 7, 1150.00, 40),
  ('MAT-0008', 'Zscaler Internet Access Business (per user, annual)', 8, 42.00, 800),
  ('MAT-0009', 'Cisco Meraki MX85 Security Appliance', 2, 1650.00, 18),
  ('MAT-0010', 'FortiAnalyzer 200G', 1, 5200.00, 10),
  ('MAT-0011', 'PA-850 Next-Gen Firewall', 3, 6800.00, 12),
  ('MAT-0012', 'Check Point Harmony Endpoint License (per seat)', 4, 38.00, 600),
  ('MAT-0013', 'CrowdStrike Falcon Complete MDR (per endpoint)', 5, 110.00, 350),
  ('MAT-0014', 'Microsoft Defender for Endpoint P2 (per user)', 6, 24.00, 900),
  ('MAT-0015', 'Veeam ONE Monitoring & Analytics (per socket)', 7, 340.00, 60),
  ('MAT-0016', 'Zscaler Private Access Business (per user, annual)', 8, 48.00, 700),
  ('MAT-0017', 'FortiSwitch 448E-FPOE', 1, 3100.00, 14),
  ('MAT-0018', 'FortiClient EMS License (per endpoint)', 1, 22.00, 750),
  ('MAT-0019', 'FortiMail 200F Secure Email Gateway', 1, 4600.00, 8),
  ('MAT-0020', 'Cisco Identity Services Engine (ISE) License', 2, 95.00, 400),
  ('MAT-0021', 'Cisco Umbrella DNS Security (per user, annual)', 2, 28.00, 950),
  ('MAT-0022', 'Cisco Duo MFA (per user, annual)', 2, 18.00, 1200),
  ('MAT-0023', 'Prisma Access License (per user, annual)', 3, 72.00, 600),
  ('MAT-0024', 'Cortex XDR Pro (per endpoint)', 3, 85.00, 450),
  ('MAT-0025', 'GlobalProtect Subscription (per user, annual)', 3, 34.00, 700),
  ('MAT-0026', 'Check Point CloudGuard Network Security', 4, 5400.00, 9),
  ('MAT-0027', 'Check Point Harmony Email & Collaboration (per seat)', 4, 26.00, 850),
  ('MAT-0028', 'Check Point Quantum Maestro Orchestrator', 4, 12500.00, 4),
  ('MAT-0029', 'CrowdStrike Falcon Prevent (per endpoint)', 5, 45.00, 900),
  ('MAT-0030', 'CrowdStrike Falcon Identity Threat Protection (per user)', 5, 58.00, 500),
  ('MAT-0031', 'CrowdStrike Falcon Cloud Security (per workload)', 5, 130.00, 300),
  ('MAT-0032', 'Microsoft Sentinel (per GB ingested, monthly)', 6, 2.75, 5000),
  ('MAT-0033', 'Microsoft Entra ID P2 License (per user)', 6, 9.00, 1500),
  ('MAT-0034', 'Microsoft Intune License (per user)', 6, 8.00, 1500),
  ('MAT-0035', 'Veeam Backup for Microsoft 365 (per user)', 7, 4.00, 2000),
  ('MAT-0036', 'Veeam Recovery Orchestrator (per socket)', 7, 950.00, 30),
  ('MAT-0037', 'Veeam CDP for Continuous Data Protection (per VM)', 7, 210.00, 100),
  ('MAT-0038', 'Zscaler Digital Experience (per user, annual)', 8, 20.00, 900),
  ('MAT-0039', 'Zscaler Cloud Protection (per workload)', 8, 95.00, 250),
  ('MAT-0040', 'Zscaler Deception (per user, annual)', 8, 30.00, 600);

-- Purchase Orders -------------------------------------------------------------
-- PO1 (Fortinet): full happy path, invoiced+matched+paid.
-- PO2 (Cisco): received, invoice posted but not yet matched — live match+pay demo.
-- PO3 (Palo Alto): received, invoice over price tolerance — pre-blocked, release+pay demo.
-- PO4 (CrowdStrike): still Open — live full-cycle demo from scratch.
-- PO5 (Veeam): 2-way match (no GR), invoiced+matched+paid.
-- PO6 (Microsoft): still Open — live full-cycle demo from scratch.

INSERT INTO purchase_orders (po_number, vendor_id, status) VALUES
  ('4500000001', 1, 'Invoiced'),
  ('4500000002', 2, 'Received'),
  ('4500000003', 3, 'Invoiced'),
  ('4500000004', 5, 'Open'),
  ('4500000005', 7, 'Invoiced'),
  ('4500000006', 6, 'Open');

INSERT INTO po_items (po_id, material_id, qty, price, line_total) VALUES
  (1, 1, 5, 1850.00, 9250.00),
  (1, 10, 2, 5200.00, 10400.00),
  (2, 2, 3, 4200.00, 12600.00),
  (3, 3, 4, 2100.00, 8400.00),
  (4, 5, 100, 65.00, 6500.00),
  (5, 7, 8, 1150.00, 9200.00),
  (6, 6, 50, 57.00, 2850.00);

-- Goods Receipts -----------------------------------------------------------

INSERT INTO goods_receipts (gr_number, po_id, status) VALUES
  ('5000000001', 1, 'Posted'),
  ('5000000002', 2, 'Posted'),
  ('5000000003', 3, 'Posted');

INSERT INTO gr_items (gr_id, po_item_id, qty_received) VALUES
  (1, 1, 5),
  (1, 2, 2),
  (2, 3, 3),
  (3, 4, 4);

-- Supplier Invoices ---------------------------------------------------------
-- SI1 (against PO1): exact match -> Matched -> Paid.
-- SI2 (against PO3): price 2300 vs PO/GR price 2100 (+9.5%, over 5% tolerance)
--   -> pre-seeded Blocked, ready for Release -> Pay.
-- SI3 (against PO5): 2-way match (PO5 has no GR), exact -> Matched -> Paid.
-- SI4 (against PO2): exact match but not yet matched -> live Match + Pay demo.

INSERT INTO supplier_invoices (inv_number, po_id, vendor_id, amount, status, block_reason) VALUES
  ('5100000001', 1, 1, 19650.00, 'Paid', NULL),
  ('5100000002', 3, 3, 9200.00, 'Blocked', 'Line 1: invoice price 2300.00 vs PO price 2100.00 exceeds 5% tolerance'),
  ('5100000003', 5, 7, 9200.00, 'Paid', NULL),
  ('5100000004', 2, 2, 12600.00, 'Invoiced', NULL);

INSERT INTO si_items (si_id, po_item_id, qty, price, line_total) VALUES
  (1, 1, 5, 1850.00, 9250.00),
  (1, 2, 2, 5200.00, 10400.00),
  (2, 4, 4, 2300.00, 9200.00),
  (3, 6, 8, 1150.00, 9200.00),
  (4, 3, 3, 4200.00, 12600.00);

-- Sales Orders ----------------------------------------------------------------
-- PO-driven O2C: each order carries the customer's own Purchase Order number
-- (their own numbering format — this isn't WeSAP's to standardize) plus the
-- WeCPQ quote ref it traces back to. Both are supplied by the UiPath bridge,
-- which has already matched the customer PO against the WeCPQ quote before
-- calling POST /api/sales-orders — WeSAP just carries them through.
--
-- SO1 (Northbridge): full happy path, delivered+billed+paid.
-- SO2 (Datapoint): delivered, not yet billed — live Bill demo.
-- SO3 (Meridian): Open — live Create Delivery demo.
-- SO4 (Cirrus): billed, not yet paid — live Clear demo (also in worklist).
-- SO5 (Apex): Open, total 27500 against a 30000 credit limit — this customer
--   sits near their limit; a new SO here of >2500 trips Blocked (Credit).
-- SO6 (Solstice): pre-seeded Blocked (Credit) (52000 > 45000 limit) — ready
--   for Release Credit demo, also in worklist.
-- SO7 (Harbor): Open, source_quote_ref references WeCPQ's Q-2026-0011 (also
--   a Harbor Networks / CrowdStrike quote) — illustrates the bridge field.

INSERT INTO sales_orders (so_number, customer_id, status, source_quote_ref, customer_po_number, total_amount) VALUES
  ('1000000001', 1, 'Paid', 'Q-2026-0002', 'PO-NORTHBRIDGE-2026-0142', 5700.00),
  ('1000000002', 2, 'Delivered', 'Q-2026-0004', 'DPS-PO-88231', 2850.00),
  ('1000000003', 3, 'Open', 'Q-2026-0006', 'PO-MERIDIAN-4471', 8400.00),
  ('1000000004', 4, 'Billed', 'Q-2026-0008', 'CCS2026-0219', 16000.00),
  ('1000000005', 8, 'Open', 'Q-2026-0009', 'APEX-PO-2026-056', 27500.00),
  ('1000000006', 7, 'Blocked (Credit)', 'Q-2026-0010', 'SDG-PO-30187', 52000.00),
  ('1000000007', 6, 'Open', 'Q-2026-0011', 'HN-2026-PO-0088', 17000.00);

INSERT INTO so_items (so_id, description, qty, unit_price, line_total, material_code) VALUES
  (1, 'FortiGate 100F Firewall Appliance', 2, 1850.00, 3700.00, 'MAT-0001'),
  (1, 'Onboarding Services', 10, 200.00, 2000.00, NULL),
  (2, 'Microsoft 365 E5 License (annual)', 50, 57.00, 2850.00, 'MAT-0006'),
  (3, 'PA-440 Next-Gen Firewall', 4, 2100.00, 8400.00, 'MAT-0003'),
  (4, 'Zscaler Internet Access Business (per user, annual)', 200, 42.00, 8400.00, 'MAT-0008'),
  (4, 'Zscaler Deployment & Migration Services', 40, 190.00, 7600.00, NULL),
  (5, 'CrowdStrike Falcon Complete (per endpoint, annual)', 250, 85.00, 21250.00, NULL),
  (5, 'Onboarding & Training Services', 25, 250.00, 6250.00, NULL),
  (6, 'Veeam Backup & Replication Enterprise Plus (per socket)', 40, 1150.00, 46000.00, NULL),
  (6, 'Veeam ONE Monitoring (per socket)', 25, 240.00, 6000.00, NULL),
  (7, 'CrowdStrike Falcon Complete (per endpoint, annual)', 150, 85.00, 12750.00, NULL),
  (7, 'CrowdStrike Falcon Discover', 150, 15.00, 2250.00, NULL),
  (7, 'Onboarding & Training Services', 10, 200.00, 2000.00, NULL);

-- Deliveries --------------------------------------------------------------

INSERT INTO deliveries (dlv_number, so_id, status) VALUES
  ('8000000001', 1, 'Posted'),
  ('8000000002', 2, 'Posted'),
  ('8000000003', 4, 'Posted');

-- Billing Documents -------------------------------------------------------
-- customer_po_number is copied from the originating sales order.

INSERT INTO billing_documents (bill_number, so_id, customer_id, amount, status, customer_po_number) VALUES
  ('9000000001', 1, 1, 5700.00, 'Paid', 'PO-NORTHBRIDGE-2026-0142'),
  ('9000000002', 4, 4, 16000.00, 'Open', 'CCS2026-0219');

-- Payments ------------------------------------------------------------------

INSERT INTO payments (pay_number, ref_type, ref_id, direction, amount, status) VALUES
  ('2000000001', 'supplier_invoice', 1, 'out', 19650.00, 'Cleared'),
  ('2000000002', 'supplier_invoice', 3, 'out', 9200.00, 'Cleared'),
  ('2000000003', 'billing_document', 1, 'in', 5700.00, 'Cleared');

-- Document Flow -------------------------------------------------------------

INSERT INTO doc_flow (from_type, from_id, to_type, to_id) VALUES
  ('purchase_order', 1, 'goods_receipt', 1),
  ('purchase_order', 1, 'supplier_invoice', 1),
  ('supplier_invoice', 1, 'payment', 1),
  ('purchase_order', 2, 'goods_receipt', 2),
  ('purchase_order', 2, 'supplier_invoice', 4),
  ('purchase_order', 3, 'goods_receipt', 3),
  ('purchase_order', 3, 'supplier_invoice', 2),
  ('purchase_order', 5, 'supplier_invoice', 3),
  ('supplier_invoice', 3, 'payment', 2),
  ('sales_order', 1, 'delivery', 1),
  ('sales_order', 1, 'billing_document', 1),
  ('billing_document', 1, 'payment', 3),
  ('sales_order', 2, 'delivery', 2),
  ('sales_order', 4, 'delivery', 3),
  ('sales_order', 4, 'billing_document', 2);
