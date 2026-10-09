import prisma from "../db/db.js";
import { ApiError } from "../utils/ApiError.js";

class PermissionMiddleware {
  static hasPermission = (permission) => {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          throw ApiError.unauthorized("User not authenticated");
        }

        if (!permission) {
          throw ApiError.forbidden("Permission is required");
        }

        const [resource, action] = permission.split(".");

        if (!resource || !action) {
          throw ApiError.badRequest(
            `Invalid permission format: ${permission}`
          );
        }

        // =====================================
        // CHECK PERMISSION
        // =====================================

        const assignedPermission =
          await prisma.assignedPermission.findFirst({
            where: {
              permission: {
                resource,
                action,
                isActive: true,
              },

              OR: [
                {
                  // Role based permission
                  roleId: req.user.roleId,
                },
                {
                  // Direct user based permission
                  userId: req.user.id,
                },
              ],
            },

            include: {
              permission: true,
            },
          });

        if (!assignedPermission) {
          throw ApiError.forbidden(
            `Permission denied: ${permission}`
          );
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  };
}

export default PermissionMiddleware;