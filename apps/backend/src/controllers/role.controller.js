import RoleService from "../services/role.service.js";
import { ApiError } from "../utils/ApiError.js";

class RoleController {
  // =========================================================
  // CREATE ROLE
  // =========================================================
  static create = async (req, res) => {
    

    const data = await RoleService.createRole({
      ...req.body,
      createdById: req.user.id,
    });

    return res.success(data, "Role created", 201);
  };

  // =========================================================
  // GET ALL ROLES
  // =========================================================
  
static getAll = async (req, res) => {
  const currentUserId = req.user?.id;

  if (!currentUserId) {
    throw ApiError.unauthorized("Authentication required");
  }

  const data = await RoleService.getAllRoles(currentUserId);

  return res.success(data, "Roles fetched");
};


  // =========================================================
  // GET ROLE BY ID
  // =========================================================
  static getById = async (req, res) => {
    const data = await RoleService.getRoleById(
      req.params.id,
      req.user.id,
    );

    return res.success(data, "Role fetched");
  };

  // =========================================================
  // UPDATE ROLE
  // =========================================================
  static update = async (req, res) => {
    

    const data = await RoleService.updateRole(
      req.params.id,
      req.body,
      req.user.id,
    );

    return res.success(data, "Role updated");
  };

  // =========================================================
  // DELETE ROLE
  // =========================================================
  static delete = async (req, res) => {
    await RoleService.deleteRole(
      req.params.id,
      req.user.id,
    );

    return res.success(null, "Role deleted");
  };
}

export default RoleController;