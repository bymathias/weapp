// SAP-style sequential document numbers. `table`/`column` are always
// hardcoded call-site constants (never user input), so string-interpolating
// them into the query is safe here.
export async function nextDocNumber(db: D1Database, table: string, column: string, start: number): Promise<string> {
  const row = await db
    .prepare(`SELECT ${column} as num FROM ${table} ORDER BY CAST(${column} AS INTEGER) DESC LIMIT 1`)
    .first<{ num: string }>();
  const next = row?.num ? Number(row.num) + 1 : start;
  return String(next);
}

// Master-data ref_ids (CUST-0001, VEND-0001, ...): prefixed, zero-padded to 4
// digits. `table`/`column` are always hardcoded call-site constants.
export async function nextRefId(db: D1Database, table: string, column: string, prefix: string): Promise<string> {
  const row = await db
    .prepare(`SELECT ${column} as ref FROM ${table} WHERE ${column} LIKE ?1 ORDER BY CAST(SUBSTR(${column}, ${prefix.length + 1}) AS INTEGER) DESC LIMIT 1`)
    .bind(`${prefix}%`)
    .first<{ ref: string }>();
  const next = row?.ref ? Number(row.ref.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}
