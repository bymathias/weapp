import type { Context, Hono } from "hono";
import type { Env } from "../../types";
import { getCustomer, getCustomerByRefId, listCustomers, listMaterials } from "../../db/master";
import {
  createBilling,
  createDelivery,
  createSalesOrder,
  getBillingByNumber,
  getDeliveryByNumber,
  getSalesOrder,
  getSalesOrderByNumber,
  listBillingDocuments,
  listDeliveries,
  listSalesOrders,
  releaseCreditBlock,
} from "../../db/o2c";
import { createPayment } from "../../db/payments";
import { getFlow } from "../../lib/flow";
import {
  billingDetailPage,
  billingListPage,
  deliveriesListPage,
  deliveryDetailPage,
  newSalesOrderPage,
  salesOrderDetailPage,
  salesOrdersListPage,
} from "../pages/o2c";
import { notFoundPage } from "../pages/shared";
import { toArray } from "../form";

function notFound(c: Context<Env>, entity: string, identifier: string) {
  return c.html(notFoundPage({ entity, identifier }), 404);
}

export function registerO2CUiRoutes(ui: Hono<Env>) {
  // Sales Orders ---------------------------------------------------------------

  ui.get("/sales-orders", async (c) => {
    const rows = await listSalesOrders(c.env.DB);
    return c.html(salesOrdersListPage(rows));
  });

  ui.get("/sales-orders/new", async (c) => {
    const [customers, materials] = await Promise.all([listCustomers(c.env.DB), listMaterials(c.env.DB)]);
    return c.html(newSalesOrderPage(customers, materials));
  });

  ui.post("/sales-orders/new", async (c) => {
    const body = await c.req.parseBody({ all: true });
    const customerRef = typeof body.customer_ref === "string" ? body.customer_ref : "";
    const customer = await getCustomerByRefId(c.env.DB, customerRef);
    const customers = await listCustomers(c.env.DB);
    const materials = await listMaterials(c.env.DB);

    if (!customer) return c.html(newSalesOrderPage(customers, materials, { error: "Select a customer." }), 400);

    const customerPoNumber = typeof body.customer_po_number === "string" ? body.customer_po_number.trim() : "";
    const sourceQuoteRef = typeof body.source_quote_ref === "string" ? body.source_quote_ref.trim() : "";

    if (!customerPoNumber || !sourceQuoteRef) {
      return c.html(newSalesOrderPage(customers, materials, { error: "Customer PO Number and Quote Ref are required." }), 400);
    }

    const descriptions = toArray(body["description[]"]);
    const qtys = toArray(body["qty[]"]);
    const unitPrices = toArray(body["unit_price[]"]);
    const materialCodes = toArray(body["material_code[]"]);

    const items = descriptions
      .map((description, i) => ({
        description,
        qty: Number(qtys[i]) || 0,
        unit_price: Number(unitPrices[i]) || 0,
        material_code: materialCodes[i] && materialCodes[i].trim() !== "" ? materialCodes[i] : undefined,
      }))
      .filter((item) => item.description.trim() !== "" && item.qty > 0);

    if (items.length === 0) {
      return c.html(newSalesOrderPage(customers, materials, { error: "Add at least one line item." }), 400);
    }

    const so = await createSalesOrder(c.env.DB, customer.id, items, sourceQuoteRef, customerPoNumber);
    return c.redirect(`/sales-orders/${so.so_number}`);
  });

  ui.get("/sales-orders/:so_number", async (c) => {
    const soNumber = c.req.param("so_number");
    const so = await getSalesOrderByNumber(c.env.DB, soNumber);
    if (!so) return notFound(c, "Sales Order", soNumber);
    const customer = await getCustomer(c.env.DB, so.customer_id);
    if (!customer) return notFound(c, "Customer", String(so.customer_id));
    const flow = await getFlow(c.env.DB, "sales_order", so.id);
    return c.html(salesOrderDetailPage(so, customer, flow));
  });

  ui.post("/sales-orders/:so_number/release-credit", async (c) => {
    const soNumber = c.req.param("so_number");
    try {
      await releaseCreditBlock(c.env.DB, soNumber);
    } catch {
      // Button is only shown when the action is valid; swallow and re-render current state.
    }
    return c.redirect(`/sales-orders/${soNumber}`);
  });

  ui.post("/sales-orders/:so_number/deliver", async (c) => {
    const soNumber = c.req.param("so_number");
    try {
      await createDelivery(c.env.DB, soNumber);
    } catch {
      // ditto
    }
    return c.redirect(`/sales-orders/${soNumber}`);
  });

  ui.post("/sales-orders/:so_number/bill", async (c) => {
    const soNumber = c.req.param("so_number");
    try {
      await createBilling(c.env.DB, soNumber);
    } catch {
      // ditto
    }
    return c.redirect(`/sales-orders/${soNumber}`);
  });

  // Deliveries ------------------------------------------------------------------

  ui.get("/deliveries", async (c) => {
    const rows = await listDeliveries(c.env.DB);
    return c.html(deliveriesListPage(rows));
  });

  ui.get("/deliveries/:dlv_number", async (c) => {
    const dlvNumber = c.req.param("dlv_number");
    const dlv = await getDeliveryByNumber(c.env.DB, dlvNumber);
    if (!dlv) return notFound(c, "Delivery", dlvNumber);
    const so = await getSalesOrder(c.env.DB, dlv.so_id);
    if (!so) return notFound(c, "Sales Order", String(dlv.so_id));
    const customer = await getCustomer(c.env.DB, so.customer_id);
    if (!customer) return notFound(c, "Customer", String(so.customer_id));
    const flow = await getFlow(c.env.DB, "delivery", dlv.id);
    return c.html(deliveryDetailPage(dlv, so, customer, flow));
  });

  // Billing Documents --------------------------------------------------------------

  ui.get("/billing", async (c) => {
    const rows = await listBillingDocuments(c.env.DB);
    return c.html(billingListPage(rows));
  });

  ui.get("/billing/:bill_number", async (c) => {
    const billNumber = c.req.param("bill_number");
    const bill = await getBillingByNumber(c.env.DB, billNumber);
    if (!bill) return notFound(c, "Billing Document", billNumber);
    const so = await getSalesOrder(c.env.DB, bill.so_id);
    const customer = await getCustomer(c.env.DB, bill.customer_id);
    if (!so || !customer) return notFound(c, "Sales Order", String(bill.so_id));
    const flow = await getFlow(c.env.DB, "billing_document", bill.id);
    return c.html(billingDetailPage(bill, so, customer, flow));
  });

  ui.post("/billing/:bill_number/clear", async (c) => {
    const billNumber = c.req.param("bill_number");
    try {
      await createPayment(c.env.DB, "billing_document", billNumber);
    } catch {
      // ditto
    }
    return c.redirect(`/billing/${billNumber}`);
  });
}
