const express = require("express");
const { login, me, listRoles } = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");
const { INQUIRY_CATEGORIES } = require("../config/rbac");

const router = express.Router();

router.post("/login", login);
router.get("/me", authenticate, me);
router.get("/roles", authenticate, listRoles);
router.get("/inquiry-categories", authenticate, (_req, res) => {
  res.json(INQUIRY_CATEGORIES);
});

module.exports = router;
