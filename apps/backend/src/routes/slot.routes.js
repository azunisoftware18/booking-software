
import { Router } from "express";
import {
  SlotController,
  SlotOverrideController,
  SlotTemplateController,
} from "../controllers/slot.controller.js";

import SlotValidation from "../validations/slot.validation.js";
import ValidateRequest from "../middlewares/validateRequest.middleware.js";
import AuthMiddleware from "../middlewares/auth.middleware.js";
import PermissionMiddleware from "../middlewares/permission.middleware.js";
import asyncHandler from "../utils/AsyncHandler.js";
import { PermissionsRegistry } from "../lib/PermissionsRegistry.js";

const router = Router();

// CREATE SLOT TEMPLATE
router.post(
  "/template",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.SLOT.CREATE
  ),
  ValidateRequest.validate(SlotValidation.createSlot),
  asyncHandler(SlotTemplateController.create)
);

// LIST SLOT TEMPLATES
router.get(
  "/template/:placeId",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.SLOT.READ
  ),
  asyncHandler(SlotTemplateController.list)
);

// UPDATE SLOT TEMPLATE
router.put(
  "/template/:id",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.SLOT.UPDATE
  ),
  ValidateRequest.validate(SlotValidation.updateSlot),
  asyncHandler(SlotTemplateController.update)
);

// DELETE SLOT TEMPLATE
router.delete(
  "/template/:id",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.SLOT.DELETE
  ),
  asyncHandler(SlotTemplateController.delete)
);

// CREATE / UPDATE SLOT OVERRIDE
router.post(
  "/override",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.SLOT.UPDATE
  ),
  asyncHandler(SlotOverrideController.upsert)
);

// GET SLOTS BY PLACE AND DATE
router.get(
  "/slots/:placeId/:date",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.SLOT.READ
  ),
  asyncHandler(SlotController.getByDate)
);

// GET SLOT OVERRIDES BY PLACE AND DATE
router.get(
  "/override/:placeId/:date",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.SLOT.READ
  ),
  asyncHandler(SlotOverrideController.getAll)
);

export default router;
