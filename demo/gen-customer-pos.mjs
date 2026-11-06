#!/usr/bin/env node
// Generates the customer Purchase Order PDFs (demo/customer-pos/) from
// demo-seed-data.json .demo_inputs. These are the documents a customer
// sends back against a Won WeCPQ quote, the input the UiPath bot ingests,
// so they are styled as coming from each customer, not from WeCPQ/WeSAP.
// Run: npm run po:gen
//
// .demo_inputs.customer_pos[] — one PO each, written to its own `file`:
//   po_number, date, customer (ref_id), buyer, email, address[], payment_terms,
//   note (expected outcome, not rendered), lines[] { desc, qty, unit_price }
//   quote_ref         the quote the PO is issued against, or
//   quote_refs[]      several quotes (1 PO covering several quotes)
//   lines[].sku       optional: supplier SKU -> "Supplier SKU" column
//   lines[].quote_ref optional: quote of that line -> "Quote Ref" column
// .demo_inputs.customer_po_bundles[] — several POs in one PDF:
//   file, po_numbers[] (each PO starts on a new page with its own header), note
//
// Output is deterministic: fixed PDF metadata, so reruns are byte-identical.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const demoDir = dirname(fileURLToPath(import.meta.url));
const outDir = join(demoDir, "customer-pos");
const data = JSON.parse(readFileSync(join(demoDir, "demo-seed-data.json"), "utf8"));
const customersByRef = new Map(data.customers.map((c) => [c.ref_id, c]));
const pos = data.demo_inputs.customer_pos;
const posByNumber = new Map(pos.map((po) => [po.po_number, po]));

// Supplier block: the PO is addressed to the company that issued the quote.
const SUPPLIER = ["WeCPQ Inc.", "100 Market Street", "San Francisco, CA 94105", "United States"];
const ACCENTS = [
  rgb(0.0, 0.42, 0.45),
  rgb(0.42, 0.2, 0.6),
  rgb(0.62, 0.16, 0.16),
  rgb(0.1, 0.3, 0.62),
  rgb(0.2, 0.2, 0.2),
  rgb(0.75, 0.4, 0.0),
];
// One letterhead colour per customer, in order of first appearance.
const accentByCustomer = new Map();
for (const po of pos) {
  if (!accentByCustomer.has(po.customer)) accentByCustomer.set(po.customer, ACCENTS[accentByCustomer.size % ACCENTS.length]);
}

const PAGE_WIDTH = 595; // A4
const PAGE_HEIGHT = 842;
const MARGIN = 50;
const GREY = rgb(0.45, 0.45, 0.45);
const INK = rgb(0.1, 0.1, 0.1);

function money(n) {
  return `€${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function quoteRefsOf(po) {
  return po.quote_refs ?? [po.quote_ref];
}

function wrap(text, font, size, maxWidth) {
  const lines = [];
  let current = "";
  for (const word of text.split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  lines.push(current);
  return lines;
}

async function newDocument(title, author, isoDate) {
  const pdf = await PDFDocument.create();
  // Fixed metadata so regenerating yields byte-identical files.
  const date = new Date(`${isoDate}T09:00:00Z`);
  pdf.setTitle(title);
  pdf.setAuthor(author);
  pdf.setCreator(author);
  pdf.setProducer(author);
  pdf.setCreationDate(date);
  pdf.setModificationDate(date);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  return { pdf, font, bold };
}

// Draws one PO starting on a new page of `doc`; returns its total.
function drawPo({ pdf, font, bold }, po) {
  const customer = customersByRef.get(po.customer);
  const accent = accentByCustomer.get(po.customer);
  const refs = quoteRefsOf(po);
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const draw = (text, x, { size = 10, f = font, color = INK } = {}) => page.drawText(text, { x, y, size, font: f, color });
  const drawRight = (text, xRight, opts = {}) =>
    draw(text, xRight - (opts.f ?? font).widthOfTextAtSize(text, opts.size ?? 10), opts);
  const rule = (color = rgb(0.8, 0.8, 0.8), thickness = 1) =>
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness, color });

  // Customer letterhead
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 8, width: PAGE_WIDTH, height: 8, color: accent });
  draw(customer.name, MARGIN, { size: 20, f: bold, color: accent });
  drawRight("PURCHASE ORDER", PAGE_WIDTH - MARGIN, { size: 16, f: bold });
  y -= 16;
  draw(po.address.slice(1).join(" · "), MARGIN, { size: 9, color: GREY });
  y -= 24;
  rule(accent, 1.5);
  y -= 28;

  // Meta (left) and supplier (right)
  const topY = y;
  const quoteLabel = refs.length > 1 ? "Your Quote Refs" : "Your Quote Ref";
  const meta = [
    ["PO Number", po.po_number],
    ["PO Date", po.date],
    [quoteLabel, refs.join(", ")],
    ["Payment Terms", po.payment_terms],
    ["Currency", "EUR"],
    ["Buyer", po.buyer],
    ["Email", po.email],
  ];
  for (const [label, value] of meta) {
    draw(`${label}:`, MARGIN, { size: 10, color: GREY });
    draw(value, MARGIN + 95, { size: 10, f: label === "PO Number" || label === quoteLabel ? bold : font });
    y -= 15;
  }
  const leftBottom = y;

  const rightX = PAGE_WIDTH / 2 + 30;
  y = topY;
  draw("SUPPLIER", rightX, { size: 9, f: bold, color: GREY });
  y -= 15;
  for (const line of SUPPLIER) {
    draw(line, rightX, { size: 10, f: line === SUPPLIER[0] ? bold : font });
    y -= 14;
  }
  y -= 8;
  draw("SHIP TO / BILL TO", rightX, { size: 9, f: bold, color: GREY });
  y -= 15;
  for (const line of po.address) {
    draw(line, rightX, { size: 10, f: line === po.address[0] ? bold : font });
    y -= 14;
  }

  y = Math.min(y, leftBottom) - 20;

  // Line items. Supplier SKU / Quote Ref columns only appear when lines carry them.
  const hasSku = po.lines.some((l) => l.sku);
  const hasLineQuote = po.lines.some((l) => l.quote_ref);
  const cols = { item: MARGIN, sku: MARGIN + 35, desc: MARGIN + 35, quote: 300, qty: 380, price: 460, total: PAGE_WIDTH - MARGIN };
  if (hasSku) cols.desc = cols.sku + 90;
  const descWidth = (hasLineQuote ? cols.quote - 8 : cols.qty - 25) - cols.desc;

  page.drawRectangle({ x: MARGIN, y: y - 6, width: PAGE_WIDTH - 2 * MARGIN, height: 22, color: rgb(0.94, 0.94, 0.94) });
  draw("Item", cols.item + 4, { size: 9, f: bold });
  if (hasSku) draw("Supplier SKU", cols.sku, { size: 9, f: bold });
  draw("Description", cols.desc, { size: 9, f: bold });
  if (hasLineQuote) draw("Quote Ref", cols.quote, { size: 9, f: bold });
  drawRight("Qty", cols.qty, { size: 9, f: bold });
  drawRight("Unit Price", cols.price, { size: 9, f: bold });
  drawRight("Amount", cols.total - 4, { size: 9, f: bold });
  y -= 26;

  let total = 0;
  po.lines.forEach((line, i) => {
    const amount = line.qty * line.unit_price;
    total += amount;
    const rowTop = y;
    draw(String((i + 1) * 10), cols.item + 4);
    if (hasSku && line.sku) draw(line.sku, cols.sku, { size: 9 });
    if (hasLineQuote && line.quote_ref) draw(line.quote_ref, cols.quote, { size: 9 });
    drawRight(String(line.qty), cols.qty);
    drawRight(money(line.unit_price), cols.price);
    drawRight(money(amount), cols.total - 4);
    const descLines = wrap(line.desc, font, 10, descWidth);
    descLines.forEach((text, j) => {
      y = rowTop - j * 12;
      draw(text, cols.desc);
    });
    y -= 10;
    rule(rgb(0.88, 0.88, 0.88), 0.5);
    y -= 14;
  });

  y -= 6;
  draw("Total (excl. VAT)", cols.price - 120, { size: 11, f: bold });
  drawRight(money(total), cols.total - 4, { size: 11, f: bold });
  y -= 40;

  // Terms + signature
  const refsText = refs.length > 1 ? `quotations ${refs.slice(0, -1).join(", ")} and ${refs.at(-1)}` : `quotation ${refs[0]}`;
  const terms = [
    `This Purchase Order is issued against your ${refsText} and is subject to ${refs.length > 1 ? "their" : "its"} terms.`,
    `Please quote PO number ${po.po_number} on all delivery notes and invoices.`,
    "Invoices without a valid PO number will be returned unpaid.",
  ];
  for (const t of terms) {
    draw(t, MARGIN, { size: 9, color: GREY });
    y -= 13;
  }
  y -= 30;
  draw(`Authorised by: ${po.buyer}, Procurement`, MARGIN, { size: 10 });
  y -= 14;
  draw(customer.name, MARGIN, { size: 10, f: bold });

  y = MARGIN;
  draw("Fictional company and document, created for WeCPQ + WeSAP automation demos.", MARGIN, { size: 7, color: GREY });

  return total;
}

mkdirSync(outDir, { recursive: true });

for (const po of pos) {
  const customer = customersByRef.get(po.customer);
  const doc = await newDocument(`Purchase Order ${po.po_number}`, customer.name, po.date);
  const total = drawPo(doc, po);
  writeFileSync(join(outDir, po.file), await doc.pdf.save());
  console.log(`${po.file}  ${po.po_number}  ${quoteRefsOf(po).join("+")}  ${money(total)}`);
}

for (const bundle of data.demo_inputs.customer_po_bundles ?? []) {
  const bundlePos = bundle.po_numbers.map((n) => {
    const po = posByNumber.get(n);
    if (!po) throw new Error(`${bundle.file}: unknown po_number ${n}`);
    return po;
  });
  const customer = customersByRef.get(bundlePos[0].customer);
  const doc = await newDocument(`Purchase Orders ${bundle.po_numbers.join(", ")}`, customer.name, bundlePos[0].date);
  const totals = bundlePos.map((po) => drawPo(doc, po));
  writeFileSync(join(outDir, bundle.file), await doc.pdf.save());
  console.log(`${bundle.file}  ${bundle.po_numbers.join(" + ")}  ${totals.map(money).join(" + ")}`);
}
