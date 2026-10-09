import { Router } from "express";

import ValidateRequest from "../middlewares/validateRequest.middleware.js";
import AuthMiddleware from "../middlewares/auth.middleware.js";
import PermissionMiddleware from "../middlewares/permission.middleware.js";

import asyncHandler from "../utils/AsyncHandler.js";

import UserController from "../controllers/user.controller.js";
import UserValidation from "../validations/user.validation.js";

import { PermissionsRegistry } from "../lib/PermissionsRegistry.js";

const router = Router();

// =========================================================
// USER PERMISSIONS
// =========================================================

// CREATE USER
router.post(
  "/",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.USER.CREATE
  ),
  ValidateRequest.validate(UserValidation.create),
  asyncHandler(UserController.create)
);

// UPDATE USER
router.put(
  "/:id",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.USER.UPDATE
  ),
  ValidateRequest.validate(UserValidation.update),
  asyncHandler(UserController.update)
);

// DELETE USER
router.delete(
  "/:id",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.USER.DELETE
  ),
  asyncHandler(UserController.delete)
);

// =========================================================
// GET
// =========================================================

// GET ALL USERS
router.get(
  "/",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.USER.READ
  ),
  asyncHandler(UserController.getAll)
);

// GET USER BY ID
router.get(
  "/:id",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.USER.READ
  ),
  asyncHandler(UserController.getById)
);

export default router;