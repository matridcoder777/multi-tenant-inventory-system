// Middleware to inject tenantId into requests for multi-tenancy
const tenantInjector = (req, res, next) => {
  // Get tenantId from JWT
  if (req.user && req.user.tenantId) {
    req.tenantId = req.user.tenantId;
  }
  
  // Override from URL param if present (for single-tenant routes)
  if (req.params.tenantId) {
    req.tenantId = req.params.tenantId;
  }

  next();
};

module.exports = tenantInjector;
