const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { ROLE_OPTIONS } = require("../config/rbac");

const teamMemberStatuses = ["Active", "Inactive"];
const roleSlugs = ROLE_OPTIONS.map((r) => r.value);

const teamMemberSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    role: { type: String, required: true, enum: roleSlugs },
    status: { type: String, enum: teamMemberStatuses, default: "Active" },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true },
);

teamMemberSchema.methods.comparePassword = async function comparePassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

teamMemberSchema.statics.hashPassword = async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
};

teamMemberSchema.virtual("isActive").get(function isActive() {
  return this.status === "Active";
});

teamMemberSchema.set("toJSON", {
  virtuals: true,
  transform(_doc, ret) {
    delete ret.passwordHash;
    return ret;
  },
});

module.exports = {
  TeamMember: mongoose.model("TeamMember", teamMemberSchema),
  teamMemberStatuses,
  roleSlugs,
};
