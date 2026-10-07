const express = require("express");
const {
  listMaterials,
  getMaterialById,
  createMaterial,
  updateMaterial,
  adjustMaterialStock,
} = require("../controllers/materialController");
const { authenticate, requireRoles } = require("../middleware/auth");
const { ROLES } = require("../config/rbac");

const router = express.Router();

router.use(authenticate);

router.get("/", listMaterials);
router.get("/:id", getMaterialById);
router.post("/", requireRoles(ROLES.ADMIN, ROLES.PROCUREMENT), createMaterial);
router.patch("/:id", requireRoles(ROLES.ADMIN, ROLES.PROCUREMENT), updateMaterial);
router.patch("/:id/stock", requireRoles(ROLES.ADMIN, ROLES.PROCUREMENT), adjustMaterialStock);

module.exports = router;
