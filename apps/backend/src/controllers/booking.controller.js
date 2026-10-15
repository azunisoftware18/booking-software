import BookingService from "../services/booking.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { envConfig } from "../config/env.config.js";

class BookingController {
  // ============================================================
  // CREATE BOOKING
  // ============================================================
  static create = async (req, res) => {
    const data = await BookingService.createBooking(req.body, req.user);

    // Cash Booking
    if (data.isCashBooking) {
      return res.status(201).json(
        ApiResponse.success(
          {
            bookingId: data.booking.id,
            paymentMethod: data.booking.paymentMethod,
            status: data.booking.status,
            ticketPdfUrl: data.booking.ticketPdfUrl,
            payment: null,
          },
          "Cash booking successful"
        )
      );
    }

    // UPI / Online Booking
    return res.status(200).json(
      ApiResponse.success(
        {
          bookingId: data.booking.id,
          paymentMethod: data.booking.paymentMethod,
          status: data.booking.status,
          payment: data.payment,
        },
        "Booking initiated"
      )
    );
  };

  static atomResponse = async (req, res) => {
    const result = await BookingService.processAtomResponse(req.body);
    const frontendUrl = envConfig.FRONTEND_URL;
    if (!frontendUrl) {
      throw new Error("FRONTEND_URL must be configured for ATOM payment callbacks");
    }

    if (result.isSuccessful) {
      const receiptToken = BookingService.createReceiptToken(result.booking.id);
      return res.redirect(
        `${frontendUrl.replace(/\/+$/, "")}/payment-success?bookingId=${result.booking.id}&receiptToken=${receiptToken}`,
      );
    }

    return res.redirect(`${frontendUrl.replace(/\/+$/, "")}/payment-failure`);
  };

  // ============================================================
  // GET ALL BOOKINGS
  // ============================================================
  static getAll = async (req, res) => {
    const data = await BookingService.getAllBookings();

    return res.json(ApiResponse.success(data, "Bookings fetched"));
  };

  // ============================================================
  // GET BOOKING BY ID
  // ============================================================
  static getById = async (req, res) => {
    const id = req.params.id.trim();

    const data = await BookingService.getBookingById(id);

    return res.json(ApiResponse.success(data, "Booking fetched"));
  };

  static getPublicReceipt = async (req, res) => {
    const data = await BookingService.getPublicReceipt(
      req.params.id,
      req.query.receiptToken,
    );

    return res.json(ApiResponse.success(data, "Payment receipt fetched"));
  };

  // ============================================================
  // CANCEL BOOKING
  // ============================================================
  static cancelBooking = async (req, res) => {
    const { id } = req.params;

    await BookingService.cancelBooking(id, req.user);

    return res.json(ApiResponse.success(null, "Booking cancelled"));
  };
}

export default BookingController;