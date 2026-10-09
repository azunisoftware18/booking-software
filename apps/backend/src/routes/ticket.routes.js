
import { Router } from "express";
import TicketController from "../controllers/ticket.controller.js";
import asyncHandler from "../utils/AsyncHandler.js";
import AuthMiddleware from "../middlewares/auth.middleware.js";
import PermissionMiddleware from "../middlewares/permission.middleware.js";
import TicketValidation from "../validations/ticket.validation.js";
import ValidateRequest from "../middlewares/validateRequest.middleware.js";
import { PermissionsRegistry } from "../lib/PermissionsRegistry.js";

const router = Router();

// SCAN TICKET
router.post(
  "/scan",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.TICKET.SCAN
  ),
  ValidateRequest.validate(TicketValidation.scanTicket),
  asyncHandler(TicketController.scanTicket)
);

// GET ALL TICKETS
router.get(
  "/",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.TICKET.READ
  ),
  asyncHandler(TicketController.getAll)
);

// DOWNLOAD TICKET
router.get(
  "/download/:bookingId",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.TICKET.READ
  ),
  asyncHandler(TicketController.download)
);

export default router;
