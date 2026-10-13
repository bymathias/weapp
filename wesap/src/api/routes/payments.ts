import { createRoute, z, type OpenAPIHono } from "@hono/zod-openapi";
import type { Env } from "../../types";
import { createPayment, getPaymentByNumber, listPayments } from "../../db/payments";
import { getFlow } from "../../lib/flow";
import { mapActionError } from "../errors";
import { ErrorSchema, FlowEntrySchema, PayNumberParamSchema, PaymentInputSchema, PaymentListQuerySchema, PaymentSchema } from "../schemas";

export function registerPaymentsRoutes(api: OpenAPIHono<Env>) {
  api.openapi(
    createRoute({
      method: "get",
      path: "/payments",
      tags: ["Payments"],
      summary: "List payments",
      description: "Optionally filter by direction: 'out' for vendor payments (AP), 'in' for customer receipts (AR).",
      security: [{ Bearer: [] }],
      request: { query: PaymentListQuerySchema },
      responses: { 200: { description: "List of payments", content: { "application/json": { schema: z.array(PaymentSchema) } } } },
    }),
    async (c) => {
      const { direction } = c.req.valid("query");
      return c.json(await listPayments(c.env.DB, direction), 200);
    }
  );

  // Unified Pay (supplier invoice, AP/"out") / Clear (billing document,
  // AR/"in") action — direction and amount follow from ref_type.
  api.openapi(
    createRoute({
      method: "post",
      path: "/payments",
      tags: ["Payments"],
      summary: "Post a payment against a supplier invoice or billing document",
      security: [{ Bearer: [] }],
      request: { body: { content: { "application/json": { schema: PaymentInputSchema } } } },
      responses: {
        201: { description: "Created payment", content: { "application/json": { schema: PaymentSchema } } },
        400: { description: "Document is not yet payable", content: { "application/json": { schema: ErrorSchema } } },
        404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
        409: { description: "Document is already Paid/Cleared", content: { "application/json": { schema: ErrorSchema } } },
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      try {
        return c.json(await createPayment(c.env.DB, body.ref_type, body.ref_number), 201);
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
      path: "/payments/{pay_number}",
      tags: ["Payments"],
      summary: "Get a payment",
      security: [{ Bearer: [] }],
      request: { params: PayNumberParamSchema },
      responses: {
        200: { description: "Payment", content: { "application/json": { schema: PaymentSchema } } },
        404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
      },
    }),
    async (c) => {
      const { pay_number } = c.req.valid("param");
      const payment = await getPaymentByNumber(c.env.DB, pay_number);
      if (!payment) return c.json({ error: "not_found", message: "Payment not found" }, 404);
      return c.json(payment, 200);
    }
  );

  api.openapi(
    createRoute({
      method: "get",
      path: "/payments/{pay_number}/flow",
      tags: ["Payments"],
      summary: "Get the document flow for a payment",
      security: [{ Bearer: [] }],
      request: { params: PayNumberParamSchema },
      responses: {
        200: { description: "Document flow", content: { "application/json": { schema: z.array(FlowEntrySchema) } } },
        404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
      },
    }),
    async (c) => {
      const { pay_number } = c.req.valid("param");
      const payment = await getPaymentByNumber(c.env.DB, pay_number);
      if (!payment) return c.json({ error: "not_found", message: "Payment not found" }, 404);
      return c.json(await getFlow(c.env.DB, "payment", payment.id), 200);
    }
  );
}
