
import { Router } from "express";
import PlaceController from "../controllers/place.controller.js";
import PlaceValidation from "../validations/place.validation.js";
import ValidateRequest from "../middlewares/validateRequest.middleware.js";
import AuthMiddleware from "../middlewares/auth.middleware.js";
import PermissionMiddleware from "../middlewares/permission.middleware.js";
import asyncHandler from "../utils/AsyncHandler.js";
import { settingUpload } from "../middlewares/multer.js";
import { PermissionsRegistry } from "../lib/PermissionsRegistry.js";

const router = Router();

// CREATE PLACE
router.post(
  "/",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.PLACE.CREATE
  ),
  settingUpload.single("image"),
  ValidateRequest.validate(PlaceValidation.create),
  asyncHandler(PlaceController.create)
);

// UPDATE PLACE
router.put(
  "/:id",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.PLACE.UPDATE
  ),
  settingUpload.single("image"),
  ValidateRequest.validate(PlaceValidation.update),
  asyncHandler(PlaceController.update)
);

// DELETE PLACE
router.delete(
  "/:id",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.PLACE.DELETE
  ),
  asyncHandler(PlaceController.delete)
);

// GET ALL PLACES
router.get(
  "/",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.PLACE.READ
  ),
  asyncHandler(PlaceController.getAll)
);

// GET PLACE BY ID
router.get(
  "/:id",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.PLACE.READ
  ),
  asyncHandler(PlaceController.getById)
);

export default router;
