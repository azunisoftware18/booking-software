
import { Router } from "express";

import RoleController from "../controllers/role.controller.js";
import RoleValidation from "../validations/role.validation.js";
import ValidateRequest from "../middlewares/validateRequest.middleware.js";
import AuthMiddleware from "../middlewares/auth.middleware.js";
import PermissionMiddleware from "../middlewares/permission.middleware.js";
import asyncHandler from "../utils/AsyncHandler.js";
import { PermissionsRegistry } from "../lib/PermissionsRegistry.js";

const router = Router();

// CREATE ROLE
router.post(
  "/",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.ROLE.CREATE
  ),
  ValidateRequest.validate(RoleValidation.create),
  asyncHandler(RoleController.create)
);

// UPDATE ROLE
router.put(
  "/:id",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.ROLE.UPDATE
  ),
  ValidateRequest.validate(RoleValidation.update),
  asyncHandler(RoleController.update)
);

// DELETE ROLE
router.delete(
  "/:id",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.ROLE.DELETE
  ),
  asyncHandler(RoleController.delete)
);

// GET ALL ROLES
router.get(
  "/",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.ROLE.READ
  ),
  asyncHandler(RoleController.getAll)
);

// GET ROLE BY ID
router.get(
  "/:id",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.ROLE.READ
  ),
  asyncHandler(RoleController.getById)
);

export default router;
