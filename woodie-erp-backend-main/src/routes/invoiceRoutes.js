const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const {
  listInvoices,
  getInvoiceById,
  downloadInvoicePdf,
  createInvoice,
  sendInvoice,
  recordPayment,
  escalateInvoice,
  resolveEscalation,
  financeStats,
  workOrderInvoiceSummary,
  recordFollowUp,
} = require("../controllers/invoiceController");
const { authenticate, requireRoles } = require("../middleware/auth");
const { ROLES } = require("../config/rbac");

const router = express.Router();

const FINANCE_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES, ROLES.ACCOUNTS];
const MANAGE_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTS];

function receiptStorage() {
  return multer.diskStorage({
    destination(req, _file, cb) {
      const dir = path.join(__dirname, "../../uploads/receipts", String(req.params.id));
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename(_req, file, cb) {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${Date.now()}-${safe}`);
    },
  });
}

const receiptUpload = multer({
  storage: receiptStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const ok = /^(image\/|application\/pdf)/.test(file.mimetype);
    cb(ok ? null : new Error("Receipt must be an image or PDF"), ok);
  },
});

router.use(authenticate);

router.get("/stats", requireRoles(...FINANCE_ROLES), financeStats);
router.get("/work-order/:workOrderId/summary", requireRoles(...FINANCE_ROLES), workOrderInvoiceSummary);
router.get("/", requireRoles(...FINANCE_ROLES), listInvoices);
router.get("/:id/pdf", requireRoles(...FINANCE_ROLES), downloadInvoicePdf);
router.get("/:id", requireRoles(...FINANCE_ROLES), getInvoiceById);
router.post("/", requireRoles(...FINANCE_ROLES), createInvoice);
router.patch("/:id/send", requireRoles(...FINANCE_ROLES), sendInvoice);
router.patch("/:id/follow-up", requireRoles(...FINANCE_ROLES), recordFollowUp);
router.post(
  "/:id/payments",
  requireRoles(...FINANCE_ROLES),
  receiptUpload.single("receiptFile"),
  recordPayment,
);
router.patch("/:id/escalate", requireRoles(...MANAGE_ROLES), escalateInvoice);
router.patch("/:id/resolve", requireRoles(...MANAGE_ROLES), resolveEscalation);

module.exports = router;
