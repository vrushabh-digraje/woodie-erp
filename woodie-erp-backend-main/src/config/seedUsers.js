const { TeamMember } = require("../models/TeamMember");
const { ROLES } = require("./rbac");

const DEFAULT_ADMIN = {
  name: "System Admin",
  email: "admin@woodie.com",
  phone: "9999999999",
  password: "Admin@123",
  role: ROLES.ADMIN,
};

async function generateEmployeeId() {
  const total = await TeamMember.countDocuments();
  return `EMP-${String(total + 1).padStart(4, "0")}`;
}

async function seedUsers() {
  const exists = await TeamMember.findOne({ email: DEFAULT_ADMIN.email });
  if (exists) return;

  const passwordHash = await TeamMember.hashPassword(DEFAULT_ADMIN.password);
  const employeeId = await generateEmployeeId();

  await TeamMember.create({
    employeeId,
    name: DEFAULT_ADMIN.name,
    phone: DEFAULT_ADMIN.phone,
    email: DEFAULT_ADMIN.email,
    role: DEFAULT_ADMIN.role,
    status: "Active",
    passwordHash,
  });

  // eslint-disable-next-line no-console
  console.log(`Seeded admin: ${DEFAULT_ADMIN.email}`);
}

module.exports = { seedUsers, DEFAULT_ADMIN, generateEmployeeId };
