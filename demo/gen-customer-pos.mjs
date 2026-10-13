#!/usr/bin/env node
// Generates the customer Purchase Order PDFs (demo/customer-pos/) from
// demo-seed-data.json .demo_inputs.customer_pos. These are the documents a
// customer sends back against a Won WeCPQ quote, the input the UiPath bot
// ingests, so they are styled as coming from each customer, not from WeCPQ/WeSAP.
// Run: npm run po:gen

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const demoDir = dirname(fileURLToPath(import.meta.url));
const outDir = join(demoDir, "customer-pos");
const data = JSON.parse(readFileSync(join(demoDir, "demo-seed-data.json"), "utf8"));
const customersByRef = new Map(data.customers.map((c) => [c.ref_id, c]));

// Supplier block: the PO is addressed to the company that issued the quote.
const SUPPLIER = ["WeCPQ Inc.", "100 Market Street", "San Francisco, CA 94105", "United States"];
const ACCENTS = [rgb(0.0, 0.42, 0.45), rgb(0.42, 0.2, 0.6), rgb(0.62, 0.16, 0.16)];

const PAGE_WIDTH = 595; // A4
const PAGE_HEIGHT = 842;
const MARGIN = 50;
const GREY = rgb(0.45, 0.45, 0.45);
const INK = rgb(0.1, 0.1, 0.1);

function money(n) {
  return `€${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function buildPo(po, accent) {
  const customer = customersByRef.get(po.customer);
  const pdf = await PDFDocument.create();
  // Fixed metadata so regenerating yields byte-identical files.
  const date = new Date(`${po.date}T09:00:00Z`);
  pdf.setTitle(`Purchase Order ${po.po_number}`);
  pdf.setAuthor(customer.name);
  pdf.setCreator(customer.name);
  pdf.setProducer(customer.name);
  pdf.setCreationDate(date);
  pdf.setModificationDate(date);

  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
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
  const meta = [
    ["PO Number", po.po_number],
    ["PO Date", po.date],
    ["Your Quote Ref", po.quote_ref],
    ["Payment Terms", po.payment_terms],
    ["Currency", "EUR"],
    ["Buyer", po.buyer],
    ["Email", po.email],
  ];
  for (const [label, value] of meta) {
    draw(`${label}:`, MARGIN, { size: 10, color: GREY });
    draw(value, MARGIN + 95, { size: 10, f: label === "PO Number" || label === "Your Quote Ref" ? bold : font });
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

  // Line items
  const cols = { item: MARGIN, desc: MARGIN + 35, qty: 380, price: 460, total: PAGE_WIDTH - MARGIN };
  page.drawRectangle({ x: MARGIN, y: y - 6, width: PAGE_WIDTH - 2 * MARGIN, height: 22, color: rgb(0.94, 0.94, 0.94) });
  draw("Item", cols.item + 4, { size: 9, f: bold });
  draw("Description", cols.desc, { size: 9, f: bold });
  drawRight("Qty", cols.qty, { size: 9, f: bold });
  drawRight("Unit Price", cols.price, { size: 9, f: bold });
  drawRight("Amount", cols.total - 4, { size: 9, f: bold });
  y -= 26;

  let total = 0;
  po.lines.forEach((line, i) => {
    const amount = line.qty * line.unit_price;
    total += amount;
    draw(String((i + 1) * 10), cols.item + 4);
    draw(line.desc, cols.desc);
    drawRight(String(line.qty), cols.qty);
    drawRight(money(line.unit_price), cols.price);
    drawRight(money(amount), cols.total - 4);
    y -= 10;
    rule(rgb(0.88, 0.88, 0.88), 0.5);
    y -= 14;
  });

  y -= 6;
  draw("Total (excl. VAT)", cols.price - 120, { size: 11, f: bold });
  drawRight(money(total), cols.total - 4, { size: 11, f: bold });
  y -= 40;

  // Terms + signature
  const terms = [
    `This Purchase Order is issued against your quotation ${po.quote_ref} and is subject to its terms.`,
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

  return { bytes: await pdf.save(), total };
}

mkdirSync(outDir, { recursive: true });
for (const [i, po] of data.demo_inputs.customer_pos.entries()) {
  const { bytes, total } = await buildPo(po, ACCENTS[i % ACCENTS.length]);
  writeFileSync(join(outDir, po.file), bytes);
  console.log(`${po.file}  ${po.po_number}  ${money(total)}`);
}
