import prisma from "../../src/db/db.js";
import { PermissionsRegistry } from "../../src/lib/PermissionsRegistry.js";

function extractPermissions(registry) {
  const permissions = [];

  for (const resource in registry) {
    const actions = registry[resource];

    if (typeof actions !== "object" || actions === null) {
      continue;
    }

    for (const action in actions) {
      permissions.push({
        resource,
        action,
      });
    }
  }

  return permissions;
}

export async function seedPermissions() {
  const permissions = extractPermissions(PermissionsRegistry);

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: {
        resource_action: {
          resource: permission.resource,
          action: permission.action,
        },
      },

      update: {
        isActive: true,
      },

      create: {
        resource: permission.resource,
        action: permission.action,
        isActive: true,
      },
    });
  }

  console.log(`✅ Seeded ${permissions.length} permissions`);
}