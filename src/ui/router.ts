import { Hono, type Context } from "hono";
import type { Env } from "../types";
import { createSession, clearSession, requireUiAuth } from "../lib/session";
import {
  getCustomer,
  getCustomerByRefId,
  listCustomers,
  listQuotesForCustomer,
  getQuoteByRef,
  createQuote,
  updateQuote,
  createCustomer,
  getDashboardStats,
  listQuotes,
} from "../db/queries";
import {
  loginPage,
  dashboardPage,
  quotesResultsPanel,
  customersPage,
  customersResultsPanel,
  customerPage,
  newCustomerPage,
  newQuotePage,
  editQuotePage,
  quoteDetailPage,
  notFoundPage,
} from "./pages";
import type { QuoteStatus } from "../types";

export const uiRouter = new Hono<Env>();

function notFound(c: Context<Env>, entity: "Customer" | "Quote", identifier: string) {
  return c.html(notFoundPage({ entity, identifier }), 404);
}

// Live search sends this header on its fetch() calls so the route can
// respond with just the results fragment instead of the full page.
function isLiveSearch(c: Context<Env>): boolean {
  return c.req.header("X-Requested-With") === "fetch";
}

uiRouter.get("/login", async (c) => {
  const error = c.req.query("error");
  return c.html(
    loginPage({
      error: error === "missing" || error === "invalid" ? error : undefined,
      username: c.req.query("username") ?? "",
    })
  );
});

uiRouter.post("/login", async (c) => {
  const body = await c.req.parseBody();
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const usernameParam = `username=${encodeURIComponent(username)}`;

  if (!username || !password) {
    return c.redirect(`/login?error=missing&${usernameParam}`);
  }

  if (username === c.env.UI_USERNAME && password === c.env.UI_PASSWORD) {
    await createSession(c);
    return c.redirect("/");
  }
  return c.redirect(`/login?error=invalid&${usernameParam}`);
});

uiRouter.get("/logout", async (c) => {
  clearSession(c);
  return c.redirect("/login");
});

uiRouter.use("/*", requireUiAuth);

uiRouter.get("/", async (c) => {
  const search = c.req.query("q") ?? "";
  const page = Math.max(1, Number(c.req.query("page")) || 1);

  if (isLiveSearch(c)) {
    const quoteList = await listQuotes(c.env.DB, { search, page, pageSize: 10 });
    return c.html(quotesResultsPanel(quoteList, search));
  }

  const [stats, quoteList] = await Promise.all([
    getDashboardStats(c.env.DB),
    listQuotes(c.env.DB, { search, page, pageSize: 10 }),
  ]);
  return c.html(dashboardPage(stats, quoteList, search));
});

uiRouter.get("/customers", async (c) => {
  const search = c.req.query("q") ?? "";
  const customers = await listCustomers(c.env.DB, search);

  if (isLiveSearch(c)) {
    return c.html(customersResultsPanel(customers, search));
  }

  return c.html(customersPage(customers, search));
});

uiRouter.get("/customers/new", async (c) => {
  return c.html(newCustomerPage());
});

uiRouter.post("/customers/new", async (c) => {
  const body = await c.req.parseBody();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const industry = typeof body.industry === "string" ? body.industry.trim() : "";
  const country = typeof body.country === "string" ? body.country.trim() : "";
  const accountOwner = typeof body.account_owner === "string" ? body.account_owner.trim() : "";

  if (!name || !industry || !country || !accountOwner) {
    return c.html(newCustomerPage({ error: "All fields are required." }), 400);
  }

  const customer = await createCustomer(c.env.DB, { name, industry, country, account_owner: accountOwner });
  return c.redirect(`/customers/${customer.ref_id}`);
});

uiRouter.get("/customers/:refId", async (c) => {
  const refId = c.req.param("refId");
  const customer = await getCustomerByRefId(c.env.DB, refId);
  if (!customer) return notFound(c, "Customer", refId);
  const quotes = await listQuotesForCustomer(c.env.DB, customer.id);
  return c.html(customerPage(customer, quotes));
});

uiRouter.get("/quotes/new", async (c) => {
  const refId = c.req.query("customer_id") ?? "";
  if (!refId) {
    const customers = await listCustomers(c.env.DB);
    return c.html(newQuotePage(null, customers));
  }
  const customer = await getCustomerByRefId(c.env.DB, refId);
  if (!customer) return notFound(c, "Customer", refId);
  return c.html(newQuotePage(customer, []));
});

uiRouter.post("/quotes/new", async (c) => {
  const body = await c.req.parseBody({ all: true });
  const customerId = Number(body.customer_id);
  const customer = await getCustomer(c.env.DB, customerId);
  if (!customer) return notFound(c, "Customer", String(body.customer_id ?? ""));

  const { vendor, status, marginPct, items } = parseQuoteForm(body);

  if (items.length === 0) {
    return c.html(newQuotePage(customer, [], { error: "Add at least one line item with a SKU, description, and quantity." }), 400);
  }

  const quote = await createQuote(c.env.DB, customerId, { vendor, status, margin_pct: marginPct, items });
  return c.redirect(`/quotes/${quote.ref}`);
});

uiRouter.get("/quotes/:ref", async (c) => {
  const ref = c.req.param("ref");
  const quote = await getQuoteByRef(c.env.DB, ref);
  if (!quote) return notFound(c, "Quote", ref);
  const customer = await getCustomer(c.env.DB, quote.customer_id);
  if (!customer) return notFound(c, "Customer", String(quote.customer_id));
  return c.html(quoteDetailPage(customer, quote));
});

uiRouter.get("/quotes/:ref/edit", async (c) => {
  const ref = c.req.param("ref");
  const quote = await getQuoteByRef(c.env.DB, ref);
  if (!quote) return notFound(c, "Quote", ref);
  if (quote.status === "Won") return c.redirect(`/quotes/${ref}`);
  const customer = await getCustomer(c.env.DB, quote.customer_id);
  if (!customer) return notFound(c, "Customer", String(quote.customer_id));
  return c.html(editQuotePage(customer, quote));
});

uiRouter.post("/quotes/:ref/edit", async (c) => {
  const ref = c.req.param("ref");
  const existing = await getQuoteByRef(c.env.DB, ref);
  if (!existing) return notFound(c, "Quote", ref);
  const customer = await getCustomer(c.env.DB, existing.customer_id);
  if (!customer) return notFound(c, "Customer", String(existing.customer_id));

  if (existing.status === "Won") return c.redirect(`/quotes/${ref}`);

  const body = await c.req.parseBody({ all: true });
  const { vendor, status, marginPct, items } = parseQuoteForm(body);

  if (items.length === 0) {
    return c.html(editQuotePage(customer, existing, { error: "Add at least one line item with a SKU, description, and quantity." }), 400);
  }

  try {
    const quote = await updateQuote(c.env.DB, ref, { vendor, status, margin_pct: marginPct, items });
    return c.redirect(`/quotes/${quote.ref}`);
  } catch (err) {
    if (err instanceof Error && err.message === "won_locked") {
      return c.redirect(`/quotes/${ref}`);
    }
    throw err;
  }
});

function parseQuoteForm(body: Record<string, string | File | (string | File)[]>) {
  const vendor = typeof body.vendor === "string" ? body.vendor : "";
  const status = (typeof body.status === "string" ? body.status : "Draft") as QuoteStatus;
  const marginPct = Number(body.margin_pct) || 0;

  const skus = toArray(body["sku[]"]);
  const descriptions = toArray(body["description[]"]);
  const quantities = toArray(body["quantity[]"]);
  const unitPrices = toArray(body["unit_price[]"]);

  const items = descriptions
    .map((description, i) => ({
      sku: skus[i] ?? "",
      description,
      quantity: Number(quantities[i]) || 0,
      unit_price: Number(unitPrices[i]) || 0,
    }))
    .filter((item) => item.sku.trim() !== "" && item.description.trim() !== "" && item.quantity > 0);

  return { vendor, status, marginPct, items };
}

function toArray(value: string | File | (string | File)[] | undefined): string[] {
  if (value === undefined) return [];
  const arr = Array.isArray(value) ? value : [value];
  return arr.map((v) => (typeof v === "string" ? v : ""));
}
