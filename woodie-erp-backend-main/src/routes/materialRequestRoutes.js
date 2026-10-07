const express = require("express");
const {
  createMaterialRequest,
  listMaterialRequests,
  getMaterialRequestById,
  updateMaterialRequestStatus,
} = require("../controllers/materialRequestController");
const { authenticate, requireRoles } = require("../middleware/auth");
const { ROLES, FIELD_ROLES } = require("../config/rbac");

const router = express.Router();

const CREATE_ROLES = [...FIELD_ROLES];
const MANAGE_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.PROCUREMENT];

router.use(authenticate);

router.get("/", requireRoles(...MANAGE_ROLES), listMaterialRequests);
router.get("/:id", requireRoles(...MANAGE_ROLES), getMaterialRequestById);
router.post("/", requireRoles(...CREATE_ROLES), createMaterialRequest);
router.patch("/:id/status", requireRoles(...MANAGE_ROLES), updateMaterialRequestStatus);

module.exports = router;
