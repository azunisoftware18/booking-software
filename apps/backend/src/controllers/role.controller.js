import RoleService from "../services/role.service.js";

class RoleController {
  // =========================================================
  // CREATE ROLE
  // =========================================================
  static create = async (req, res) => {
    console.log("=== CREATE ROLE ===");
    console.log("BODY:", req.body);

    const data = await RoleService.createRole(req.body);

    return res.success(data, "Role created", 201);
  };

  // =========================================================
  // GET ALL ROLES
  // =========================================================
  static getAll = async (req, res) => {
    const data = await RoleService.getAllRoles();

    return res.success(data, "Roles fetched");
  };

  // =========================================================
  // GET ROLE BY ID
  // =========================================================
  static getById = async (req, res) => {
    const data = await RoleService.getRoleById(
      req.params.id
    );

    return res.success(data, "Role fetched");
  };

  // =========================================================
  // UPDATE ROLE
  // =========================================================
  static update = async (req, res) => {
    console.log("=== UPDATE ROLE ===");
    console.log("BODY:", req.body);
    console.log("PARAMS:", req.params);

    const data = await RoleService.updateRole(
      req.params.id,
      req.body
    );

    return res.success(data, "Role updated");
  };

  // =========================================================
  // DELETE ROLE
  // =========================================================
  static delete = async (req, res) => {
    await RoleService.deleteRole(
      req.params.id
    );

    return res.success(null, "Role deleted");
  };
}

export default RoleController;