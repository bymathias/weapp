import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import type { Customer, Material, PurchaseOrderWithItems, SalesOrderWithItems, Vendor } from "./types";

const PAGE_WIDTH = 612; // US Letter
const PAGE_HEIGHT = 792;
const MARGIN = 50;
const CONTENT_BOTTOM = 95; // footer rule sits at y=80
const ROW_FONT_SIZE = 9;
const ROW_LINE_HEIGHT = 11;
const INK = rgb(0.1, 0.1, 0.1);
const BRAND = rgb(0.039, 0.431, 0.82);

function money(n: number): string {
  return `€${n.toFixed(2)}`;
}

// Greedy word wrap to maxWidth; words wider than a line are split by
// character so nothing is ever cut off.
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const fits = (s: string) => font.widthOfTextAtSize(s, size) <= maxWidth;
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = current ? `${current} ${word}` : word;
    if (fits(candidate)) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = "";
    let rest = word;
    while (!fits(rest)) {
      let n = rest.length - 1;
      while (n > 1 && !fits(rest.slice(0, n))) n--;
      lines.push(rest.slice(0, n));
      rest = rest.slice(n);
    }
    current = rest;
  }
  if (current || lines.length === 0) lines.push(current);
  return lines;
}

interface DocRow {
  code: string;
  description: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

interface DocSpec {
  docTitle: string; // e.g. "SALES ORDER"
  docLabel: string; // e.g. "Sales Order 1000000001", used on continuation pages and footers
  meta: { text: string; bold?: boolean }[];
  partyTitle: string;
  partyLines: string[];
  rows: DocRow[];
  total: number;
  tableGap: number; // space between the lower of the two blocks and the table
}

// Shared layout for WeSAP documents: header + meta/party blocks on page 1,
// a line-item table that wraps long text and paginates (header repeated on
// every page), totals right after the last line, "Page n of N" footers.
async function renderDocument(spec: DocSpec): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page: PDFPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const draw = (text: string, x: number, opts: { size?: number; f?: PDFFont; color?: RGB } = {}) => {
    page.drawText(text, { x, y, size: opts.size ?? 10, font: opts.f ?? font, color: opts.color ?? INK });
  };
  const hline = (x1: number, x2: number, atY: number, thickness: number, gray: number) => {
    page.drawLine({ start: { x: x1, y: atY }, end: { x: x2, y: atY }, thickness, color: rgb(gray, gray, gray) });
  };

  // Header / company block
  draw("WeSAP", MARGIN, { size: 22, f: bold, color: BRAND });
  draw("Enterprise Resource Planning", MARGIN + 90, { size: 10, color: rgb(0.4, 0.4, 0.4) });
  y -= 16;
  draw("WeSAP AG · Company Code 1000", MARGIN, { size: 9, color: rgb(0.45, 0.45, 0.45) });
  y -= 30;
  hline(MARGIN, PAGE_WIDTH - MARGIN, y, 1, 0.8);
  y -= 26;

  // Meta + party block, side by side
  const leftX = MARGIN;
  const rightX = PAGE_WIDTH / 2 + 10;
  const topY = y;

  draw(spec.docTitle, leftX, { size: 13, f: bold });
  for (const m of spec.meta) {
    y -= m === spec.meta[0] ? 16 : 14;
    draw(m.text, leftX, { size: 10, f: m.bold ? bold : font });
  }
  const leftEndY = y;

  y = topY;
  draw(spec.partyTitle, rightX, { size: 13, f: bold });
  y -= 16;
  for (const line of spec.partyLines) {
    for (const wrapped of wrapText(line, font, 10, PAGE_WIDTH - MARGIN - rightX)) {
      draw(wrapped, rightX, { size: 10 });
      y -= 14;
    }
  }
  y += 14;

  // Items table starts below whichever column (meta or party) ran longer.
  y = Math.min(y, leftEndY) - spec.tableGap;

  const col = {
    code: MARGIN,
    desc: MARGIN + 70,
    qty: PAGE_WIDTH - MARGIN - 190,
    unit: PAGE_WIDTH - MARGIN - 130,
    total: PAGE_WIDTH - MARGIN - 60,
  };
  const codeWidth = col.desc - col.code - 6;
  const descWidth = col.qty - col.desc - 12;

  const tableHeader = () => {
    page.drawRectangle({ x: MARGIN, y: y - 4, width: PAGE_WIDTH - MARGIN * 2, height: 18, color: rgb(0.94, 0.95, 0.97) });
    draw("Code", col.code + 4, { size: 9, f: bold });
    draw("Description", col.desc + 4, { size: 9, f: bold });
    draw("Qty", col.qty, { size: 9, f: bold });
    draw("Unit Price", col.unit, { size: 9, f: bold });
    draw("Line Total", col.total, { size: 9, f: bold });
    y -= 22;
  };

  const continuationPage = () => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
    draw("WeSAP", MARGIN, { size: 14, f: bold, color: BRAND });
    draw(`${spec.docLabel} (continued)`, MARGIN + 70, { size: 10, f: bold });
    y -= 12;
    hline(MARGIN, PAGE_WIDTH - MARGIN, y, 1, 0.8);
    y -= 22;
  };

  tableHeader();

  for (const row of spec.rows) {
    const codeLines = wrapText(row.code, font, ROW_FONT_SIZE, codeWidth);
    const descLines = wrapText(row.description, font, ROW_FONT_SIZE, descWidth);
    const lineCount = Math.max(codeLines.length, descLines.length);
    const rowHeight = (lineCount - 1) * ROW_LINE_HEIGHT + 16;
    if (y - rowHeight < CONTENT_BOTTOM) {
      continuationPage();
      tableHeader();
    }
    const rowTop = y;
    draw(String(row.qty), col.qty, { size: ROW_FONT_SIZE });
    draw(money(row.unitPrice), col.unit, { size: ROW_FONT_SIZE });
    draw(money(row.lineTotal), col.total, { size: ROW_FONT_SIZE });
    for (let i = 0; i < lineCount; i++) {
      y = rowTop - i * ROW_LINE_HEIGHT;
      if (codeLines[i]) draw(codeLines[i], col.code + 4, { size: ROW_FONT_SIZE });
      if (descLines[i]) draw(descLines[i], col.desc + 4, { size: ROW_FONT_SIZE });
    }
    y = rowTop - rowHeight;
    hline(MARGIN, PAGE_WIDTH - MARGIN, y + 6, 0.5, 0.9);
  }

  // Totals block always follows the last line, on the same page.
  if (y - 34 < CONTENT_BOTTOM) {
    continuationPage();
  }
  y -= 14;
  hline(PAGE_WIDTH / 2, PAGE_WIDTH - MARGIN, y, 1, 0.8);
  y -= 20;
  draw("Total", PAGE_WIDTH / 2 + 40, { size: 13, f: bold });
  draw(money(spec.total), col.total, { size: 13, f: bold, color: BRAND });

  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    page = p;
    y = 60;
    hline(MARGIN, PAGE_WIDTH - MARGIN, y + 20, 0.5, 0.9);
    draw("Generated by WeSAP — this is a demo document.", MARGIN, { size: 8, color: rgb(0.55, 0.55, 0.55) });
    const label = `${spec.docLabel} · Page ${i + 1} of ${pages.length}`;
    draw(label, PAGE_WIDTH - MARGIN - font.widthOfTextAtSize(label, 8), { size: 8, color: rgb(0.55, 0.55, 0.55) });
  });

  return pdf.save();
}

export async function generatePurchaseOrderPdf(
  po: PurchaseOrderWithItems,
  vendor: Vendor,
  materialsById: Map<number, Material>
): Promise<Uint8Array> {
  return renderDocument({
    docTitle: "PURCHASE ORDER",
    docLabel: `Purchase Order ${po.po_number}`,
    meta: [
      { text: `PO Number: ${po.po_number}` },
      { text: `Date: ${new Date(po.created_at).toLocaleDateString("en-US")}` },
      { text: `Status: ${po.status}`, bold: true },
    ],
    partyTitle: "VENDOR",
    partyLines: [vendor.name, vendor.ref_id],
    rows: po.items.map((item) => {
      const material = materialsById.get(item.material_id);
      return {
        code: material ? material.material_code : `#${item.material_id}`,
        description: material ? material.description : "Unknown material",
        qty: item.qty,
        unitPrice: item.price,
        lineTotal: item.line_total,
      };
    }),
    total: po.items.reduce((s, i) => s + i.line_total, 0),
    tableGap: 20,
  });
}

export async function generateSalesOrderPdf(so: SalesOrderWithItems, customer: Customer): Promise<Uint8Array> {
  const meta: DocSpec["meta"] = [
    { text: `SO Number: ${so.so_number}` },
    { text: `Date: ${new Date(so.created_at).toLocaleDateString("en-US")}` },
    { text: `Status: ${so.status}`, bold: true },
  ];
  if (so.customer_po_number) meta.push({ text: `Customer PO: ${so.customer_po_number}`, bold: true });
  if (so.source_quote_ref) meta.push({ text: `Source Quote: ${so.source_quote_ref}` });

  return renderDocument({
    docTitle: "SALES ORDER",
    docLabel: `Sales Order ${so.so_number}`,
    meta,
    partyTitle: "SOLD TO",
    partyLines: [customer.name, customer.ref_id, `${customer.industry} · ${customer.country}`, `Account owner: ${customer.account_owner}`],
    rows: so.items.map((item) => ({
      code: item.material_code ?? "—",
      description: item.description,
      qty: item.qty,
      unitPrice: item.unit_price,
      lineTotal: item.line_total,
    })),
    total: so.total_amount,
    tableGap: 24,
  });
}
