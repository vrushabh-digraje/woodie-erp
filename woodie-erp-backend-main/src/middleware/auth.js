const jwt = require("jsonwebtoken");
const { TeamMember } = require("../models/TeamMember");
const { isActiveMember } = require("../config/rbac");

function getJwtSecret() {
  return process.env.JWT_SECRET || "woodie-erp-dev-secret-change-in-production";
}

async function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    const member = await TeamMember.findById(payload.sub).select("-passwordHash");
    if (!member || !isActiveMember(member)) {
      return res.status(401).json({ message: "Invalid or inactive account" });
    }
    req.user = member;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission for this action" });
    }
    return next();
  };
}

function signToken(member) {
  return jwt.sign(
    { sub: member._id.toString(), role: member.role, email: member.email },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );
}

module.exports = { authenticate, requireRoles, signToken, getJwtSecret };
