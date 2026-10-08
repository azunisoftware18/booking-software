import prisma from "../db/db.js";
import { ApiError } from "../utils/ApiError.js";
import bcrypt from "bcryptjs";

class UserService {
  // =========================================================
  // CREATE USER
  // =========================================================
  static async createUser(payload) {
    const {
      fullName,
      email,
      password,
      phone,
      roleId,
      placeId,
    } = payload;

    const normalizedEmail = email.trim().toLowerCase();

    // =======================================================
    // CHECK DUPLICATE EMAIL
    // =======================================================
    const existingUser = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      throw ApiError.conflict("Email already exists");
    }

    // =======================================================
    // CHECK ROLE
    // =======================================================
    const role = await prisma.role.findUnique({
      where: {
        id: roleId,
      },
    });

    if (!role) {
      throw ApiError.notFound("Role not found");
    }

    // =======================================================
    // CHECK PLACE
    // =======================================================
    const place = await prisma.place.findUnique({
      where: {
        id: placeId,
      },
    });

    if (!place) {
      throw ApiError.notFound("Place not found");
    }

    // =======================================================
    // HASH PASSWORD
    // =======================================================
    const hashedPassword = await bcrypt.hash(password, 10);

    // =======================================================
    // CREATE USER
    // =======================================================
    const user = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        phone: phone?.trim() || null,
        roleId,
        placeId,
      },

      include: {
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

    // =======================================================
    // REMOVE PASSWORD
    // =======================================================
    const { password: _, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }

  // =========================================================
  // GET ALL USERS
  // =========================================================
  static async getAllUsers() {
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },

      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
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

    return users;
  }

  // =========================================================
  // GET USER BY ID
  // =========================================================
  static async getUserById(id) {
    const user = await prisma.user.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
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

    return user;
  }

  // =========================================================
  // UPDATE USER
  // =========================================================
  static async updateUser(id, payload) {
    // =======================================================
    // FIND EXISTING USER
    // =======================================================
    const existing = await prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!existing) {
      throw ApiError.notFound("User not found");
    }

    const {
      fullName,
      email,
      password,
      phone,
      roleId,
      placeId,
    } = payload;

    // =======================================================
    // NEXT VALUES
    // =======================================================
    const nextFullName =
      fullName !== undefined
        ? fullName.trim()
        : existing.fullName;

    const nextEmail =
      email !== undefined
        ? email.trim().toLowerCase()
        : existing.email;

    const nextPhone =
      phone !== undefined
        ? phone.trim() || null
        : existing.phone;

    const nextRoleId =
      roleId !== undefined
        ? roleId
        : existing.roleId;

    const nextPlaceId =
      placeId !== undefined
        ? placeId
        : existing.placeId;

    // =======================================================
    // CHECK EMAIL DUPLICATE
    // =======================================================
    const duplicateEmail = await prisma.user.findFirst({
      where: {
        email: nextEmail,
        NOT: {
          id,
        },
      },
    });

    if (duplicateEmail) {
      throw ApiError.conflict("Email already exists");
    }

    // =======================================================
    // CHECK ROLE
    // =======================================================
    if (roleId !== undefined) {
      const role = await prisma.role.findUnique({
        where: {
          id: nextRoleId,
        },
      });

      if (!role) {
        throw ApiError.notFound("Role not found");
      }
    }

    // =======================================================
    // CHECK PLACE
    // =======================================================
    if (placeId !== undefined) {
      const place = await prisma.place.findUnique({
        where: {
          id: nextPlaceId,
        },
      });

      if (!place) {
        throw ApiError.notFound("Place not found");
      }
    }

    // =======================================================
    // CHECK PASSWORD
    // =======================================================
    let nextPassword = existing.password;

    if (password !== undefined) {
      nextPassword = await bcrypt.hash(password, 10);
    }

    // =======================================================
    // CHECK NO CHANGES
    // =======================================================
    const isSame =
      existing.fullName === nextFullName &&
      existing.email === nextEmail &&
      existing.phone === nextPhone &&
      existing.roleId === nextRoleId &&
      existing.placeId === nextPlaceId &&
      password === undefined;

    if (isSame) {
      throw ApiError.badRequest("Already updated");
    }

    // =======================================================
    // UPDATE USER
    // =======================================================
    return await prisma.user.update({
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
  }

  // =========================================================
  // DELETE USER
  // =========================================================
  static async deleteUser(id) {
    const existing = await prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!existing) {
      throw ApiError.notFound("User not found");
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