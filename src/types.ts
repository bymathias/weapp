export type Env = {
  Bindings: {
    DB: D1Database;
    SESSION_SECRET: string;
    OAUTH_CLIENT_ID: string;
    OAUTH_CLIENT_SECRET: string;
    UI_USERNAME: string;
    UI_PASSWORD: string;
  };
  Variables: {
    apiClientId?: string;
  };
};

// Master data ----------------------------------------------------------------

export interface CompanyCode {
  code: string;
  name: string;
}

export interface Customer {
  id: number;
  name: string;
  ref_id: string;
  industry: string;
  country: string;
  account_owner: string;
  credit_limit: number;
  created_at: string;
}

export interface Vendor {
  id: number;
  name: string;
  ref_id: string;
  created_at: string;
}

export interface Material {
  id: number;
  material_code: string;
  description: string;
  vendor_id: number;
  standard_price: number;
  stock_qty: number;
  created_at: string;
}

// Purchase-to-Pay --------------------------------------------------------------

export type PoStatus = "Open" | "Received" | "Invoiced";

export interface PurchaseOrder {
  id: number;
  po_number: string;
  vendor_id: number;
  status: PoStatus;
  created_at: string;
}

export interface PoItem {
  id: number;
  po_id: number;
  material_id: number;
  qty: number;
  price: number;
  line_total: number;
}

export interface PurchaseOrderWithItems extends PurchaseOrder {
  items: PoItem[];
}

export type GrStatus = "Posted";

export interface GoodsReceipt {
  id: number;
  gr_number: string;
  po_id: number;
  status: GrStatus;
  created_at: string;
}

export interface GrItem {
  id: number;
  gr_id: number;
  po_item_id: number;
  qty_received: number;
}

export interface GoodsReceiptWithItems extends GoodsReceipt {
  items: GrItem[];
}

export type SiStatus = "Invoiced" | "Matched" | "Blocked" | "Released" | "Paid";

export interface SupplierInvoice {
  id: number;
  inv_number: string;
  po_id: number;
  vendor_id: number;
  amount: number;
  status: SiStatus;
  block_reason: string | null;
  created_at: string;
}

export interface SiItem {
  id: number;
  si_id: number;
  po_item_id: number;
  qty: number;
  price: number;
  line_total: number;
}

export interface SupplierInvoiceWithItems extends SupplierInvoice {
  items: SiItem[];
}

// Order-to-Cash ------------------------------------------------------------------

export type SoStatus = "Open" | "Blocked (Credit)" | "Released" | "Delivered" | "Billed" | "Paid";

export interface SalesOrder {
  id: number;
  so_number: string;
  customer_id: number;
  status: SoStatus;
  source_quote_ref: string | null;
  total_amount: number;
  created_at: string;
}

export interface SoItem {
  id: number;
  so_id: number;
  description: string;
  qty: number;
  unit_price: number;
  line_total: number;
  material_code: string | null;
}

export interface SalesOrderWithItems extends SalesOrder {
  items: SoItem[];
}

export type DeliveryStatus = "Posted";

export interface Delivery {
  id: number;
  dlv_number: string;
  so_id: number;
  status: DeliveryStatus;
  created_at: string;
}

export type BillingStatus = "Open" | "Paid";

export interface BillingDocument {
  id: number;
  bill_number: string;
  so_id: number;
  customer_id: number;
  amount: number;
  status: BillingStatus;
  created_at: string;
}

// Shared -----------------------------------------------------------------------

export type PaymentDirection = "in" | "out";
export type PaymentStatus = "Cleared";
export type PaymentRefType = "supplier_invoice" | "billing_document";

export interface Payment {
  id: number;
  pay_number: string;
  ref_type: PaymentRefType;
  ref_id: number;
  direction: PaymentDirection;
  amount: number;
  status: PaymentStatus;
  created_at: string;
}

export type DocType =
  | "purchase_order"
  | "goods_receipt"
  | "supplier_invoice"
  | "sales_order"
  | "delivery"
  | "billing_document"
  | "payment";

export interface FlowEntry {
  type: DocType;
  id: number;
  number: string;
  status: string;
}

export interface WorklistItem {
  kind: "blocked-invoice" | "credit-blocked-so" | "delivery-due" | "unpaid-billing";
  title: string;
  detail: string;
  href: string;
}
