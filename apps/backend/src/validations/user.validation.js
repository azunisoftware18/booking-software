import { z } from "zod";

class UserValidation {
  // =========================================================
  // CREATE USER
  // =========================================================
  static get create() {
    return z.object({
      fullName: z
        .string()
        .min(2, "Full name required"),

      email: z
        .string()
        .email("Invalid email"),

      password: z
        .string()
        .min(6, "Password must be at least 6 characters"),

      phone: z
        .string()
        .min(10, "Phone number must be at least 10 characters")
        .optional(),

      roleId: z
        .string()
        .min(1, "Role is required"),

      placeId: z
        .string()
        .min(1, "Place is required"),
    });
  }

  // =========================================================
  // UPDATE USER
  // =========================================================
  static get update() {
    return z.object({
      fullName: z
        .string()
        .min(2, "Full name required")
        .optional(),

      email: z
        .string()
        .email("Invalid email")
        .optional(),

      password: z
        .string()
        .min(6, "Password must be at least 6 characters")
        .optional(),

      phone: z
        .string()
        .min(10, "Phone number must be at least 10 characters")
        .optional(),

      roleId: z
        .string()
        .min(1, "Role is required")
        .optional(),

      placeId: z
        .string()
        .min(1, "Place is required")
        .optional(),
    });
  }
}

export default UserValidation;