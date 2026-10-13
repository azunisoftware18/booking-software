
import { Router } from "express";
import {
  getLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
} from "../controllers/location.controller.js";
import AuthMiddleware from "../middlewares/auth.middleware.js";
import PermissionMiddleware from "../middlewares/permission.middleware.js";
import { PermissionsRegistry } from "../lib/PermissionsRegistry.js";

const router = Router();

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
  createLocation,
);
router.patch(
  "/:id",
  AuthMiddleware.isAuthenticated,
  AuthMiddleware.authorize(["SUPER_ADMIN"]),
  updateLocation,
);
router.delete(
  "/:id",
  AuthMiddleware.isAuthenticated,
  AuthMiddleware.authorize(["SUPER_ADMIN"]),
  deleteLocation,
);

export default router;