import prisma from "../db/db.js";
import { ApiError } from "../utils/ApiError.js";

class PermissionService {
  // =========================================================
  // GET ALL PERMISSIONS
  // =========================================================

  static getAllPermissions = async () => {
    const permissions = await prisma.permission.findMany({
      where: {
        isActive: true,
      },

      orderBy: [
        {
          resource: "asc",
        },
        {
          action: "asc",
        },
      ],
    });

    return permissions;
  };

  // =========================================================
  // GET USER DIRECT PERMISSIONS
  // =========================================================

  
static getUserPermissions = async (userId) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
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

  // Get permissions assigned directly to the user
  // and permissions assigned to the user's role
  const assignedPermissions = await prisma.assignedPermission.findMany({
    where: {
      OR: [
        {
          userId: user.id,
        },
        {
          roleId: user.roleId,
        },
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

  // Merge duplicate permissions and track their source
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
  // ASSIGN PERMISSION TO USER
  // =========================================================

  static assignPermissionToUser = async (
    userId,
    permissionId
  ) => {
    // Check user
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw ApiError.notFound("User not found");
    }

    // Check permission
    const permission = await prisma.permission.findUnique({
      where: {
        id: permissionId,
      },
    });

    if (!permission) {
      throw ApiError.notFound("Permission not found");
    }

    if (!permission.isActive) {
      throw ApiError.badRequest(
        "Permission is inactive"
      );
    }

    // Check existing assignment
    const existingAssignment =
      await prisma.assignedPermission.findFirst({
        where: {
          userId,
          permissionId,
        },
      });

    if (existingAssignment) {
      throw ApiError.conflict(
        "Permission already assigned to this user"
      );
    }

    // Create assignment
    const assignedPermission =
      await prisma.assignedPermission.create({
        data: {
          userId,
          permissionId,
        },

        include: {
          permission: true,
        },
      });

    return assignedPermission;
  };

  // =========================================================
  // REMOVE PERMISSION FROM USER
  // =========================================================

  static removePermissionFromUser = async (
    userId,
    permissionId
  ) => {
    // Check assignment
    const assignedPermission =
      await prisma.assignedPermission.findFirst({
        where: {
          userId,
          permissionId,
        },
      });

    if (!assignedPermission) {
      throw ApiError.notFound(
        "Permission is not assigned to this user"
      );
    }

    await prisma.assignedPermission.delete({
      where: {
        id: assignedPermission.id,
      },
    });

    return {
      message: "Permission removed successfully",
    };
  };
}

export default PermissionService;