const { TeamMember } = require("../models/TeamMember");
const { Inquiry } = require("../models/Inquiry");
const { BoqQuotation, recalculateTotals } = require("../models/BoqQuotation");
const { WorkOrder } = require("../models/WorkOrder");
const { Customer } = require("../models/Customer");
const { Invoice } = require("../models/Invoice");
const { ROLES } = require("./rbac");

const SEEDED_ACCOUNTS = [
  // Tier 1: Master Super Admin
  {
    employeeId: "MST-0001",
    name: "Master Super Admin",
    email: "master@woodie.com",
    phone: "+971500000001",
    password: "master@woodie",
    role: ROLES.MASTER_ADMIN,
    companyId: "global",
  },

  // Tier 2: Woodie 1 (Staff & Positions)
  {
    employeeId: "W1-0001",
    name: "Rizwan Ali",
    email: "rizwan.ali@woodie-1.ae",
    phone: "0501000001",
    password: "rizwan.ali@123",
    role: ROLES.MANAGER,
    companyId: "woodie-1",
  },
  {
    employeeId: "W1-0002",
    name: "Abid Kareem",
    email: "abid.kareem@woodie-1.ae",
    phone: "0501000002",
    password: "abid.kareem@123",
    role: ROLES.OPERATION_MANAGER,
    companyId: "woodie-1",
  },
  {
    employeeId: "W1-0003",
    name: "Admin Office",
    email: "admin.office@woodie-1.ae",
    phone: "0501000003",
    password: "admin.office@123",
    role: ROLES.ADMIN,
    companyId: "woodie-1",
  },
  {
    employeeId: "W1-0004",
    name: "Site Team Dadnah",
    email: "dadnah.team@woodie-1.ae",
    phone: "0501000004",
    password: "dadnah.team@123",
    role: ROLES.SITE_ENGINEER,
    companyId: "woodie-1",
  },
  {
    employeeId: "W1-0005",
    name: "Site Team Abu Dhabi",
    email: "abudhabi.team@woodie-1.ae",
    phone: "0501000005",
    password: "abudhabi.team@123",
    role: ROLES.SITE_ENGINEER,
    companyId: "woodie-1",
  },
  {
    employeeId: "W1-0006",
    name: "Site Team Dubai",
    email: "dubai.team@woodie-1.ae",
    phone: "0501000006",
    password: "dubai.team@123",
    role: ROLES.SITE_ENGINEER,
    companyId: "woodie-1",
  },
  {
    employeeId: "W1-0007",
    name: "test",
    email: "test@gmail.com",
    phone: "9999999999",
    password: "test@123",
    role: ROLES.SITE_ENGINEER,
    companyId: "woodie-1",
  },

  // Tier 2: Woodie 2 (6 Roles)
  {
    employeeId: "W2-0001",
    name: "Woodie 2 Admin",
    email: "admin@woodie-2.com",
    phone: "+971502000001",
    password: "admin@woodie-2",
    role: ROLES.ADMIN,
    companyId: "woodie-2",
  },
  {
    employeeId: "W2-0002",
    name: "Woodie 2 Manager",
    email: "manager@woodie-2.com",
    phone: "+971502000002",
    password: "manager@woodie-2",
    role: ROLES.MANAGER,
    companyId: "woodie-2",
  },
  {
    employeeId: "W2-0003",
    name: "Woodie 2 Operation Manager",
    email: "opmanager@woodie-2.com",
    phone: "+971502000003",
    password: "opmanager@woodie-2",
    role: ROLES.OPERATION_MANAGER,
    companyId: "woodie-2",
  },
  {
    employeeId: "W2-0004",
    name: "Woodie 2 Engineer",
    email: "engineer@woodie-2.com",
    phone: "+971502000004",
    password: "engineer@woodie-2",
    role: ROLES.ENGINEER,
    companyId: "woodie-2",
  },
  {
    employeeId: "W2-0005",
    name: "Woodie 2 Supervisor",
    email: "supervisor@woodie-2.com",
    phone: "+971502000005",
    password: "supervisor@woodie-2",
    role: ROLES.SUPERVISOR,
    companyId: "woodie-2",
  },
  {
    employeeId: "W2-0006",
    name: "Woodie 2 Site Engineer",
    email: "siteengineer@woodie-2.com",
    phone: "+971502000006",
    password: "siteengineer@woodie-2",
    role: ROLES.SITE_ENGINEER,
    companyId: "woodie-2",
  },

  // Tier 2: Woodie 3 (6 Roles)
  {
    employeeId: "W3-0001",
    name: "Woodie 3 Admin",
    email: "admin@woodie-3.com",
    phone: "+971503000001",
    password: "admin@woodie-3",
    role: ROLES.ADMIN,
    companyId: "woodie-3",
  },
  {
    employeeId: "W3-0002",
    name: "Woodie 3 Manager",
    email: "manager@woodie-3.com",
    phone: "+971503000002",
    password: "manager@woodie-3",
    role: ROLES.MANAGER,
    companyId: "woodie-3",
  },
  {
    employeeId: "W3-0003",
    name: "Woodie 3 Operation Manager",
    email: "opmanager@woodie-3.com",
    phone: "+971503000003",
    password: "opmanager@woodie-3",
    role: ROLES.OPERATION_MANAGER,
    companyId: "woodie-3",
  },
  {
    employeeId: "W3-0004",
    name: "Woodie 3 Engineer",
    email: "engineer@woodie-3.com",
    phone: "+971503000004",
    password: "engineer@woodie-3",
    role: ROLES.ENGINEER,
    companyId: "woodie-3",
  },
  {
    employeeId: "W3-0005",
    name: "Woodie 3 Supervisor",
    email: "supervisor@woodie-3.com",
    phone: "+971503000005",
    password: "supervisor@woodie-3",
    role: ROLES.SUPERVISOR,
    companyId: "woodie-3",
  },
  {
    employeeId: "W3-0006",
    name: "Woodie 3 Site Engineer",
    email: "siteengineer@woodie-3.com",
    phone: "+971503000006",
    password: "siteengineer@woodie-3",
    role: ROLES.SITE_ENGINEER,
    companyId: "woodie-3",
  },
];

async function seedMultiCompanyUsers() {
  // eslint-disable-next-line no-console
  console.log("Seeding multi-company users and validating tenant isolation...");

  // 1. Remove old woodie-1 demo staff accounts
  const allowedWoodie1Emails = [
    "rizwan.ali@woodie-1.ae",
    "abid.kareem@woodie-1.ae",
    "admin.office@woodie-1.ae",
    "dadnah.team@woodie-1.ae",
    "abudhabi.team@woodie-1.ae",
    "dubai.team@woodie-1.ae",
    "test@gmail.com",
  ];
  await TeamMember.deleteMany({
    $or: [
      { companyId: "woodie-1", email: { $nin: allowedWoodie1Emails } },
      {
        email: {
          $in: [
            "admin@woodie-1.com",
            "manager@woodie-1.com",
            "opmanager@woodie-1.com",
            "engineer@woodie-1.com",
            "supervisor@woodie-1.com",
            "siteengineer@woodie-1.com",
            "ramesh.site@woodie.com",
            "vikram.sup@woodie.com",
            "anil.tech@woodie.com",
            "admin@woodie.com",
          ],
        },
      },
    ],
  });

  // 2. Seed or update all 19 accounts
  for (const acc of SEEDED_ACCOUNTS) {
    const existing = await TeamMember.findOne({ email: acc.email });
    const passwordHash = await TeamMember.hashPassword(acc.password);

    if (existing) {
      existing.name = acc.name;
      existing.role = acc.role;
      existing.companyId = acc.companyId;
      existing.passwordHash = passwordHash;
      existing.status = "Active";
      await existing.save();
    } else {
      await TeamMember.create({
        employeeId: acc.employeeId,
        name: acc.name,
        phone: acc.phone,
        email: acc.email,
        role: acc.role,
        companyId: acc.companyId,
        status: "Active",
        passwordHash,
      });
    }
  }

  // Reassign any inquiries previously assigned to test
  const defaultSiteTeam = await TeamMember.findOne({ email: "dubai.team@woodie-1.ae" });
  if (defaultSiteTeam) {
    await Inquiry.updateMany(
      { companyId: "woodie-1", assignedPersonName: "test" },
      { $set: { assignedPersonId: defaultSiteTeam._id, assignedPersonName: defaultSiteTeam.name } }
    );
  }

  // eslint-disable-next-line no-console
  console.log(`Successfully verified 19 multi-company accounts.`);

  // 2. Ensure legacy data in collections without companyId are tagged to woodie-1
  await Inquiry.updateMany({ companyId: { $in: [null, undefined, ""] } }, { $set: { companyId: "woodie-1" } });
  await BoqQuotation.updateMany({ companyId: { $in: [null, undefined, ""] } }, { $set: { companyId: "woodie-1" } });
  await Customer.updateMany({ companyId: { $in: [null, undefined, ""] } }, { $set: { companyId: "woodie-1" } });

  // Clear all work orders and invoices so live cloud database starts completely clean
  await WorkOrder.deleteMany({});
  await Invoice.deleteMany({});

  // 3. Seed demonstration tenant data for Woodie 2 and Woodie 3 if none exist
  await seedDemoCompanyData("woodie-2", "Woodie 2");
  await seedDemoCompanyData("woodie-3", "Woodie 3");
}

async function seedDemoCompanyData(companyId, companyName) {
  const existingInq = await Inquiry.findOne({ companyId });
  if (existingInq) return;

  const engineer = await TeamMember.findOne({ companyId, role: ROLES.ENGINEER });
  const siteEng = await TeamMember.findOne({ companyId, role: ROLES.SITE_ENGINEER });
  const assigned = engineer || siteEng;

  const prefix = companyId === "woodie-2" ? "W2" : "W3";

  // Inquiry 1
  const inq1 = await Inquiry.create({
    inquiryNumber: `INQ-${prefix}-1001`,
    companyId,
    clientName: `${companyName} Prime Client`,
    contactPersonName: "Mr. Tariq Al Nuaimi",
    phone: "+971501112233",
    category: "Interior Fit-Out",
    scopeOfWork: `${companyName} Corporate Office Reception & Executive Lounge Fit-Out`,
    fullAddress: "Downtown Business Bay Tower, Level 18, Dubai",
    scheduleVisitDate: new Date(),
    scheduleVisitTime: "10:30 AM",
    assignedPersonId: assigned ? assigned._id : null,
    assignedPersonName: assigned ? assigned.name : "Assigned Engineer",
    status: "Site Report Attached",
    siteReport: {
      observations: "Initial site inspection completed. Wall preparation required for acoustics.",
      reportSubmittedAt: new Date(),
    },
    activityTimeline: [
      { action: "Site Report Attached", note: "Inspection completed with survey photos", createdBy: "System", createdAt: new Date() },
      { action: "Visit Approved", note: "Site visit approved", createdBy: "Manager", createdAt: new Date() },
    ],
  });

  // Quotation 1
  const quot1 = new BoqQuotation({
    quotationNumber: `QT-${prefix}-1001`,
    companyId,
    inquiryId: inq1._id,
    projectName: `${companyName} Corporate Reception Fit-Out`,
    clientName: inq1.clientName,
    clientPhone: inq1.phone,
    clientEmail: `client@${companyId}.com`,
    location: inq1.fullAddress,
    subject: inq1.scopeOfWork,
    quoteDate: new Date(),
    status: "Approved",
    items: [
      { description: "Custom Fluted Wall Paneling with LED Integration", category: "Material", quantity: 45, unit: "sqm", unitPrice: 380 },
      { description: "Executive Marble Reception Desk (3m x 1.2m)", category: "Labor", quantity: 1, unit: "unit", unitPrice: 12500 },
      { description: "Specialized Acoustic Ceiling Baffles", category: "Material", quantity: 60, unit: "sqm", unitPrice: 220 },
    ],
    taxPercent: 5,
    discountPercent: 0,
    activityTimeline: [
      { action: "Approved", note: "Quotation approved by Manager", createdBy: "Manager", createdAt: new Date() },
    ],
  });
  recalculateTotals(quot1);
  await quot1.save();

  // Inquiry 2 (Pending visit approval)
  await Inquiry.create({
    inquiryNumber: `INQ-${prefix}-1002`,
    companyId,
    clientName: `${companyName} Retail Partner LLC`,
    contactPersonName: "Fatima Al Mansoori",
    phone: "+971504445566",
    category: "Showroom Wrap",
    scopeOfWork: `${companyName} High-End Retail Display Wrap & Signage`,
    fullAddress: "Dubai Marina Mall, Ground Floor, Dubai",
    scheduleVisitDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    scheduleVisitTime: "02:00 PM",
    assignedPersonId: assigned ? assigned._id : null,
    assignedPersonName: assigned ? assigned.name : "Assigned Engineer",
    status: "Visit Pending Approval",
    activityTimeline: [
      { action: "Inquiry Created", note: "New inquiry captured", createdBy: "Admin", createdAt: new Date() },
    ],
  });

  // Quotation 2 (Pending approval to demonstrate approval hierarchy)
  const quot2 = new BoqQuotation({
    quotationNumber: `QT-${prefix}-1002`,
    companyId,
    projectName: `${companyName} Commercial Glass Partition Works`,
    clientName: `${companyName} Tech Hub`,
    clientPhone: "+971509998877",
    clientEmail: `tech@${companyId}.com`,
    location: "Al Quoz Industrial 1, Dubai",
    subject: "Acoustic Double Glazed Aluminum Partitions",
    quoteDate: new Date(),
    status: "Pending Approval",
    items: [
      { description: "12mm Tempered Clear Glass Partition System", category: "Material", quantity: 80, unit: "sqm", unitPrice: 290 },
      { description: "Frameless Glass Swing Doors with Hydraulic Patch Fittings", category: "Labor", quantity: 4, unit: "unit", unitPrice: 2200 },
    ],
    taxPercent: 5,
    discountPercent: 0,
    activityTimeline: [
      { action: "Manager Approval", note: "Submitted by Engineer for Manager review", createdBy: "Engineer", createdAt: new Date() },
    ],
  });
  recalculateTotals(quot2);
  await quot2.save();

  // eslint-disable-next-line no-console
  console.log(`Seeded demonstration data for ${companyName} (${companyId}).`);
}

module.exports = {
  seedMultiCompanyUsers,
  SEEDED_ACCOUNTS,
};
