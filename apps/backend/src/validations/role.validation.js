import { z } from "zod";

class RoleValidation {
  static get create() {
    return z.object({
      roleName: z
        .string()
        .min(2, "Role name required"),

      roleCode: z
        .string()
        .min(2, "Role code required"),

      description: z
        .string()
        .min(0, "Description must be at least 10 characters")
        .optional(),
    });
  }

  static get update() {
    return z.object({
      roleName: z
        .string()
        .min(2, "Role name required")
        .optional(),

      roleCode: z
        .string()
        .min(2, "Role code required")
        .optional(),

      description: z
        .string()
        .min(0, "Description must be at least 10 characters")
        .optional(),
    });
  }
}

export default RoleValidation;