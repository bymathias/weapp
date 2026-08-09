import { Hono } from "hono";
import type { Env } from "../types";
import { createSession, clearSession, requireUiAuth } from "../lib/session";
import { getCustomer, listCustomers, listQuotesForCustomer, getQuoteByRef, createQuote } from "../db/queries";
import { loginPage, dashboardPage, customerPage, newQuotePage, quoteDetailPage } from "./pages";
import type { QuoteStatus } from "../types";

export const uiRouter = new Hono<Env>();

uiRouter.get("/login", async (c) => {
  return c.html(loginPage({ error: c.req.query("error") === "1" }));
});

uiRouter.post("/login", async (c) => {
  const body = await c.req.parseBody();
  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (username === c.env.UI_USERNAME && password === c.env.UI_PASSWORD) {
    await createSession(c);
    return c.redirect("/");
  }
  return c.redirect("/login?error=1");
});

uiRouter.get("/logout", async (c) => {
  clearSession(c);
  return c.redirect("/login");
});

uiRouter.use("/*", requireUiAuth);

uiRouter.get("/", async (c) => {
  const customers = await listCustomers(c.env.DB);
  return c.html(dashboardPage(customers));
});

uiRouter.get("/customers/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const customer = await getCustomer(c.env.DB, id);
  if (!customer) return c.notFound();
  const quotes = await listQuotesForCustomer(c.env.DB, id);
  return c.html(customerPage(customer, quotes));
});

uiRouter.get("/quotes/new", async (c) => {
  const customerId = Number(c.req.query("customer_id"));
  const customer = await getCustomer(c.env.DB, customerId);
  if (!customer) return c.notFound();
  return c.html(newQuotePage(customer));
});

uiRouter.post("/quotes/new", async (c) => {
  const body = await c.req.parseBody({ all: true });
  const customerId = Number(body.customer_id);
  const customer = await getCustomer(c.env.DB, customerId);
  if (!customer) return c.notFound();

  const vendor = typeof body.vendor === "string" ? body.vendor : "";
  const status = (typeof body.status === "string" ? body.status : "Draft") as QuoteStatus;
  const marginPct = Number(body.margin_pct) || 0;

  const descriptions = toArray(body["description[]"]);
  const quantities = toArray(body["quantity[]"]);
  const unitPrices = toArray(body["unit_price[]"]);

  const items = descriptions
    .map((description, i) => ({
      description,
      quantity: Number(quantities[i]) || 0,
      unit_price: Number(unitPrices[i]) || 0,
    }))
    .filter((item) => item.description.trim() !== "" && item.quantity > 0);

  if (items.length === 0) {
    return c.html(newQuotePage(customer, { error: "Add at least one line item with a description and quantity." }), 400);
  }

  const quote = await createQuote(c.env.DB, customerId, { vendor, status, margin_pct: marginPct, items });
  return c.redirect(`/quotes/${quote.ref}`);
});

uiRouter.get("/quotes/:ref", async (c) => {
  const ref = c.req.param("ref");
  const quote = await getQuoteByRef(c.env.DB, ref);
  if (!quote) return c.notFound();
  const customer = await getCustomer(c.env.DB, quote.customer_id);
  if (!customer) return c.notFound();
  return c.html(quoteDetailPage(customer, quote));
});

function toArray(value: string | File | (string | File)[] | undefined): string[] {
  if (value === undefined) return [];
  const arr = Array.isArray(value) ? value : [value];
  return arr.map((v) => (typeof v === "string" ? v : ""));
}
