const { TeamMember } = require("../models/TeamMember");
const { signToken } = require("../middleware/auth");
const { isActiveMember } = require("../config/rbac");
const { ROLE_OPTIONS } = require("../config/rbac");

function toPublicUser(member) {
  return {
    id: member._id.toString(),
    name: member.name,
    email: member.email,
    phone: member.phone,
    role: member.role,
    employeeId: member.employeeId,
    status: member.status,
  };
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const member = await TeamMember.findOne({ email: String(email).trim().toLowerCase() }).select("+passwordHash");
  if (!member || !isActiveMember(member)) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const valid = await member.comparePassword(password);
  if (!valid) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const token = signToken(member);
  return res.json({ token, user: toPublicUser(member) });
}

async function me(req, res) {
  return res.json({ user: toPublicUser(req.user) });
}

async function listRoles(_req, res) {
  return res.json(ROLE_OPTIONS);
}

module.exports = { login, me, listRoles, toPublicUser };
