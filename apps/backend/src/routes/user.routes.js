import { Router } from "express";

import ValidateRequest from "../middlewares/validateRequest.middleware.js";
import AuthMiddleware from "../middlewares/auth.middleware.js";
import asyncHandler from "../utils/AsyncHandler.js";
import UserController from "../controllers/user.controller.js";
import UserValidation from "../validations/user.validation.js";

const router = Router();

// =========================================================
// SUPER_ADMIN ONLY
// =========================================================

// CREATE USER
router.post(
  "/",
  AuthMiddleware.isAuthenticated,
  AuthMiddleware.authorize(["SUPER_ADMIN"]),
  ValidateRequest.validate(UserValidation.create),
  asyncHandler(UserController.create)
);

// UPDATE USER
router.put(
  "/:id",
  AuthMiddleware.isAuthenticated,
  AuthMiddleware.authorize(["SUPER_ADMIN"]),
  ValidateRequest.validate(UserValidation.update),
  asyncHandler(UserController.update)
);

// DELETE USER
router.delete(
  "/:id",
  AuthMiddleware.isAuthenticated,
  AuthMiddleware.authorize(["SUPER_ADMIN"]),
  asyncHandler(UserController.delete)
);

// =========================================================
// GET
// =========================================================

// GET ALL USERS
router.get(
  "/",
  AuthMiddleware.isAuthenticated,
  AuthMiddleware.authorize(["SUPER_ADMIN"]),
  asyncHandler(UserController.getAll)
);

// GET USER BY ID
router.get(
  "/:id",
  AuthMiddleware.isAuthenticated,
  AuthMiddleware.authorize(["SUPER_ADMIN"]),
  asyncHandler(UserController.getById)
);

export default router;