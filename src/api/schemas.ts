import { z } from "@hono/zod-openapi";

export const QuoteStatusSchema = z.enum(["Draft", "Sent", "Won", "Lost"]).openapi("QuoteStatus");

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

export const QuoteItemSchema = z
  .object({
    id: z.number().int(),
    quote_id: z.number().int(),
    description: z.string(),
    quantity: z.number().int(),
    unit_price: z.number(),
    line_total: z.number(),
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
  })
  .openapi("Quote");

export const QuoteWithItemsSchema = QuoteSchema.extend({
  items: z.array(QuoteItemSchema),
}).openapi("QuoteWithItems");

export const QuoteItemInputSchema = z
  .object({
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
  })
  .openapi("QuoteInput");

export const ErrorSchema = z
  .object({
    error: z.string(),
    message: z.string().optional(),
  })
  .openapi("Error");

export const CustomerIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/).openapi({ param: { name: "id", in: "path" }, example: "1" }),
});

export const QuoteRefParamSchema = z.object({
  ref: z.string().openapi({ param: { name: "ref", in: "path" }, example: "Q-2026-0001" }),
});
