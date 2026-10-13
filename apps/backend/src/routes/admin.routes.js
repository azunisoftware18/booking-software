import express from "express";
import {
  createAdmin,
  updateAdmin,
  getAllAdmins,
  deleteAdmin,
} from "../controllers/adminController.js";
import AuthMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/all", AuthMiddleware.isAuthenticated, getAllAdmins);
router.post(
  "/create",
  AuthMiddleware.isAuthenticated,
  AuthMiddleware.authorize(["SUPER_ADMIN"]),
  createAdmin,
);
router.patch(
  "/:id",
  AuthMiddleware.isAuthenticated,
  AuthMiddleware.authorize(["SUPER_ADMIN"]),
  updateAdmin,
);
router.delete(
  "/:id",
  AuthMiddleware.isAuthenticated,
  AuthMiddleware.authorize(["SUPER_ADMIN"]),
  deleteAdmin,
);

export default router;
