DROP TABLE IF EXISTS doc_flow;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS billing_documents;
DROP TABLE IF EXISTS deliveries;
DROP TABLE IF EXISTS so_items;
DROP TABLE IF EXISTS sales_orders;
DROP TABLE IF EXISTS si_items;
DROP TABLE IF EXISTS supplier_invoices;
DROP TABLE IF EXISTS gr_items;
DROP TABLE IF EXISTS goods_receipts;
DROP TABLE IF EXISTS po_items;
DROP TABLE IF EXISTS purchase_orders;
DROP TABLE IF EXISTS materials;
DROP TABLE IF EXISTS vendors;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS company_code;

-- Master data --------------------------------------------------------------

CREATE TABLE company_code (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  ref_id TEXT NOT NULL UNIQUE,
  industry TEXT NOT NULL,
  country TEXT NOT NULL,
  account_owner TEXT NOT NULL,
  credit_limit REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE vendors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  ref_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  material_code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id),
  standard_price REAL NOT NULL,
  stock_qty INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Purchase-to-Pay ------------------------------------------------------------

CREATE TABLE purchase_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  po_number TEXT NOT NULL UNIQUE,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id),
  status TEXT NOT NULL CHECK (status IN ('Open', 'Received', 'Invoiced')) DEFAULT 'Open',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE po_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  po_id INTEGER NOT NULL REFERENCES purchase_orders(id),
  material_id INTEGER NOT NULL REFERENCES materials(id),
  qty INTEGER NOT NULL,
  price REAL NOT NULL,
  line_total REAL NOT NULL
);

CREATE TABLE goods_receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gr_number TEXT NOT NULL UNIQUE,
  po_id INTEGER NOT NULL REFERENCES purchase_orders(id),
  status TEXT NOT NULL CHECK (status IN ('Posted')) DEFAULT 'Posted',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE gr_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gr_id INTEGER NOT NULL REFERENCES goods_receipts(id),
  po_item_id INTEGER NOT NULL REFERENCES po_items(id),
  qty_received INTEGER NOT NULL
);

CREATE TABLE supplier_invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inv_number TEXT NOT NULL UNIQUE,
  po_id INTEGER NOT NULL REFERENCES purchase_orders(id),
  vendor_id INTEGER NOT NULL REFERENCES vendors(id),
  amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('Invoiced', 'Matched', 'Blocked', 'Released', 'Paid')) DEFAULT 'Invoiced',
  block_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE si_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  si_id INTEGER NOT NULL REFERENCES supplier_invoices(id),
  po_item_id INTEGER NOT NULL REFERENCES po_items(id),
  qty INTEGER NOT NULL,
  price REAL NOT NULL,
  line_total REAL NOT NULL
);

-- Order-to-Cash --------------------------------------------------------------

CREATE TABLE sales_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  so_number TEXT NOT NULL UNIQUE,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  status TEXT NOT NULL CHECK (status IN ('Open', 'Blocked (Credit)', 'Released', 'Delivered', 'Billed', 'Paid')) DEFAULT 'Open',
  source_quote_ref TEXT,
  total_amount REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE so_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  so_id INTEGER NOT NULL REFERENCES sales_orders(id),
  description TEXT NOT NULL,
  qty INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  line_total REAL NOT NULL,
  material_code TEXT
);

CREATE TABLE deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dlv_number TEXT NOT NULL UNIQUE,
  so_id INTEGER NOT NULL REFERENCES sales_orders(id),
  status TEXT NOT NULL CHECK (status IN ('Posted')) DEFAULT 'Posted',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE billing_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_number TEXT NOT NULL UNIQUE,
  so_id INTEGER NOT NULL REFERENCES sales_orders(id),
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('Open', 'Paid')) DEFAULT 'Open',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Shared ----------------------------------------------------------------------

CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pay_number TEXT NOT NULL UNIQUE,
  ref_type TEXT NOT NULL CHECK (ref_type IN ('supplier_invoice', 'billing_document')),
  ref_id INTEGER NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  amount REAL NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Cleared')) DEFAULT 'Cleared',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE doc_flow (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_type TEXT NOT NULL,
  from_id INTEGER NOT NULL,
  to_type TEXT NOT NULL,
  to_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes -----------------------------------------------------------------

CREATE INDEX idx_materials_vendor_id ON materials(vendor_id);
CREATE INDEX idx_po_items_po_id ON po_items(po_id);
CREATE INDEX idx_goods_receipts_po_id ON goods_receipts(po_id);
CREATE INDEX idx_gr_items_gr_id ON gr_items(gr_id);
CREATE INDEX idx_gr_items_po_item_id ON gr_items(po_item_id);
CREATE INDEX idx_supplier_invoices_po_id ON supplier_invoices(po_id);
CREATE INDEX idx_si_items_si_id ON si_items(si_id);
CREATE INDEX idx_si_items_po_item_id ON si_items(po_item_id);
CREATE INDEX idx_sales_orders_customer_id ON sales_orders(customer_id);
CREATE INDEX idx_so_items_so_id ON so_items(so_id);
CREATE INDEX idx_deliveries_so_id ON deliveries(so_id);
CREATE INDEX idx_billing_documents_so_id ON billing_documents(so_id);
CREATE INDEX idx_payments_ref ON payments(ref_type, ref_id);
CREATE INDEX idx_doc_flow_from ON doc_flow(from_type, from_id);
CREATE INDEX idx_doc_flow_to ON doc_flow(to_type, to_id);
