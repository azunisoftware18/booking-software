import "dotenv/config";
import prisma from "../../src/db/db.js";
import bcrypt from "bcryptjs";
import { seedPermissions } from "./permission.seed.js";

async function main() {
  console.log("🌱 Seeding started...");

  const adminEmail = "admin@example.com";

  try {
    // =====================================
    // 1. SEED PERMISSIONS
    // =====================================

    await seedPermissions();

    // =====================================
    // 2. CREATE / GET SUPER ADMIN ROLE
    // =====================================

    let superAdminRole = await prisma.role.findUnique({
      where: {
        roleCode: "SUPER_ADMIN",
      },
    });

    if (!superAdminRole) {
      superAdminRole = await prisma.role.create({
        data: {
          roleName: "Super Admin",
          roleCode: "SUPER_ADMIN",
          description: "Full system administrator with all permissions",
        },
      });

      console.log("✅ Super Admin role created");
    } else {
      console.log("⚠️ Super Admin role already exists");
    }

    // =====================================
    // 3. GET ALL PERMISSIONS
    // =====================================

    const permissions = await prisma.permission.findMany({
      where: {
        isActive: true,
      },
    });

    console.log(`🔐 Found ${permissions.length} active permissions`);

    // =====================================
    // 4. ASSIGN ALL PERMISSIONS TO
    //    SUPER ADMIN ROLE
    // =====================================

    for (const permission of permissions) {
      await prisma.assignedPermission.upsert({
        where: {
          permissionId_roleId: {
            permissionId: permission.id,
            roleId: superAdminRole.id,
          },
        },

        update: {},

        create: {
          permissionId: permission.id,
          roleId: superAdminRole.id,
        },
      });
    }

    console.log(
      `✅ Assigned ${permissions.length} permissions to Super Admin`
    );

    // =====================================
    // 5. CHECK EXISTING ADMIN
    // =====================================

    const existingAdmin = await prisma.user.findUnique({
      where: {
        email: adminEmail,
      },
    });

    // =====================================
    // 6. UPDATE EXISTING ADMIN
    // =====================================

    if (existingAdmin) {
      const updatedAdmin = await prisma.user.update({
        where: {
          id: existingAdmin.id,
        },

        data: {
          role: {
            connect: {
              id: superAdminRole.id,
            },
          },

          // Remove existing place relation
          place: {
            disconnect: true,
          },
        },

        include: {
          role: true,
          place: true,
        },
      });

      console.log("=================================");
      console.log("✅ Existing admin updated");
      console.log("=================================");
      console.log("ID:", updatedAdmin.id);
      console.log("Name:", updatedAdmin.fullName);
      console.log("Email:", updatedAdmin.email);
      console.log("Role:", updatedAdmin.role.roleName);
      console.log("Role Code:", updatedAdmin.role.roleCode);
      console.log("Place:", updatedAdmin.place);
      console.log("=================================");

      return;
    }

    // =====================================
    // 7. HASH PASSWORD
    // =====================================

    const hashedPassword = await bcrypt.hash("Admin@123", 10);

    // =====================================
    // 8. CREATE SUPER ADMIN
    // =====================================

    const admin = await prisma.user.create({
      data: {
        fullName: "Super Admin",
        email: adminEmail,
        phone: "9999999999",
        password: hashedPassword,

        role: {
          connect: {
            id: superAdminRole.id,
          },
        },

        // No place relation
        // place_id will remain NULL
      },

      include: {
        role: true,
        place: true,
      },
    });

    // =====================================
    // 9. SUCCESS
    // =====================================

    console.log("=================================");
    console.log("✅ Super Admin created successfully");
    console.log("=================================");
    console.log("ID:", admin.id);
    console.log("Name:", admin.fullName);
    console.log("Email:", admin.email);
    console.log("Password: Admin@123");
    console.log("Role:", admin.role.roleName);
    console.log("Role Code:", admin.role.roleCode);
    console.log("Place:", admin.place);
    console.log("=================================");
  } catch (error) {
    console.error("❌ Error during seeding:");
    console.error(error);

    throw error;
  }
}

main()
  .catch((error) => {
    console.error("❌ Seeding failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });