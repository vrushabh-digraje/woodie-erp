const { TeamMember } = require("../models/TeamMember");
const { signToken } = require("../middleware/auth");
const { isActiveMember, ROLE_OPTIONS } = require("../config/rbac");

function toPublicUser(member) {
  return {
    id: member._id.toString(),
    name: member.name,
    email: member.email,
    phone: member.phone,
    role: member.role,
    companyId: member.companyId || (member.role === "master_admin" ? null : "woodie-1"),
    employeeId: member.employeeId,
    status: member.status,
  };
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  let member = await TeamMember.findOne({ email: cleanEmail }).select("+passwordHash");
  if (!member) {
    if (cleanEmail.includes("@woodie.ae")) {
      member = await TeamMember.findOne({ email: cleanEmail.replace("@woodie.ae", "@woodie-1.ae") }).select("+passwordHash");
    } else if (cleanEmail.includes("@woodie-1.ae")) {
      member = await TeamMember.findOne({ email: cleanEmail.replace("@woodie-1.ae", "@woodie.ae") }).select("+passwordHash");
    } else if (cleanEmail.includes("@woodie-1.com")) {
      member = await TeamMember.findOne({ email: cleanEmail.replace("@woodie-1.com", "@woodie-1.ae") }).select("+passwordHash");
    }
  }
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
