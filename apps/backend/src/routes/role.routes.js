import { Router } from "express";

import RoleController from "../controllers/role.controller.js";
import RoleValidation from "../validations/role.validation.js";
import ValidateRequest from "../middlewares/validateRequest.middleware.js";
import AuthMiddleware from "../middlewares/auth.middleware.js";
import asyncHandler from "../utils/AsyncHandler.js";

const router = Router();

// =========================================================
// SUPER_ADMIN ONLY
// =========================================================

// CREATE ROLE
router.post(
  "/",
  AuthMiddleware.isAuthenticated,
  AuthMiddleware.authorize(["SUPER_ADMIN"]),
  ValidateRequest.validate(RoleValidation.create),
  asyncHandler(RoleController.create)
);

// UPDATE ROLE
router.put(
  "/:id",
  AuthMiddleware.isAuthenticated,
  AuthMiddleware.authorize(["SUPER_ADMIN"]),
  ValidateRequest.validate(RoleValidation.update),
  asyncHandler(RoleController.update)
);

// DELETE ROLE
router.delete(
  "/:id",
  AuthMiddleware.isAuthenticated,
  AuthMiddleware.authorize(["SUPER_ADMIN"]),
  asyncHandler(RoleController.delete)
);

// =========================================================
// PUBLIC
// =========================================================

// GET ALL ROLES
router.get(
  "/",
  asyncHandler(RoleController.getAll)
);

// GET ROLE BY ID
router.get(
  "/:id",
  asyncHandler(RoleController.getById)
);

export default router;