const { BoqQuotation } = require("../models/BoqQuotation");
const { Inquiry } = require("../models/Inquiry");
const { generateQuotationPDF } = require("../utils/generateQuotationPdf");
const { generateRamsPDF, detectPresetKey } = require("../utils/generateRamsPdf");
const { siteInformationFromInquiry } = require("../utils/siteReportToBoq");

async function downloadQuotationPdf(req, res) {
  try {
    const doc = await BoqQuotation.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: "Quotation not found" });
    }

    if (req.user.role === "sales" && String(doc.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "You can only download your own quotations" });
    }

    let inquiryData = null;
    if (doc.inquiryId) {
      inquiryData = await Inquiry.findById(doc.inquiryId).lean();
    }

    // Ensure quotation carries structured site blocks (backfill for older BOQs).
    if (!doc.siteInformation && inquiryData?.siteReport) {
      const snapshot = siteInformationFromInquiry(inquiryData);
      if (snapshot) {
        doc.siteInformation = snapshot;
        doc.markModified("siteInformation");
        await doc.save();
      }
    }

    const boqData = doc.toObject ? doc.toObject() : doc;
    const pdfBuffer = await generateQuotationPDF(boqData, inquiryData);

    const quoteNumber = String(doc.quotationNumber || doc._id).replace(/[^\w.-]+/g, "_");
    const filename = `quotation-${quoteNumber}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);

    return res.send(pdfBuffer);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("PDF generation failed:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate quotation PDF",
    });
  }
}

async function downloadRamsPdf(req, res) {
  try {
    const doc = await BoqQuotation.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: "Quotation not found" });
    }

    if (req.user.role === "sales" && String(doc.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "You can only download your own quotations" });
    }

    let inquiryData = null;
    if (doc.inquiryId) {
      inquiryData = await Inquiry.findById(doc.inquiryId).lean();
    }

    const scopeCombined = [
      doc.siteInformation?.scopeOfWork,
      doc.siteInformation?.location,
      doc.projectName,
      inquiryData?.scopeOfWork,
      inquiryData?.fullAddress,
      Array.isArray(doc.items) ? doc.items.map((i) => i.description || i.name || "").join(" ") : "",
    ]
      .filter(Boolean)
      .join(" ");

    const detectedPreset = detectPresetKey(scopeCombined);
    const locationName =
      req.body?.locationName ||
      doc.projectName ||
      doc.siteInformation?.location ||
      inquiryData?.fullAddress ||
      "Project Site";

    const docType = req.body?.docType || req.query?.docType || "combined";

    const ramsPayload = {
      locationName,
      presetKey: req.body?.presetKey || detectedPreset,
      docType,
      workTypeLower: req.body?.workTypeLower,
      workTypeCap: req.body?.workTypeCap,
      hazards: req.body?.hazards,
      controlMeasures: req.body?.controlMeasures,
      mosScope: req.body?.mosScope,
      methodology: req.body?.methodology,
      safetyPrecautions: req.body?.safetyPrecautions,
    };

    const pdfBuffer = await generateRamsPDF(ramsPayload, docType);

    const safeLoc = String(locationName).replace(/[^\w.-]+/g, "_");
    let filenamePrefix = "RAMS";
    if (docType === "risk_assessment") {
      filenamePrefix = "Risk_Assessment";
    } else if (docType === "mos") {
      filenamePrefix = "Method_of_Statement";
    }
    const filename = `${filenamePrefix}-${safeLoc}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);

    return res.send(pdfBuffer);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("RAMS PDF generation failed:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate RAMS PDF",
    });
  }
}

module.exports = { downloadQuotationPdf, downloadRamsPdf };

