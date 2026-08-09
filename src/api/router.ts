import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { Env } from "../types";
import { requireBearerAuth } from "../lib/bearer";
import { isAuthenticated } from "../lib/session";
import { getCustomer, listCustomers, listQuotesForCustomer, getQuoteByRef, createQuote, updateQuote, createCustomer } from "../db/queries";
import { generateQuotePdf } from "../pdf";
import {
  CustomerSchema,
  CustomerInputSchema,
  CustomerIdParamSchema,
  QuoteRefParamSchema,
  QuoteSchema,
  QuoteWithItemsSchema,
  QuoteInputSchema,
  ErrorSchema,
} from "./schemas";

export const apiRouter = new OpenAPIHono<Env>().basePath("/api");

apiRouter.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
  type: "http",
  scheme: "bearer",
  description: "Obtain via POST /oauth/token (client_credentials grant).",
});

// The PDF link is also used directly by a logged-in browser (the quote
// detail page's "Download PDF" button), so accept a UI session cookie
// there in addition to the bearer token API automation uses everywhere else.
apiRouter.use("/quotes/:ref/pdf", async (c, next) => {
  if (await isAuthenticated(c)) {
    c.set("apiClientId", "ui-session");
  }
  await next();
});

apiRouter.use("/*", requireBearerAuth);

// GET /api/customers
apiRouter.openapi(
  createRoute({
    method: "get",
    path: "/customers",
    tags: ["Customers"],
    summary: "List all customers",
    security: [{ Bearer: [] }],
    responses: {
      200: { description: "List of customers", content: { "application/json": { schema: z.array(CustomerSchema) } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
    },
  }),
  async (c) => {
    const customers = await listCustomers(c.env.DB);
    return c.json(customers, 200);
  }
);

// POST /api/customers
apiRouter.openapi(
  createRoute({
    method: "post",
    path: "/customers",
    tags: ["Customers"],
    summary: "Create a customer",
    security: [{ Bearer: [] }],
    request: {
      body: { content: { "application/json": { schema: CustomerInputSchema } } },
    },
    responses: {
      201: { description: "Created customer", content: { "application/json": { schema: CustomerSchema } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
    },
  }),
  async (c) => {
    const body = c.req.valid("json");
    const customer = await createCustomer(c.env.DB, body);
    return c.json(customer, 201);
  }
);

// GET /api/customers/:id
apiRouter.openapi(
  createRoute({
    method: "get",
    path: "/customers/{id}",
    tags: ["Customers"],
    summary: "Get a single customer",
    security: [{ Bearer: [] }],
    request: { params: CustomerIdParamSchema },
    responses: {
      200: { description: "Customer", content: { "application/json": { schema: CustomerSchema } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    },
  }),
  async (c) => {
    const id = Number(c.req.valid("param").id);
    const customer = await getCustomer(c.env.DB, id);
    if (!customer) return c.json({ error: "not_found", message: "Customer not found" }, 404);
    return c.json(customer, 200);
  }
);

// GET /api/customers/:id/quotes
apiRouter.openapi(
  createRoute({
    method: "get",
    path: "/customers/{id}/quotes",
    tags: ["Quotes"],
    summary: "List quotes for a customer",
    security: [{ Bearer: [] }],
    request: { params: CustomerIdParamSchema },
    responses: {
      200: { description: "List of quotes", content: { "application/json": { schema: z.array(QuoteSchema) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    },
  }),
  async (c) => {
    const id = Number(c.req.valid("param").id);
    const customer = await getCustomer(c.env.DB, id);
    if (!customer) return c.json({ error: "not_found", message: "Customer not found" }, 404);
    const quotes = await listQuotesForCustomer(c.env.DB, id);
    return c.json(quotes, 200);
  }
);

// POST /api/customers/:id/quotes
apiRouter.openapi(
  createRoute({
    method: "post",
    path: "/customers/{id}/quotes",
    tags: ["Quotes"],
    summary: "Create a quote for a customer",
    security: [{ Bearer: [] }],
    request: {
      params: CustomerIdParamSchema,
      body: { content: { "application/json": { schema: QuoteInputSchema } } },
    },
    responses: {
      201: { description: "Created quote", content: { "application/json": { schema: QuoteWithItemsSchema } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    },
  }),
  async (c) => {
    const id = Number(c.req.valid("param").id);
    const customer = await getCustomer(c.env.DB, id);
    if (!customer) return c.json({ error: "not_found", message: "Customer not found" }, 404);
    const body = c.req.valid("json");
    const quote = await createQuote(c.env.DB, id, body);
    return c.json(quote, 201);
  }
);

// GET /api/quotes/:ref
apiRouter.openapi(
  createRoute({
    method: "get",
    path: "/quotes/{ref}",
    tags: ["Quotes"],
    summary: "Get a quote with items and totals",
    security: [{ Bearer: [] }],
    request: { params: QuoteRefParamSchema },
    responses: {
      200: { description: "Quote", content: { "application/json": { schema: QuoteWithItemsSchema } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    },
  }),
  async (c) => {
    const { ref } = c.req.valid("param");
    const quote = await getQuoteByRef(c.env.DB, ref);
    if (!quote) return c.json({ error: "not_found", message: "Quote not found" }, 404);
    return c.json(quote, 200);
  }
);

// PUT /api/quotes/:ref
apiRouter.openapi(
  createRoute({
    method: "put",
    path: "/quotes/{ref}",
    tags: ["Quotes"],
    summary: "Update a quote (locked once Won)",
    security: [{ Bearer: [] }],
    request: {
      params: QuoteRefParamSchema,
      body: { content: { "application/json": { schema: QuoteInputSchema } } },
    },
    responses: {
      200: { description: "Updated quote", content: { "application/json": { schema: QuoteWithItemsSchema } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
      409: { description: "Quote is Won and locked", content: { "application/json": { schema: ErrorSchema } } },
    },
  }),
  async (c) => {
    const { ref } = c.req.valid("param");
    const body = c.req.valid("json");
    try {
      const quote = await updateQuote(c.env.DB, ref, body);
      return c.json(quote, 200);
    } catch (err) {
      if (err instanceof Error && err.message === "not_found") {
        return c.json({ error: "not_found", message: "Quote not found" }, 404);
      }
      if (err instanceof Error && err.message === "won_locked") {
        return c.json({ error: "won_locked", message: "Quote is Won and cannot be modified" }, 409);
      }
      throw err;
    }
  }
);

// GET /api/quotes/:ref/pdf
apiRouter.openapi(
  createRoute({
    method: "get",
    path: "/quotes/{ref}/pdf",
    tags: ["Quotes"],
    summary: "Download the quote as a PDF",
    security: [{ Bearer: [] }],
    request: { params: QuoteRefParamSchema },
    responses: {
      200: { description: "PDF document", content: { "application/pdf": { schema: { type: "string", format: "binary" } } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    },
  }),
  async (c) => {
    const { ref } = c.req.valid("param");
    const quote = await getQuoteByRef(c.env.DB, ref);
    if (!quote) return c.json({ error: "not_found", message: "Quote not found" }, 404);
    const customer = await getCustomer(c.env.DB, quote.customer_id);
    if (!customer) return c.json({ error: "not_found", message: "Customer not found" }, 404);
    const pdfBytes = await generateQuotePdf(quote, customer);
    return new Response(pdfBytes as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${quote.ref}.pdf"`,
      },
    });
  }
);
