
import { z } from "zod";

export const createLocationSchema = z.object({
  name: z.string().trim().min(2, "Location name must be at least 2 characters").max(100),
  description: z.string().trim().max(2000).optional().nullable(),
  address: z.string().trim().max(255).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  state: z.string().trim().max(100).optional().nullable(),
  email: z
    .union([
      z.string().trim().email("Enter a valid email address").max(191),
      z.literal(""),
    ])
    .optional()
    .nullable(),
  contactNumber: z.string().trim().max(10).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const updateLocationSchema = createLocationSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });