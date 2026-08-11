import type { Hono } from "hono";
import type { Env } from "../../types";
import { createCustomer, listCustomers } from "../../db/master";
import { customersListPage, newCustomerPage } from "../pages/master";

export function registerMasterUiRoutes(ui: Hono<Env>) {
  ui.get("/customers", async (c) => {
    const customers = await listCustomers(c.env.DB);
    return c.html(customersListPage(customers));
  });

  ui.get("/customers/new", async (c) => {
    return c.html(newCustomerPage());
  });

  ui.post("/customers/new", async (c) => {
    const body = await c.req.parseBody();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const industry = typeof body.industry === "string" ? body.industry.trim() : "";
    const country = typeof body.country === "string" ? body.country.trim() : "";
    const accountOwner = typeof body.account_owner === "string" ? body.account_owner.trim() : "";
    const creditLimit = Number(body.credit_limit);
    const values = {
      name,
      industry,
      country,
      account_owner: accountOwner,
      credit_limit: typeof body.credit_limit === "string" ? body.credit_limit : "0",
    };

    if (!name || !industry || !country || !accountOwner || !Number.isFinite(creditLimit) || creditLimit < 0) {
      return c.html(newCustomerPage({ error: "Fill in all fields with a valid credit limit.", values }), 400);
    }

    await createCustomer(c.env.DB, { name, industry, country, account_owner: accountOwner, credit_limit: creditLimit });
    return c.redirect("/customers");
  });
}
