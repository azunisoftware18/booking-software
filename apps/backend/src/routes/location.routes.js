
import { Router } from "express";
import {
  getLocations,
  getBookingLocationOptions,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
} from "../controllers/location.controller.js";
import AuthMiddleware from "../middlewares/auth.middleware.js";
import PermissionMiddleware from "../middlewares/permission.middleware.js";
import { PermissionsRegistry } from "../lib/PermissionsRegistry.js";
import { settingUpload } from "../middlewares/multer.js";

const router = Router();

router.get("/booking-options", getBookingLocationOptions);
router.get(
  "/",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(PermissionsRegistry.LOCATION.READ),
  getLocations,
);
router.get(
  "/:id",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(PermissionsRegistry.LOCATION.READ),
  getLocationById,
);
router.post(
  "/",
  AuthMiddleware.isAuthenticated,
  AuthMiddleware.authorize(["SUPER_ADMIN"]),
  settingUpload.single("image"),
  createLocation,
);
router.patch(
  "/:id",
  AuthMiddleware.isAuthenticated,
  AuthMiddleware.authorize(["SUPER_ADMIN"]),
  settingUpload.single("image"),
  updateLocation,
);
router.delete(
  "/:id",
  AuthMiddleware.isAuthenticated,
  AuthMiddleware.authorize(["SUPER_ADMIN"]),
  deleteLocation,
);

export default router;
