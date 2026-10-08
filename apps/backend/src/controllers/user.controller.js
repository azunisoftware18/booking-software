import UserService from "../services/user.service.js";

class UserController {
  // =========================================================
  // CREATE USER
  // =========================================================
  static create = async (req, res) => {
    console.log("=== CREATE USER ===");
    console.log("BODY:", req.body);

    const data = await UserService.createUser(req.body);

    return res.success(data, "User created", 201);
  };

  // =========================================================
  // GET ALL USERS
  // =========================================================
  static getAll = async (req, res) => {
    const data = await UserService.getAllUsers();

    return res.success(data, "Users fetched");
  };

  // =========================================================
  // GET USER BY ID
  // =========================================================
  static getById = async (req, res) => {
    const data = await UserService.getUserById(
      req.params.id
    );

    return res.success(data, "User fetched");
  };

  // =========================================================
  // UPDATE USER
  // =========================================================
  static update = async (req, res) => {
    console.log("=== UPDATE USER ===");
    console.log("BODY:", req.body);
    console.log("PARAMS:", req.params);

    const data = await UserService.updateUser(
      req.params.id,
      req.body
    );

    return res.success(data, "User updated");
  };

  // =========================================================
  // DELETE USER
  // =========================================================
  static delete = async (req, res) => {
    await UserService.deleteUser(
      req.params.id
    );

    return res.success(null, "User deleted");
  };
}

export default UserController;