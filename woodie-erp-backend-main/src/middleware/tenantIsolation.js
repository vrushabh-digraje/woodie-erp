const { isMasterAdmin } = require("../config/rbac");

/**
 * Resolves the active companyId for the request:
 * - Master Admin can specify 'x-company-id' header or 'companyId' query param.
 *   If 'all' or absent, companyId is null (meaning global view).
 * - Standard company users are strictly locked to their assigned companyId (default 'woodie-1').
 */
function resolveCompanyId(req) {
  if (!req.user) return "woodie-1";

  if (isMasterAdmin(req.user.role)) {
    const requested = (req.headers["x-company-id"] || req.query.companyId || "").toString().trim().toLowerCase();
    if (requested && requested !== "all") {
      return requested;
    }
    return null;
  }

  return (req.user.companyId || "woodie-1").toString().trim().toLowerCase();
}

/**
 * Middleware that attaches req.companyId to all authenticated requests.
 */
function attachTenant(req, _res, next) {
  req.companyId = resolveCompanyId(req);
  next();
}

/**
 * Builds a Mongo filter query enforcing tenant isolation:
 * - Master Admin with companyId == null returns baseFilter (global cross-company).
 * - Company 'woodie-1' matches documents with companyId === 'woodie-1', null, or missing (legacy data).
 * - Other companies ('woodie-2', 'woodie-3') strictly match their own companyId.
 */
function buildTenantFilter(req, baseFilter = {}) {
  const companyId = req.companyId !== undefined ? req.companyId : resolveCompanyId(req);

  if (!companyId) {
    // Master Admin viewing all companies
    return { ...baseFilter };
  }

  if (companyId === "woodie-1") {
    return {
      ...baseFilter,
      $or: [
        { companyId: "woodie-1" },
        { companyId: { $exists: false } },
        { companyId: null },
      ],
    };
  }

  return {
    ...baseFilter,
    companyId,
  };
}

/**
 * Enforces companyId on new documents:
 * Standard users can ONLY create records in their own company.
 * Master Admin defaults to active company filter or 'woodie-1'.
 */
function applyTenantCreation(req, payload = {}) {
  const activeCompany = resolveCompanyId(req);
  const companyId = activeCompany || payload.companyId || "woodie-1";
  return {
    ...payload,
    companyId,
  };
}

module.exports = {
  resolveCompanyId,
  attachTenant,
  buildTenantFilter,
  applyTenantCreation,
};
