import { nextRefId } from "../lib/numbering";
import type { CompanyCode, Customer, Material, Vendor } from "../types";

export async function listCustomers(db: D1Database): Promise<Customer[]> {
  const { results } = await db.prepare(`SELECT * FROM customers ORDER BY name`).all<Customer>();
  return results ?? [];
}

export interface CustomerInput {
  name: string;
  industry: string;
  country: string;
  account_owner: string;
  credit_limit: number;
}

export async function createCustomer(db: D1Database, input: CustomerInput): Promise<Customer> {
  const refId = await nextRefId(db, "customers", "ref_id", "CUST-");
  const row = await db
    .prepare(
      `INSERT INTO customers (name, ref_id, industry, country, account_owner, credit_limit)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)
       RETURNING *`
    )
    .bind(input.name, refId, input.industry, input.country, input.account_owner, input.credit_limit)
    .first<Customer>();
  return row!;
}

export async function getCustomer(db: D1Database, id: number): Promise<Customer | null> {
  return (await db.prepare(`SELECT * FROM customers WHERE id = ?1`).bind(id).first<Customer>()) ?? null;
}

export async function getCustomerByRefId(db: D1Database, refId: string): Promise<Customer | null> {
  return (await db.prepare(`SELECT * FROM customers WHERE ref_id = ?1`).bind(refId).first<Customer>()) ?? null;
}

export async function listVendors(db: D1Database): Promise<Vendor[]> {
  const { results } = await db.prepare(`SELECT * FROM vendors ORDER BY name`).all<Vendor>();
  return results ?? [];
}

export async function getVendor(db: D1Database, id: number): Promise<Vendor | null> {
  return (await db.prepare(`SELECT * FROM vendors WHERE id = ?1`).bind(id).first<Vendor>()) ?? null;
}

export async function getVendorByRefId(db: D1Database, refId: string): Promise<Vendor | null> {
  return (await db.prepare(`SELECT * FROM vendors WHERE ref_id = ?1`).bind(refId).first<Vendor>()) ?? null;
}

export async function listMaterials(db: D1Database): Promise<Material[]> {
  const { results } = await db.prepare(`SELECT * FROM materials ORDER BY material_code`).all<Material>();
  return results ?? [];
}

export async function getMaterial(db: D1Database, id: number): Promise<Material | null> {
  return (await db.prepare(`SELECT * FROM materials WHERE id = ?1`).bind(id).first<Material>()) ?? null;
}

export async function getMaterialByCode(db: D1Database, code: string): Promise<Material | null> {
  return (await db.prepare(`SELECT * FROM materials WHERE material_code = ?1`).bind(code).first<Material>()) ?? null;
}

export async function getCompanyCode(db: D1Database): Promise<CompanyCode | null> {
  return (await db.prepare(`SELECT * FROM company_code LIMIT 1`).first<CompanyCode>()) ?? null;
}

export async function adjustMaterialStock(db: D1Database, materialId: number, delta: number): Promise<void> {
  await db.prepare(`UPDATE materials SET stock_qty = stock_qty + ?1 WHERE id = ?2`).bind(delta, materialId).run();
}
