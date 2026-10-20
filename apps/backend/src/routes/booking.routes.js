
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
 * Guests can use Online payment; signed-in users may choose any method.
 */
router.post(
  "/",
  AuthMiddleware.optionalAuthentication,
  ValidateRequest.validate(BookingValidation.createBooking),
  asyncHandler(BookingController.create)
);

/**
 * ATOM encrypted payment response
 * No authentication required
 */
router.post(
  "/atom-response",
  ValidateRequest.validate(BookingValidation.atomResponse),
  asyncHandler(BookingController.atomResponse),
);

router.get(
  "/receipt/:id",
  ValidateRequest.validate(BookingValidation.publicReceipt),
  asyncHandler(BookingController.getPublicReceipt),
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

router.get(
  "/:id/refund-quote",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(PermissionsRegistry.BOOKING.READ),
  ValidateRequest.validate(BookingValidation.bookingIdParam),
  asyncHandler(BookingController.getAnnexureRefundQuote),
);

router.post(
  "/:id/refund",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(PermissionsRegistry.BOOKING.READ),
  ValidateRequest.validate(BookingValidation.annexureRefund),
  asyncHandler(BookingController.processAnnexureRefund),
);

router.get(
  "/:id/refund-receipt",
  AuthMiddleware.isAuthenticated,
  PermissionMiddleware.hasPermission(PermissionsRegistry.BOOKING.READ),
  ValidateRequest.validate(BookingValidation.bookingIdParam),
  asyncHandler(BookingController.downloadAnnexureRefundReceipt),
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
