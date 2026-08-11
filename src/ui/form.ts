export function toArray(value: string | File | (string | File)[] | undefined): string[] {
  if (value === undefined) return [];
  const arr = Array.isArray(value) ? value : [value];
  return arr.map((v) => (typeof v === "string" ? v : ""));
}
