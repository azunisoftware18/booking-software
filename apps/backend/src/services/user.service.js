
import prisma from "../db/db.js";
import { ApiError } from "../utils/ApiError.js";
import bcrypt from "bcryptjs";

class UserService {
  // =========================================================
  // GET AUTHENTICATED USER FROM DATABASE
  // =========================================================
  static async getActor(currentUser) {
    if (!currentUser?.id) {
      throw ApiError.unauthorized("User not authenticated");
    }

    const actor = await prisma.user.findUnique({
      where: {
        id: currentUser.id,
      },
      select: {
        id: true,
        roleId: true,
        placeId: true,
        parentId: true,
        level: true,
        role: {
          select: {
            id: true,
            roleName: true,
            roleCode: true,
          },
        },
      },
    });

    if (!actor) {
      throw ApiError.unauthorized("Invalid user");
    }

    return actor;
  }

  // =========================================================
  // CHECK TARGET USER ACCESS
  // Super Admin can access all users.
  // Other users can access only their direct children
  // assigned to the same place.
  // =========================================================
  static checkUserAccess(actor, targetUser, action = "access") {
    const isSuperAdmin = actor.role?.roleCode === "SUPER_ADMIN";

    if (isSuperAdmin) {
      return true;
    }

    if (targetUser.parentId !== actor.id) {
      throw ApiError.forbidden(`You cannot ${action} this user`);
    }

    if (targetUser.placeId !== actor.placeId) {
      throw ApiError.forbidden("Access to this place denied");
    }

    return true;
  }

  // =========================================================
  // CREATE USER
  // Super Admin -> Level 2
  // Level 2 -> Level 3
  // Level 3 -> Cannot create users
  // =========================================================
  static async createUser(payload, currentUser) {
    const actor = await this.getActor(currentUser);

    const {
      fullName,
      email,
      password,
      phone,
      roleId,
      placeId,
    } = payload;

    // Validate required fields
    if (
      typeof fullName !== "string" ||
      !fullName.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password ||
      typeof roleId !== "string" ||
      !roleId
    ) {
      throw ApiError.badRequest(
        "Full name, email, password and role are required"
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check duplicate email
    const existingUser = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      throw ApiError.conflict("Email already exists");
    }

    // Check role
    const role = await prisma.role.findUnique({
      where: {
        id: roleId,
      },
      select: {
        id: true,
        roleName: true,
        roleCode: true,
      },
    });

    if (!role) {
      throw ApiError.notFound("Role not found");
    }

    // Never allow creating another Super Admin through this flow
    if (role.roleCode === "SUPER_ADMIN") {
      throw ApiError.forbidden("Cannot create another Super Admin");
    }

    const isSuperAdmin = actor.role?.roleCode === "SUPER_ADMIN";

    // Only Super Admin and Level 2 can create users
    if (!isSuperAdmin && actor.level !== 2) {
      throw ApiError.forbidden(
        "Only Super Admin and Level 2 users can create users"
      );
    }

    // Assign hierarchy fields on the server
    const nextLevel = isSuperAdmin ? 2 : 3;
    const nextPlaceId = isSuperAdmin ? placeId : actor.placeId;

    // A place is required for a newly created user
    if (!nextPlaceId) {
      throw ApiError.badRequest("Place is required");
    }

    // Level 2 users cannot assign another place
    if (
      !isSuperAdmin &&
      placeId !== undefined &&
      placeId !== actor.placeId
    ) {
      throw ApiError.forbidden("You can only assign your own place");
    }

    // Check place exists
    const place = await prisma.place.findUnique({
      where: {
        id: nextPlaceId,
      },
      select: {
        id: true,
      },
    });

    if (!place) {
      throw ApiError.notFound("Place not found");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        phone:
          typeof phone === "string" && phone.trim()
            ? phone.trim()
            : null,
        roleId,
        placeId: nextPlaceId,
        parentId: actor.id,
        level: nextLevel,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        parentId: true,
        level: true,
        placeId: true,
        createdAt: true,
        role: {
          select: {
            id: true,
            roleName: true,
            roleCode: true,
            description: true,
          },
        },
        place: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });

    // Password is not selected or returned
    return user;
  }

  // =========================================================
  // GET ALL USERS
  // Super Admin -> All users
  // Other users -> Their direct children only
  // =========================================================
  static async getAllUsers(currentUser) {
    const actor = await this.getActor(currentUser);

    const isSuperAdmin = actor.role?.roleCode === "SUPER_ADMIN";

    const users = await prisma.user.findMany({
      where: isSuperAdmin
        ? {}
        : {
            parentId: actor.id,
            placeId: actor.placeId,
          },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        parentId: true,
        level: true,
        placeId: true,
        createdAt: true,
        role: {
          select: {
            id: true,
            roleName: true,
            roleCode: true,
          },
        },
        place: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });

    return users;
  }

  // =========================================================
  // GET USER BY ID
  // =========================================================
  static async getUserById(id, currentUser) {
    const actor = await this.getActor(currentUser);

    const user = await prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        parentId: true,
        level: true,
        placeId: true,
        createdAt: true,
        role: {
          select: {
            id: true,
            roleName: true,
            roleCode: true,
            description: true,
          },
        },
        place: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });

    if (!user) {
      throw ApiError.notFound("User not found");
    }

    this.checkUserAccess(actor, user, "access");

    return user;
  }

  // =========================================================
  // UPDATE USER
  // =========================================================
  static async updateUser(id, payload, currentUser) {
    const actor = await this.getActor(currentUser);

    const existing = await prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        password: true,
        phone: true,
        roleId: true,
        placeId: true,
        parentId: true,
        level: true,
        createdAt: true,
        role: {
          select: {
            roleCode: true,
          },
        },
      },
    });

    if (!existing) {
      throw ApiError.notFound("User not found");
    }

    this.checkUserAccess(actor, existing, "update");

    const isSuperAdmin = actor.role?.roleCode === "SUPER_ADMIN";

    const {
      fullName,
      email,
      password,
      phone,
      roleId,
      placeId,
    } = payload;

    // Validate supplied values
    if (
      fullName !== undefined &&
      (typeof fullName !== "string" || !fullName.trim())
    ) {
      throw ApiError.badRequest("Full name cannot be empty");
    }

    if (
      email !== undefined &&
      (typeof email !== "string" || !email.trim())
    ) {
      throw ApiError.badRequest("Email cannot be empty");
    }

    if (
      password !== undefined &&
      (typeof password !== "string" || !password)
    ) {
      throw ApiError.badRequest("Password cannot be empty");
    }

    if (roleId !== undefined && (typeof roleId !== "string" || !roleId)) {
      throw ApiError.badRequest("Invalid role");
    }

    // Prevent non-admins from changing roles
    if (!isSuperAdmin && roleId !== undefined && roleId !== existing.roleId) {
      throw ApiError.forbidden("Only Super Admin can change a user's role");
    }

    // Prevent users from moving a child to another place
    if (!isSuperAdmin && placeId !== undefined && placeId !== actor.placeId) {
      throw ApiError.forbidden("You cannot change the assigned place");
    }

    const nextFullName =
      fullName !== undefined ? fullName.trim() : existing.fullName;

    const nextEmail =
      email !== undefined
        ? email.trim().toLowerCase()
        : existing.email;

    const nextPhone =
      phone !== undefined
        ? typeof phone === "string" && phone.trim()
          ? phone.trim()
          : null
        : existing.phone;

    const nextRoleId =
      roleId !== undefined ? roleId : existing.roleId;

    const nextPlaceId =
      placeId !== undefined ? placeId : existing.placeId;

    // Protect Super Admin role
    if (roleId !== undefined) {
      const nextRole = await prisma.role.findUnique({
        where: {
          id: nextRoleId,
        },
        select: {
          id: true,
          roleCode: true,
        },
      });

      if (!nextRole) {
        throw ApiError.notFound("Role not found");
      }

      if (nextRole.roleCode === "SUPER_ADMIN") {
        throw ApiError.forbidden("Cannot assign the Super Admin role");
      }
    }

    // Validate place if supplied
    if (placeId !== undefined) {
      if (!nextPlaceId) {
        throw ApiError.badRequest("Place is required");
      }

      const place = await prisma.place.findUnique({
        where: {
          id: nextPlaceId,
        },
        select: {
          id: true,
        },
      });

      if (!place) {
        throw ApiError.notFound("Place not found");
      }
    }

    // Check duplicate email, excluding the current target user
    const duplicateEmail = await prisma.user.findFirst({
      where: {
        email: nextEmail,
        NOT: {
          id,
        },
      },
      select: {
        id: true,
      },
    });

    if (duplicateEmail) {
      throw ApiError.conflict("Email already exists");
    }

    // Hash password only when a new password is provided
    let nextPassword = existing.password;

    if (password !== undefined) {
      nextPassword = await bcrypt.hash(password, 10);
    }

    // Detect whether anything changed
    const isSame =
      existing.fullName === nextFullName &&
      existing.email === nextEmail &&
      existing.phone === nextPhone &&
      existing.roleId === nextRoleId &&
      existing.placeId === nextPlaceId &&
      password === undefined;

    if (isSame) {
      throw ApiError.badRequest("No changes detected");
    }

    // Update allowed fields only.
    // parentId and level cannot be changed from request payload.
    const updatedUser = await prisma.user.update({
      where: {
        id,
      },
      data: {
        fullName: nextFullName,
        email: nextEmail,
        password: nextPassword,
        phone: nextPhone,
        roleId: nextRoleId,
        placeId: nextPlaceId,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        parentId: true,
        level: true,
        placeId: true,
        createdAt: true,
        role: {
          select: {
            id: true,
            roleName: true,
            roleCode: true,
            description: true,
          },
        },
        place: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });

    return updatedUser;
  }

  // =========================================================
  // DELETE USER
  // =========================================================
  static async deleteUser(id, currentUser) {
    const actor = await this.getActor(currentUser);

    const existing = await prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        parentId: true,
        placeId: true,
        level: true,
        role: {
          select: {
            roleCode: true,
          },
        },
      },
    });

    if (!existing) {
      throw ApiError.notFound("User not found");
    }

    this.checkUserAccess(actor, existing, "delete");

    // Protect the Super Admin account
    if (existing.role?.roleCode === "SUPER_ADMIN") {
      throw ApiError.forbidden("Super Admin cannot be deleted");
    }

    // Do not delete a parent while it still has child users
    const childrenCount = await prisma.user.count({
      where: {
        parentId: id,
      },
    });

    if (childrenCount > 0) {
      throw ApiError.badRequest(
        "Cannot delete this user because child users exist"
      );
    }

    await prisma.user.delete({
      where: {
        id,
      },
    });

    return true;
  }
}

export default UserService;
