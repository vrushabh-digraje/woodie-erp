const {
  escapeHtml,
  signatureImageHtml,
  wrapHtmlDocument,
  renderPdfFromHtml,
} = require("./pdfShared");
const {
  TRADE_DEFINITIONS,
  detectTradeKey,
  generateRamsData,
} = require("./aiRamsGenerator");

/**
 * Builds the styles for RAMS and Method of Statement documents, matching the user's exact PDF layout.
 */
function getDocumentStyles() {
  return `
    .woodie-engineering-doc {
      font-family: Arial, Helvetica, sans-serif;
      color: #000000;
      font-size: 10pt;
      line-height: 1.45;
      padding: 0 10px;
    }
    .doc-main-title {
      text-align: center;
      font-size: 17pt;
      font-weight: bold;
      color: #000000;
      margin: 10px 0 18px 0;
      letter-spacing: 0.02em;
    }
    .doc-subject-title {
      font-size: 12.5pt;
      font-weight: bold;
      color: #000000;
      margin: 0 0 14px 0;
    }
    .doc-metadata-block {
      margin-bottom: 16px;
      line-height: 1.5;
      font-size: 10pt;
    }
    .doc-metadata-block .meta-row {
      margin-bottom: 2px;
    }
    .doc-metadata-block strong {
      color: #000000;
      font-weight: bold;
      display: inline-block;
      min-width: 90px;
    }
    .section-title {
      font-size: 11pt;
      font-weight: bold;
      color: #000000;
      margin: 16px 0 8px 0;
      page-break-after: avoid;
    }
    .section-para {
      margin: 0 0 10px 0;
      text-align: justify;
      line-height: 1.45;
    }
    .clean-bullets {
      margin: 0 0 12px 0;
      padding-left: 22px;
      list-style-type: disc;
    }
    .clean-bullets li {
      margin-bottom: 5px;
      line-height: 1.4;
      text-align: justify;
    }
    .methodology-steps {
      margin: 0 0 14px 0;
    }
    .methodology-steps .step-item {
      margin-bottom: 9px;
      line-height: 1.45;
      text-align: justify;
    }
    .methodology-steps .step-item strong {
      color: #000000;
    }

    /* Risk Assessment Table Styling */
    .risk-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      font-size: 8.5pt;
      line-height: 1.35;
      page-break-inside: auto;
    }
    .risk-table thead {
      display: table-header-group;
    }
    .risk-table tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .risk-table th {
      background: transparent;
      color: #000000;
      font-weight: bold;
      text-align: left;
      padding: 7px 6px;
      border-bottom: 1.5px solid #000000;
      font-size: 9pt;
      vertical-align: bottom;
    }
    .risk-table td {
      padding: 6.5px 6px;
      vertical-align: top;
      border-bottom: 1px solid #e5e7eb;
      color: #000000;
      background: transparent;
    }
    .risk-table .text-center {
      text-align: center;
    }
    .risk-table .fw-semibold {
      font-weight: 600;
      color: #000000;
    }
    .risk-badge {
      display: inline-block;
      font-weight: 600;
      font-size: 8.5pt;
    }
    .risk-badge.risk-low {
      color: #047857;
    }
    .risk-badge.risk-medium {
      color: #b45309;
    }
    .risk-badge.risk-high {
      color: #b91c1c;
    }

    /* Sign-off / Signature + Stamp */
    .doc-signoff-block {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      margin-top: 26px;
      margin-bottom: 10px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .doc-signoff-block .pdf-signature-stamp {
      width: 190px;
      text-align: right;
    }
    .doc-signoff-block .pdf-signature-stamp img {
      width: 180px;
      height: auto;
      display: inline-block;
    }

    .page-break {
      page-break-before: always;
      break-before: page;
      height: 0;
      margin: 0;
      padding: 0;
    }
  `;
}

/**
 * Builds HTML for Method of Statement matching the user's PDF screenshots.
 */
function buildMethodOfStatementHtml(data) {
  return `
    <div class="mos-document">
      <div class="doc-main-title">METHOD OF STATEMENT</div>
      <div class="doc-subject-title">${escapeHtml(data.subject)}</div>

      <div class="doc-metadata-block">
        <div class="meta-row"><strong>Project:</strong> <span>${escapeHtml(data.projectName)}</span></div>
        <div class="meta-row"><strong>Location:</strong> <span>${escapeHtml(data.location)}</span></div>
        <div class="meta-row"><strong>Client:</strong> <span>${escapeHtml(data.clientName)}</span></div>
        <div class="meta-row"><strong>Date:</strong> <span>${escapeHtml(data.formattedDate)}</span></div>
      </div>

      <div class="section-title">1. Scope of Work</div>
      <ul class="clean-bullets">
        ${data.scopeOfWork.map((s) => `<li>${escapeHtml(s)}</li>`).join("\n")}
      </ul>

      <div class="section-title">2. Materials and Equipment</div>
      <ul class="clean-bullets">
        ${data.materials.map((m) => `<li>${escapeHtml(m)}</li>`).join("\n")}
        ${data.tools.map((t) => `<li>${escapeHtml(t)}</li>`).join("\n")}
      </ul>

      <div class="section-title">3. Methodology / Work Procedure</div>
      <div class="methodology-steps">
        ${data.methodology
          .map(
            (m, idx) => `
          <div class="step-item">
            <strong>${idx + 1}. ${escapeHtml(m.step)}:</strong> ${escapeHtml(m.text)}
          </div>
        `
          )
          .join("\n")}
      </div>

      <div class="section-title">4. Health, Safety and Environmental Requirements</div>
      <ul class="clean-bullets">
        <li>All workers must wear appropriate PPE, including safety shoes, gloves, helmets and eye protection.</li>
        <li>Provide suitable edge protection and fall-prevention measures where working at height.</li>
        <li>Barricade the work area and display warning signs.</li>
        <li>Ensure safe access and keep walkways free from obstructions and trailing cables.</li>
        <li>Check weather conditions and comply with applicable UAE heat-stress requirements.</li>
        <li>Follow the safety data sheet (SDS) for all chemicals, primers, sealants, and paints.</li>
        <li>Ensure adequate ventilation where required.</li>
        <li>Dispose of waste and empty containers according to site and local municipality requirements.</li>
      </ul>

      <div class="section-title">5. Quality Control</div>
      <ul class="clean-bullets">
        <li>Use only approved materials adhering strictly to project specifications.</li>
        <li>Verify surface preparation, alignment, and levels prior to execution.</li>
        <li>Follow the manufacturer's application rate, thickness, torque settings, and curing requirements.</li>
        <li>Inspect all joints, connections, and detailing prior to concealment.</li>
        <li>Complete required pressure/leak inspections, electrical tests, and functional commissioning before handover.</li>
      </ul>

      <div class="section-title">6. Emergency Procedure</div>
      <p class="section-para">
        In case of an accident, fall hazard, chemical exposure, electrical incident, or other emergency, stop work immediately, notify the site supervisor and follow the site's emergency response procedure.
      </p>

      <div class="section-title">7. Responsibilities</div>
      <ul class="clean-bullets">
        <li><strong>Project Engineer:</strong> Ensure compliance with project specifications, approved shop drawings, and materials.</li>
        <li><strong>Site Supervisor:</strong> Coordinate the work, manage technician teams, and monitor execution quality and safety.</li>
        <li><strong>HSE Officer:</strong> Monitor safety requirements, verify mandatory PPE, and inspect scaffolding/access equipment.</li>
        <li><strong>Technicians / Workers:</strong> Perform the work according to the approved method statement and manufacturer's instructions.</li>
      </ul>

      <div class="doc-signoff-block">
        ${signatureImageHtml("pdf-signature-stamp")}
      </div>
    </div>
  `;
}

/**
 * Builds HTML for Risk Assessment matching the user's PDF screenshots.
 */
function buildRiskAssessmentHtml(data) {
  return `
    <div class="ra-document">
      <div class="doc-main-title">Risk Assessment</div>
      <div class="doc-subject-title">${escapeHtml(data.subject)}</div>

      <div class="doc-metadata-block">
        <div class="meta-row"><strong>1. Project:</strong> <span>${escapeHtml(data.projectName)}</span></div>
        <div class="meta-row"><strong>Location:</strong> <span>${escapeHtml(data.location)}</span></div>
        <div class="meta-row"><strong>Client:</strong> <span>${escapeHtml(data.clientName)}</span></div>
        <div class="meta-row"><strong>Date:</strong> <span>${escapeHtml(data.formattedDate)}</span></div>
      </div>

      <div class="section-title" style="margin-top: 14px;">1. Risk Assessment Table</div>

      <table class="risk-table">
        <thead>
          <tr>
            <th style="width: 5%;">No.</th>
            <th style="width: 20%;">Work Activity</th>
            <th style="width: 18%;">Hazard</th>
            <th style="width: 18%;">Potential Risk</th>
            <th style="width: 31%;">Control Measures</th>
            <th style="width: 8%; text-align: center;">Risk Level</th>
          </tr>
        </thead>
        <tbody>
          ${data.risks
            .map(
              (r) => `
            <tr>
              <td class="text-center">${r.no}</td>
              <td class="fw-semibold">${escapeHtml(r.activity)}</td>
              <td>${escapeHtml(r.hazard)}</td>
              <td>${escapeHtml(r.risk)}</td>
              <td>${escapeHtml(r.controls)}</td>
              <td class="text-center">
                <span class="risk-badge risk-${String(r.level).toLowerCase()}">${escapeHtml(r.level)}</span>
              </td>
            </tr>
          `
            )
            .join("\n")}
        </tbody>
      </table>

      <div class="doc-signoff-block">
        ${signatureImageHtml("pdf-signature-stamp")}
      </div>
    </div>
  `;
}

/**
 * Builds full HTML document for Puppeteer rendering
 */
function buildRamsHtml(dataPayload = {}, requestedDocType, options = {}) {
  const docType = requestedDocType || dataPayload.docType || "combined";
  const chromeHeaderFooter =
    options.chromeHeaderFooter !== undefined
      ? Boolean(options.chromeHeaderFooter)
      : false;

  const quotation = dataPayload.quotation || {};
  const inquiry = dataPayload.inquiry || {};
  const fullData = generateRamsData(quotation, inquiry, dataPayload);

  let contentHtml = "";
  let pageTitle = `${fullData.projectName} - RAMS`;

  if (docType === "risk_assessment") {
    contentHtml = buildRiskAssessmentHtml(fullData);
    pageTitle = `${fullData.projectName} - Risk Assessment`;
  } else if (docType === "mos") {
    contentHtml = buildMethodOfStatementHtml(fullData);
    pageTitle = `${fullData.projectName} - Method of Statement`;
  } else {
    // Combined: Risk Assessment first, then Method of Statement with clean page break
    contentHtml = `
      ${buildRiskAssessmentHtml(fullData)}
      <div class="page-break"></div>
      ${buildMethodOfStatementHtml(fullData)}
    `;
    pageTitle = `${fullData.projectName} - RAMS`;
  }

  const styles = getDocumentStyles();
  const innerHtml = `
    <div class="woodie-engineering-doc">
      <style>${styles}</style>
      ${contentHtml}
    </div>
  `;

  return wrapHtmlDocument(pageTitle, innerHtml, {
    chromeHeaderFooter,
    woodieDoc: !chromeHeaderFooter,
    includeWatermark: true,
  });
}

/**
 * Generates the RAMS / Risk Assessment / MOS PDF Buffer using Puppeteer
 */
async function generateRamsPDF(data = {}, explicitDocType) {
  const effectiveDocType = explicitDocType || data.docType || "combined";
  const html = buildRamsHtml(data, effectiveDocType, { chromeHeaderFooter: true });
  return renderPdfFromHtml(html, {
    chromeHeaderFooter: true,
  });
}

module.exports = {
  TRADE_DEFINITIONS,
  detectTradeKey,
  detectPresetKey: detectTradeKey,
  RAMS_PRESETS: TRADE_DEFINITIONS,
  generateRamsData,
  buildRamsHtml,
  generateRamsPDF,
};
