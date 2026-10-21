
import { Router } from "express";
import {
  getSetting,
  updateSetting,
} from "../controllers/setting.controller.js";

import AuthMiddleware from "../middlewares/auth.middleware.js";
import PermissionMiddleware from "../middlewares/permission.middleware.js";
import { settingUpload } from "../middlewares/multer.js";
import { PermissionsRegistry } from "../lib/PermissionsRegistry.js";

const router = Router();

// PUBLIC — GET SETTINGS
router.get("/", getSetting);

// UPDATE SETTINGS
router.put(
  "/",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.SETTING.UPDATE
  ),
  settingUpload.fields([
    { name: "logo", maxCount: 1 },
    { name: "favicon", maxCount: 1 },
  ]),
  updateSetting
);

export default router;
