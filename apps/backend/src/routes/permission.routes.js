
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
// GET ALL ACTIVE PERMISSIONS
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
// GET USER'S EFFECTIVE PERMISSIONS
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
// GET PERMISSIONS THAT CAN BE ASSIGNED TO TARGET USER
// =========================================================

router.get(
  "/user/:userId/assignable",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.PERMISSION.ASSIGN
  ),
  asyncHandler(PermissionController.getAssignablePermissions)
);

// =========================================================
// BULK ASSIGN + REMOVE PERMISSIONS
// =========================================================

router.put(
  "/user/:userId",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.PERMISSION.ASSIGN
  ),
  asyncHandler(PermissionController.bulkUpdateUserPermissions)
);

// =========================================================
// ASSIGN SINGLE PERMISSION (EXISTING API)
// =========================================================

router.post(
  "/user/:userId",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.PERMISSION.ASSIGN
  ),
  ValidateRequest.validate(PermissionValidation.assign),
  asyncHandler(PermissionController.assignPermissionToUser)
);

// =========================================================
// REMOVE SINGLE PERMISSION (EXISTING API)
// =========================================================

router.delete(
  "/user/:userId/:permissionId",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.PERMISSION.ASSIGN
  ),
  asyncHandler(PermissionController.removePermissionFromUser)
);

export default router;
