const fs = require("fs");
const path = require("path");

/** Render / cloud hosts rarely have Puppeteer's Chrome cache; use bundled Chromium there. */
const isCloudHost = Boolean(
  process.env.RENDER ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NODE_ENV === "production",
);

async function launchPdfBrowser() {
  const commonArgs = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--font-render-hinting=none",
  ];

  if (isCloudHost) {
    const Chromium = require("@sparticuz/chromium").default;
    const puppeteerCore = require("puppeteer-core");
    return puppeteerCore.launch({
      args: [...Chromium.args, ...commonArgs],
      defaultViewport: { width: 794, height: 1123, deviceScaleFactor: 1 },
      executablePath: await Chromium.executablePath(),
      headless: true,
    });
  }

  const puppeteer = require("puppeteer");
  const launchOpts = {
    headless: true,
    args: commonArgs,
  };
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOpts.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  return puppeteer.launch(launchOpts);
}

const COMPANY = {
  name: "Woodie Technical Services Contracting LLC",
  nameShort: "WOODIE TECHNICAL SERVICES CONTRACTING L.L.C",
  trn: "100548827300003",
  address: "Al Qouz industrial area # 3",
  phone: "+971 56 422 6955 / +971 52 824 7034",
  email: "info@woodie.ae",
  website: "www.woodie.ae",
  representative: "Rizwan Ali",
  representativePhone: "054 2580355",
};

const ASSETS_DIR = path.join(__dirname, "../assets");
const HEADER_PATH = path.join(ASSETS_DIR, "pdf_header.png");

/** Printed height of the header/footer banner images, and the page margins reserved for them. */
const HEADER_BAND_MM = 50;
const FOOTER_BAND_MM = 16.5;
/** Clearance between banner and content (keeps body strictly between header/footer). */
const HEADER_CONTENT_GAP_MM = (15 * 25.4) / 96;
const FOOTER_CONTENT_GAP_MM = (10 * 25.4) / 96;
/** Margin = banner only + content clearance — no extra strip above the header or below the footer. */
const HEADER_MARGIN_MM = HEADER_BAND_MM + HEADER_CONTENT_GAP_MM;
const FOOTER_MARGIN_MM = FOOTER_BAND_MM + FOOTER_CONTENT_GAP_MM;

const COLORS = {
  peach: "#FCE4D6",
  blueLabel: "#BDD7EE",
  border: "#000000",
  redNote: "#C00000",
  gold: "#C9A227",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Preserve line breaks; optional *text* → red emphasis like sample notes */
function formatDescription(text) {
  const safe = escapeHtml(text || "");
  return safe
    .replace(/\*([^*]+)\*/g, `<span class="desc-red">$1</span>`)
    .replace(/\n/g, "<br />");
}

function formatPdfDate(value) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatMoneyNum(amount) {
  const n = Number(amount) || 0;
  return n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatRefNo(quotationNumber, date = new Date()) {
  const digits = String(quotationNumber || "").replace(/\D/g, "") || "0";
  return `QTY/WTS${digits}/${date.getFullYear()}`;
}

function loadAssetDataUri(filename) {
  try {
    const filePath = path.join(ASSETS_DIR, filename);
    if (!fs.existsSync(filePath)) return "";
    const buf = fs.readFileSync(filePath);
    const ext = path.extname(filename).toLowerCase();
    const mime = ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return "";
  }
}

function getHeaderDataUri() {
  return loadAssetDataUri("pdf_header.png");
}

function getFooterDataUri() {
  return loadAssetDataUri("pdf_footer.png");
}

function headerBannerHtml() {
  const src = getHeaderDataUri();
  if (!src) {
    return `<div class="header-fallback">${escapeHtml(COMPANY.name)}</div>`;
  }
  return `<header class="pdf-header"><img src="${src}" alt="Woodie" /></header>`;
}

function footerBannerHtml() {
  const footerSrc = getFooterDataUri();
  if (!footerSrc) return "";
  return `<footer class="pdf-footer-img"><img src="${footerSrc}" alt="Footer" /></footer>`;
}

function signatureImageHtml(className = "pdf-signature") {
  const src = loadAssetDataUri("pdf_signature.png");
  if (!src) return `<div class="sig-underline">Signature</div>`;
  return `<div class="${className}"><img src="${src}" alt="Authorized signature" /></div>`;
}

/** Reset Chromium's default #header/#footer padding so banners sit on the page edges. */
const HF_CHROME_RESET =
  "<style>#header,#footer{padding:0!important;margin:0!important;}html,body{margin:0;padding:0;}</style>";

function puppeteerHeaderTemplate() {
  const src = getHeaderDataUri();
  if (!src) {
    return `${HF_CHROME_RESET}<div style="width:100%;height:${HEADER_MARGIN_MM}mm;margin:0;padding:0;font-size:10px;text-align:center;color:#000;font-family:Arial,sans-serif;">${escapeHtml(COMPANY.name)}</div>`;
  }
  // Image flush to the top edge of every page; remaining margin height is content clearance.
  return `${HF_CHROME_RESET}<div style="box-sizing:border-box;width:100%;height:${HEADER_MARGIN_MM}mm;margin:0;padding:0;position:relative;line-height:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;"><img src="${src}" style="position:absolute;left:0;top:0;display:block;width:100%;height:${HEADER_BAND_MM}mm;object-fit:fill;margin:0;border:0;padding:0;" /></div>`;
}

function puppeteerFooterTemplate() {
  const src = getFooterDataUri();
  if (!src) {
    return `${HF_CHROME_RESET}<div style="width:100%;height:${FOOTER_MARGIN_MM}mm;margin:0;padding:0;"></div>`;
  }
  // Image flush to the bottom edge of every page; remaining margin height is content clearance.
  return `${HF_CHROME_RESET}<div style="box-sizing:border-box;width:100%;height:${FOOTER_MARGIN_MM}mm;margin:0;padding:0;position:relative;line-height:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;"><img src="${src}" style="position:absolute;left:0;bottom:0;display:block;width:100%;height:${FOOTER_BAND_MM}mm;object-fit:fill;margin:0;border:0;padding:0;" /></div>`;
}

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function wordsUnder1000(n) {
  if (n === 0) return "";
  if (n < 20) return ONES[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const r = n % 10;
    return `${TENS[t]}${r ? ` ${ONES[r]}` : ""}`.trim();
  }
  const h = Math.floor(n / 100);
  const r = n % 100;
  return `${ONES[h]} Hundred${r ? ` and ${wordsUnder1000(r)}` : ""}`.trim();
}

function integerToWords(n) {
  if (n === 0) return "Zero";
  const parts = [];
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  if (millions) parts.push(`${wordsUnder1000(millions)} Million`);
  if (thousands) parts.push(`${wordsUnder1000(thousands)} Thousand`);
  if (rest) parts.push(wordsUnder1000(rest));
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function amountInWords(amount) {
  const n = Math.round((Number(amount) || 0) * 100);
  const dirhams = Math.floor(n / 100);
  const fils = n % 100;
  const dirhamWords = integerToWords(dirhams);
  const filsPart = ` & ${String(fils).padStart(2, "0")}fils`;
  return `${dirhamWords} AED${filsPart}`;
}

function calcBoqTotals(boq) {
  const items = Array.isArray(boq?.items) ? boq.items : [];
  const computedSub = items.reduce(
    (s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
    0,
  );
  const subtotal = Number(boq?.subtotal) || computedSub;
  const discountPercent = Number(boq?.discountPercent) || 0;
  const taxPercent = Number(boq?.taxPercent) ?? 5;
  const discountAmount =
    Number(boq?.discountAmount) || (subtotal * discountPercent) / 100;
  const totalExVat = subtotal - discountAmount;
  const taxAmount = Number(boq?.taxAmount) || (totalExVat * taxPercent) / 100;
  const grandTotal = Number(boq?.grandTotal) || totalExVat + taxAmount;
  return { subtotal, discountAmount, taxPercent, taxAmount, totalExVat, grandTotal };
}

/** Meta field row: 4 cells label|value|label|value */
function metaPair(leftLabel, leftValue, rightLabel, rightValue) {
  return `<tr>
    <td class="lbl">${escapeHtml(leftLabel)}</td>
    <td class="val">${escapeHtml(leftValue ?? "—")}</td>
    <td class="lbl">${escapeHtml(rightLabel)}</td>
    <td class="val">${escapeHtml(rightValue ?? "—")}</td>
  </tr>`;
}

const WOODIE_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  /* No @page margin here: print margins come from the render options, so documents
     using Chrome-rendered header/footer keep those bands clear of content. */
  @page { size: A4 portrait; }
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10px;
    color: #000;
    line-height: 1.35;
    background: #fff;
  }
  .pdf-header {
    display: block;
    width: 100%;
    margin: 0;
    padding: 0;
    line-height: 0;
  }
  .pdf-header img {
    display: block;
    width: 100%;
    height: auto;
    margin: 0;
    border: 0;
  }
  .header-fallback {
    background: #000;
    color: ${COLORS.gold};
    text-align: center;
    padding: 20px;
    font-size: 14px;
    font-weight: bold;
    width: 100%;
  }
  .page-body {
    width: 100%;
    margin: 0;
    padding: 6px 12px 10px;
  }

  /* Quotation: fixed header/footer + explicit top padding on continued pages.
     Body padding only clears page 1; after a page-break Chromium resets to y=0
     under the fixed header, so .page-continued must repeat the header clearance. */
  body.woodie-doc .pdf-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 50mm;
    z-index: 10;
    overflow: hidden;
  }
  body.woodie-doc .pdf-header img {
    width: 100%;
    height: 50mm;
    object-fit: fill;
  }
  body.woodie-doc .pdf-footer-img {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 16.5mm;
    margin: 0;
    z-index: 10;
    overflow: hidden;
  }
  body.woodie-doc .pdf-footer-img img {
    width: 100%;
    height: 16.5mm;
    object-fit: fill;
  }
  body.woodie-doc .page-body {
    padding: 52mm 12px 22mm;
  }
  body.woodie-doc .force-page-break {
    break-before: page;
    page-break-before: always;
    height: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }
  body.woodie-doc table.hf-clear-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    margin: 0;
    border: none;
  }
  body.woodie-doc table.hf-clear-table td {
    height: 60mm;
    border: none !important;
    padding: 0 !important;
    margin: 0;
    font-size: 1px;
    line-height: 60mm;
    color: transparent;
  }
  body.woodie-doc .page-continued {
    page-break-before: always;
    padding-top: 0;
  }
  body.woodie-doc .hf-clear {
    display: none;
  }

  /* Invoice: sticky header/footer + body padding (unchanged) */
  body.invoice-doc .pdf-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10;
  }
  body.invoice-doc .pdf-footer-img {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    margin: 0;
    z-index: 10;
  }
  body.invoice-doc .page-body {
    padding: 52mm 10px 22mm;
  }
  .page-continued {
    page-break-before: always;
    padding-top: 8px;
  }

  table.wts {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    margin-bottom: 8px;
  }
  table.wts td, table.wts th {
    border: 1px solid ${COLORS.border};
    padding: 4px 6px;
    vertical-align: middle;
    word-wrap: break-word;
  }
  table.wts .lbl {
    background: ${COLORS.blueLabel};
    font-weight: bold;
    font-size: 9px;
    width: 14%;
  }
  table.wts .val {
    background: #fff;
    font-size: 10px;
    width: 36%;
  }
  table.wts .title-row td {
    background: ${COLORS.peach};
    text-align: center;
    font-weight: bold;
    font-size: 12px;
    letter-spacing: 0.12em;
    padding: 7px;
  }
  table.wts .subject-lbl {
    background: ${COLORS.blueLabel};
    font-weight: bold;
    width: 14%;
  }

  .intro-text {
    margin: 10px 0 10px;
    font-size: 10px;
    line-height: 1.5;
  }

  table.items th {
    background: ${COLORS.peach};
    color: #000;
    font-weight: bold;
    font-size: 9px;
    text-align: center;
    padding: 5px 4px;
  }
  table.items td {
    font-size: 9px;
    background: #fff;
    vertical-align: top;
  }
  table.items td.desc {
    text-align: left;
  }
  table.items .c { text-align: center; }
  table.items .r { text-align: right; white-space: nowrap; }
  table.items tr.project-row td {
    font-weight: bold;
    background: #fff;
    text-align: left;
    padding: 5px 6px;
  }
  .desc-red { color: ${COLORS.redNote}; }

  table.items tfoot > tr > td { padding: 0; vertical-align: top; }
  table.words-inner {
    width: 100%;
    border-collapse: collapse;
    height: 100%;
  }
  table.words-inner td {
    border: none;
    border-right: 1px solid ${COLORS.border};
    padding: 8px 8px;
    font-size: 9px;
  }
  table.words-inner .lbl { border-right: 1px solid ${COLORS.border}; }
  table.words-inner .lbl {
    background: ${COLORS.blueLabel};
    font-weight: bold;
    width: 28%;
  }
  table.words-inner .words-val {
    font-style: italic;
    font-size: 10px;
  }
  table.totals-side {
    width: 100%;
    border-collapse: collapse;
    height: 100%;
  }
  table.totals-side td {
    border: none;
    border-bottom: 1px solid ${COLORS.border};
    padding: 4px 6px;
    font-size: 9px;
  }
  table.totals-side tr:last-child td { border-bottom: none; }
  table.totals-side .lbl {
    background: ${COLORS.blueLabel};
    font-weight: bold;
    text-align: left;
  }
  table.totals-side .r { text-align: right; }
  table.totals-side tr.grand td {
    background: ${COLORS.peach};
    font-weight: bold;
  }

  .inv-title {
    text-align: center;
    font-size: 14px;
    font-weight: bold;
    text-decoration: underline;
    margin: 2px 0 2px;
    letter-spacing: 0.04em;
  }
  .inv-trn {
    text-align: center;
    font-weight: bold;
    font-size: 11px;
    margin-bottom: 8px;
  }
  .inv-middle {
    position: relative;
  }
  .info-columns {
    display: table;
    width: 100%;
    border-collapse: separate;
    border-spacing: 6px 0;
    margin: 0 0 8px;
  }
  .info-columns .col {
    display: table-cell;
    width: 50%;
    vertical-align: top;
    padding: 0;
  }
  table.info-mini {
    width: 100%;
    border-collapse: collapse;
  }
  table.info-mini td {
    border: 1px solid ${COLORS.border};
    padding: 5px 6px;
    font-size: 9px;
    vertical-align: middle;
  }
  table.info-mini .lbl {
    background: ${COLORS.blueLabel};
    font-weight: bold;
    width: 40%;
  }

  table.inv-items { font-size: 8px; margin-bottom: 0; }
  table.inv-items col.c-sn { width: 4%; }
  table.inv-items col.c-desc { width: 26%; }
  table.inv-items col.c-qty { width: 5%; }
  table.inv-items col.c-up { width: 8%; }
  table.inv-items col.c-unit { width: 5%; }
  table.inv-items col.c-amt { width: 9%; }
  table.inv-items col.c-disc { width: 7%; }
  table.inv-items col.c-tax { width: 9%; }
  table.inv-items col.c-rate { width: 6%; }
  table.inv-items col.c-vat { width: 9%; }
  table.inv-items col.c-incl { width: 12%; }
  table.inv-items th {
    background: ${COLORS.peach};
    font-weight: bold;
    text-align: center;
    padding: 6px 2px;
    font-size: 7.5px;
    vertical-align: middle;
  }
  table.inv-items td { padding: 5px 3px; background: transparent; }
  table.inv-items tr.total-row td {
    font-weight: bold;
    background: ${COLORS.peach};
  }

  table.summary-block {
    width: 100%;
    border-collapse: collapse;
    margin-top: 0;
  }
  table.summary-block > tbody > tr > td {
    border: 1px solid ${COLORS.border};
    vertical-align: top;
    width: 50%;
    padding: 0;
    background: transparent;
  }
  table.summary-left, table.summary-right {
    width: 100%;
    border-collapse: collapse;
  }
  table.summary-left td, table.summary-right td {
    border: 1px solid ${COLORS.border};
    padding: 6px 8px;
    font-size: 9px;
  }
  table.summary-left .lbl, table.summary-right .lbl {
    background: ${COLORS.blueLabel};
    font-weight: bold;
  }
  table.summary-left .italic {
    font-style: italic;
    min-height: 16px;
    background: #fff;
  }
  table.summary-right .r { text-align: right; font-weight: bold; background: #fff; }
  table.summary-right tr.last td { background: ${COLORS.peach}; }

  .signatures {
    display: table;
    width: 100%;
    margin-top: 12px;
    border-collapse: collapse;
    page-break-inside: avoid;
  }
  .signatures .sig-col {
    display: table-cell;
    width: 50%;
    border: 1px solid ${COLORS.border};
    padding: 10px 12px 12px;
    vertical-align: top;
    height: 145px;
    background: transparent;
  }
  .signatures h4 {
    font-size: 9px;
    font-weight: bold;
    text-decoration: underline;
    margin: 0 0 12px;
    text-transform: none;
  }
  .sig-line-item {
    margin-bottom: 14px;
    font-size: 9px;
    line-height: 1.6;
  }
  .sig-line-item .k { font-weight: bold; }
  .sig-line-item .line {
    display: inline-block;
    min-width: 170px;
    border-bottom: 1px solid #333;
    margin-left: 4px;
    height: 12px;
    vertical-align: baseline;
  }
  .stamp-box {
    margin-top: 16px;
    width: 95px;
    height: 95px;
    border: 2px solid #1e4f9c;
    border-radius: 50%;
    color: #1e4f9c;
    font-size: 7px;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    line-height: 1.2;
  }

  .section-h {
    font-weight: bold;
    text-decoration: underline;
    margin: 10px 0 4px;
    font-size: 10px;
    page-break-after: avoid;
  }
  table.wts.items {
    page-break-inside: auto;
  }
  table.wts.items thead {
    display: table-header-group;
  }
  table.wts.items tr {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  /* Quotation content column: keeps sections off the full-bleed header/footer edges */
  .quotation-body {
    width: 100%;
    padding: 0 6mm;
  }
  /* One clean outer border; whole block moves to the next page if it will not fit */
  .site-block {
    border: 1px solid ${COLORS.border};
    border-radius: 0;
    padding: 8px;
    margin: 0 0 10px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .site-block .section-h {
    margin-top: 8px;
    margin-bottom: 3px;
  }
  .site-block .section-h:first-child {
    margin-top: 0;
  }
  /* Subtle inner table borders only — no extra horizontal rules */
  .site-block table.wts {
    border-color: #c8c8c8;
  }
  .site-block table.wts td,
  .site-block table.wts th {
    border-color: #c8c8c8;
  }
  .site-block table.wts.items {
    page-break-inside: avoid;
    break-inside: avoid;
    margin-bottom: 6px;
  }
  .site-block table.wts:last-child {
    margin-bottom: 0;
  }
  .avoid-break {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .closing-section {
    margin-top: 12px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .closing-section .section-h:first-child {
    margin-top: 0;
  }
  table.amount-summary {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  table.amount-summary td {
    border: 1px solid ${COLORS.border};
    padding: 5px 8px;
    font-size: 9px;
  }
  table.amount-summary .lbl {
    background: ${COLORS.blueLabel};
    font-weight: bold;
    width: 55%;
  }
  table.amount-summary .r {
    text-align: right;
    white-space: nowrap;
  }
  table.amount-summary tr.grand td {
    background: ${COLORS.peach};
    font-weight: bold;
  }
  table.amount-summary .words-val {
    font-style: italic;
    font-size: 9px;
  }
  table.bullets td {
    border: 1px solid ${COLORS.border};
    padding: 4px 8px;
    font-size: 9px;
  }
  .pay-line { font-weight: bold; margin: 10px 0; font-size: 10px; }
  .rep-title { font-weight: bold; margin-top: 14px; font-size: 10px; }
  .rep-name { font-weight: bold; margin-top: 4px; }
  .rep-phone { margin-top: 2px; }
  .sig-underline {
    margin-top: 36px;
    border-top: 1px solid #000;
    width: 200px;
    padding-top: 3px;
    font-size: 8px;
  }
  .pdf-signature {
    margin-top: 10px;
    margin-bottom: 4px;
    width: 220px;
    line-height: 0;
  }
  .pdf-signature img {
    display: block;
    width: 180px;
    max-width: 100%;
    height: auto;
  }
  .auth-sign-block {
    margin-top: 6px;
    text-align: center;
    min-height: 105px;
  }
  .auth-sign-block .pdf-signature {
    margin: 10px auto 14px;
    width: 170px;
  }
  .auth-sign-block .pdf-signature img {
    width: 160px;
    margin: 0 auto;
  }
  .auth-sign-block .auth-caption {
    font-size: 9px;
    font-weight: bold;
    text-align: center;
    margin-top: 8px;
  }

  .pdf-footer-img {
    width: 100%;
    margin: 16px 0 0;
    padding: 0;
    line-height: 0;
    page-break-inside: avoid;
  }
  .pdf-footer-img img {
    display: block;
    width: 100%;
    max-width: 210mm;
    height: auto;
    margin: 0 auto;
    border: 0;
  }
`;

function buildStyles() {
  return WOODIE_STYLES;
}

async function renderPdfFromHtml(html, options = {}) {
  const {
    chromeHeaderFooter = false,
    headerMarginMm = HEADER_MARGIN_MM,
    footerMarginMm = FOOTER_MARGIN_MM,
  } = options;

  let browser;
  try {
    browser = await launchPdfBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "load", timeout: 60000 });
    await page.evaluate(async () => {
      const imgs = Array.from(document.querySelectorAll("img"));
      await Promise.all(
        imgs.map(
          (img) =>
            new Promise((resolve) => {
              if (img.complete && img.naturalWidth > 0) resolve();
              else {
                img.onload = () => resolve();
                img.onerror = () => resolve();
                setTimeout(resolve, 5000);
              }
            }),
        ),
      );
    });

    const pdfOptions = {
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: chromeHeaderFooter
        ? {
            top: `${headerMarginMm}mm`,
            right: "0",
            bottom: `${footerMarginMm}mm`,
            left: "0",
          }
        : { top: "0", right: "0", bottom: "0", left: "0" },
    };

    if (chromeHeaderFooter) {
      pdfOptions.preferCSSPageSize = false;
      pdfOptions.displayHeaderFooter = true;
      pdfOptions.headerTemplate = puppeteerHeaderTemplate();
      pdfOptions.footerTemplate = puppeteerFooterTemplate();
    }

    const pdfBuffer = await page.pdf(pdfOptions);
    return Buffer.from(pdfBuffer);
  } finally {
    if (browser) await browser.close();
  }
}

function wrapHtmlDocument(title, bodyInner, options = {}) {
  const {
    includeFooter = false,
    /** When true, header/footer are injected by Puppeteer on every page — omit from body. */
    chromeHeaderFooter = false,
    /** Invoice layout: in-document header/footer fixed on each page */
    invoiceDoc = false,
    /** Shared sticky header/footer for quotation + invoice */
    woodieDoc = false,
  } = options;
  const header = chromeHeaderFooter ? "" : headerBannerHtml();
  const footer = chromeHeaderFooter
    ? ""
    : includeFooter || invoiceDoc || woodieDoc
      ? footerBannerHtml()
      : "";
  const bodyClass =
    invoiceDoc || woodieDoc
      ? ` class="${invoiceDoc ? "invoice-doc" : "woodie-doc"}"`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>${buildStyles()}</style>
</head>
<body${bodyClass}>
  ${header}
  <div class="page-body">
    ${bodyInner}
  </div>
  ${footer}
</body>
</html>`;
}

module.exports = {
  COMPANY,
  COLORS,
  escapeHtml,
  formatDescription,
  formatPdfDate,
  formatMoneyNum,
  formatRefNo,
  amountInWords,
  calcBoqTotals,
  metaPair,
  signatureImageHtml,
  wrapHtmlDocument,
  renderPdfFromHtml,
};
