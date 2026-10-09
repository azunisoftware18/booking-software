
import { Router } from "express";
import AuthMiddleware from "../middlewares/auth.middleware.js";
import PermissionMiddleware from "../middlewares/permission.middleware.js";
import asyncHandler from "../utils/AsyncHandler.js";
import AddonController from "../controllers/addon.controller.js";
import { PermissionsRegistry } from "../lib/PermissionsRegistry.js";

const router = Router();

// CREATE ADDON
router.post(
  "/",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.ADDON.CREATE
  ),
  asyncHandler(AddonController._handle_)
);

export default router;
