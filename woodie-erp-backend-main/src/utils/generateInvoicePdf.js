const {
  COMPANY,
  escapeHtml,
  formatDescription,
  formatPdfDate,
  formatMoneyNum,
  amountInWords,
  signatureImageHtml,
  wrapHtmlDocument,
  renderPdfFromHtml,
} = require("./pdfShared");

function buildLineRows(items, taxPercent) {
  const rows = [];
  let sn = 0;
  for (const item of items) {
    sn += 1;
    const qty = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    const amount = qty * unitPrice;
    const discount = Number(item.discount) || 0;
    const taxable = amount - discount;
    const vatRate = taxPercent;
    const vatAmount = (taxable * vatRate) / 100;
    const inclVat = taxable + vatAmount;
    rows.push({
      sn,
      description: item.description,
      qty,
      unit: item.unit || "EA",
      unitPrice,
      amount,
      discount,
      taxable,
      vatRate,
      vatAmount,
      inclVat,
    });
  }
  return rows;
}

function infoTableRows(pairs) {
  return pairs
    .map(
      ([label, value]) =>
        `<tr><td class="lbl">${escapeHtml(label)}</td><td>${escapeHtml(value ?? "—")}</td></tr>`,
    )
    .join("");
}

function moneyOrDash(n) {
  const v = Number(n) || 0;
  return v > 0 ? formatMoneyNum(v) : "-";
}

function buildInvoiceHtml(invoiceData, boqData, inquiryData, workOrderData) {
  const inv = invoiceData || {};
  const boq = boqData || {};
  const inquiry = inquiryData || {};
  const wo = workOrderData || {};

  const taxPercent = Number(inv.taxPercent) ?? 5;
  const exTax = Number(inv.amount) || 0;
  const vatTotal = Number(inv.taxAmount) || 0;
  const inclTax = Number(inv.totalAmount) || exTax + vatTotal;
  const invType = String(inv.type || "Invoice");

  // Partial invoices (Advance / Progress) must match this invoice amount — not full BOQ.
  // Final may use BOQ lines only when they total the invoice ex-tax (within 0.05).
  const boqItems = Array.isArray(boq.items) && boq.items.length ? boq.items : [];
  let lines = [];
  if (invType === "Final" && boqItems.length) {
    const candidate = buildLineRows(boqItems, taxPercent);
    const sumTaxable = candidate.reduce((s, l) => s + l.taxable, 0);
    if (Math.abs(sumTaxable - exTax) <= 0.05) {
      lines = candidate;
    }
  }
  if (lines.length === 0) {
    const project =
      wo.projectName || boq.projectName || inv.projectName || "Services";
    lines = [
      {
        sn: 1,
        description: `${invType} payment — ${project}`,
        qty: 1,
        unit: "LS",
        unitPrice: exTax,
        amount: exTax,
        discount: 0,
        taxable: exTax,
        vatRate: taxPercent,
        vatAmount: vatTotal,
        inclVat: inclTax,
      },
    ];
  }

  const sumAmount = lines.reduce((s, l) => s + l.amount, 0);
  const sumDiscount = lines.reduce((s, l) => s + l.discount, 0);
  const sumTaxable = lines.reduce((s, l) => s + l.taxable, 0);
  const sumVat = lines.reduce((s, l) => s + l.vatAmount, 0);
  const sumIncl = lines.reduce((s, l) => s + l.inclVat, 0);

  const itemRows = lines
    .map(
      (l) => `<tr>
        <td class="c">${l.sn}</td>
        <td class="desc">${formatDescription(l.description)}</td>
        <td class="c">${l.qty}</td>
        <td class="r">${formatMoneyNum(l.unitPrice)}</td>
        <td class="c">${escapeHtml(l.unit)}</td>
        <td class="r">${formatMoneyNum(l.amount)}</td>
        <td class="r">${moneyOrDash(l.discount)}</td>
        <td class="r">${formatMoneyNum(l.taxable)}</td>
        <td class="c">${l.vatRate}%</td>
        <td class="r">${formatMoneyNum(l.vatAmount)}</td>
        <td class="r">${formatMoneyNum(l.inclVat)}</td>
      </tr>`,
    )
    .join("");

  const buyerAddress =
    inquiry.fullAddress ||
    inquiry.siteDetails ||
    wo.siteAddress ||
    wo.projectName ||
    inv.projectName ||
    "—";
  const customerTrn = inv.customerTrn || inquiry.customerTrn || inquiry.clientTrn || "—";
  const lpoNo = inv.lpoNumber || wo.lpoNumber || "—";
  const lpoDate = inv.lpoDate || wo.lpoDate;
  const deliveryNote = inv.deliveryNoteNumber || wo.deliveryNoteNumber || "—";
  const dateOfSupply = inv.dateOfSupply || inv.sentAt || inv.createdAt;
  const termsDelivery = inv.termsOfDelivery || wo.termsOfDelivery || "Local";
  const termsPayment =
    inv.termsOfPayment || boq.paymentTerms || wo.paymentTerms || "50% Advance";

  const leftInfo = infoTableRows([
    ["Invoice No.", inv.invoiceNumber],
    ["Invoice Date", formatPdfDate(inv.createdAt)],
    ["Name of Buyer", inv.clientName],
    ["Address", buyerAddress],
    ["Customer TRN", customerTrn],
  ]);

  const rightInfo = infoTableRows([
    ["LPO No.", lpoNo],
    ["LPO Date", lpoDate ? formatPdfDate(lpoDate) : "—"],
    ["Delivery Note No.", deliveryNote],
    ["Date of Supply", formatPdfDate(dateOfSupply)],
    ["Terms of delivery", termsDelivery],
    ["Terms of payment", termsPayment],
  ]);

  const body = `
    <div class="inv-middle">
      <div class="inv-title">TAX INVOICE</div>
      <div class="inv-trn">TRN: ${escapeHtml(COMPANY.trn)}</div>

      <div class="info-columns">
        <div class="col">
          <table class="info-mini"><tbody>${leftInfo}</tbody></table>
        </div>
        <div class="col">
          <table class="info-mini"><tbody>${rightInfo}</tbody></table>
        </div>
      </div>

      <table class="wts inv-items items">
        <colgroup>
          <col class="c-sn" /><col class="c-desc" /><col class="c-qty" /><col class="c-up" />
          <col class="c-unit" /><col class="c-amt" /><col class="c-disc" /><col class="c-tax" />
          <col class="c-rate" /><col class="c-vat" /><col class="c-incl" />
        </colgroup>
        <thead>
          <tr>
            <th>Sr. No.</th>
            <th>Description of Goods</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Unit</th>
            <th>Amount (AED)</th>
            <th>Discount</th>
            <th>Taxable value (AED)</th>
            <th>VAT Rate</th>
            <th>VAT Amount (AED)</th>
            <th>Amount Including VAT (AED)</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
          <tr class="total-row">
            <td colspan="5" class="c"><strong>Total</strong></td>
            <td class="r">${formatMoneyNum(sumAmount)}</td>
            <td class="r">${moneyOrDash(sumDiscount)}</td>
            <td class="r">${formatMoneyNum(sumTaxable)}</td>
            <td></td>
            <td class="r">${formatMoneyNum(sumVat)}</td>
            <td class="r">${formatMoneyNum(sumIncl)}</td>
          </tr>
        </tbody>
      </table>

      <table class="summary-block">
        <tr>
          <td>
            <table class="summary-left">
              <tr>
                <td class="lbl">Total Excluding Tax Amount in Words:</td>
              </tr>
              <tr>
                <td class="italic">${escapeHtml(amountInWords(exTax))}</td>
              </tr>
              <tr>
                <td class="lbl">VAT Amount in Words:</td>
              </tr>
              <tr>
                <td class="italic">${escapeHtml(amountInWords(vatTotal))}</td>
              </tr>
              <tr>
                <td class="lbl">Total Including Tax Amount in Words:</td>
              </tr>
              <tr>
                <td class="italic">${escapeHtml(amountInWords(inclTax))}</td>
              </tr>
            </table>
          </td>
          <td>
            <table class="summary-right">
              <tr>
                <td class="lbl">Total Excluding Tax Amount:</td>
                <td class="r">${formatMoneyNum(exTax)}</td>
              </tr>
              <tr>
                <td class="lbl">Total VAT Amount:</td>
                <td class="r">${formatMoneyNum(vatTotal)}</td>
              </tr>
              <tr class="last">
                <td class="lbl">Total Including Tax Amount:</td>
                <td class="r">${formatMoneyNum(inclTax)}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <div class="signatures">
        <div class="sig-col">
          <h4>For Client</h4>
          <div class="sig-line-item"><span class="k">Receiver's Name:</span><span class="line"></span></div>
          <div class="sig-line-item"><span class="k">Sign:</span><span class="line"></span></div>
          <div class="sig-line-item"><span class="k">Mobile No:</span><span class="line"></span></div>
          <div class="sig-line-item"><span class="k">Date:</span><span class="line"></span></div>
        </div>
        <div class="sig-col">
          <h4>For ${escapeHtml(COMPANY.nameShort)}</h4>
          <div class="auth-sign-block">
            ${signatureImageHtml()}
            <div class="auth-caption">Authorised Signatory</div>
          </div>
        </div>
      </div>
    </div>
  `;

  return wrapHtmlDocument(`Invoice ${inv.invoiceNumber || ""}`, body, {
    invoiceDoc: true,
  });
}

async function generateInvoicePDF(invoiceData, boqData, inquiryData, workOrderData) {
  const html = buildInvoiceHtml(invoiceData, boqData, inquiryData, workOrderData);
  return renderPdfFromHtml(html);
}

module.exports = { generateInvoicePDF, buildInvoiceHtml };
