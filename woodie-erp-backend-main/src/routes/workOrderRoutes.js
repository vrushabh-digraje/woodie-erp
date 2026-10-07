const express = require("express");
const path = require("path");
const multer = require("multer");
const {
  createWorkOrder,
  listWorkOrders,
  getWorkOrderById,
  updateWorkOrderStatus,
  startExecution,
  completeProject,
  clientHandover,
  assignTeam,
  updateWorkOrder,
  addProgressLog,
  uploadSitePhotos,
  addSnag,
  resolveSnag,
  deleteWorkOrder,
} = require("../controllers/workOrderController");
const { authenticate, requireRoles } = require("../middleware/auth");
const { ROLES, FIELD_ROLES } = require("../config/rbac");

const router = express.Router();

const OFFICE_AND_FIELD = [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES, ROLES.PROCUREMENT, ...FIELD_ROLES];
const MANAGE_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.PROCUREMENT];
const FIELD_WRITE = [ROLES.ADMIN, ROLES.MANAGER, ROLES.PROCUREMENT, ...FIELD_ROLES];

function workOrderPhotoStorage() {
  return multer.diskStorage({
    destination(req, _file, cb) {
      const dir = path.join(__dirname, "../../uploads/work-order", String(req.params.id));
      require("fs").mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename(_req, file, cb) {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${Date.now()}-${safe}`);
    },
  });
}

const photoUpload = multer({
  storage: workOrderPhotoStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 8 },
});

router.use(authenticate);

router.get("/", requireRoles(...OFFICE_AND_FIELD), listWorkOrders);
router.post("/", requireRoles(...MANAGE_ROLES), createWorkOrder);
router.get("/:id", requireRoles(...OFFICE_AND_FIELD), getWorkOrderById);
router.patch("/:id", requireRoles(...MANAGE_ROLES), updateWorkOrder);
router.patch("/:id/status", requireRoles(...MANAGE_ROLES), updateWorkOrderStatus);
router.post("/:id/start-execution", requireRoles(...MANAGE_ROLES), startExecution);
router.post("/:id/complete", requireRoles(...MANAGE_ROLES), completeProject);
router.post("/:id/handover", requireRoles(...MANAGE_ROLES), clientHandover);
router.patch("/:id/team", requireRoles(...MANAGE_ROLES), assignTeam);
router.post("/:id/progress-logs", requireRoles(...FIELD_WRITE), addProgressLog);
router.post(
  "/:id/photos",
  requireRoles(...FIELD_WRITE),
  photoUpload.array("photos", 8),
  uploadSitePhotos,
);
router.post("/:id/snags", requireRoles(...FIELD_WRITE), addSnag);
router.patch("/:id/snags/:snagId/resolve", requireRoles(...FIELD_WRITE), resolveSnag);
router.delete("/:id", requireRoles(...MANAGE_ROLES), deleteWorkOrder);

module.exports = router;
