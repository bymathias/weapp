import { z } from "@hono/zod-openapi";

export const QuoteStatusSchema = z.enum(["Draft", "Sent", "Won", "Lost"]).openapi("QuoteStatus");
export const QuoteCurrencySchema = z.enum(["EUR", "USD", "GBP"]).openapi("QuoteCurrency");

export const CustomerSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    ref_id: z.string(),
    industry: z.string(),
    country: z.string(),
    account_owner: z.string(),
    created_at: z.string(),
  })
  .openapi("Customer");

export const CustomerInputSchema = z
  .object({
    name: z.string().min(1),
    industry: z.string().min(1),
    country: z.string().min(1),
    account_owner: z.string().min(1),
  })
  .openapi("CustomerInput");

export const QuoteItemSchema = z
  .object({
    id: z.number().int(),
    quote_id: z.number().int(),
    sku: z.string(),
    description: z.string(),
    quantity: z.number().int(),
    unit_price: z.number(),
    line_total: z.number(),
    sell_unit_price: z.number().openapi({ description: "Customer unit price: round2(unit_price × (1 + margin_pct/100))" }),
    sell_line_total: z.number().openapi({ description: "Customer line total: round2(quantity × sell_unit_price)" }),
  })
  .openapi("QuoteItem");

export const QuoteSchema = z
  .object({
    id: z.number().int(),
    ref: z.string(),
    customer_id: z.number().int(),
    vendor: z.string(),
    status: QuoteStatusSchema,
    margin_pct: z.number(),
    subtotal: z.number(),
    total_amount: z.number(),
    created_at: z.string(),
    currency: QuoteCurrencySchema,
    valid_until: z.string().nullable().openapi({ example: "2026-12-06" }),
    payment_terms: z.string().openapi({ example: "Net 30" }),
  })
  .openapi("Quote");

export const QuoteWithItemsSchema = QuoteSchema.extend({
  items: z.array(QuoteItemSchema),
}).openapi("QuoteWithItems");

export const QuoteItemInputSchema = z
  .object({
    sku: z.string().min(1),
    description: z.string().min(1),
    quantity: z.number().int().positive(),
    unit_price: z.number().nonnegative(),
  })
  .openapi("QuoteItemInput");

export const QuoteInputSchema = z
  .object({
    vendor: z.string().min(1),
    status: QuoteStatusSchema,
    margin_pct: z.number().min(0),
    items: z.array(QuoteItemInputSchema).min(1),
    // Optional terms. On create: EUR, created date + 30 days, Net 30. On
    // update: omitted fields keep their current value.
    currency: QuoteCurrencySchema.optional(),
    valid_until: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "ISO date YYYY-MM-DD")
      .optional()
      .openapi({ example: "2026-12-06" }),
    payment_terms: z.string().min(1).optional().openapi({ example: "Net 30" }),
  })
  .openapi("QuoteInput");

export const ErrorSchema = z
  .object({
    error: z.string(),
    message: z.string().optional(),
  })
  .openapi("Error");

export const CustomerRefIdParamSchema = z.object({
  refId: z.string().openapi({ param: { name: "refId", in: "path" }, example: "CUST-0001" }),
});

export const PdfDownloadQuerySchema = z.object({
  download: z
    .string()
    .optional()
    .openapi({ param: { name: "download", in: "query" }, example: "1", description: "1 = Content-Disposition: attachment (default inline)" }),
});

export const QuoteRefParamSchema = z.object({
  ref: z.string().openapi({ param: { name: "ref", in: "path" }, example: "Q-2026-0001" }),
});
