const express = require("express");
const {
  listQuotations,
  listPendingApprovals,
  getQuotation,
  getQuotationByInquiry,
  createQuotation,
  updateQuotation,
  markQuotationDraft,
  submitForApproval,
  approveQuotation,
  rejectQuotation,
  requestRevision,
  importSiteReportItems,
  deleteQuotation,
} = require("../controllers/boqController");
const { downloadQuotationPdf, downloadRamsPdf } = require("../controllers/pdfController");
const {
  sendQuotation,
  markNegotiation,
  markWon,
  markLost,
} = require("../controllers/negotiationController");
const { authenticate, requireRoles } = require("../middleware/auth");
const { ROLES } = require("../config/rbac");

const router = express.Router();

router.use(authenticate);

router.get("/", requireRoles(ROLES.ADMIN, ROLES.SALES, ROLES.MANAGER, ROLES.PROCUREMENT), listQuotations);
router.get("/pending", requireRoles(ROLES.ADMIN, ROLES.MANAGER, ROLES.PROCUREMENT), listPendingApprovals);
router.get("/by-inquiry/:inquiryId", requireRoles(ROLES.ADMIN, ROLES.SALES, ROLES.MANAGER, ROLES.PROCUREMENT), getQuotationByInquiry);
router.post("/", requireRoles(ROLES.ADMIN, ROLES.SALES), createQuotation);
router.get("/:id/pdf", requireRoles(ROLES.ADMIN, ROLES.SALES, ROLES.MANAGER, ROLES.PROCUREMENT), downloadQuotationPdf);
router.get("/:id/rams-pdf", requireRoles(ROLES.ADMIN, ROLES.SALES, ROLES.MANAGER, ROLES.PROCUREMENT), downloadRamsPdf);
router.post("/:id/rams-pdf", requireRoles(ROLES.ADMIN, ROLES.SALES, ROLES.MANAGER, ROLES.PROCUREMENT), downloadRamsPdf);
router.get("/:id", requireRoles(ROLES.ADMIN, ROLES.SALES, ROLES.MANAGER, ROLES.PROCUREMENT), getQuotation);
router.patch("/:id", requireRoles(ROLES.ADMIN, ROLES.SALES), updateQuotation);
router.post("/:id/import-site-report", requireRoles(ROLES.ADMIN, ROLES.SALES), importSiteReportItems);
router.post("/:id/save-draft", requireRoles(ROLES.ADMIN, ROLES.SALES), markQuotationDraft);
router.post("/:id/submit", requireRoles(ROLES.ADMIN, ROLES.SALES), submitForApproval);
router.post("/:id/approve", requireRoles(ROLES.ADMIN, ROLES.MANAGER, ROLES.PROCUREMENT), approveQuotation);
router.post("/:id/reject", requireRoles(ROLES.ADMIN, ROLES.MANAGER, ROLES.PROCUREMENT), rejectQuotation);
router.post("/:id/request-revision", requireRoles(ROLES.ADMIN, ROLES.MANAGER, ROLES.PROCUREMENT), requestRevision);
router.patch("/:id/send", requireRoles(ROLES.ADMIN, ROLES.SALES), sendQuotation);
router.patch("/:id/negotiation", requireRoles(ROLES.ADMIN, ROLES.SALES), markNegotiation);
router.patch("/:id/won", requireRoles(ROLES.ADMIN, ROLES.SALES, ROLES.MANAGER, ROLES.PROCUREMENT), markWon);
router.patch("/:id/lost", requireRoles(ROLES.ADMIN, ROLES.SALES, ROLES.MANAGER, ROLES.PROCUREMENT), markLost);
router.delete("/:id", requireRoles(ROLES.ADMIN, ROLES.SALES, ROLES.MANAGER, ROLES.PROCUREMENT), deleteQuotation);

module.exports = router;
