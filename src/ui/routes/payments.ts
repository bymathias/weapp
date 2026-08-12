import type { Hono } from "hono";
import type { Env } from "../../types";
import { listPayments } from "../../db/payments";
import { incomingPaymentsListPage, outgoingPaymentsListPage } from "../pages/payments";

export function registerPaymentsUiRoutes(ui: Hono<Env>) {
  ui.get("/payments", async (c) => {
    const rows = await listPayments(c.env.DB, "out");
    return c.html(outgoingPaymentsListPage(rows));
  });

  ui.get("/incoming-payments", async (c) => {
    const rows = await listPayments(c.env.DB, "in");
    return c.html(incomingPaymentsListPage(rows));
  });
}
