const fs = require("fs");
const path = require("path");
const {
  COMPANY,
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
} = require("./pdfShared");

const STANDARD_TERMS = [
  "We reserve the right to re-quote in the event of size, quantity or specification change.",
  "This offer is valid for 30 days from the date of issuance.",
  "All physical samples and material finishes to be approved by the client prior to work commencement.",
  "Total completion timeline is estimated at 2-3 weeks from receipt of confirmation and advance payment.",
  "Work will be carried out during approved building/facility working hours in accordance with UAE safety norms.",
];

const STANDARD_EXCLUSIONS = [
  "Any additional civil, MEP, or structural modifications not explicitly mentioned in the scope.",
  "Authority permits, DEWA/Municipality approvals and associated fees to be paid directly by the client.",
  "Existing concealed defects, hidden plumbing leaks, or electrical wiring within walls/floors.",
  "Any items designated as 'Supplied by Client' are excluded from Woodie supply responsibility.",
];

const SITE_CONDITION_FIELDS = [
  ["existingCondition", "Existing Site Condition"],
  ["demolitionRequired", "Demolition Required"],
  ["accessLimitations", "Access Limitations & Logistics"],
  ["ceilingWallFloorCondition", "Ceiling / Wall / Floor Condition"],
];

const RISK_FIELDS = [
  ["electricalRisk", "Electrical & Wiring Safety"],
  ["heightWork", "Height Work Protocols"],
  ["waterLeakage", "Moisture & Waterproofing Evaluation"],
  ["restrictedAccess", "Restricted Access & Working Hours"],
  ["otherRisks", "Other Site Environmental Factors"],
];

const VISIT_NOTE_FIELDS = [
  ["clientRequirements", "Client Specific Brief & Requirements"],
  ["installationDetails", "Installation & Fixing Details"],
  ["materialSuggestions", "Material & Finish Suggestions"],
  ["recommendedSolution", "Engineering Recommended Solution"],
  ["executionComplexity", "Execution Complexity & Access"],
  ["specialInstructions", "Site Supervisor Special Instructions"],
];

function hasText(value) {
  return String(value ?? "").trim().length > 0;
}

function textOrEmpty(value) {
  return String(value ?? "").trim();
}

function resolvePhotoDataUri(photoUrl) {
  if (!photoUrl) return "";
  try {
    const cleanPath = photoUrl.replace(/^\//, "");
    const absPath = path.resolve(__dirname, "../../", cleanPath);
    if (fs.existsSync(absPath)) {
      const ext = path.extname(absPath).slice(1).toLowerCase() || "jpeg";
      const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
      const base64 = fs.readFileSync(absPath).toString("base64");
      return `data:${mime};base64,${base64}`;
    }
  } catch {}
  return photoUrl;
}

function findBoqItem(boqItems, workItem, index) {
  const items = Array.isArray(boqItems) ? boqItems : [];
  if (!items.length) return null;

  const needle = `${textOrEmpty(workItem.workType)} ${textOrEmpty(workItem.description)}`
    .trim()
    .toLowerCase();
  if (needle) {
    for (const item of items) {
      const desc = textOrEmpty(item.description).toLowerCase();
      if (!desc) continue;
      if (
        desc.includes(needle) ||
        needle.includes(desc) ||
        (workItem.workType && desc.includes(textOrEmpty(workItem.workType).toLowerCase()))
      ) {
        return item;
      }
    }
  }

  if (index !== undefined && items[index]) {
    return items[index];
  }

  return null;
}

function parseQty(item, boqItem) {
  let val = item?.quantity;
  if (val === "" || val === undefined || val === null) {
    if (boqItem?.quantity !== undefined && boqItem?.quantity !== null && boqItem?.quantity !== "") {
      val = boqItem.quantity;
    }
  }
  if (val === "" || val === undefined || val === null) {
    return { qtyNum: 1, qty: "1" };
  }
  const n = Number(val);
  if (Number.isNaN(n) || n <= 0) return { qtyNum: 1, qty: "1" };
  return { qtyNum: n, qty: String(val) };
}

function calcTotalsFromSiteWorkItems(sites, boq) {
  const boqItems = Array.isArray(boq?.items) ? boq.items : [];
  let computedSub = 0;
  let anyLine = false;
  let idx = 0;

  for (const site of sites || []) {
    const list = Array.isArray(site?.workItems) ? site.workItems : [];
    for (const rawItem of list) {
      const item = rawItem && typeof rawItem.toObject === "function" ? rawItem.toObject() : rawItem;
      const workType = textOrEmpty(item.workType);
      const description = textOrEmpty(item.description);
      const unit = textOrEmpty(item.unit);
      const finish = textOrEmpty(item.finishMaterial);
      const notes = textOrEmpty(item.notes);
      if (!workType && !description && !item.quantity && !unit && !finish && !notes) continue;
      anyLine = true;
      const boqItem = findBoqItem(boqItems, item, idx);
      const { qtyNum } = parseQty(item, boqItem);
      const rate = Number(item.unitPrice) || Number(boqItem?.unitPrice) || 0;
      computedSub += qtyNum * rate;
      idx++;
    }
  }

  if (!anyLine) return null;
  if (computedSub <= 0) return calcBoqTotals(boq);

  const discountPercent = Number(boq?.discountPercent) || 0;
  const taxPercent = Number(boq?.taxPercent) ?? 5;
  const subtotal = computedSub;
  const discountAmount =
    Number(boq?.discountAmount) || (subtotal * discountPercent) / 100;
  const totalExVat = subtotal - discountAmount;
  const taxAmount = Number(boq?.taxAmount) || (totalExVat * taxPercent) / 100;
  const grandTotal = totalExVat + taxAmount;
  return { subtotal, discountAmount, taxPercent, taxAmount, totalExVat, grandTotal };
}

function buildWorkItemsSection(workItems, boqItems, quotationId) {
  if (!Array.isArray(workItems) || !workItems.length) return "";

  const rows = workItems
    .map((rawItem, index) => {
      const item = rawItem && typeof rawItem.toObject === "function" ? rawItem.toObject() : rawItem;
      const boqItem = findBoqItem(boqItems, item, index);

      const workType = textOrEmpty(item.workType);
      const description = textOrEmpty(item.description);
      const { qtyNum, qty } = parseQty(item, boqItem);
      const unit = textOrEmpty(item.unit) || textOrEmpty(boqItem?.unit) || "Nos";
      const finish = textOrEmpty(item.finishMaterial);
      const notes = textOrEmpty(item.notes);
      const location = textOrEmpty(item.location);
      const dimensionText = textOrEmpty(item.dimensionText);
      const materialNotes = textOrEmpty(item.materialNotes);
      const blockTitle = textOrEmpty(item.blockTitle);

      if (!workType && !description && !item.quantity && !unit && !finish && !notes && !location && !blockTitle && !boqItem) return "";

      const rate = Number(item.unitPrice) || Number(boqItem?.unitPrice) || 0;
      const amount = qtyNum * rate;

      // Determine client supply responsibility
      const allText = `${description} ${finish} ${notes} ${materialNotes}`.toLowerCase();
      const isClientSupply =
        allText.includes("client") ||
        allText.includes("supplied by client") ||
        allText.includes("by client");

      function stripSupplyWords(str) {
        return String(str || "")
          .replace(/\bwoodie\s*supply\b/gi, "")
          .replace(/\bsupply\b/gi, "")
          .replace(/\s*·\s*$/, "")
          .replace(/^\s*·\s*/, "")
          .trim();
      }

      // 1. Location:
      let locVal = location || (blockTitle ? blockTitle : "") || item.areaRoom || "";
      if (!locVal && description.includes("Location:")) {
        const m = description.match(/Location:\s*([^\n\r]+)/i);
        if (m) locVal = m[1].trim();
      }
      if (!locVal) locVal = "—";

      // 2. Scope :
      let scopeVal = workType || "";
      let detailsText = description || "";
      let matFromDesc = "";

      if (detailsText.includes(" — Finish:")) {
        const parts = detailsText.split(" — Finish:");
        detailsText = parts[0];
        matFromDesc = (parts[1] || "").trim();
      }

      if (!scopeVal && detailsText.includes(" — ")) {
        const parts = detailsText.split(" — ");
        scopeVal = parts[0].trim();
        detailsText = parts.slice(1).join(" — ").trim();
      } else if (scopeVal && detailsText.startsWith(scopeVal)) {
        detailsText = detailsText.replace(new RegExp(`^${scopeVal}\\s*(—|-)?\\s*`, "i"), "").trim();
      }

      if (!scopeVal) {
        scopeVal = description.split("\n")[0] || "Fit-Out & Installation Work";
      }

      // 3. Measurement :
      let measurementVal = dimensionText || "";
      if (!measurementVal) {
        measurementVal = qty ? `${qty} ${unit || "Nos"}` : (unit || "—");
      }

      // 4. Material :
      const matParts = [];
      const cleanFinish = stripSupplyWords(finish || matFromDesc);
      const cleanMatNotes = stripSupplyWords(materialNotes);
      const cleanNotes = stripSupplyWords(notes);

      if (cleanFinish && cleanFinish.toLowerCase() !== "woodie supply") matParts.push(cleanFinish);
      if (cleanMatNotes && cleanMatNotes !== cleanFinish && !matParts.includes(cleanMatNotes) && cleanMatNotes.toLowerCase() !== "woodie supply") {
        matParts.push(cleanMatNotes);
      }
      if (cleanNotes && !matParts.includes(cleanNotes) && !detailsText.toLowerCase().includes(cleanNotes.toLowerCase()) && cleanNotes.toLowerCase() !== "woodie supply") {
        matParts.push(cleanNotes);
      }

      let materialVal = matParts.filter(Boolean).join(" · ").trim();
      if (!materialVal) {
        materialVal = "—";
      } else if (isClientSupply) {
        materialVal = `${materialVal} (Supplied by Client)`;
      }

      // 5. Details formatting
      let formattedDetails = "";
      if (detailsText) {
        formattedDetails = escapeHtml(detailsText)
          .replace(/(\([^)]*client[^)]*\))/gi, '<span style="color:#000;font-weight:bold;">$1</span>')
          .replace(/(painting to be done by client)/gi, '<span style="color:#000;font-weight:bold;">$1</span>')
          .replace(/(tiles to be supplied by client)/gi, '<span style="color:#000;font-weight:bold;">$1</span>')
          .replace(/(to be supplied by client)/gi, '<span style="color:#000;font-weight:bold;">$1</span>')
          .replace(/(supplied by client)/gi, '<span style="color:#000;font-weight:bold;">$1</span>')
          .replace(/•\s*/g, "• ")
          .replace(/\n/g, "<br />");
      }

      const descCell = `
        <div style="font-size:8.5px;color:#000;line-height:1.45;">
          <div style="margin-bottom:2.5px;">
            <span style="font-weight:bold;color:#000;">Location: </span>
            <span style="color:#000;">${escapeHtml(locVal)}</span>
          </div>
          <div style="margin-bottom:2.5px;">
            <span style="font-weight:bold;color:#000;">Scope : </span>
            <span style="color:#000;">${escapeHtml(scopeVal)}</span>
          </div>
          <div style="margin-bottom:2.5px;">
            <span style="font-weight:bold;color:#000;">Measurement : </span>
            <span style="color:#000;">${escapeHtml(measurementVal)}</span>
          </div>
          <div style="margin-bottom:2.5px;">
            <span style="font-weight:bold;color:#000;">Material : </span>
            <span style="color:#000;">${escapeHtml(materialVal)}</span>
          </div>
          ${formattedDetails ? `
            <div style="margin-top:2.5px;">
              <span style="font-weight:bold;color:#000;">Details : </span>
              <div style="padding-left:2px;margin-top:1px;">
                ${formattedDetails}
              </div>
            </div>
          ` : `
            <div style="margin-top:2.5px;">
              <span style="font-weight:bold;color:#000;">Details : </span>
              <span style="color:#000;">—</span>
            </div>
          `}
        </div>
      `;

      return `<tr>
        <td class="c" style="vertical-align:top;padding:8px 4px;font-size:10px;font-weight:bold;text-align:center;border:1px solid #000;color:#000;background:#fff;">${index + 1}</td>
        <td class="desc" style="padding:8px 10px;vertical-align:top;font-size:9px;line-height:1.4;border:1px solid #000;color:#000;background:#fff;">${descCell}</td>
        <td class="c" style="vertical-align:top;padding:8px 4px;font-size:10px;text-align:center;font-weight:600;border:1px solid #000;color:#000;background:#fff;">${escapeHtml(qty || "1")}</td>
        <td class="c" style="vertical-align:top;padding:8px 4px;font-size:10px;text-align:center;border:1px solid #000;color:#000;background:#fff;">${escapeHtml(unit || "Nos")}</td>
        <td class="r" style="vertical-align:top;padding:8px 6px;font-size:10px;text-align:right;font-weight:600;border:1px solid #000;color:#000;background:#fff;">${rate > 0 ? formatMoneyNum(rate) : "—"}</td>
        <td class="r" style="vertical-align:top;padding:8px 6px;font-size:10px;text-align:right;font-weight:bold;color:#000;border:1px solid #000;background:#fff;">${rate > 0 || qtyNum ? formatMoneyNum(amount) : "—"}</td>
      </tr>`;
    })
    .filter(Boolean);

  if (!rows.length) return "";

  return `
    <div id="section-scope" style="margin-top:6px;">
      <table class="wts items" style="margin-top:0;border-collapse:collapse;width:100%;">
        <thead>
          <tr style="background:#FCE4D6;">
            <th style="width:5%;padding:6px 4px;font-size:9.5px;font-weight:bold;border:1px solid #000;">S.N</th>
            <th style="width:47%;padding:6px 8px;font-size:9.5px;font-weight:bold;border:1px solid #000;text-align:left;">Description</th>
            <th style="width:10%;padding:6px 4px;font-size:9.5px;font-weight:bold;border:1px solid #000;">Quantity</th>
            <th style="width:8%;padding:6px 4px;font-size:9.5px;font-weight:bold;border:1px solid #000;">Unit</th>
            <th style="width:15%;padding:6px 4px;font-size:9.5px;font-weight:bold;border:1px solid #000;text-align:right;">Unit price (AED)</th>
            <th style="width:15%;padding:6px 4px;font-size:9.5px;font-weight:bold;border:1px solid #000;text-align:right;">Amount (AED)</th>
          </tr>
        </thead>
        <tbody>
          <tr style="background:#fff;">
            <td colspan="6" style="font-weight:bold;font-size:10.5px;padding:5px 8px;text-align:left;border:1px solid #000;background:#fff;color:#000;letter-spacing:0.02em;">
              Scope of Work &amp; Itemized Specifications
            </td>
          </tr>
          ${rows.join("")}
        </tbody>
      </table>
    </div>
  `;
}

function buildAmountSummaryHtml(totals, refNo, subject) {
  const { subtotal, discountAmount, taxPercent, taxAmount, totalExVat, grandTotal } = totals;
  const discountDisplay = discountAmount > 0 ? formatMoneyNum(discountAmount) : "-";
  const words = amountInWords(grandTotal);

  return `
    <div id="section-financial" style="page-break-inside:avoid;margin-top:0;">
      <table class="wts amount-summary" style="width:100%;border-collapse:collapse;margin-top:0;border-top:none;">
        <tbody>
          <tr>
            <td rowspan="5" style="width:16%;border:1px solid #000;font-weight:bold;vertical-align:middle;text-align:center;padding:8px 6px;font-size:9.5px;background:#fff;">
              Amount in<br />words:
            </td>
            <td rowspan="5" style="width:36%;border:1px solid #000;vertical-align:middle;text-align:left;padding:10px 10px;font-size:9.5px;background:#fff;line-height:1.4;">
              <div style="font-weight:600;color:#0f172a;margin-bottom:8px;">${escapeHtml(words)} (+VAT)</div>
              <div style="border-top:1px dashed #cbd5e1;padding-top:6px;font-size:8px;color:#64748b;">
                <span>💬 Quick Questions? </span>
                <a href="https://wa.me/971564226955?text=Hello%20Woodie%2C%20regarding%20Quotation%20${encodeURIComponent(refNo)}" target="_blank" style="color:#059669;font-weight:bold;text-decoration:none;">
                  Chat on WhatsApp ↗
                </a>
              </div>
            </td>
            <td style="width:26%;border:1px solid #000;font-weight:bold;padding:5px 8px;font-size:9.5px;background:#fff;">Sub Total</td>
            <td style="width:22%;border:1px solid #000;text-align:right;font-weight:bold;padding:5px 8px;font-size:9.5px;background:#fff;">${formatMoneyNum(subtotal)}</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;font-weight:bold;padding:5px 8px;font-size:9.5px;background:#fff;">Discount</td>
            <td style="border:1px solid #000;text-align:right;padding:5px 8px;font-size:9.5px;background:#fff;">${discountDisplay}</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;font-weight:bold;padding:5px 8px;font-size:9.5px;background:#fff;">Total excluding VAT</td>
            <td style="border:1px solid #000;text-align:right;font-weight:bold;padding:5px 8px;font-size:9.5px;background:#fff;">${formatMoneyNum(totalExVat)}</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;font-weight:bold;padding:5px 8px;font-size:9.5px;background:#fff;">VAT ${taxPercent}%</td>
            <td style="border:1px solid #000;text-align:right;padding:5px 8px;font-size:9.5px;background:#fff;">${formatMoneyNum(taxAmount)}</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;font-weight:bold;padding:6px 8px;font-size:10px;background:#FCE4D6;">Grand Total</td>
            <td style="border:1px solid #000;text-align:right;font-weight:bold;font-size:11px;padding:6px 8px;background:#FCE4D6;color:#000;">${formatMoneyNum(grandTotal)} AED</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function buildTechnicalSiteSurveyHtml(sites, shared, photos) {
  let measurementRows = [];
  let sIdx = 1;
  for (const s of sites || []) {
    const loc = s.measurements?.[0]?.areaRoom || s.title || "Area";
    const work = s.workItems?.[0]?.workType || s.workItems?.[0]?.description?.split("\n")[0] || "Scope Item";
    const dim = s.measurements?.[0]?.measurementItem || s.measurements?.[0]?.label || "—";
    const val = s.measurements?.[0]?.value || s.workItems?.[0]?.quantity || "—";
    const unit = s.measurements?.[0]?.unit || s.workItems?.[0]?.unit || "Nos";
    const finish = s.workItems?.[0]?.finishMaterial || s.materialFinishDetails?.[0]?.specification || "—";
    const supply = s.materialFinishDetails?.[0]?.specification || (finish.toLowerCase().includes("client") ? "Client Supply" : "Woodie Supply");

    measurementRows.push(`
      <tr>
        <td class="c" style="padding:5px 4px;text-align:center;font-weight:bold;border:1px solid #000;">${sIdx++}</td>
        <td style="padding:5px 6px;font-weight:600;color:#0f172a;border:1px solid #000;">${escapeHtml(loc)}</td>
        <td style="padding:5px 6px;border:1px solid #000;">${escapeHtml(work)}</td>
        <td style="padding:5px 6px;border:1px solid #000;">${escapeHtml(dim !== "—" ? dim : `${val} ${unit}`)}</td>
        <td class="c" style="padding:5px 4px;text-align:center;border:1px solid #000;">${escapeHtml(String(val))} ${escapeHtml(unit)}</td>
        <td style="padding:5px 6px;font-size:8px;border:1px solid #000;">${escapeHtml(finish)}</td>
        <td class="c" style="padding:5px 4px;text-align:center;font-size:8px;font-weight:bold;border:1px solid #000;color:${supply.toLowerCase().includes("client") ? "#b91c1c" : "#047857"};">
          ${escapeHtml(supply)}
        </td>
      </tr>
    `);
  }

  const cond = shared.siteCondition || {};
  const condRows = SITE_CONDITION_FIELDS.map(([key, label]) => {
    const val = textOrEmpty(cond[key]);
    if (!val) return null;
    return `
      <tr>
        <td class="lbl" style="width:25%;background:#BDD7EE;font-weight:bold;font-size:8.5px;border:1px solid #000;padding:4px 6px;">${escapeHtml(label)}</td>
        <td class="val" style="width:75%;background:#fff;font-size:9px;border:1px solid #000;padding:4px 6px;">${escapeHtml(val)}</td>
      </tr>
    `;
  }).filter(Boolean);

  const risk = shared.riskAssessment || {};
  const riskRows = RISK_FIELDS.map(([key, label]) => {
    const val = textOrEmpty(risk[key]);
    if (!val) return null;
    return `
      <tr>
        <td class="lbl" style="width:25%;background:#BDD7EE;font-weight:bold;font-size:8.5px;border:1px solid #000;padding:4px 6px;">${escapeHtml(label)}</td>
        <td class="val" style="width:75%;background:#fff;font-size:9px;border:1px solid #000;padding:4px 6px;">${escapeHtml(val)}</td>
      </tr>
    `;
  }).filter(Boolean);

  const validPhotos = (photos || []).filter(p => p.url).slice(0, 4);
  let photoGalleryHtml = "";
  if (validPhotos.length > 0) {
    const photoCards = validPhotos.map((photo, i) => {
      const dataUri = resolvePhotoDataUri(photo.url);
      return `
        <div style="width:48%;border:1px solid #000;background:#fff;padding:4px;box-sizing:border-box;margin-bottom:6px;page-break-inside:avoid;">
          <img src="${dataUri}" style="width:100%;height:130px;object-fit:cover;display:block;border:1px solid #e2e8f0;" />
          <div style="font-size:8px;font-weight:bold;color:#1e293b;padding-top:3px;text-align:center;">
            📷 Site Survey Inspection Reference #${i + 1}
          </div>
        </div>
      `;
    }).join("");

    photoGalleryHtml = `
      <div style="margin-top:8px;page-break-inside:avoid;">
        <div style="font-weight:bold;font-size:9.5px;color:#000;margin-bottom:4px;text-transform:uppercase;">Site Inspection Photo Documentation:</div>
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;">
          ${photoCards}
        </div>
      </div>
    `;
  }

  return `
    <div id="section-technical" style="page-break-before:always;padding-top:8px;">
      <div style="background:#0f172a;color:#fff;font-weight:bold;font-size:10.5px;padding:5px 8px;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:6px;">
        Technical Site Inspection &amp; Scope Schedule
      </div>

      <table class="wts items" style="width:100%;border-collapse:collapse;margin-bottom:8px;">
        <thead>
          <tr style="background:#BDD7EE;">
            <th style="width:4%;border:1px solid #000;padding:4px 2px;font-size:8.5px;">#</th>
            <th style="width:18%;border:1px solid #000;padding:4px 6px;font-size:8.5px;text-align:left;">Area / Room</th>
            <th style="width:24%;border:1px solid #000;padding:4px 6px;font-size:8.5px;text-align:left;">Scope Work Item</th>
            <th style="width:18%;border:1px solid #000;padding:4px 6px;font-size:8.5px;text-align:left;">Dimensions / Specs</th>
            <th style="width:10%;border:1px solid #000;padding:4px 4px;font-size:8.5px;">Quantity</th>
            <th style="width:16%;border:1px solid #000;padding:4px 6px;font-size:8.5px;text-align:left;">Material / Finish</th>
            <th style="width:10%;border:1px solid #000;padding:4px 4px;font-size:8.5px;">Supply Terms</th>
          </tr>
        </thead>
        <tbody>
          ${measurementRows.join("")}
        </tbody>
      </table>

      ${condRows.length ? `
        <div style="font-weight:bold;font-size:9.5px;color:#000;margin:6px 0 3px;text-transform:uppercase;">Site Pre-requisites &amp; Existing Conditions:</div>
        <table class="wts" style="width:100%;border-collapse:collapse;margin-bottom:8px;">
          <tbody>${condRows.join("")}</tbody>
        </table>
      ` : ""}

      ${riskRows.length ? `
        <div style="font-weight:bold;font-size:9.5px;color:#000;margin:6px 0 3px;text-transform:uppercase;">Safety &amp; Risk Assessment:</div>
        <table class="wts" style="width:100%;border-collapse:collapse;margin-bottom:8px;">
          <tbody>${riskRows.join("")}</tbody>
        </table>
      ` : ""}

      ${photoGalleryHtml}
    </div>
  `;
}

function buildTermsExclusionsAcceptanceHtml(paymentTerms, representative, repPhone, notes, refNo, clientName, attn, clientRef, subject) {
  const termsHtml = STANDARD_TERMS.map(
    (t) => `<tr><td style="border:1px solid #000;padding:4px 6px;font-size:8.5px;line-height:1.4;">❖ ${escapeHtml(t)}</td></tr>`,
  ).join("");
  const exclusionsHtml = STANDARD_EXCLUSIONS.map(
    (t) => `<tr><td style="border:1px solid #000;padding:4px 6px;font-size:8.5px;line-height:1.4;">❖ ${escapeHtml(t)}</td></tr>`,
  ).join("");

  return `
    <div id="section-terms" style="page-break-before:always;padding-top:8px;">
      <div style="font-weight:bold;font-size:10px;margin-bottom:3px;color:#000;text-transform:uppercase;">
        Contractual Terms &amp; Conditions:
      </div>
      <table class="wts bullets" style="width:100%;border-collapse:collapse;border:1px solid #000;margin-bottom:8px;">
        <tbody>${termsHtml}</tbody>
      </table>

      <div style="font-weight:bold;font-size:10px;margin-bottom:3px;color:#000;text-transform:uppercase;">
        Scope Exclusions:
      </div>
      <table class="wts bullets" style="width:100%;border-collapse:collapse;border:1px solid #000;margin-bottom:8px;">
        <tbody>${exclusionsHtml}</tbody>
      </table>

      <div style="background:#f8fafc;border:1px solid #000;padding:6px 8px;margin-bottom:12px;font-size:9.5px;">
        <span style="font-weight:bold;color:#000;text-transform:uppercase;">Payment Terms: </span>
        <span style="font-weight:600;color:#0f172a;">${escapeHtml(paymentTerms)}</span>
      </div>

      <div id="section-acceptance" style="border:1.5px solid #000;padding:10px;background:#fff;margin-top:6px;page-break-inside:avoid;">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #000;padding-bottom:5px;margin-bottom:8px;">
          <span style="font-weight:bold;font-size:10.5px;color:#000;text-transform:uppercase;letter-spacing:0.04em;">
            Customer Acceptance &amp; Project Authorization
          </span>
          <span style="font-size:8px;font-weight:bold;color:#1e3a8a;background:#dbeafe;padding:2px 6px;border-radius:3px;">
            Interactive Sign-off
          </span>
        </div>

        <p style="font-size:8.5px;color:#334155;margin-bottom:8px;line-height:1.4;">
          By signing or digitally confirming below, the client accepts the scope of work, itemized specifications, financial values, and terms specified in this quotation (Ref: <strong>${escapeHtml(refNo)}</strong>).
        </p>

        <div style="margin-bottom:8px;font-size:9px;">
          <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-weight:bold;color:#0f172a;">
            <input type="checkbox" name="accepted_scope" checked style="width:13px;height:13px;" />
            I hereby approve and accept this Quotation and authorize work commencement.
          </label>
        </div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:8px;font-size:8.5px;">
          <tr>
            <td style="width:18%;padding:4px;font-weight:bold;border:none;">Client Signatory:</td>
            <td style="width:32%;padding:4px;border:none;">
              <input type="text" name="signatory_name" value="${escapeHtml(attn !== "—" ? attn : "")}" placeholder="Authorized Name" style="width:95%;border:1px solid #94a3b8;padding:3px 5px;font-size:8.5px;border-radius:2px;" />
            </td>
            <td style="width:18%;padding:4px;font-weight:bold;border:none;">Designation:</td>
            <td style="width:32%;padding:4px;border:none;">
              <input type="text" name="designation" placeholder="Owner / Manager" style="width:95%;border:1px solid #94a3b8;padding:3px 5px;font-size:8.5px;border-radius:2px;" />
            </td>
          </tr>
          <tr>
            <td style="padding:4px;font-weight:bold;border:none;">P.O. / Project Ref #:</td>
            <td style="padding:4px;border:none;">
              <input type="text" name="po_ref" value="${escapeHtml(clientRef !== "—" ? clientRef : "")}" placeholder="Purchase Order Number" style="width:95%;border:1px solid #94a3b8;padding:3px 5px;font-size:8.5px;border-radius:2px;" />
            </td>
            <td style="padding:4px;font-weight:bold;border:none;">Date of Acceptance:</td>
            <td style="padding:4px;border:none;">
              <input type="text" name="acceptance_date" value="${formatPdfDate(new Date())}" style="width:95%;border:1px solid #94a3b8;padding:3px 5px;font-size:8.5px;border-radius:2px;" />
            </td>
          </tr>
        </table>

        <div style="display:flex;justify-content:space-between;gap:12px;margin-top:6px;">
          <div style="flex:1;border:1px solid #000;padding:8px;text-align:left;height:120px;display:flex;flex-direction:column;justify-content:space-between;background:#fafafa;">
            <div>
              <div style="font-weight:bold;font-size:9px;color:#000;text-transform:uppercase;">Woodie Representative:</div>
              <div style="font-weight:bold;font-size:10.5px;color:#0f172a;text-transform:uppercase;margin-top:2px;">${escapeHtml(representative)}</div>
              <div style="font-size:9px;color:#475569;">${escapeHtml(repPhone)}</div>
            </div>
            <div style="text-align:center;">
              ${signatureImageHtml()}
            </div>
          </div>

          <div style="flex:1;border:1px dashed #000;padding:8px;text-align:center;height:120px;display:flex;flex-direction:column;justify-content:flex-end;background:#fff;">
            <div style="font-size:8.5px;color:#64748b;font-weight:bold;text-transform:uppercase;border-top:1px dashed #cbd5e1;padding-top:4px;">
              Authorized Client Signature &amp; Company Stamp
            </div>
          </div>
        </div>

        <div style="margin-top:10px;padding-top:8px;border-top:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;font-size:8.5px;">
          <span style="color:#64748b;">Instant Digital Acceptance:</span>
          <div style="display:flex;gap:8px;">
            <a href="https://wa.me/971564226955?text=Hello%20Woodie%2C%20I%20hereby%20accept%20Quotation%20${encodeURIComponent(refNo)}" target="_blank" style="display:inline-flex;align-items:center;gap:3px;background:#25d366;color:#fff;font-weight:bold;padding:3px 8px;border-radius:3px;text-decoration:none;">
              💬 Confirm on WhatsApp
            </a>
            <a href="mailto:info@woodie.ae?subject=Approved%20Quotation%20${encodeURIComponent(refNo)}&body=I%20accept%20Quotation%20${encodeURIComponent(refNo)}%20for%20project%20${encodeURIComponent(subject)}." target="_blank" style="display:inline-flex;align-items:center;gap:3px;background:#0f172a;color:#fff;font-weight:bold;padding:3px 8px;border-radius:3px;text-decoration:none;">
              ✉️ Confirm via Email
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
}

function resolveSiteBlocks(source) {
  if (!source || typeof source !== "object") return [];
  if (Array.isArray(source.blocks) && source.blocks.length) return source.blocks;
  if (Array.isArray(source.scopes) && source.scopes.length) return source.scopes;
  if (Array.isArray(source.sites) && source.sites.length) return source.sites;
  const sr = source.siteReport || source.siteInformation;
  if (sr && sr !== source) return resolveSiteBlocks(sr);
  return [];
}

function buildQuotationHtml(boqData, inquiryData) {
  const boq = boqData && typeof boqData.toObject === "function" ? boqData.toObject() : (boqData || {});
  const inquiry = inquiryData && typeof inquiryData.toObject === "function" ? inquiryData.toObject() : (inquiryData || {});

  const quoteDate = boq.updatedAt || boq.createdAt || new Date();
  const refNo = formatRefNo(boq.quotationNumber, new Date(quoteDate));
  const clientName = boq.clientName || inquiry.clientName || "—";
  const emirates = inquiry.emirates || inquiry.state || "Dubai";
  const location = inquiry.fullAddress || inquiry.siteDetails || boq.projectName || "—";
  const attn = inquiry.attn || inquiry.contactPerson || inquiry.contactPersonName || clientName;
  const subject = boq.projectName || inquiry.scopeOfWork || "—";
  const clientRef = inquiry.inquiryNumber || inquiry.clientRefNo || "—";
  const rev = boq.revision != null ? String(boq.revision) : "0";

  const sitesFromBoq = boq?.siteInformation?.blocks && boq.siteInformation.blocks.length ? boq.siteInformation.blocks : [];
  const sitesFromInq = inquiry?.siteReport?.scopes && inquiry.siteReport.scopes.length ? inquiry.siteReport.scopes : [];
  const sites = sitesFromBoq.length ? sitesFromBoq : (sitesFromInq.length ? sitesFromInq : (boq?.siteInformation ? [boq.siteInformation] : []));

  const fromWorkItems = calcTotalsFromSiteWorkItems(sites, boq);
  const totals = fromWorkItems || calcBoqTotals(boq);

  let allWorkItems = [];
  for (const s of sites) {
    if (Array.isArray(s.workItems)) {
      s.workItems.forEach((rawWi, wiIdx) => {
        const wi = rawWi && typeof rawWi.toObject === "function" ? rawWi.toObject() : (rawWi || {});
        const meas = s.measurements?.[wiIdx] || s.measurements?.[0] || {};
        const mat = s.materialFinishDetails?.[wiIdx] || s.materialFinishDetails?.[0] || {};
        const loc = (meas.areaRoom || s.title || "").trim();
        const dim = (meas.measurementItem || meas.label || (meas.value ? `${meas.value} ${meas.unit || "Nos"}` : "")).trim();
        const matNotes = (mat.specification || "").trim();

        allWorkItems.push({
          ...wi,
          location: loc || wi.location || "",
          dimensionText: dim || wi.dimensionText || "",
          materialNotes: matNotes || wi.materialNotes || "",
        });
      });
    }
  }

  const boqItems = Array.isArray(boq?.items) ? boq.items : [];
  const workItemsContentHtml = buildWorkItemsSection(allWorkItems.length ? allWorkItems : boqItems, boqItems, boq._id);

  const paymentTerms =
    boq.paymentTerms || "50% Advance, 25% Mid , 25% After Completion";
  const representative =
    boq.createdByName || boq.approval?.reviewedByName || COMPANY.representative;
  const repPhone = boq.representativePhone || COMPANY.representativePhone;

  const shared = {
    siteCondition: boq.siteInformation?.siteCondition || inquiry.siteReport?.siteCondition || {},
    riskAssessment: boq.siteInformation?.riskAssessment || inquiry.siteReport?.riskAssessment || {},
    siteVisitNotes: boq.siteInformation?.siteVisitNotes || inquiry.siteReport?.siteVisitNotes || {},
  };
  const photos = boq.siteInformation?.photos || inquiry.siteReport?.photos || [];

  const termsAndAcceptanceHtml = buildTermsExclusionsAcceptanceHtml(
    paymentTerms,
    representative,
    repPhone,
    boq.notes,
    refNo,
    clientName,
    attn,
    clientRef,
    subject
  );

  const body = `
    <div class="quotation-body" style="font-family: Arial, Helvetica, sans-serif;">
      <div class="interactive-nav" style="display:flex;justify-content:space-between;align-items:center;background:#f8fafc;border:1px solid #cbd5e1;padding:3px 8px;margin-bottom:8px;font-size:8px;">
        <span style="font-weight:bold;color:#475569;text-transform:uppercase;letter-spacing:0.04em;">Interactive Sections:</span>
        <div style="display:flex;gap:10px;">
          <a href="#section-scope" style="color:#0284c7;font-weight:bold;text-decoration:none;">📋 Scope of Work</a>
          <a href="#section-financial" style="color:#0284c7;font-weight:bold;text-decoration:none;">💰 Commercial Summary</a>
          <a href="#section-terms" style="color:#0284c7;font-weight:bold;text-decoration:none;">📜 Terms &amp; Conditions</a>
          <a href="#section-acceptance" style="color:#0284c7;font-weight:bold;text-decoration:none;">✍️ Client Acceptance</a>
        </div>
      </div>

      <table class="wts" style="width:100%;border-collapse:collapse;margin-bottom:6px;">
        <tr class="title-row"><td colspan="4" style="background:#FCE4D6;text-align:center;font-weight:bold;font-size:12px;letter-spacing:0.12em;padding:6px;border:1px solid #000;">QUOTATION</td></tr>
        ${metaPair("REF NO", refNo, "Date", formatPdfDate(quoteDate))}
        ${metaPair("CLIENT", clientName, "REV", rev)}
        ${metaPair("EMIRATES", emirates, "Vendor TRN", COMPANY.trn)}
        ${metaPair("LOCATION", location, "PROJECT", boq.projectName || "—")}
        ${metaPair("ATTN", attn, "CLIENT REF NO", clientRef)}
        <tr>
          <td class="lbl" style="background:#BDD7EE;font-weight:bold;font-size:9px;border:1px solid #000;width:14%;padding:4px 6px;">SUBJECT</td>
          <td class="val" colspan="3" style="font-size:10px;border:1px solid #000;padding:4px 6px;font-weight:600;">${escapeHtml(subject)}</td>
        </tr>
      </table>

      <p class="intro-text" style="font-size:9.5px;line-height:1.45;margin:6px 0 8px;">
        Dear Sir / Madam,<br />
        Thank you for inviting us to participate in the above project and subject. We are pleased to submit our comprehensive commercial offer and technical execution proposal based on the site survey and engineering specifications.
      </p>

      ${workItemsContentHtml}
      ${buildAmountSummaryHtml(totals, refNo, subject)}
      ${termsAndAcceptanceHtml}
    </div>
  `;

  return wrapHtmlDocument(`Quotation ${boq.quotationNumber || ""}`, body, {
    chromeHeaderFooter: true,
  });
}

function buildSiteReportHtml(boq, inquiry) {
  return buildQuotationHtml(boq, inquiry);
}

async function generateQuotationPDF(boqData, inquiryData) {
  return renderPdfFromHtml(buildQuotationHtml(boqData, inquiryData), {
    chromeHeaderFooter: true,
  });
}

module.exports = {
  generateQuotationPDF,
  buildQuotationHtml,
  buildSiteReportHtml,
};
