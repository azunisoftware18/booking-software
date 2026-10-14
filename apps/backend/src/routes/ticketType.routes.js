
import { Router } from "express";
import AuthMiddleware from "../middlewares/auth.middleware.js";
import PermissionMiddleware from "../middlewares/permission.middleware.js";
import asyncHandler from "../utils/AsyncHandler.js";
import TicketTypeController from "../controllers/ticketType.controller.js";
import { PermissionsRegistry } from "../lib/PermissionsRegistry.js";
import { ApiError } from "../utils/ApiError.js";

const router = Router();

const denySuperAdminWrites = (req, res, next) => {
  const writeActions = ["create", "update", "delete", "upsert"];

  if (
    req.user?.role?.roleCode === "SUPER_ADMIN" &&
    writeActions.includes(req.body?.action)
  ) {
    return next(ApiError.forbidden("Super Admin can only view entry fees"));
  }

  return next();
};

// CREATE TICKET TYPE
router.post(
  "/",
  AuthMiddleware.isAuthenticated,
  denySuperAdminWrites,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.TICKET_TYPE.CREATE
  ),
  asyncHandler(TicketTypeController.handle)
);

// PUBLIC TICKET TYPE ROUTE
router.post(
  "/public",
  AuthMiddleware.optionalAuthentication,
  asyncHandler(TicketTypeController.handle)
);

export default router;
