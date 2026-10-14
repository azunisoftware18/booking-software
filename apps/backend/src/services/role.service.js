import prisma from "../db/db.js";
import { ApiError } from "../utils/ApiError.js";

class RoleService {
  // =========================================================
  // CREATE ROLE
  // =========================================================
  static async createRole(payload) {
    const {
      roleName,
      roleCode,
      description,
      createdById,
    } = payload;

    const normalizedName = roleName.trim();
    const normalizedCode = roleCode.trim().toUpperCase();

    // =======================================================
    // CHECK DUPLICATE ROLE NAME
    // =======================================================
    const existingName = await prisma.role.findUnique({
      where: {
        roleName: normalizedName,
      },
    });

    if (existingName) {
      throw ApiError.conflict("Role name already exists");
    }

    // =======================================================
    // CHECK DUPLICATE ROLE CODE
    // =======================================================
    const existingCode = await prisma.role.findUnique({
      where: {
        roleCode: normalizedCode,
      },
    });

    if (existingCode) {
      throw ApiError.conflict("Role code already exists");
    }

    // =======================================================
    // CREATE ROLE
    // =======================================================
    return await prisma.role.create({
      data: {
        roleName: normalizedName,
        roleCode: normalizedCode,
        description: description?.trim() || null,
        createdById,
      },
    });
  }

  // =========================================================
  // GET ALL ROLES
  // =========================================================
  

static async getAllRoles(currentUserId) {
  const currentUser = await prisma.user.findUnique({
    where: {
      id: currentUserId,
    },
    select: {
      parentId: true,
      roleId: true,
    },
  });

  if (!currentUser) {
    throw ApiError.notFound("User not found");
  }

  // Parent ka assigned role
  let parentRoleId = null;

  if (currentUser.parentId) {
    const parentUser = await prisma.user.findUnique({
      where: {
        id: currentUser.parentId,
      },
      select: {
        roleId: true,
      },
    });

    parentRoleId = parentUser?.roleId ?? null;
  }

  // Super Admin, parent ka role aur current user ka role exclude karo
  const excludedRoleIds = [
    parentRoleId,
    currentUser.roleId,
  ].filter(Boolean);

  const roles = await prisma.role.findMany({
    where: {
      roleName: {
        not: "Super Admin",
      },
      roleCode: {
        not: "SUPER_ADMIN",
      },
      ...(excludedRoleIds.length > 0
        ? {
            id: {
              notIn: excludedRoleIds,
            },
          }
        : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      createdBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });

  return roles;
}



  // =========================================================
  // GET ROLE BY ID
  // =========================================================
  static async getRoleById(id) {
    const role = await prisma.role.findUnique({
      where: {
        id,
      },
    });

    if (!role) {
      throw ApiError.notFound("Role not found");
    }

    return role;
  }

  // =========================================================
  // UPDATE ROLE
  // =========================================================
  static async updateRole(id, payload) {
    // =======================================================
    // FIND EXISTING ROLE
    // =======================================================
    const existing = await prisma.role.findUnique({
      where: {
        id,
      },
    });

    if (!existing) {
      throw ApiError.notFound("Role not found");
    }

    const {
      roleName,
      roleCode,
      description,
    } = payload;

    // =======================================================
    // NEXT VALUES
    // =======================================================
    const nextRoleName =
      roleName !== undefined
        ? roleName.trim()
        : existing.roleName;

    const nextRoleCode =
      roleCode !== undefined
        ? roleCode.trim().toUpperCase()
        : existing.roleCode;

    const nextDescription =
      description !== undefined
        ? description?.trim() || null
        : existing.description;

    // =======================================================
    // CHECK DUPLICATE ROLE NAME
    // =======================================================
    const duplicateName = await prisma.role.findFirst({
      where: {
        roleName: nextRoleName,
        NOT: {
          id,
        },
      },
    });

    if (duplicateName) {
      throw ApiError.conflict("Role name already exists");
    }

    // =======================================================
    // CHECK DUPLICATE ROLE CODE
    // =======================================================
    const duplicateCode = await prisma.role.findFirst({
      where: {
        roleCode: nextRoleCode,
        NOT: {
          id,
        },
      },
    });

    if (duplicateCode) {
      throw ApiError.conflict("Role code already exists");
    }

    // =======================================================
    // CHECK NO CHANGES
    // =======================================================
    const isSame =
      existing.roleName === nextRoleName &&
      existing.roleCode === nextRoleCode &&
      existing.description === nextDescription;

    if (isSame) {
      throw ApiError.badRequest("Already updated");
    }

    // =======================================================
    // UPDATE ROLE
    // =======================================================
    return await prisma.role.update({
      where: {
        id,
      },
      data: {
        roleName: nextRoleName,
        roleCode: nextRoleCode,
        description: nextDescription,
      },
    });
  }

  // =========================================================
  // DELETE ROLE
  // =========================================================
  static async deleteRole(id) {
    // =======================================================
    // FIND ROLE
    // =======================================================
    const existing = await prisma.role.findUnique({
      where: {
        id,
      },
    });

    if (!existing) {
      throw ApiError.notFound("Role not found");
    }

    // =======================================================
    // DELETE ROLE
    // =======================================================
    await prisma.role.delete({
      where: {
        id,
      },
    });

    return true;
  }
}

export default RoleService;