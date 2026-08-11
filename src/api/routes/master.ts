import { createRoute, z, type OpenAPIHono } from "@hono/zod-openapi";
import type { Env } from "../../types";
import { getCustomerByRefId, getMaterialByCode, getVendorByRefId, listCustomers, listMaterials, listVendors } from "../../db/master";
import { CustomerRefParamSchema, CustomerSchema, ErrorSchema, MaterialCodeParamSchema, MaterialSchema, VendorRefParamSchema, VendorSchema } from "../schemas";

// Read-only master data — customers, vendors, materials — for populating
// forms and resolving refs. No create endpoints (not part of the spec).
export function registerMasterRoutes(api: OpenAPIHono<Env>) {
  api.openapi(
    createRoute({
      method: "get",
      path: "/customers",
      tags: ["Master Data"],
      summary: "List customers",
      security: [{ Bearer: [] }],
      responses: { 200: { description: "List of customers", content: { "application/json": { schema: z.array(CustomerSchema) } } } },
    }),
    async (c) => c.json(await listCustomers(c.env.DB), 200)
  );

  api.openapi(
    createRoute({
      method: "get",
      path: "/customers/{ref}",
      tags: ["Master Data"],
      summary: "Get a customer",
      security: [{ Bearer: [] }],
      request: { params: CustomerRefParamSchema },
      responses: {
        200: { description: "Customer", content: { "application/json": { schema: CustomerSchema } } },
        404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
      },
    }),
    async (c) => {
      const { ref } = c.req.valid("param");
      const customer = await getCustomerByRefId(c.env.DB, ref);
      if (!customer) return c.json({ error: "not_found", message: "Customer not found" }, 404);
      return c.json(customer, 200);
    }
  );

  api.openapi(
    createRoute({
      method: "get",
      path: "/vendors",
      tags: ["Master Data"],
      summary: "List vendors",
      security: [{ Bearer: [] }],
      responses: { 200: { description: "List of vendors", content: { "application/json": { schema: z.array(VendorSchema) } } } },
    }),
    async (c) => c.json(await listVendors(c.env.DB), 200)
  );

  api.openapi(
    createRoute({
      method: "get",
      path: "/vendors/{ref}",
      tags: ["Master Data"],
      summary: "Get a vendor",
      security: [{ Bearer: [] }],
      request: { params: VendorRefParamSchema },
      responses: {
        200: { description: "Vendor", content: { "application/json": { schema: VendorSchema } } },
        404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
      },
    }),
    async (c) => {
      const { ref } = c.req.valid("param");
      const vendor = await getVendorByRefId(c.env.DB, ref);
      if (!vendor) return c.json({ error: "not_found", message: "Vendor not found" }, 404);
      return c.json(vendor, 200);
    }
  );

  api.openapi(
    createRoute({
      method: "get",
      path: "/materials",
      tags: ["Master Data"],
      summary: "List materials",
      security: [{ Bearer: [] }],
      responses: { 200: { description: "List of materials", content: { "application/json": { schema: z.array(MaterialSchema) } } } },
    }),
    async (c) => c.json(await listMaterials(c.env.DB), 200)
  );

  api.openapi(
    createRoute({
      method: "get",
      path: "/materials/{code}",
      tags: ["Master Data"],
      summary: "Get a material",
      security: [{ Bearer: [] }],
      request: { params: MaterialCodeParamSchema },
      responses: {
        200: { description: "Material", content: { "application/json": { schema: MaterialSchema } } },
        404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
      },
    }),
    async (c) => {
      const { code } = c.req.valid("param");
      const material = await getMaterialByCode(c.env.DB, code);
      if (!material) return c.json({ error: "not_found", message: "Material not found" }, 404);
      return c.json(material, 200);
    }
  );
}
