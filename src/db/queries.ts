import type { Customer, Quote, QuoteItem, QuoteStatus, QuoteWithItems } from "../types";
import { computeItems, computeSubtotal, computeTotalAmount, nextCustomerRefId, nextQuoteRef, type LineItemInput } from "../lib/totals";

// Matches name, ref_id, industry, country, or account owner — the columns
// shown in the customers table.
export async function listCustomers(db: D1Database, search = ""): Promise<Customer[]> {
  const trimmed = search.trim();
  const like = `%${trimmed}%`;
  const { results } = await db
    .prepare(
      `SELECT * FROM customers
       WHERE ?1 = '' OR name LIKE ?2 OR ref_id LIKE ?2 OR industry LIKE ?2 OR country LIKE ?2 OR account_owner LIKE ?2
       ORDER BY name`
    )
    .bind(trimmed, like)
    .all<Customer>();
  return results ?? [];
}

export async function getCustomer(db: D1Database, id: number): Promise<Customer | null> {
  return (await db.prepare(`SELECT * FROM customers WHERE id = ?1`).bind(id).first<Customer>()) ?? null;
}

export async function getCustomerByRefId(db: D1Database, refId: string): Promise<Customer | null> {
  return (await db.prepare(`SELECT * FROM customers WHERE ref_id = ?1`).bind(refId).first<Customer>()) ?? null;
}

export interface CreateCustomerInput {
  name: string;
  industry: string;
  country: string;
  account_owner: string;
}

export async function createCustomer(db: D1Database, input: CreateCustomerInput): Promise<Customer> {
  const refId = await nextCustomerRefId(db);
  const result = await db
    .prepare(
      `INSERT INTO customers (name, ref_id, industry, country, account_owner)
       VALUES (?1, ?2, ?3, ?4, ?5)`
    )
    .bind(input.name, refId, input.industry, input.country, input.account_owner)
    .run();

  return (await getCustomer(db, result.meta.last_row_id as number))!;
}

export interface DashboardStats {
  totalCustomers: number;
  totalQuotes: number;
  draftCount: number;
  sentCount: number;
  wonCount: number;
  lostCount: number;
}

export async function getDashboardStats(db: D1Database): Promise<DashboardStats> {
  const customerRow = await db.prepare(`SELECT COUNT(*) as n FROM customers`).first<{ n: number }>();
  const { results } = await db
    .prepare(`SELECT status, COUNT(*) as n FROM quotes GROUP BY status`)
    .all<{ status: QuoteStatus; n: number }>();

  const counts: Record<QuoteStatus, number> = { Draft: 0, Sent: 0, Won: 0, Lost: 0 };
  for (const row of results ?? []) counts[row.status] = row.n;

  return {
    totalCustomers: customerRow?.n ?? 0,
    totalQuotes: counts.Draft + counts.Sent + counts.Won + counts.Lost,
    draftCount: counts.Draft,
    sentCount: counts.Sent,
    wonCount: counts.Won,
    lostCount: counts.Lost,
  };
}

export interface QuoteListRow {
  ref: string;
  customer_id: number;
  customer_name: string;
  customer_ref_id: string;
  vendor: string;
  status: QuoteStatus;
  total_amount: number;
  created_at: string;
}

export interface ListQuotesOptions {
  search?: string;
  page: number;
  pageSize: number;
}

export interface QuoteListResult {
  quotes: QuoteListRow[];
  total: number;
  page: number;
  pageSize: number;
}

// Matches quote ref, customer name, or customer ref_id (e.g. "CUST-0001") —
// the three human-facing identifiers a user would search by.
export async function listQuotes(db: D1Database, opts: ListQuotesOptions): Promise<QuoteListResult> {
  const search = (opts.search ?? "").trim();
  const like = `%${search}%`;
  const whereClause = `WHERE ?1 = '' OR q.ref LIKE ?2 OR c.name LIKE ?2 OR c.ref_id LIKE ?2`;

  const countRow = await db
    .prepare(`SELECT COUNT(*) as n FROM quotes q JOIN customers c ON c.id = q.customer_id ${whereClause}`)
    .bind(search, like)
    .first<{ n: number }>();
  const total = countRow?.n ?? 0;

  const totalPages = Math.max(1, Math.ceil(total / opts.pageSize));
  const page = Math.min(Math.max(1, opts.page), totalPages);
  const offset = (page - 1) * opts.pageSize;

  const { results } = await db
    .prepare(
      `SELECT q.ref, q.customer_id, c.name as customer_name, c.ref_id as customer_ref_id, q.vendor, q.status, q.total_amount, q.created_at
       FROM quotes q JOIN customers c ON c.id = q.customer_id
       ${whereClause}
       ORDER BY q.created_at DESC, q.id DESC LIMIT ?3 OFFSET ?4`
    )
    .bind(search, like, opts.pageSize, offset)
    .all<QuoteListRow>();

  return { quotes: results ?? [], total, page, pageSize: opts.pageSize };
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
