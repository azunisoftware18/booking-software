import { Router } from "express";

import AuthMiddleware from "../middlewares/auth.middleware.js";
import PermissionMiddleware from "../middlewares/permission.middleware.js";
import ValidateRequest from "../middlewares/validateRequest.middleware.js";

import asyncHandler from "../utils/AsyncHandler.js";

import PermissionController from "../controllers/permission.controller.js";
import PermissionValidation from "../validations/permission.validation.js";

import { PermissionsRegistry } from "../lib/PermissionsRegistry.js";

const router = Router();

// =========================================================
// GET ALL PERMISSIONS
// =========================================================

router.get(
  "/",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.PERMISSION.READ
  ),
  asyncHandler(PermissionController.getAllPermissions)
);

// =========================================================
// GET USER PERMISSIONS
// =========================================================

router.get(
  "/user/:userId",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.PERMISSION.READ
  ),
  asyncHandler(PermissionController.getUserPermissions)
);

// =========================================================
// ASSIGN PERMISSION TO USER
// =========================================================

router.post(
  "/user/:userId",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.PERMISSION.ASSIGN
  ),
  ValidateRequest.validate(
    PermissionValidation.assign
  ),
  asyncHandler(
    PermissionController.assignPermissionToUser
  )
);

// =========================================================
// REMOVE PERMISSION FROM USER
// =========================================================

router.delete(
  "/user/:userId/:permissionId",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.PERMISSION.ASSIGN
  ),
  asyncHandler(
    PermissionController.removePermissionFromUser
  )
);

export default router;