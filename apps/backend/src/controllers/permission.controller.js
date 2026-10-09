
import PermissionService from "../services/permission.service.js";

class PermissionController {
  // =========================================================
  // GET ALL PERMISSIONS
  // =========================================================


  static getAllPermissions = async (req, res) => {
    const permissions =
      await PermissionService.getAllPermissions(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Your permissions fetched successfully",
      data: permissions,
    });
  };

  static getAllAvailablePermissions = async (req, res) => {
    const permissions =
      await PermissionService.getAllAvailablePermissions();

    return res.status(200).json({
      success: true,
      message: "All active permissions fetched successfully",
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
  // GET PERMISSIONS ASSIGNABLE TO TARGET USER
  // =========================================================

  static getAssignablePermissions = async (req, res) => {
    const { userId } = req.params;

    const permissions =
      await PermissionService.getAssignablePermissions(
        req.user.id,
        userId
      );

    return res.status(200).json({
      success: true,
      message: "Assignable permissions fetched successfully",
      data: permissions,
    });
  };

  // =========================================================
  // ASSIGN SINGLE PERMISSION
  // =========================================================

  static assignPermissionToUser = async (req, res) => {
    const { userId } = req.params;
    const { permissionId } = req.body;

    const assignedPermission =
      await PermissionService.assignPermissionToUser(
        userId,
        permissionId,
        req.user.id
      );

    return res.status(201).json({
      success: true,
      message: "Permission assigned successfully",
      data: assignedPermission,
    });
  };

  // =========================================================
  // REMOVE SINGLE PERMISSION
  // =========================================================

  static removePermissionFromUser = async (req, res) => {
    const { userId, permissionId } = req.params;

    const result =
      await PermissionService.removePermissionFromUser(
        userId,
        permissionId,
        req.user.id
      );

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  };

  // =========================================================
  // BULK ASSIGN + REMOVE
  // =========================================================

  static bulkUpdateUserPermissions = async (req, res) => {
    const { userId } = req.params;

    const result =
      await PermissionService.bulkUpdateUserPermissions(
        req.user.id,
        userId,
        req.body
      );

    return res.status(200).json({
      success: true,
      message: "Permissions updated successfully",
      data: result,
    });
  };
}

export default PermissionController;
