import { createRoute, z, type OpenAPIHono } from "@hono/zod-openapi";
import type { Env } from "../../types";
import { getCustomer, getCustomerByRefId } from "../../db/master";
import {
  createBilling,
  createDelivery,
  createSalesOrder,
  getBillingByNumber,
  getDeliveryByNumber,
  getSalesOrderByNumber,
  listBillingDocuments,
  listDeliveries,
  listSalesOrders,
  releaseCreditBlock,
} from "../../db/o2c";
import { getFlow } from "../../lib/flow";
import { mapActionError } from "../errors";
import { generateSalesOrderPdf } from "../../pdf";
import {
  BillNumberParamSchema,
  BillingDocumentSchema,
  BillingInputSchema,
  DeliveryInputSchema,
  DeliverySchema,
  DlvNumberParamSchema,
  ErrorSchema,
  FlowEntrySchema,
  SalesOrderInputSchema,
  SalesOrderSchema,
  SalesOrderWithItemsSchema,
  SoNumberParamSchema,
} from "../schemas";

export function registerO2CRoutes(api: OpenAPIHono<Env>) {
  // Sales Orders ---------------------------------------------------------------

  api.openapi(
    createRoute({
      method: "get",
      path: "/sales-orders",
      tags: ["Sales Orders"],
      summary: "List sales orders",
      security: [{ Bearer: [] }],
      responses: { 200: { description: "List of sales orders", content: { "application/json": { schema: z.array(SalesOrderSchema) } } } },
    }),
    async (c) => c.json(await listSalesOrders(c.env.DB), 200)
  );

  // The UiPath bridge target: WeCPQ hands over a Won quote's customer_ref +
  // items + its own quote ref; this endpoint computes totals, runs the
  // credit-limit check, and returns the sales order.
  api.openapi(
    createRoute({
      method: "post",
      path: "/sales-orders",
      tags: ["Sales Orders"],
      summary: "Create a sales order (runs the credit-limit check)",
      security: [{ Bearer: [] }],
      request: { body: { content: { "application/json": { schema: SalesOrderInputSchema } } } },
      responses: {
        201: { description: "Created sales order", content: { "application/json": { schema: SalesOrderWithItemsSchema } } },
        404: { description: "Customer not found", content: { "application/json": { schema: ErrorSchema } } },
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const customer = await getCustomerByRefId(c.env.DB, body.customer_ref);
      if (!customer) return c.json({ error: "not_found", message: "Customer not found" }, 404);
      const so = await createSalesOrder(c.env.DB, customer.id, body.items, body.source_quote_ref ?? null, body.customer_po_number);
      return c.json(so, 201);
    }
  );

  api.openapi(
    createRoute({
      method: "get",
      path: "/sales-orders/{so_number}",
      tags: ["Sales Orders"],
      summary: "Get a sales order with items",
      security: [{ Bearer: [] }],
      request: { params: SoNumberParamSchema },
      responses: {
        200: { description: "Sales order", content: { "application/json": { schema: SalesOrderWithItemsSchema } } },
        404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
      },
    }),
    async (c) => {
      const { so_number } = c.req.valid("param");
      const so = await getSalesOrderByNumber(c.env.DB, so_number);
      if (!so) return c.json({ error: "not_found", message: "Sales order not found" }, 404);
      return c.json(so, 200);
    }
  );

  api.openapi(
    createRoute({
      method: "get",
      path: "/sales-orders/{so_number}/pdf",
      tags: ["Sales Orders"],
      summary: "Download the sales order as a PDF",
      security: [{ Bearer: [] }],
      request: { params: SoNumberParamSchema },
      responses: {
        200: { description: "PDF document", content: { "application/pdf": { schema: { type: "string", format: "binary" } } } },
        404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
      },
    }),
    async (c) => {
      const { so_number } = c.req.valid("param");
      const so = await getSalesOrderByNumber(c.env.DB, so_number);
      if (!so) return c.json({ error: "not_found", message: "Sales order not found" }, 404);
      const customer = await getCustomer(c.env.DB, so.customer_id);
      if (!customer) return c.json({ error: "not_found", message: "Customer not found" }, 404);
      const pdfBytes = await generateSalesOrderPdf(so, customer);
      return new Response(pdfBytes as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${so.so_number}.pdf"`,
        },
      });
    }
  );

  api.openapi(
    createRoute({
      method: "post",
      path: "/sales-orders/{so_number}/release-credit",
      tags: ["Sales Orders"],
      summary: "Release a credit-blocked sales order",
      security: [{ Bearer: [] }],
      request: { params: SoNumberParamSchema },
      responses: {
        200: { description: "Released sales order", content: { "application/json": { schema: SalesOrderWithItemsSchema } } },
        400: { description: "Sales order is not credit-blocked", content: { "application/json": { schema: ErrorSchema } } },
        404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
        409: { description: "Sales order is Paid and locked", content: { "application/json": { schema: ErrorSchema } } },
      },
    }),
    async (c) => {
      const { so_number } = c.req.valid("param");
      try {
        return c.json(await releaseCreditBlock(c.env.DB, so_number), 200);
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
      path: "/sales-orders/{so_number}/flow",
      tags: ["Sales Orders"],
      summary: "Get the document flow for a sales order",
      security: [{ Bearer: [] }],
      request: { params: SoNumberParamSchema },
      responses: {
        200: { description: "Document flow", content: { "application/json": { schema: z.array(FlowEntrySchema) } } },
        404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
      },
    }),
    async (c) => {
      const { so_number } = c.req.valid("param");
      const so = await getSalesOrderByNumber(c.env.DB, so_number);
      if (!so) return c.json({ error: "not_found", message: "Sales order not found" }, 404);
      return c.json(await getFlow(c.env.DB, "sales_order", so.id), 200);
    }
  );

  // Deliveries -----------------------------------------------------------------

  api.openapi(
    createRoute({
      method: "get",
      path: "/deliveries",
      tags: ["Deliveries"],
      summary: "List deliveries",
      security: [{ Bearer: [] }],
      responses: { 200: { description: "List of deliveries", content: { "application/json": { schema: z.array(DeliverySchema) } } } },
    }),
    async (c) => c.json(await listDeliveries(c.env.DB), 200)
  );

  api.openapi(
    createRoute({
      method: "post",
      path: "/deliveries",
      tags: ["Deliveries"],
      summary: "Create an outbound delivery for a sales order (deducts stock)",
      security: [{ Bearer: [] }],
      request: { body: { content: { "application/json": { schema: DeliveryInputSchema } } } },
      responses: {
        201: { description: "Created delivery", content: { "application/json": { schema: DeliverySchema } } },
        400: { description: "Sales order is not ready for delivery", content: { "application/json": { schema: ErrorSchema } } },
        404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
        409: { description: "Sales order is Paid and locked", content: { "application/json": { schema: ErrorSchema } } },
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      try {
        return c.json(await createDelivery(c.env.DB, body.so_number), 201);
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
      path: "/deliveries/{dlv_number}",
      tags: ["Deliveries"],
      summary: "Get a delivery",
      security: [{ Bearer: [] }],
      request: { params: DlvNumberParamSchema },
      responses: {
        200: { description: "Delivery", content: { "application/json": { schema: DeliverySchema } } },
        404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
      },
    }),
    async (c) => {
      const { dlv_number } = c.req.valid("param");
      const dlv = await getDeliveryByNumber(c.env.DB, dlv_number);
      if (!dlv) return c.json({ error: "not_found", message: "Delivery not found" }, 404);
      return c.json(dlv, 200);
    }
  );

  api.openapi(
    createRoute({
      method: "get",
      path: "/deliveries/{dlv_number}/flow",
      tags: ["Deliveries"],
      summary: "Get the document flow for a delivery",
      security: [{ Bearer: [] }],
      request: { params: DlvNumberParamSchema },
      responses: {
        200: { description: "Document flow", content: { "application/json": { schema: z.array(FlowEntrySchema) } } },
        404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
      },
    }),
    async (c) => {
      const { dlv_number } = c.req.valid("param");
      const dlv = await getDeliveryByNumber(c.env.DB, dlv_number);
      if (!dlv) return c.json({ error: "not_found", message: "Delivery not found" }, 404);
      return c.json(await getFlow(c.env.DB, "delivery", dlv.id), 200);
    }
  );

  // Billing Documents ------------------------------------------------------------

  api.openapi(
    createRoute({
      method: "get",
      path: "/billing",
      tags: ["Billing"],
      summary: "List billing documents",
      security: [{ Bearer: [] }],
      responses: { 200: { description: "List of billing documents", content: { "application/json": { schema: z.array(BillingDocumentSchema) } } } },
    }),
    async (c) => c.json(await listBillingDocuments(c.env.DB), 200)
  );

  api.openapi(
    createRoute({
      method: "post",
      path: "/billing",
      tags: ["Billing"],
      summary: "Create a billing document for a delivered sales order",
      security: [{ Bearer: [] }],
      request: { body: { content: { "application/json": { schema: BillingInputSchema } } } },
      responses: {
        201: { description: "Created billing document", content: { "application/json": { schema: BillingDocumentSchema } } },
        400: { description: "Sales order is not Delivered", content: { "application/json": { schema: ErrorSchema } } },
        404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
        409: { description: "Sales order is Paid and locked", content: { "application/json": { schema: ErrorSchema } } },
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      try {
        return c.json(await createBilling(c.env.DB, body.so_number), 201);
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
      path: "/billing/{bill_number}",
      tags: ["Billing"],
      summary: "Get a billing document",
      security: [{ Bearer: [] }],
      request: { params: BillNumberParamSchema },
      responses: {
        200: { description: "Billing document", content: { "application/json": { schema: BillingDocumentSchema } } },
        404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
      },
    }),
    async (c) => {
      const { bill_number } = c.req.valid("param");
      const bill = await getBillingByNumber(c.env.DB, bill_number);
      if (!bill) return c.json({ error: "not_found", message: "Billing document not found" }, 404);
      return c.json(bill, 200);
    }
  );

  api.openapi(
    createRoute({
      method: "get",
      path: "/billing/{bill_number}/flow",
      tags: ["Billing"],
      summary: "Get the document flow for a billing document",
      security: [{ Bearer: [] }],
      request: { params: BillNumberParamSchema },
      responses: {
        200: { description: "Document flow", content: { "application/json": { schema: z.array(FlowEntrySchema) } } },
        404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
      },
    }),
    async (c) => {
      const { bill_number } = c.req.valid("param");
      const bill = await getBillingByNumber(c.env.DB, bill_number);
      if (!bill) return c.json({ error: "not_found", message: "Billing document not found" }, 404);
      return c.json(await getFlow(c.env.DB, "billing_document", bill.id), 200);
    }
  );
}
