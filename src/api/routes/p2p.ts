import { createRoute, z, type OpenAPIHono } from "@hono/zod-openapi";
import type { Env } from "../../types";
import { getMaterialByCode, getVendorByRefId } from "../../db/master";
import {
  createGoodsReceipt,
  createPurchaseOrder,
  createSupplierInvoice,
  getGoodsReceiptByNumber,
  getPurchaseOrderByNumber,
  getSupplierInvoiceByNumber,
  listGoodsReceipts,
  listPurchaseOrders,
  listSupplierInvoices,
  matchSupplierInvoice,
  releaseSupplierInvoice,
} from "../../db/p2p";
import { getFlow } from "../../lib/flow";
import { mapActionError } from "../errors";
import {
  ErrorSchema,
  FlowEntrySchema,
  GoodsReceiptInputSchema,
  GoodsReceiptSchema,
  GoodsReceiptWithItemsSchema,
  GrNumberParamSchema,
  InvNumberParamSchema,
  PoNumberParamSchema,
  PurchaseOrderInputSchema,
  PurchaseOrderSchema,
  PurchaseOrderWithItemsSchema,
  SupplierInvoiceInputSchema,
  SupplierInvoiceSchema,
  SupplierInvoiceWithItemsSchema,
} from "../schemas";

export function registerP2PRoutes(api: OpenAPIHono<Env>) {
  // Purchase Orders -----------------------------------------------------------

  api.openapi(
    createRoute({
      method: "get",
      path: "/purchase-orders",
      tags: ["Purchase Orders"],
      summary: "List purchase orders",
      security: [{ Bearer: [] }],
      responses: { 200: { description: "List of purchase orders", content: { "application/json": { schema: z.array(PurchaseOrderSchema) } } } },
    }),
    async (c) => c.json(await listPurchaseOrders(c.env.DB), 200)
  );

  api.openapi(
    createRoute({
      method: "post",
      path: "/purchase-orders",
      tags: ["Purchase Orders"],
      summary: "Create a purchase order",
      security: [{ Bearer: [] }],
      request: { body: { content: { "application/json": { schema: PurchaseOrderInputSchema } } } },
      responses: {
        201: { description: "Created purchase order", content: { "application/json": { schema: PurchaseOrderWithItemsSchema } } },
        400: { description: "Material does not belong to the vendor", content: { "application/json": { schema: ErrorSchema } } },
        404: { description: "Vendor or material not found", content: { "application/json": { schema: ErrorSchema } } },
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const vendor = await getVendorByRefId(c.env.DB, body.vendor_ref);
      if (!vendor) return c.json({ error: "not_found", message: "Vendor not found" }, 404);

      const items = [];
      for (const item of body.items) {
        const material = await getMaterialByCode(c.env.DB, item.material_code);
        if (!material) return c.json({ error: "not_found", message: `Material ${item.material_code} not found` }, 404);
        if (material.vendor_id !== vendor.id) {
          return c.json({ error: "invalid_material", message: `${material.material_code} does not belong to ${vendor.name}` }, 400);
        }
        items.push({ material_id: material.id, qty: item.qty, price: item.price });
      }

      const po = await createPurchaseOrder(c.env.DB, vendor.id, items);
      return c.json(po, 201);
    }
  );

  api.openapi(
    createRoute({
      method: "get",
      path: "/purchase-orders/{po_number}",
      tags: ["Purchase Orders"],
      summary: "Get a purchase order with items",
      security: [{ Bearer: [] }],
      request: { params: PoNumberParamSchema },
      responses: {
        200: { description: "Purchase order", content: { "application/json": { schema: PurchaseOrderWithItemsSchema } } },
        404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
      },
    }),
    async (c) => {
      const { po_number } = c.req.valid("param");
      const po = await getPurchaseOrderByNumber(c.env.DB, po_number);
      if (!po) return c.json({ error: "not_found", message: "Purchase order not found" }, 404);
      return c.json(po, 200);
    }
  );

  api.openapi(
    createRoute({
      method: "get",
      path: "/purchase-orders/{po_number}/flow",
      tags: ["Purchase Orders"],
      summary: "Get the document flow for a purchase order",
      security: [{ Bearer: [] }],
      request: { params: PoNumberParamSchema },
      responses: {
        200: { description: "Document flow", content: { "application/json": { schema: z.array(FlowEntrySchema) } } },
        404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
      },
    }),
    async (c) => {
      const { po_number } = c.req.valid("param");
      const po = await getPurchaseOrderByNumber(c.env.DB, po_number);
      if (!po) return c.json({ error: "not_found", message: "Purchase order not found" }, 404);
      return c.json(await getFlow(c.env.DB, "purchase_order", po.id), 200);
    }
  );

  // Goods Receipts -------------------------------------------------------------

  api.openapi(
    createRoute({
      method: "get",
      path: "/goods-receipts",
      tags: ["Goods Receipts"],
      summary: "List goods receipts",
      security: [{ Bearer: [] }],
      responses: { 200: { description: "List of goods receipts", content: { "application/json": { schema: z.array(GoodsReceiptSchema) } } } },
    }),
    async (c) => c.json(await listGoodsReceipts(c.env.DB), 200)
  );

  api.openapi(
    createRoute({
      method: "post",
      path: "/goods-receipts",
      tags: ["Goods Receipts"],
      summary: "Post a goods receipt against a purchase order",
      security: [{ Bearer: [] }],
      request: { body: { content: { "application/json": { schema: GoodsReceiptInputSchema } } } },
      responses: {
        201: { description: "Created goods receipt", content: { "application/json": { schema: GoodsReceiptWithItemsSchema } } },
        404: { description: "Purchase order not found", content: { "application/json": { schema: ErrorSchema } } },
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const po = await getPurchaseOrderByNumber(c.env.DB, body.po_number);
      if (!po) return c.json({ error: "not_found", message: "Purchase order not found" }, 404);
      const gr = await createGoodsReceipt(c.env.DB, po.id, body.items);
      return c.json(gr, 201);
    }
  );

  api.openapi(
    createRoute({
      method: "get",
      path: "/goods-receipts/{gr_number}",
      tags: ["Goods Receipts"],
      summary: "Get a goods receipt with items",
      security: [{ Bearer: [] }],
      request: { params: GrNumberParamSchema },
      responses: {
        200: { description: "Goods receipt", content: { "application/json": { schema: GoodsReceiptWithItemsSchema } } },
        404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
      },
    }),
    async (c) => {
      const { gr_number } = c.req.valid("param");
      const gr = await getGoodsReceiptByNumber(c.env.DB, gr_number);
      if (!gr) return c.json({ error: "not_found", message: "Goods receipt not found" }, 404);
      return c.json(gr, 200);
    }
  );

  api.openapi(
    createRoute({
      method: "get",
      path: "/goods-receipts/{gr_number}/flow",
      tags: ["Goods Receipts"],
      summary: "Get the document flow for a goods receipt",
      security: [{ Bearer: [] }],
      request: { params: GrNumberParamSchema },
      responses: {
        200: { description: "Document flow", content: { "application/json": { schema: z.array(FlowEntrySchema) } } },
        404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
      },
    }),
    async (c) => {
      const { gr_number } = c.req.valid("param");
      const gr = await getGoodsReceiptByNumber(c.env.DB, gr_number);
      if (!gr) return c.json({ error: "not_found", message: "Goods receipt not found" }, 404);
      return c.json(await getFlow(c.env.DB, "goods_receipt", gr.id), 200);
    }
  );

  // Supplier Invoices ------------------------------------------------------------

  api.openapi(
    createRoute({
      method: "get",
      path: "/supplier-invoices",
      tags: ["Supplier Invoices"],
      summary: "List supplier invoices",
      security: [{ Bearer: [] }],
      responses: { 200: { description: "List of supplier invoices", content: { "application/json": { schema: z.array(SupplierInvoiceSchema) } } } },
    }),
    async (c) => c.json(await listSupplierInvoices(c.env.DB), 200)
  );

  api.openapi(
    createRoute({
      method: "post",
      path: "/supplier-invoices",
      tags: ["Supplier Invoices"],
      summary: "Create a supplier invoice against a purchase order",
      security: [{ Bearer: [] }],
      request: { body: { content: { "application/json": { schema: SupplierInvoiceInputSchema } } } },
      responses: {
        201: { description: "Created supplier invoice", content: { "application/json": { schema: SupplierInvoiceWithItemsSchema } } },
        404: { description: "Purchase order not found", content: { "application/json": { schema: ErrorSchema } } },
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const po = await getPurchaseOrderByNumber(c.env.DB, body.po_number);
      if (!po) return c.json({ error: "not_found", message: "Purchase order not found" }, 404);
      const si = await createSupplierInvoice(c.env.DB, po.id, po.vendor_id, body.items);
      return c.json(si, 201);
    }
  );

  api.openapi(
    createRoute({
      method: "get",
      path: "/supplier-invoices/{inv_number}",
      tags: ["Supplier Invoices"],
      summary: "Get a supplier invoice with items",
      security: [{ Bearer: [] }],
      request: { params: InvNumberParamSchema },
      responses: {
        200: { description: "Supplier invoice", content: { "application/json": { schema: SupplierInvoiceWithItemsSchema } } },
        404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
      },
    }),
    async (c) => {
      const { inv_number } = c.req.valid("param");
      const si = await getSupplierInvoiceByNumber(c.env.DB, inv_number);
      if (!si) return c.json({ error: "not_found", message: "Supplier invoice not found" }, 404);
      return c.json(si, 200);
    }
  );

  api.openapi(
    createRoute({
      method: "post",
      path: "/supplier-invoices/{inv_number}/match",
      tags: ["Supplier Invoices"],
      summary: "Run 2-way/3-way match — sets Matched or Blocked (+reason)",
      security: [{ Bearer: [] }],
      request: { params: InvNumberParamSchema },
      responses: {
        200: { description: "Matched invoice", content: { "application/json": { schema: SupplierInvoiceWithItemsSchema } } },
        400: { description: "Invalid request", content: { "application/json": { schema: ErrorSchema } } },
        404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
        409: { description: "Invoice is Paid and locked", content: { "application/json": { schema: ErrorSchema } } },
      },
    }),
    async (c) => {
      const { inv_number } = c.req.valid("param");
      try {
        return c.json(await matchSupplierInvoice(c.env.DB, inv_number), 200);
      } catch (err) {
        const mapped = mapActionError(err);
        if (mapped) return c.json(mapped.body, mapped.status);
        throw err;
      }
    }
  );

  api.openapi(
    createRoute({
      method: "post",
      path: "/supplier-invoices/{inv_number}/release",
      tags: ["Supplier Invoices"],
      summary: "Release a Blocked invoice",
      security: [{ Bearer: [] }],
      request: { params: InvNumberParamSchema },
      responses: {
        200: { description: "Released invoice", content: { "application/json": { schema: SupplierInvoiceWithItemsSchema } } },
        400: { description: "Invoice is not Blocked", content: { "application/json": { schema: ErrorSchema } } },
        404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
        409: { description: "Invoice is Paid and locked", content: { "application/json": { schema: ErrorSchema } } },
      },
    }),
    async (c) => {
      const { inv_number } = c.req.valid("param");
      try {
        return c.json(await releaseSupplierInvoice(c.env.DB, inv_number), 200);
      } catch (err) {
        const mapped = mapActionError(err);
        if (mapped) return c.json(mapped.body, mapped.status);
        throw err;
      }
    }
  );

  api.openapi(
    createRoute({
      method: "get",
      path: "/supplier-invoices/{inv_number}/flow",
      tags: ["Supplier Invoices"],
      summary: "Get the document flow for a supplier invoice",
      security: [{ Bearer: [] }],
      request: { params: InvNumberParamSchema },
      responses: {
        200: { description: "Document flow", content: { "application/json": { schema: z.array(FlowEntrySchema) } } },
        404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
      },
    }),
    async (c) => {
      const { inv_number } = c.req.valid("param");
      const si = await getSupplierInvoiceByNumber(c.env.DB, inv_number);
      if (!si) return c.json({ error: "not_found", message: "Supplier invoice not found" }, 404);
      return c.json(await getFlow(c.env.DB, "supplier_invoice", si.id), 200);
    }
  );
}
