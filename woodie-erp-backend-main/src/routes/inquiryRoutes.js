const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const {
  listInquiries,
  createInquiry,
  getInquiryById,
  updateInquiry,
  deleteInquiry,
  decideVisitApproval,
  uploadSiteReportMedia,
  updateSiteReport,
  submitSiteReport,
} = require("../controllers/inquiryController");
const { authenticate, requireRoles } = require("../middleware/auth");
const { ROLES, FIELD_ROLES } = require("../config/rbac");

const SURVEY_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ...FIELD_ROLES];

const router = express.Router();

function attachmentStorage(subfolder) {
  return multer.diskStorage({
    destination: (req, _file, cb) => {
      const dir = path.join(__dirname, `../../uploads/${subfolder}`, String(req.params.id || "new"));
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "") || ".jpg";
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  });
}

const inquiryUpload = multer({
  storage: attachmentStorage("inquiry-attachments"),
});

const siteReportUpload = multer({
  storage: attachmentStorage("site-report"),
  fileFilter: (_req, file, cb) => {
    const ok = /^image\//.test(file.mimetype) || /^video\//.test(file.mimetype);
    cb(null, ok);
  },
});

const salesOrAdmin = [ROLES.ADMIN, ROLES.SALES];

router.use(authenticate);

router.get("/", listInquiries);
router.post("/", requireRoles(...salesOrAdmin), inquiryUpload.array("attachments", 10), createInquiry);
router.get("/:id", getInquiryById);
router.patch("/:id", requireRoles(...salesOrAdmin), inquiryUpload.array("attachments", 10), updateInquiry);
router.delete("/:id", requireRoles(ROLES.ADMIN), deleteInquiry);
router.patch("/:id/visit-approval", requireRoles(...FIELD_ROLES), decideVisitApproval);
router.post(
  "/:id/site-report/media",
  requireRoles(...SURVEY_ROLES),
  siteReportUpload.fields([
    { name: "photos", maxCount: 25 },
    { name: "videos", maxCount: 15 },
    { name: "references", maxCount: 25 },
  ]),
  uploadSiteReportMedia,
);
router.patch("/:id/site-report", requireRoles(...SURVEY_ROLES), updateSiteReport);
router.post("/:id/site-report/submit", requireRoles(...FIELD_ROLES), submitSiteReport);

module.exports = router;
