import { z } from "@hono/zod-openapi";

export const ErrorSchema = z
  .object({
    error: z.string(),
    message: z.string().optional(),
  })
  .openapi("Error");

// Master data ------------------------------------------------------------------

export const CompanyCodeSchema = z.object({ code: z.string(), name: z.string() }).openapi("CompanyCode");

export const CustomerSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    ref_id: z.string(),
    industry: z.string(),
    country: z.string(),
    account_owner: z.string(),
    credit_limit: z.number(),
    created_at: z.string(),
  })
  .openapi("Customer");

export const VendorSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    ref_id: z.string(),
    created_at: z.string(),
  })
  .openapi("Vendor");

export const MaterialSchema = z
  .object({
    id: z.number().int(),
    material_code: z.string(),
    description: z.string(),
    standard_price: z.number(),
    stock_qty: z.number().int(),
    created_at: z.string(),
  })
  .openapi("Material");

export const CustomerRefParamSchema = z.object({
  ref: z.string().openapi({ param: { name: "ref", in: "path" }, example: "CUST-0001" }),
});
export const VendorRefParamSchema = z.object({
  ref: z.string().openapi({ param: { name: "ref", in: "path" }, example: "VEND-0001" }),
});
export const MaterialCodeParamSchema = z.object({
  code: z.string().openapi({ param: { name: "code", in: "path" }, example: "MAT-0001" }),
});

// Purchase-to-Pay ----------------------------------------------------------------

export const PoStatusSchema = z.enum(["Open", "Received", "Invoiced"]).openapi("PoStatus");

export const PoItemSchema = z
  .object({
    id: z.number().int(),
    po_id: z.number().int(),
    material_id: z.number().int(),
    qty: z.number().int(),
    price: z.number(),
    line_total: z.number(),
  })
  .openapi("PoItem");

export const PurchaseOrderSchema = z
  .object({
    id: z.number().int(),
    po_number: z.string(),
    vendor_id: z.number().int(),
    status: PoStatusSchema,
    created_at: z.string(),
  })
  .openapi("PurchaseOrder");

export const PurchaseOrderWithItemsSchema = PurchaseOrderSchema.extend({ items: z.array(PoItemSchema) }).openapi(
  "PurchaseOrderWithItems"
);

export const PoItemInputSchema = z
  .object({
    material_code: z.string().min(1),
    qty: z.number().int().positive(),
    price: z.number().nonnegative(),
  })
  .openapi("PoItemInput");

export const PurchaseOrderInputSchema = z
  .object({
    vendor_ref: z.string().min(1),
    items: z.array(PoItemInputSchema).min(1),
  })
  .openapi("PurchaseOrderInput");

export const PoNumberParamSchema = z.object({
  po_number: z.string().openapi({ param: { name: "po_number", in: "path" }, example: "4500000001" }),
});

export const GrStatusSchema = z.enum(["Posted"]).openapi("GrStatus");

export const GrItemSchema = z
  .object({
    id: z.number().int(),
    gr_id: z.number().int(),
    po_item_id: z.number().int(),
    qty_received: z.number().int(),
  })
  .openapi("GrItem");

export const GoodsReceiptSchema = z
  .object({
    id: z.number().int(),
    gr_number: z.string(),
    po_id: z.number().int(),
    status: GrStatusSchema,
    created_at: z.string(),
  })
  .openapi("GoodsReceipt");

export const GoodsReceiptWithItemsSchema = GoodsReceiptSchema.extend({ items: z.array(GrItemSchema) }).openapi(
  "GoodsReceiptWithItems"
);

export const GrItemInputSchema = z
  .object({
    po_item_id: z.number().int(),
    qty_received: z.number().int().positive(),
  })
  .openapi("GrItemInput");

export const GoodsReceiptInputSchema = z
  .object({
    po_number: z.string().min(1),
    items: z.array(GrItemInputSchema).min(1),
  })
  .openapi("GoodsReceiptInput");

export const GrNumberParamSchema = z.object({
  gr_number: z.string().openapi({ param: { name: "gr_number", in: "path" }, example: "5000000001" }),
});

export const SiStatusSchema = z.enum(["Invoiced", "Matched", "Blocked", "Released", "Paid"]).openapi("SiStatus");

export const SiItemSchema = z
  .object({
    id: z.number().int(),
    si_id: z.number().int(),
    po_item_id: z.number().int(),
    qty: z.number().int(),
    price: z.number(),
    line_total: z.number(),
  })
  .openapi("SiItem");

export const SupplierInvoiceSchema = z
  .object({
    id: z.number().int(),
    inv_number: z.string(),
    po_id: z.number().int(),
    vendor_id: z.number().int(),
    amount: z.number(),
    status: SiStatusSchema,
    block_reason: z.string().nullable(),
    created_at: z.string(),
  })
  .openapi("SupplierInvoice");

export const SupplierInvoiceWithItemsSchema = SupplierInvoiceSchema.extend({ items: z.array(SiItemSchema) }).openapi(
  "SupplierInvoiceWithItems"
);

export const SiItemInputSchema = z
  .object({
    po_item_id: z.number().int(),
    qty: z.number().int().positive(),
    price: z.number().nonnegative(),
  })
  .openapi("SiItemInput");

export const SupplierInvoiceInputSchema = z
  .object({
    po_number: z.string().min(1),
    items: z.array(SiItemInputSchema).min(1),
  })
  .openapi("SupplierInvoiceInput");

export const InvNumberParamSchema = z.object({
  inv_number: z.string().openapi({ param: { name: "inv_number", in: "path" }, example: "5100000001" }),
});

// Order-to-Cash --------------------------------------------------------------------

export const SoStatusSchema = z
  .enum(["Open", "Blocked (Credit)", "Released", "Delivered", "Billed", "Paid"])
  .openapi("SoStatus");

export const SoItemSchema = z
  .object({
    id: z.number().int(),
    so_id: z.number().int(),
    description: z.string(),
    qty: z.number().int(),
    unit_price: z.number(),
    line_total: z.number(),
    material_code: z.string().nullable(),
  })
  .openapi("SoItem");

export const SalesOrderSchema = z
  .object({
    id: z.number().int(),
    so_number: z.string(),
    customer_id: z.number().int(),
    status: SoStatusSchema,
    source_quote_ref: z.string().nullable(),
    total_amount: z.number(),
    created_at: z.string(),
  })
  .openapi("SalesOrder");

export const SalesOrderWithItemsSchema = SalesOrderSchema.extend({ items: z.array(SoItemSchema) }).openapi(
  "SalesOrderWithItems"
);

export const SoItemInputSchema = z
  .object({
    description: z.string().min(1),
    qty: z.number().int().positive(),
    unit_price: z.number().nonnegative(),
    material_code: z.string().optional(),
  })
  .openapi("SoItemInput");

export const SalesOrderInputSchema = z
  .object({
    customer_ref: z.string().min(1),
    items: z.array(SoItemInputSchema).min(1),
    source_quote_ref: z.string().optional(),
  })
  .openapi("SalesOrderInput");

export const SoNumberParamSchema = z.object({
  so_number: z.string().openapi({ param: { name: "so_number", in: "path" }, example: "1000000001" }),
});

export const DeliveryStatusSchema = z.enum(["Posted"]).openapi("DeliveryStatus");

export const DeliverySchema = z
  .object({
    id: z.number().int(),
    dlv_number: z.string(),
    so_id: z.number().int(),
    status: DeliveryStatusSchema,
    created_at: z.string(),
  })
  .openapi("Delivery");

export const DeliveryInputSchema = z.object({ so_number: z.string().min(1) }).openapi("DeliveryInput");

export const DlvNumberParamSchema = z.object({
  dlv_number: z.string().openapi({ param: { name: "dlv_number", in: "path" }, example: "8000000001" }),
});

export const BillingStatusSchema = z.enum(["Open", "Paid"]).openapi("BillingStatus");

export const BillingDocumentSchema = z
  .object({
    id: z.number().int(),
    bill_number: z.string(),
    so_id: z.number().int(),
    customer_id: z.number().int(),
    amount: z.number(),
    status: BillingStatusSchema,
    created_at: z.string(),
  })
  .openapi("BillingDocument");

export const BillingInputSchema = z.object({ so_number: z.string().min(1) }).openapi("BillingInput");

export const BillNumberParamSchema = z.object({
  bill_number: z.string().openapi({ param: { name: "bill_number", in: "path" }, example: "9000000001" }),
});

// Shared ----------------------------------------------------------------------------

export const PaymentRefTypeSchema = z.enum(["supplier_invoice", "billing_document"]).openapi("PaymentRefType");
export const PaymentDirectionSchema = z.enum(["in", "out"]).openapi("PaymentDirection");
export const PaymentStatusSchema = z.enum(["Cleared"]).openapi("PaymentStatus");

export const PaymentSchema = z
  .object({
    id: z.number().int(),
    pay_number: z.string(),
    ref_type: PaymentRefTypeSchema,
    ref_id: z.number().int(),
    ref_number: z.string(),
    direction: PaymentDirectionSchema,
    amount: z.number(),
    status: PaymentStatusSchema,
    created_at: z.string(),
  })
  .openapi("Payment");

export const PaymentInputSchema = z
  .object({
    ref_type: PaymentRefTypeSchema,
    ref_number: z.string().min(1),
  })
  .openapi("PaymentInput");

export const PayNumberParamSchema = z.object({
  pay_number: z.string().openapi({ param: { name: "pay_number", in: "path" }, example: "2000000001" }),
});

export const FlowEntrySchema = z
  .object({
    type: z.enum([
      "purchase_order",
      "goods_receipt",
      "supplier_invoice",
      "sales_order",
      "delivery",
      "billing_document",
      "payment",
    ]),
    id: z.number().int(),
    number: z.string(),
    status: z.string(),
  })
  .openapi("FlowEntry");
