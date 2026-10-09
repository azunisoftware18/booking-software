import { z } from "zod";

class PermissionValidation {
  static assign = z.object({
    permissionId: z
      .string()
      .uuid("Invalid permission ID"),
  });
}

export default PermissionValidation;