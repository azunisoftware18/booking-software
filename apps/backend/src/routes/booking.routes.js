
import { Router } from "express";
import BookingController from "../controllers/booking.controller.js";
import BookingValidation from "../validations/booking.validation.js";
import ValidateRequest from "../middlewares/validateRequest.middleware.js";
import AuthMiddleware from "../middlewares/auth.middleware.js";
import PermissionMiddleware from "../middlewares/permission.middleware.js";
import asyncHandler from "../utils/AsyncHandler.js";
import { PermissionsRegistry } from "../lib/PermissionsRegistry.js";

const router = Router();

/**
 * Create Booking
 * Guest: UPI allowed, CASH rejected by BookingService
 * Logged-in: UPI and CASH allowed
 */
router.post(
  "/",
  AuthMiddleware.optionalAuthentication,
  ValidateRequest.validate(BookingValidation.createBooking),
  asyncHandler(BookingController.create)
);

/**
 * Easebuzz payment success callback
 * No authentication required
 */
router.post(
  "/success",
  ValidateRequest.validate(BookingValidation.paymentSuccess),
  asyncHandler(BookingController.success)
);

/**
 * Easebuzz payment failure callback
 * No authentication required
 */
router.post(
  "/failure",
  ValidateRequest.validate(BookingValidation.paymentFailure),
  asyncHandler(BookingController.failure)
);

/**
 * Cancel booking
 * Login required
 */
router.post(
  "/cancel/:id",
  AuthMiddleware.isAuthenticated,
  asyncHandler(BookingController.cancelBooking)
);

/**
 * Get all bookings
 * Requires BOOKING.READ permission
 */
router.get(
  "/all",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(
    PermissionsRegistry.BOOKING.READ
  ),
  asyncHandler(BookingController.getAll)
);

/**
 * Get booking by ID
 * Login required
 */
router.get(
  "/:id",
  AuthMiddleware.isAuthenticated,
  asyncHandler(BookingController.getById)
);

export default router;
