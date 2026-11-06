import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import type { Customer, QuoteWithItems } from "./types";

const PAGE_WIDTH = 612; // US Letter
const PAGE_HEIGHT = 792;
const MARGIN = 50;
const CONTENT_BOTTOM = 95; // footer rule sits at y=80
const ROW_FONT_SIZE = 9;
const ROW_LINE_HEIGHT = 11;
const INK = rgb(0.1, 0.1, 0.1);
const BRAND = rgb(0.12, 0.28, 0.55);

const CURRENCY_SYMBOLS: Record<string, string> = { EUR: "€", USD: "$", GBP: "£" };

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

export async function generateQuotePdf(quote: QuoteWithItems, customer: Customer): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const money = (n: number) => `${CURRENCY_SYMBOLS[quote.currency] ?? "€"}${n.toFixed(2)}`;

  let page: PDFPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const draw = (text: string, x: number, opts: { size?: number; f?: PDFFont; color?: RGB } = {}) => {
    page.drawText(text, { x, y, size: opts.size ?? 10, font: opts.f ?? font, color: opts.color ?? INK });
  };
  const hline = (x1: number, x2: number, atY: number, thickness: number, gray: number) => {
    page.drawLine({ start: { x: x1, y: atY }, end: { x: x2, y: atY }, thickness, color: rgb(gray, gray, gray) });
  };

  // Header / company block
  draw("WeCPQ", MARGIN, { size: 22, f: bold, color: BRAND });
  draw("Configure · Price · Quote", MARGIN + 90, { size: 10, color: rgb(0.4, 0.4, 0.4) });
  y -= 16;
  draw("WeCPQ Inc. · 100 Market Street · San Francisco, CA", MARGIN, { size: 9, color: rgb(0.45, 0.45, 0.45) });
  y -= 30;
  hline(MARGIN, PAGE_WIDTH - MARGIN, y, 1, 0.8);
  y -= 26;

  // Quote meta + customer block, side by side
  const leftX = MARGIN;
  const rightX = PAGE_WIDTH / 2 + 10;
  const topY = y;

  draw("QUOTE", leftX, { size: 13, f: bold });
  y -= 16;
  draw(`Ref: ${quote.ref}`, leftX, { size: 10 });
  y -= 14;
  draw(`Date: ${new Date(quote.created_at).toLocaleDateString("en-US")}`, leftX, { size: 10 });
  y -= 14;
  draw(`Status: ${quote.status}`, leftX, { size: 10, f: bold });
  y -= 14;
  draw(`Vendor: ${quote.vendor}`, leftX, { size: 10 });
  y -= 14;
  draw(`Currency: ${quote.currency}`, leftX, { size: 10 });
  y -= 14;
  draw(`Valid Until: ${quote.valid_until ?? "-"}`, leftX, { size: 10 });
  y -= 14;
  draw(`Payment Terms: ${quote.payment_terms}`, leftX, { size: 10 });
  const leftEndY = y;

  y = topY;
  draw("BILL TO", rightX, { size: 13, f: bold });
  y -= 16;
  for (const line of wrapText(customer.name, font, 10, PAGE_WIDTH - MARGIN - rightX)) {
    draw(line, rightX, { size: 10 });
    y -= 14;
  }
  draw(`${customer.ref_id}`, rightX, { size: 10 });
  y -= 14;
  draw(`${customer.industry} · ${customer.country}`, rightX, { size: 10 });
  y -= 14;
  draw(`Account owner: ${customer.account_owner}`, rightX, { size: 10 });

  y = Math.min(y, leftEndY) - 34;

  // Line items table
  const col = {
    sku: MARGIN,
    desc: MARGIN + 75,
    qty: PAGE_WIDTH - MARGIN - 190,
    unit: PAGE_WIDTH - MARGIN - 130,
    total: PAGE_WIDTH - MARGIN - 60,
  };
  const skuWidth = col.desc - col.sku - 10;
  const descWidth = col.qty - col.desc - 8;

  const tableHeader = () => {
    page.drawRectangle({ x: MARGIN, y: y - 4, width: PAGE_WIDTH - MARGIN * 2, height: 18, color: rgb(0.94, 0.95, 0.97) });
    draw("SKU", col.sku + 4, { size: 9, f: bold });
    draw("Description", col.desc, { size: 9, f: bold });
    draw("Qty", col.qty, { size: 9, f: bold });
    draw("Unit Price", col.unit, { size: 9, f: bold });
    draw("Line Total", col.total, { size: 9, f: bold });
    y -= 22;
  };

  const continuationPage = () => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
    draw("WeCPQ", MARGIN, { size: 14, f: bold, color: BRAND });
    draw(`Quote ${quote.ref} (continued)`, MARGIN + 70, { size: 10, f: bold });
    y -= 12;
    hline(MARGIN, PAGE_WIDTH - MARGIN, y, 1, 0.8);
    y -= 22;
  };

  tableHeader();

  for (const item of quote.items) {
    const skuLines = wrapText(item.sku, font, ROW_FONT_SIZE, skuWidth);
    const descLines = wrapText(item.description, font, ROW_FONT_SIZE, descWidth);
    const lineCount = Math.max(skuLines.length, descLines.length);
    const rowHeight = (lineCount - 1) * ROW_LINE_HEIGHT + 16;
    if (y - rowHeight < CONTENT_BOTTOM) {
      continuationPage();
      tableHeader();
    }
    const rowTop = y;
    draw(String(item.quantity), col.qty, { size: ROW_FONT_SIZE });
    draw(money(item.sell_unit_price), col.unit, { size: ROW_FONT_SIZE });
    draw(money(item.sell_line_total), col.total, { size: ROW_FONT_SIZE });
    for (let i = 0; i < lineCount; i++) {
      y = rowTop - i * ROW_LINE_HEIGHT;
      if (skuLines[i]) draw(skuLines[i], col.sku + 4, { size: ROW_FONT_SIZE });
      if (descLines[i]) draw(descLines[i], col.desc, { size: ROW_FONT_SIZE });
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
  const totalsX = PAGE_WIDTH / 2 + 40;
  draw(`Total (${quote.currency})`, totalsX, { size: 13, f: bold });
  draw(money(quote.total_amount), col.total, { size: 13, f: bold, color: BRAND });

  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    page = p;
    y = 60;
    hline(MARGIN, PAGE_WIDTH - MARGIN, y + 20, 0.5, 0.9);
    draw("Generated by WeCPQ — this is a demo document.", MARGIN, { size: 8, color: rgb(0.55, 0.55, 0.55) });
    const label = `Quote ${quote.ref} · Page ${i + 1} of ${pages.length}`;
    draw(label, PAGE_WIDTH - MARGIN - font.widthOfTextAtSize(label, 8), { size: 8, color: rgb(0.55, 0.55, 0.55) });
  });

  return pdf.save();
}
