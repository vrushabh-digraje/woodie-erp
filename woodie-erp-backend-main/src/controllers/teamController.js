const crypto = require("crypto");
const { TeamMember } = require("../models/TeamMember");
const { generateEmployeeId } = require("../config/seedUsers");
const { validateTeamMemberPayload } = require("../validators/teamValidator");
const { ROLES } = require("../config/rbac");

function generatePassword(length = 10) {
  return crypto.randomBytes(length).toString("base64url").slice(0, length);
}

async function listTeamMembers(req, res) {
  const { status = "All", q = "", assignable = "" } = req.query;
  const filter = {};
  if (status !== "All") filter.status = status;
  if (String(assignable).toLowerCase() === "true") {
    filter.status = "Active";
    filter.role = { $in: require("../config/rbac").FIELD_ROLES };
  }
  const search = String(q).trim();
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { employeeId: { $regex: search, $options: "i" } },
    ];
  }
  const data = await TeamMember.find(filter).select("-passwordHash").sort({ name: 1 });
  return res.json(data);
}

async function getTeamMemberById(req, res) {
  const member = await TeamMember.findById(req.params.id).select("-passwordHash");
  if (!member) return res.status(404).json({ message: "Team member not found" });
  return res.json(member);
}

async function createTeamMember(req, res) {
  const error = validateTeamMemberPayload(req.body, { requirePassword: true });
  if (error) return res.status(400).json({ message: error });

  const email = String(req.body.email).trim().toLowerCase();
  const dup = await TeamMember.findOne({ email });
  if (dup) return res.status(400).json({ message: "Email already in use" });

  const plainPassword = req.body.generatePassword
    ? generatePassword()
    : String(req.body.password || "");
  if (!plainPassword || plainPassword.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  const passwordHash = await TeamMember.hashPassword(plainPassword);
  const employeeId = await generateEmployeeId();

  const member = await TeamMember.create({
    employeeId,
    name: req.body.name.trim(),
    phone: req.body.phone,
    email,
    role: req.body.role,
    status: req.body.status,
    passwordHash,
  });

  const json = member.toObject();
  delete json.passwordHash;
  return res.status(201).json({
    ...json,
    generatedPassword: req.body.generatePassword ? plainPassword : undefined,
  });
}

async function updateTeamMember(req, res) {
  const error = validateTeamMemberPayload(req.body, { isUpdate: true });
  if (error) return res.status(400).json({ message: error });

  const member = await TeamMember.findById(req.params.id).select("+passwordHash");
  if (!member) return res.status(404).json({ message: "Team member not found" });

  if (req.body.email) {
    const email = String(req.body.email).trim().toLowerCase();
    const dup = await TeamMember.findOne({ email, _id: { $ne: member._id } });
    if (dup) return res.status(400).json({ message: "Email already in use" });
    member.email = email;
  }

  if (req.body.name) member.name = req.body.name.trim();
  if (req.body.phone) member.phone = req.body.phone;
  if (req.body.role) member.role = req.body.role;
  if (req.body.status) member.status = req.body.status;

  let generatedPassword;
  if (req.body.password || req.body.generatePassword) {
    const plain = req.body.generatePassword ? generatePassword() : String(req.body.password);
    if (plain.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    member.passwordHash = await TeamMember.hashPassword(plain);
    if (req.body.generatePassword) generatedPassword = plain;
  }

  await member.save();
  const json = member.toObject();
  delete json.passwordHash;
  return res.json({ ...json, generatedPassword });
}

async function deleteTeamMember(req, res) {
  if (req.user._id.toString() === req.params.id) {
    return res.status(400).json({ message: "You cannot delete your own account" });
  }
  const member = await TeamMember.findById(req.params.id);
  if (!member) return res.status(404).json({ message: "Team member not found" });
  if (member.role === ROLES.ADMIN) {
    const adminCount = await TeamMember.countDocuments({ role: ROLES.ADMIN, status: "Active" });
    if (adminCount <= 1) {
      return res.status(400).json({ message: "Cannot delete the only active admin" });
    }
  }
  await member.deleteOne();
  return res.status(204).send();
}

module.exports = {
  listTeamMembers,
  getTeamMemberById,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
};
