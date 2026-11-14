const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { ROLE_OPTIONS } = require("../config/rbac");

const ROLES = ROLE_OPTIONS.map((r) => r.value);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },
    companyId: { type: String, default: "woodie-1", trim: true, lowercase: true },
    isActive: { type: Boolean, default: true },
    teamMemberId: { type: mongoose.Schema.Types.ObjectId, ref: "TeamMember", default: null },
  },
  { timestamps: true },
);

userSchema.methods.comparePassword = async function comparePassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.statics.hashPassword = async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
};

const User = mongoose.model("User", userSchema);

module.exports = { User, ROLES };
