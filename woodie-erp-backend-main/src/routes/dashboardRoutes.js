const express = require("express");
const {
  adminStats,
  salesStats,
  fieldStats,
  managerStats,
  getDashboardStats,
} = require("../controllers/dashboardController");
const { authenticate, requireRoles } = require("../middleware/auth");
const { ROLES, FIELD_ROLES } = require("../config/rbac");

const router = express.Router();

router.use(authenticate);

router.get("/stats", getDashboardStats);

router.get("/admin", requireRoles("admin"), adminStats);
router.get("/sales", requireRoles(ROLES.SALES, ROLES.ACCOUNTS), salesStats);
router.get("/manager", requireRoles(ROLES.MANAGER, ROLES.PROCUREMENT), managerStats);
router.get("/field", requireRoles(...FIELD_ROLES), fieldStats);

module.exports = router;
