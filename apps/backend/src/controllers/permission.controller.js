import PermissionService from "../services/permission.service.js";

class PermissionController {
  // =========================================================
  // GET ALL PERMISSIONS
  // =========================================================

  static getAllPermissions = async (req, res) => {
    const permissions =
      await PermissionService.getAllPermissions();

    return res.status(200).json({
      success: true,
      message: "Permissions fetched successfully",
      data: permissions,
    });
  };

  // =========================================================
  // GET USER PERMISSIONS
  // =========================================================

  static getUserPermissions = async (req, res) => {
    const { userId } = req.params;

    const data =
      await PermissionService.getUserPermissions(userId);

    return res.status(200).json({
      success: true,
      message: "User permissions fetched successfully",
      data,
    });
  };

  // =========================================================
  // ASSIGN PERMISSION TO USER
  // =========================================================

  static assignPermissionToUser = async (req, res) => {
    const { userId } = req.params;
    const { permissionId } = req.body;

    const assignedPermission =
      await PermissionService.assignPermissionToUser(
        userId,
        permissionId
      );

    return res.status(201).json({
      success: true,
      message: "Permission assigned successfully",
      data: assignedPermission,
    });
  };

  // =========================================================
  // REMOVE PERMISSION FROM USER
  // =========================================================

  static removePermissionFromUser = async (req, res) => {
    const { userId, permissionId } = req.params;

    const result =
      await PermissionService.removePermissionFromUser(
        userId,
        permissionId
      );

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  };
}

export default PermissionController;