import BookingService from "../services/booking.service.js";
import TicketService from "../services/ticket.service.js";
import EmailService from "../services/Email.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { envConfig } from "../config/env.config.js";

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });

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
    const data = await BookingService.getAllBookings(req.user);

    return res.json(ApiResponse.success(data, "Bookings fetched"));
  };

  // ============================================================
  // GET BOOKING BY ID
  // ============================================================
  static getById = async (req, res) => {
    const id = req.params.id.trim();

    const data = await BookingService.getBookingById(id, req.user);

    return res.json(ApiResponse.success(data, "Booking fetched"));
  };

  static getPublicReceipt = async (req, res) => {
    const data = await BookingService.getPublicReceipt(
      req.params.id,
      req.query.receiptToken,
    );

    return res.json(ApiResponse.success(data, "Payment receipt fetched"));
  };

  static getAnnexureRefundQuote = async (req, res) => {
    const data = await BookingService.getAnnexureRefundQuote(
      req.params.id,
      req.user,
    );

    return res.json(ApiResponse.success(data, "Refund quote calculated"));
  };

  static processAnnexureRefund = async (req, res) => {
    const { booking, refundDetails } =
      await BookingService.processAnnexureRefund(
        req.params.id,
        req.body,
        req.user,
      );
    let receiptEmailSent = false;
    try {
      const pdfBuffer = await TicketService.generateAnnexureRefundPDF(booking);
      const emailInfo = await EmailService.sendMail({
        to: booking.email,
        subject: "Annexure booking refund receipt",
        html: `<p>Dear ${escapeHtml(booking.name)},</p><p>Your Annexure booking settlement has been recorded. Refund amount: <strong>Rs ${Number(refundDetails.refundAmount).toFixed(2)}</strong>. Amount to collect: <strong>Rs ${Number(refundDetails.collectionAmount).toFixed(2)}</strong>. The itemized calculation receipt is attached.</p>`,
        attachments: [
          {
            filename: `refund-receipt-${booking.id}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ],
      });
      receiptEmailSent = Boolean(emailInfo);
    } catch (error) {
      console.error("Refund was recorded, but receipt email failed:", error);
    }

    return res.json(
      ApiResponse.success(
        {
          refundAmount: refundDetails.refundAmount,
          collectionAmount: refundDetails.collectionAmount,
          receiptEmailSent,
        },
        "Refund recorded and receipt generated",
      ),
    );
  };

  static downloadAnnexureRefundReceipt = async (req, res) => {
    const booking = await BookingService.getBookingById(
      req.params.id,
      req.user,
    );
    const pdfBuffer = await TicketService.generateAnnexureRefundPDF(booking);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=refund-receipt-${booking.id}.pdf`,
    );
    return res.send(pdfBuffer);
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