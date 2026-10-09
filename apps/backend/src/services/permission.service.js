
import prisma from "../db/db.js";
import { ApiError } from "../utils/ApiError.js";

class PermissionService {
  // =========================================================
  // GET ALL ACTIVE PERMISSIONS
  // =========================================================


  static getAllPermissions = async (userId) => {
    const { permissions } = await this.getUserPermissions(userId);

    return permissions;
  };

  // Super Admin ke liye complete active permission list
  static getAllAvailablePermissions = async () => {
    return prisma.permission.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        { resource: "asc" },
        { action: "asc" },
      ],
    });
  };


  // =========================================================
  // GET USER PERMISSIONS (DIRECT + ROLE)
  // =========================================================

  static getUserPermissions = async (userId) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        roleId: true,
        role: {
          select: {
            id: true,
            roleName: true,
            roleCode: true,
          },
        },
      },
    });

    if (!user) {
      throw ApiError.notFound("User not found");
    }

    const assignedPermissions =
      await prisma.assignedPermission.findMany({
        where: {
          OR: [
            { userId: user.id },
            { roleId: user.roleId },
          ],
          permission: {
            isActive: true,
          },
        },
        include: {
          permission: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    const permissionMap = new Map();

    for (const assignment of assignedPermissions) {
      const permission = assignment.permission;

      if (!permission) continue;

      const source =
        assignment.userId === user.id ? "USER" : "ROLE";

      if (permissionMap.has(permission.id)) {
        const existing = permissionMap.get(permission.id);

        if (!existing.sources.includes(source)) {
          existing.sources.push(source);
        }
      } else {
        permissionMap.set(permission.id, {
          ...permission,
          sources: [source],
        });
      }
    }

    return {
      user,
      permissions: Array.from(permissionMap.values()),
    };
  };

  // =========================================================
  // CHECK WHO CAN MANAGE TARGET USER
  // =========================================================

  static checkTargetAccess = async (actorId, targetUserId) => {
    const actor = await prisma.user.findUnique({
      where: { id: actorId },
      select: {
        id: true,
        parentId: true,
        role: {
          select: {
            roleCode: true,
          },
        },
      },
    });

    if (!actor) {
      throw ApiError.notFound("Current user not found");
    }

    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        parentId: true,
      },
    });

    if (!target) {
      throw ApiError.notFound("Target user not found");
    }

    const isSuperAdmin =
      actor.role?.roleCode === "SUPER_ADMIN";

    if (actor.id === target.id) {
      throw ApiError.forbidden(
        "You cannot manage your own permissions using this endpoint"
      );
    }

    if (!isSuperAdmin && target.parentId !== actor.id) {
      throw ApiError.forbidden(
        "You can manage permissions only for your direct child users"
      );
    }

    return { actor, target, isSuperAdmin };
  };

  // =========================================================
  // GET PERMISSIONS THAT ACTOR CAN DELEGATE
  // =========================================================

  static getAssignablePermissions = async (
    actorId,
    targetUserId
  ) => {
    const { isSuperAdmin } = await this.checkTargetAccess(
      actorId,
      targetUserId
    );

    if (isSuperAdmin) {
      return prisma.permission.findMany({
        where: { isActive: true },
        orderBy: [
          { resource: "asc" },
          { action: "asc" },
        ],
      });
    }

    const { permissions } = await this.getUserPermissions(actorId);

    const allowedIds = permissions.map(
      (permission) => permission.id
    );

    if (allowedIds.length === 0) {
      return [];
    }

    return prisma.permission.findMany({
      where: {
        isActive: true,
        id: { in: allowedIds },
      },
      orderBy: [
        { resource: "asc" },
        { action: "asc" },
      ],
    });
  };

  // =========================================================
  // SINGLE ASSIGN
  // =========================================================

  static assignPermissionToUser = async (
    userId,
    permissionId,
    actorId
  ) => {
    const assignable = await this.getAssignablePermissions(
      actorId,
      userId
    );

    const allowed = assignable.some(
      (permission) => permission.id === permissionId
    );

    if (!allowed) {
      throw ApiError.forbidden(
        "You cannot assign this permission"
      );
    }

    const existing = await prisma.assignedPermission.findFirst({
      where: {
        userId,
        permissionId,
      },
    });

    if (existing) {
      throw ApiError.conflict(
        "Permission already assigned to this user"
      );
    }

    return prisma.assignedPermission.create({
      data: {
        userId,
        permissionId,
      },
      include: {
        permission: true,
      },
    });
  };

  // =========================================================
  // SINGLE REMOVE
  // =========================================================

  static removePermissionFromUser = async (
    userId,
    permissionId,
    actorId
  ) => {
    await this.checkTargetAccess(actorId, userId);

    const existing = await prisma.assignedPermission.findFirst({
      where: {
        userId,
        permissionId,
      },
    });

    if (!existing) {
      throw ApiError.notFound(
        "Permission is not directly assigned to this user"
      );
    }

    await prisma.assignedPermission.delete({
      where: {
        id: existing.id,
      },
    });

    return {
      message: "Permission removed successfully",
    };
  };

  // =========================================================
  // BULK ASSIGN + REMOVE
  // =========================================================

  static bulkUpdateUserPermissions = async (
    actorId,
    targetUserId,
    {
      assignPermissionIds = [],
      removePermissionIds = [],
    }
  ) => {
    if (
      !Array.isArray(assignPermissionIds) ||
      !Array.isArray(removePermissionIds)
    ) {
      throw ApiError.badRequest(
        "assignPermissionIds and removePermissionIds must be arrays"
      );
    }

    assignPermissionIds = [...new Set(assignPermissionIds)];
    removePermissionIds = [...new Set(removePermissionIds)];

    if (
      assignPermissionIds.length === 0 &&
      removePermissionIds.length === 0
    ) {
      throw ApiError.badRequest(
        "Provide at least one permission to assign or remove"
      );
    }

    const overlap = assignPermissionIds.filter((id) =>
      removePermissionIds.includes(id)
    );

    if (overlap.length > 0) {
      throw ApiError.badRequest(
        "A permission cannot be assigned and removed in the same request"
      );
    }

    const assignable = await this.getAssignablePermissions(
      actorId,
      targetUserId
    );

    const allowedIds = new Set(
      assignable.map((permission) => permission.id)
    );

    const forbiddenIds = assignPermissionIds.filter(
      (id) => !allowedIds.has(id)
    );

    if (forbiddenIds.length > 0) {
      throw ApiError.forbidden(
        "You cannot assign permissions you do not have"
      );
    }

    const allRequestedIds = [
      ...new Set([
        ...assignPermissionIds,
        ...removePermissionIds,
      ]),
    ];

    if (allRequestedIds.length > 0) {
      const validPermissions = await prisma.permission.findMany({
        where: {
          id: { in: allRequestedIds },
          isActive: true,
        },
        select: { id: true },
      });

      const validIds = new Set(
        validPermissions.map((permission) => permission.id)
      );

      const invalidIds = allRequestedIds.filter(
        (id) => !validIds.has(id)
      );

      if (invalidIds.length > 0) {
        throw ApiError.badRequest(
          "One or more permission IDs are invalid or inactive"
        );
      }
    }

    // Validate removable assignments before making changes.
    if (removePermissionIds.length > 0) {
      const existingToRemove =
        await prisma.assignedPermission.findMany({
          where: {
            userId: targetUserId,
            permissionId: {
              in: removePermissionIds,
            },
          },
          select: {
            permissionId: true,
          },
        });

      const existingIds = new Set(
        existingToRemove.map((item) => item.permissionId)
      );

      const missingIds = removePermissionIds.filter(
        (id) => !existingIds.has(id)
      );

      if (missingIds.length > 0) {
        throw ApiError.badRequest(
          "One or more permissions are not directly assigned to this user"
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      let assignedCount = 0;
      let removedCount = 0;

      if (assignPermissionIds.length > 0) {
        const existing = await tx.assignedPermission.findMany({
          where: {
            userId: targetUserId,
            permissionId: {
              in: assignPermissionIds,
            },
          },
          select: {
            permissionId: true,
          },
        });

        const existingIds = new Set(
          existing.map((item) => item.permissionId)
        );

        const newIds = assignPermissionIds.filter(
          (id) => !existingIds.has(id)
        );

        if (newIds.length > 0) {
          const result = await tx.assignedPermission.createMany({
            data: newIds.map((permissionId) => ({
              userId: targetUserId,
              permissionId,
            })),
          });

          assignedCount = result.count;
        }
      }

      if (removePermissionIds.length > 0) {
        const result = await tx.assignedPermission.deleteMany({
          where: {
            userId: targetUserId,
            permissionId: {
              in: removePermissionIds,
            },
          },
        });

        removedCount = result.count;
      }

      return {
        assignedCount,
        removedCount,
      };
    });
  };
}

export default PermissionService;
