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

        if (req.user.role?.roleCode === "SUPER_ADMIN") {
          const allowedCreatePermissions = new Set([
            "LOCATION.CREATE",
            "ROLE.CREATE",
            "USER.CREATE",
            "PLACE.CREATE",
          ]);

          if (
            action === "CREATE" &&
            !allowedCreatePermissions.has(permission)
          ) {
            throw ApiError.forbidden(
              "Super Admin cannot create this resource"
            );
          }

          return next();
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

  static hasAnyPermission = (permissions = []) => {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          throw ApiError.unauthorized("User not authenticated");
        }

        if (!permissions.length) {
          throw ApiError.forbidden("Permission is required");
        }

        if (req.user.role?.roleCode === "SUPER_ADMIN") {
          return next();
        }

        const assignedPermission = await prisma.assignedPermission.findFirst({
          where: {
            permission: {
              resource: { in: permissions.map((permission) => permission.split(".")[0]) },
              action: { in: permissions.map((permission) => permission.split(".")[1]) },
              isActive: true,
            },
            OR: [{ roleId: req.user.roleId }, { userId: req.user.id }],
          },
        });

        if (!assignedPermission) {
          throw ApiError.forbidden(`Permission denied: ${permissions.join(" or ")}`);
        }

        return next();
      } catch (error) {
        return next(error);
      }
    };
  };
}

export default PermissionMiddleware;
