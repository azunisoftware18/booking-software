
import bcrypt from "bcryptjs";
import prisma from "../db/db.js";

export const createAdmin = async (req, res) => {
  try {
    const { name, fullName, email, password, locationId } = req.body;
    const submittedName = fullName ?? name;
    const adminName =
      typeof submittedName === "string" ? submittedName.trim() : "";
    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    if (
      !adminName ||
      !normalizedEmail ||
      typeof password !== "string" ||
      !password ||
      typeof locationId !== "string" ||
      !locationId
    ) {
      return res.status(400).json({
        message: "Name, email, password and location are required.",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered." });
    }

    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true, status: true },
    });
    if (!location || location.status !== "ACTIVE") {
      return res.status(404).json({ message: "Location not found." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = await prisma.$transaction(async (tx) => {
      const role = await tx.role.upsert({
        where: { roleCode: "LOCATION_ADMIN" },
        update: {},
        create: {
          roleName: "Location Admin",
          roleCode: "LOCATION_ADMIN",
          description: "Read access to an assigned location and its places",
        },
      });

      const adminPermissionCodes = [
        "LOCATION.READ",
        "PLACE.READ",
      ];
      await Promise.all(
        adminPermissionCodes.map((code) => {
          const [resource, action] = code.split(".");
          return tx.permission.upsert({
            where: { resource_action: { resource, action } },
            update: {},
            create: { resource, action },
          });
        }),
      );
      const permissions = await tx.permission.findMany({
        where: {
          isActive: true,
          OR: adminPermissionCodes.map((code) => {
            const [resource, action] = code.split(".");
            return { resource, action };
          }),
        },
        select: { id: true },
      });

      await tx.assignedPermission.createMany({
        data: permissions.map(({ id }) => ({
          permissionId: id,
          roleId: role.id,
        })),
        skipDuplicates: true,
      });

      return tx.user.create({
        data: {
          fullName: adminName,
          email: normalizedEmail,
          password: hashedPassword,
          roleId: role.id,
          locationId,
          parentId: req.user.id,
          level: 2,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: {
            select: { id: true, roleName: true, roleCode: true },
          },
          locationId: true,
          location: { select: { id: true, name: true, city: true } },
          isActive: true,
          createdAt: true,
          parent: { select: { id: true, fullName: true, email: true } },
        },
      });
    });

    return res.status(201).json({
      success: true,
      message: "Admin created successfully.",
      data: newAdmin,
    });
  } catch (error) {
    console.error("Create Admin Error:", error);
    if (error?.code === "P2002") {
      return res.status(409).json({ message: "Email already registered." });
    }
    return res.status(500).json({ message: "Unable to create admin." });
  }
};

export const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, fullName, email, password, locationId } = req.body;
    const submittedName = fullName ?? name;
    const adminName =
      typeof submittedName === "string" ? submittedName.trim() : undefined;
    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : undefined;

    if (
      adminName === "" ||
      normalizedEmail === "" ||
      (password !== undefined &&
        (typeof password !== "string" || !password.trim())) ||
      (locationId !== undefined &&
        (typeof locationId !== "string" || !locationId))
    ) {
      return res.status(400).json({ message: "Invalid admin details." });
    }

    const admin = await prisma.user.findFirst({
      where: { id, role: { roleCode: "LOCATION_ADMIN" } },
      select: { id: true },
    });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found." });
    }

    if (normalizedEmail) {
      const duplicate = await prisma.user.findFirst({
        where: { email: normalizedEmail, NOT: { id } },
        select: { id: true },
      });
      if (duplicate) {
        return res.status(409).json({ message: "Email already registered." });
      }
    }

    if (locationId) {
      const location = await prisma.location.findFirst({
        where: { id: locationId, status: "ACTIVE" },
        select: { id: true },
      });
      if (!location) {
        return res.status(404).json({ message: "Active location not found." });
      }
    }

    const updatedAdmin = await prisma.user.update({
      where: { id },
      data: {
        ...(adminName !== undefined ? { fullName: adminName } : {}),
        ...(normalizedEmail !== undefined ? { email: normalizedEmail } : {}),
        ...(locationId !== undefined ? { locationId } : {}),
        ...(password ? { password: await bcrypt.hash(password, 10) } : {}),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        locationId: true,
        location: { select: { id: true, name: true, city: true } },
        createdAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Admin updated successfully.",
      data: {
        id: updatedAdmin.id,
        name: updatedAdmin.fullName,
        email: updatedAdmin.email,
        location: updatedAdmin.location?.name || "—",
        locationId: updatedAdmin.locationId,
        status: updatedAdmin.isActive ? "ACTIVE" : "INACTIVE",
        createdAt: updatedAdmin.createdAt,
      },
    });
  } catch (error) {
    console.error("Update Admin Error:", error);
    if (error?.code === "P2002") {
      return res.status(409).json({ message: "Email already registered." });
    }
    return res.status(500).json({ message: "Unable to update admin." });
  }
};

// ✅ GET ALL ADMINS
export const getAllAdmins = async (req, res) => {
  try {
    const where = {
      role: { roleCode: "LOCATION_ADMIN" },
      ...(req.user.role?.roleCode === "SUPER_ADMIN"
        ? {}
        : { id: req.user.id }),
    };
    const admins = await prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: { select: { roleCode: true } },
        isActive: true,
        locationId: true,
        location: {
          select: { id: true, name: true, city: true },
        },
        parent: {
          select: { id: true, fullName: true, email: true },
        },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedAdmins = admins.map((admin) => ({
      id: admin.id,
      name: admin.fullName,
      email: admin.email,
      location: admin.location?.name || "—",
      locationId: admin.locationId,
      status: admin.isActive ? "ACTIVE" : "INACTIVE",
      createdAt: admin.createdAt,
      createdBy: admin.parent
        ? { id: admin.parent.id, fullName: admin.parent.fullName, email: admin.parent.email }
        : null,
    }));

    return res.status(200).json({ success: true, data: formattedAdmins });
  } catch (error) {
    console.error("Get Admins Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ✅ DELETE ADMIN (Optional)
export const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await prisma.user.findFirst({
      where: { id, role: { roleCode: "LOCATION_ADMIN" } },
      select: { id: true },
    });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found." });
    }

    await prisma.user.delete({ where: { id } });

    return res.status(200).json({
      success: true,
      message: "Admin deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Admin Error:", error);
    return res.status(500).json({ message: error.message });
  }
};