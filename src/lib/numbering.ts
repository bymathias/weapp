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
