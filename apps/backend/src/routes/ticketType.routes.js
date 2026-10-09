
import { Router } from "express";
import AuthMiddleware from "../middlewares/auth.middleware.js";
import PermissionMiddleware from "../middlewares/permission.middleware.js";
import asyncHandler from "../utils/AsyncHandler.js";
import TicketTypeController from "../controllers/ticketType.controller.js";
import { PermissionsRegistry } from "../lib/PermissionsRegistry.js";

const router = Router();

// CREATE TICKET TYPE
router.post(
  "/",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.TICKET_TYPE.CREATE
  ),
  asyncHandler(TicketTypeController.handle)
);

// PUBLIC TICKET TYPE ROUTE
router.post(
  "/public",
  asyncHandler(TicketTypeController.handle)
);

export default router;
