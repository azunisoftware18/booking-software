import { Router } from "express";
import ReportController from "../controllers/report.controller.js";
import AuthMiddleware from "../middlewares/auth.middleware.js";
import PermissionMiddleware from "../middlewares/permission.middleware.js";
import { PermissionsRegistry } from "../lib/PermissionsRegistry.js";
import asyncHandler from "../utils/AsyncHandler.js";

const router = Router();

router.get(
  "/analytics",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(PermissionsRegistry.BOOKING.READ),
  asyncHandler(ReportController.analytics),
);

export default router;
