const AppError = require('../utils/AppError');
const { verifyToken } = require('../utils/jwt');

// Middleware to extract and verify JWT
const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new AppError('No authorization token provided', 401);
    }

    const decoded = verifyToken(token);
    
    req.user = {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to check user role
const roleGuard = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole) {
      return next(new AppError('User role not found', 401));
    }

    // Define role hierarchy: owner > manager > staff
    const roleHierarchy = { owner: 3, manager: 2, staff: 1 };
    const userRoleLevel = roleHierarchy[userRole] || 0;
    const minRoleLevel = Math.min(
      ...allowedRoles.map((r) => roleHierarchy[r] || 0)
    );

    if (userRoleLevel < minRoleLevel) {
      return next(
        new AppError(
          `Only ${allowedRoles.join(', ')} can access this resource`,
          403
        )
      );
    }

    next();
  };
};

// Middleware to check tenant isolation
const tenantGuard = (req, res, next) => {
  const userTenantId = req.user?.tenantId;
  const requestTenantId = req.params.tenantId || req.body.tenantId || req.query.tenantId;

  if (requestTenantId && userTenantId !== requestTenantId) {
    return next(new AppError('Cannot access resources from another tenant', 403));
  }

  next();
};

module.exports = {
  authMiddleware,
  roleGuard,
  tenantGuard,
};
