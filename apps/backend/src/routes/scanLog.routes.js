
import { Router } from "express";
import asyncHandler from "../utils/AsyncHandler.js";
import ScanLogController from "../controllers/scanLog.controller.js";
import AuthMiddleware from "../middlewares/auth.middleware.js";
import PermissionMiddleware from "../middlewares/permission.middleware.js";
import { PermissionsRegistry } from "../lib/PermissionsRegistry.js";

const router = Router();

// GET ALL SCAN LOGS
router.get(
  "/",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.SCAN_LOG.READ
  ),
  asyncHandler(ScanLogController.getAll)
);

export default router;
