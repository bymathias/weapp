import type { Context, Hono } from "hono";
import type { Env, Material } from "../../types";
import { getMaterialByCode, getVendor, getVendorByRefId, listMaterials, listVendors } from "../../db/master";
import {
  createGoodsReceipt,
  createPurchaseOrder,
  createSupplierInvoice,
  getGoodsReceiptByNumber,
  getPurchaseOrder,
  getPurchaseOrderByNumber,
  getSupplierInvoiceByNumber,
  listGoodsReceipts,
  listPurchaseOrders,
  listSupplierInvoices,
  matchSupplierInvoice,
  releaseSupplierInvoice,
} from "../../db/p2p";
import { createPayment } from "../../db/payments";
import { getFlow } from "../../lib/flow";
import {
  goodsReceiptDetailPage,
  goodsReceiptsListPage,
  newGoodsReceiptPage,
  newPurchaseOrderPage,
  newSupplierInvoicePage,
  purchaseOrderDetailPage,
  purchaseOrdersListPage,
  supplierInvoiceDetailPage,
  supplierInvoicesListPage,
} from "../pages/p2p";
import { notFoundPage } from "../pages/shared";
import { toArray } from "../form";

function notFound(c: Context<Env>, entity: string, identifier: string) {
  return c.html(notFoundPage({ entity, identifier }), 404);
}

async function materialsMap(db: D1Database): Promise<Map<number, Material>> {
  const materials = await listMaterials(db);
  return new Map(materials.map((m) => [m.id, m]));
}

export function registerP2PUiRoutes(ui: Hono<Env>) {
  // Purchase Orders -----------------------------------------------------------

  ui.get("/purchase-orders", async (c) => {
    const rows = await listPurchaseOrders(c.env.DB);
    return c.html(purchaseOrdersListPage(rows));
  });

  ui.get("/purchase-orders/new", async (c) => {
    const [vendors, materials] = await Promise.all([listVendors(c.env.DB), listMaterials(c.env.DB)]);
    return c.html(newPurchaseOrderPage(vendors, materials));
  });

  ui.post("/purchase-orders/new", async (c) => {
    const body = await c.req.parseBody({ all: true });
    const vendorRef = typeof body.vendor_ref === "string" ? body.vendor_ref : "";
    const vendor = await getVendorByRefId(c.env.DB, vendorRef);
    const materials = await listMaterials(c.env.DB);
    const vendors = await listVendors(c.env.DB);

    if (!vendor) return c.html(newPurchaseOrderPage(vendors, materials, { error: "Select a vendor." }), 400);

    const materialCodes = toArray(body["material_code[]"]);
    const qtys = toArray(body["qty[]"]);
    const prices = toArray(body["price[]"]);

    const items = [];
    for (let i = 0; i < materialCodes.length; i++) {
      const material = await getMaterialByCode(c.env.DB, materialCodes[i]);
      const qty = Number(qtys[i]) || 0;
      const price = Number(prices[i]) || 0;
      if (material && qty > 0) items.push({ material_id: material.id, qty, price });
    }

    if (items.length === 0) {
      return c.html(newPurchaseOrderPage(vendors, materials, { error: "Add at least one line item." }), 400);
    }

    const po = await createPurchaseOrder(c.env.DB, vendor.id, items);
    return c.redirect(`/purchase-orders/${po.po_number}`);
  });

  ui.get("/purchase-orders/:po_number", async (c) => {
    const poNumber = c.req.param("po_number");
    const po = await getPurchaseOrderByNumber(c.env.DB, poNumber);
    if (!po) return notFound(c, "Purchase Order", poNumber);
    const vendor = await getVendor(c.env.DB, po.vendor_id);
    if (!vendor) return notFound(c, "Vendor", String(po.vendor_id));
    const [matById, flow] = await Promise.all([materialsMap(c.env.DB), getFlow(c.env.DB, "purchase_order", po.id)]);
    return c.html(purchaseOrderDetailPage(po, vendor, matById, flow));
  });

  // Goods Receipts -------------------------------------------------------------

  ui.get("/goods-receipts", async (c) => {
    const rows = await listGoodsReceipts(c.env.DB);
    return c.html(goodsReceiptsListPage(rows));
  });

  ui.get("/goods-receipts/new", async (c) => {
    const poNumber = c.req.query("po_number") ?? "";
    const po = await getPurchaseOrderByNumber(c.env.DB, poNumber);
    if (!po) return notFound(c, "Purchase Order", poNumber);
    const matById = await materialsMap(c.env.DB);
    return c.html(newGoodsReceiptPage(po, matById));
  });

  ui.post("/goods-receipts/new", async (c) => {
    const body = await c.req.parseBody({ all: true });
    const poNumber = typeof body.po_number === "string" ? body.po_number : "";
    const po = await getPurchaseOrderByNumber(c.env.DB, poNumber);
    if (!po) return notFound(c, "Purchase Order", poNumber);

    const poItemIds = toArray(body["po_item_id[]"]);
    const qtysReceived = toArray(body["qty_received[]"]);
    const items = poItemIds
      .map((id, i) => ({ po_item_id: Number(id), qty_received: Number(qtysReceived[i]) || 0 }))
      .filter((item) => item.qty_received > 0);

    if (items.length === 0) {
      const matById = await materialsMap(c.env.DB);
      return c.html(newGoodsReceiptPage(po, matById, { error: "Enter at least one received quantity." }), 400);
    }

    const gr = await createGoodsReceipt(c.env.DB, po.id, items);
    return c.redirect(`/goods-receipts/${gr.gr_number}`);
  });

  ui.get("/goods-receipts/:gr_number", async (c) => {
    const grNumber = c.req.param("gr_number");
    const gr = await getGoodsReceiptByNumber(c.env.DB, grNumber);
    if (!gr) return notFound(c, "Goods Receipt", grNumber);
    const po = await getPurchaseOrder(c.env.DB, gr.po_id);
    if (!po) return notFound(c, "Purchase Order", String(gr.po_id));
    const poItemsById = new Map(po.items.map((i) => [i.id, i]));
    const [matById, flow] = await Promise.all([materialsMap(c.env.DB), getFlow(c.env.DB, "goods_receipt", gr.id)]);
    return c.html(goodsReceiptDetailPage(gr, po, poItemsById, matById, flow));
  });

  // Supplier Invoices ------------------------------------------------------------

  ui.get("/supplier-invoices", async (c) => {
    const rows = await listSupplierInvoices(c.env.DB);
    return c.html(supplierInvoicesListPage(rows));
  });

  ui.get("/supplier-invoices/new", async (c) => {
    const poNumber = c.req.query("po_number") ?? "";
    const po = await getPurchaseOrderByNumber(c.env.DB, poNumber);
    if (!po) return notFound(c, "Purchase Order", poNumber);
    const matById = await materialsMap(c.env.DB);
    return c.html(newSupplierInvoicePage(po, matById));
  });

  ui.post("/supplier-invoices/new", async (c) => {
    const body = await c.req.parseBody({ all: true });
    const poNumber = typeof body.po_number === "string" ? body.po_number : "";
    const po = await getPurchaseOrderByNumber(c.env.DB, poNumber);
    if (!po) return notFound(c, "Purchase Order", poNumber);

    const poItemIds = toArray(body["po_item_id[]"]);
    const qtys = toArray(body["qty[]"]);
    const prices = toArray(body["price[]"]);
    const items = poItemIds
      .map((id, i) => ({ po_item_id: Number(id), qty: Number(qtys[i]) || 0, price: Number(prices[i]) || 0 }))
      .filter((item) => item.qty > 0);

    if (items.length === 0) {
      const matById = await materialsMap(c.env.DB);
      return c.html(newSupplierInvoicePage(po, matById, { error: "Enter at least one line item." }), 400);
    }

    const si = await createSupplierInvoice(c.env.DB, po.id, po.vendor_id, items);
    return c.redirect(`/supplier-invoices/${si.inv_number}`);
  });

  ui.get("/supplier-invoices/:inv_number", async (c) => {
    const invNumber = c.req.param("inv_number");
    const si = await getSupplierInvoiceByNumber(c.env.DB, invNumber);
    if (!si) return notFound(c, "Supplier Invoice", invNumber);
    const vendor = await getVendor(c.env.DB, si.vendor_id);
    const po = await getPurchaseOrder(c.env.DB, si.po_id);
    if (!vendor || !po) return notFound(c, "Purchase Order", String(si.po_id));
    const poItemsById = new Map(po.items.map((i) => [i.id, i]));
    const [matById, flow] = await Promise.all([materialsMap(c.env.DB), getFlow(c.env.DB, "supplier_invoice", si.id)]);
    return c.html(supplierInvoiceDetailPage(si, vendor, po, poItemsById, matById, flow));
  });

  ui.post("/supplier-invoices/:inv_number/match", async (c) => {
    const invNumber = c.req.param("inv_number");
    try {
      await matchSupplierInvoice(c.env.DB, invNumber);
    } catch {
      // Button is only shown when the action is valid; swallow and re-render current state.
    }
    return c.redirect(`/supplier-invoices/${invNumber}`);
  });

  ui.post("/supplier-invoices/:inv_number/release", async (c) => {
    const invNumber = c.req.param("inv_number");
    try {
      await releaseSupplierInvoice(c.env.DB, invNumber);
    } catch {
      // ditto
    }
    return c.redirect(`/supplier-invoices/${invNumber}`);
  });

  ui.post("/supplier-invoices/:inv_number/pay", async (c) => {
    const invNumber = c.req.param("inv_number");
    try {
      await createPayment(c.env.DB, "supplier_invoice", invNumber);
    } catch {
      // ditto
    }
    return c.redirect(`/supplier-invoices/${invNumber}`);
  });
}
