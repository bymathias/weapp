import type { Customer, Quote, QuoteItem, QuoteStatus, QuoteWithItems } from "../types";
import { computeItems, computeSubtotal, computeTotalAmount, nextQuoteRef, type LineItemInput } from "../lib/totals";

export async function listCustomers(db: D1Database): Promise<Customer[]> {
  const { results } = await db.prepare(`SELECT * FROM customers ORDER BY name`).all<Customer>();
  return results ?? [];
}

export async function getCustomer(db: D1Database, id: number): Promise<Customer | null> {
  return (await db.prepare(`SELECT * FROM customers WHERE id = ?1`).bind(id).first<Customer>()) ?? null;
}

export async function listQuotesForCustomer(db: D1Database, customerId: number): Promise<Quote[]> {
  const { results } = await db
    .prepare(`SELECT * FROM quotes WHERE customer_id = ?1 ORDER BY created_at DESC, id DESC`)
    .bind(customerId)
    .all<Quote>();
  return results ?? [];
}

export async function getQuoteByRef(db: D1Database, ref: string): Promise<QuoteWithItems | null> {
  const quote = await db.prepare(`SELECT * FROM quotes WHERE ref = ?1`).bind(ref).first<Quote>();
  if (!quote) return null;
  const { results } = await db
    .prepare(`SELECT * FROM quote_items WHERE quote_id = ?1 ORDER BY id`)
    .bind(quote.id)
    .all<QuoteItem>();
  return { ...quote, items: results ?? [] };
}

export interface CreateQuoteInput {
  vendor: string;
  status: QuoteStatus;
  margin_pct: number;
  items: LineItemInput[];
}

export async function createQuote(
  db: D1Database,
  customerId: number,
  input: CreateQuoteInput
): Promise<QuoteWithItems> {
  const computedItems = computeItems(input.items);
  const subtotal = computeSubtotal(computedItems);
  const totalAmount = computeTotalAmount(subtotal, input.margin_pct);
  const ref = await nextQuoteRef(db);

  const result = await db
    .prepare(
      `INSERT INTO quotes (ref, customer_id, vendor, status, margin_pct, subtotal, total_amount)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
    )
    .bind(ref, customerId, input.vendor, input.status, input.margin_pct, subtotal, totalAmount)
    .run();

  const quoteId = result.meta.last_row_id as number;

  for (const item of computedItems) {
    await db
      .prepare(
        `INSERT INTO quote_items (quote_id, description, quantity, unit_price, line_total)
         VALUES (?1, ?2, ?3, ?4, ?5)`
      )
      .bind(quoteId, item.description, item.quantity, item.unit_price, item.line_total)
      .run();
  }

  return (await getQuoteByRef(db, ref))!;
}

export async function updateQuote(
  db: D1Database,
  ref: string,
  input: CreateQuoteInput
): Promise<QuoteWithItems> {
  const existing = await getQuoteByRef(db, ref);
  if (!existing) throw new Error("not_found");
  if (existing.status === "Won") throw new Error("won_locked");

  const computedItems = computeItems(input.items);
  const subtotal = computeSubtotal(computedItems);
  const totalAmount = computeTotalAmount(subtotal, input.margin_pct);

  await db
    .prepare(
      `UPDATE quotes SET vendor = ?1, status = ?2, margin_pct = ?3, subtotal = ?4, total_amount = ?5 WHERE id = ?6`
    )
    .bind(input.vendor, input.status, input.margin_pct, subtotal, totalAmount, existing.id)
    .run();

  await db.prepare(`DELETE FROM quote_items WHERE quote_id = ?1`).bind(existing.id).run();

  for (const item of computedItems) {
    await db
      .prepare(
        `INSERT INTO quote_items (quote_id, description, quantity, unit_price, line_total)
         VALUES (?1, ?2, ?3, ?4, ?5)`
      )
      .bind(existing.id, item.description, item.quantity, item.unit_price, item.line_total)
      .run();
  }

  return (await getQuoteByRef(db, ref))!;
}
