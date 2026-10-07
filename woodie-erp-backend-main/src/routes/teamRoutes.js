const express = require("express");
const {
  listTeamMembers,
  getTeamMemberById,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
} = require("../controllers/teamController");
const { authenticate, requireRoles } = require("../middleware/auth");
const { ROLES } = require("../config/rbac");

const router = express.Router();

router.use(authenticate);

router.get("/", requireRoles(ROLES.ADMIN, ROLES.SALES), listTeamMembers);
router.get("/:id", requireRoles(ROLES.ADMIN), getTeamMemberById);
router.post("/", requireRoles(ROLES.ADMIN), createTeamMember);
router.patch("/:id", requireRoles(ROLES.ADMIN), updateTeamMember);
router.delete("/:id", requireRoles(ROLES.ADMIN), deleteTeamMember);

module.exports = router;
