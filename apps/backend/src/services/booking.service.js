import prisma from "../db/db.js";
import crypto from "node:crypto";
import QRCode from "qrcode";
import { ApiError } from "../utils/ApiError.js";
import { envConfig } from "../config/env.config.js";
import TicketService from "./ticket.service.js";

import fs from "fs";
import os from "os";
import path from "path";

import { upload } from "../utils/s3Service.js";
import WhatsappService from "./whatsapp.service.js";
import EmailService from "./Email.service.js";

class BookingService {
  // ============================================================
  // CREATE BOOKING
  // ============================================================

  static async createBooking(payload, user) {
    const {
      placeId,
      locationId,
      slotDateTime,
      tickets,
      name,
      email,
      phone,
      bookingType = "TICKET",
      paymentMethod = "UPI",
    } = payload;

    // ------------------------------------------------------------
    // BASIC VALIDATION
    // ------------------------------------------------------------

    if (!placeId) {
      throw ApiError.badRequest("Place ID is required");
    }

    if (!locationId) {
      throw ApiError.badRequest("Please select a location before booking");
    }

    if (!slotDateTime) {
      throw ApiError.badRequest("Slot date and time are required");
    }

    if (!Array.isArray(tickets) || tickets.length === 0) {
      throw ApiError.badRequest("At least one ticket is required");
    }

    if (!name || !email || !phone) {
      throw ApiError.badRequest("Name, email and phone are required");
    }

    if (!["CASH", "UPI", "ONLINE"].includes(paymentMethod)) {
      throw ApiError.badRequest("Invalid payment method");
    }

    // Guest user ke liye ONLY ONLINE allowed
    if (!user?.id && paymentMethod !== "ONLINE") {
      throw ApiError.unauthorized("Guest users can only use Online payment");
    }

    const txnId = "TXN_" + Date.now();

    // 🔥 Ab expiry ki zaroorat nahi — booking turant complete hogi
    const expiresAt = null;

    const booking = await prisma.$transaction(
      async (tx) => {
        const selectedLocation = await tx.location.findFirst({
          where: {
            id: locationId,
            status: "ACTIVE",
          },
          select: { id: true },
        });

        if (!selectedLocation) {
          throw ApiError.badRequest(
            "Selected location is invalid or no longer available"
          );
        }

        // --------------------------------------------------------
        // TICKET TYPES
        // --------------------------------------------------------

        const typeIds = tickets.map((ticket) => ticket.typeId);

        const ticketTypes = await tx.ticketType.findMany({
          where: {
            id: {
              in: typeIds,
            },
          },
        });

        if (!ticketTypes.length) {
          throw ApiError.badRequest("Invalid ticket types");
        }

        // Make sure every requested ticket type exists
        if (ticketTypes.length !== typeIds.length) {
          throw ApiError.badRequest("One or more ticket types are invalid");
        }

        // --------------------------------------------------------
        // CALCULATE TICKET TOTAL
        // --------------------------------------------------------

        let totalAmount = 0;
        let totalSeats = 0;

        tickets.forEach((ticket) => {
          const type = ticketTypes.find((item) => item.id === ticket.typeId);

          if (!type) {
            throw ApiError.badRequest("Invalid ticket type");
          }

          if (!type.isAvailable) {
            throw ApiError.badRequest(
              `${type.name} is not available at this center`
            );
          }

          const quantity = Number(ticket.quantity);

          if (!Number.isInteger(quantity) || quantity <= 0) {
            throw ApiError.badRequest("Invalid ticket quantity");
          }

          const unitAmount =
            Math.round(type.price * (1 + (type.taxPercent || 0) / 100) * 100) /
            100;
          totalAmount += unitAmount * quantity;
          totalSeats += quantity;
        });

        // --------------------------------------------------------
        // SLOT CAPACITY
        // --------------------------------------------------------

        const slotDate = new Date(slotDateTime);

        if (Number.isNaN(slotDate.getTime())) {
          throw ApiError.badRequest("Invalid slot date/time");
        }

        const capacity = await this.getSlotCapacity(tx, placeId, slotDateTime);

        // --------------------------------------------------------
        // EXISTING BOOKINGS
        // --------------------------------------------------------

        const activeBookings = await tx.booking.findMany({
          where: {
            placeId,
            slotDateTime: slotDate,
            OR: [
              {
                status: "PAID",
              },
              {
                status: "PENDING",
                expiresAt: {
                  gt: new Date(),
                },
              },
            ],
          },
        });

        const usedSeats = activeBookings.reduce(
          (sum, booking) => sum + booking.totalSeats,
          0
        );

        const availableSeats = capacity - usedSeats;

        if (totalSeats > availableSeats) {
          throw ApiError.badRequest(
            `Not enough seats available. Only ${Math.max(
              availableSeats,
              0
            )} seats remaining`
          );
        }

        // --------------------------------------------------------
        // CREATE BOOKING
        // 🔥 Status ab PENDING rakha hai — completeBooking isko PAID karega
        // --------------------------------------------------------

        const createdBooking = await tx.booking.create({
          data: {
            userId: user?.id || null,
            placeId,
            locationId: selectedLocation.id,
            slotDateTime: slotDate,
            bookingType,
            name,
            email,
            phone,
            paymentMethod,
            totalAmount,
            totalSeats,

            // CASH / UPI direct complete honge
            // ONLINE payment ke liye PENDING rahega
            status: paymentMethod === "ONLINE" ? "PENDING" : "PAID",

            expiresAt,
            txnId,

            ticketPayload: tickets,
          },
        });

        return createdBooking;
      },
      {
        isolationLevel: "Serializable",
      }
    );

    // ============================================================
    // CASH / UPI
    // ============================================================
    // Logged-in user ke CASH / UPI booking ko direct complete karo.

    if (paymentMethod === "CASH" || paymentMethod === "UPI") {
      const completedBooking = await this.completeBooking(booking.id, null);

      return {
        booking: completedBooking,
        payment: null,
        isCashBooking: paymentMethod === "CASH",
        isOnlinePayment: false,
      };
    }

    // ============================================================
    // ONLINE → PG
    // ============================================================

    if (paymentMethod === "ONLINE") {
      const AtomPaymentService = (await import("./atom-payment.service.js"))
        .default;
      try {
        const payment = await AtomPaymentService.initiatePayment({
          bookingId: booking.id,
          txnId: booking.txnId,
          amount: Number(booking.totalAmount).toFixed(2),
          name: booking.name,
          email: booking.email,
          phone: booking.phone,
        });
        return {
          booking,
          isCashBooking: false,
          isOnlinePayment: true,
          payment,
        };
      } catch (error) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { status: "FAILED" },
        });
        throw error;
      }
    }
  }

  static async processAtomResponse(formData) {
    const AtomPaymentService = (await import("./atom-payment.service.js"))
      .default;
    let response;

    try {
      response = AtomPaymentService.decodeCallback(formData.encData);
    } catch {
      throw ApiError.badRequest("Unable to verify ATOM payment response");
    }

    if (!AtomPaymentService.verifyCallbackSignature(response)) {
      throw ApiError.badRequest("Invalid ATOM payment signature");
    }

    const instrument = response.payInstrument;
    const { merchDetails, payDetails, responseDetails } = instrument;
    if (String(merchDetails.merchId) !== String(envConfig.ATOM_MERCHANT_ID)) {
      throw ApiError.badRequest("ATOM merchant ID does not match");
    }

    const booking = await prisma.booking.findUnique({
      where: { txnId: String(merchDetails.merchTxnId) },
    });
    if (!booking || booking.paymentMethod !== "ONLINE") {
      throw ApiError.notFound("Online booking not found");
    }

    if (
      Number(payDetails.totalAmount).toFixed(2) !==
      Number(booking.totalAmount).toFixed(2)
    ) {
      throw ApiError.badRequest("ATOM payment amount does not match booking");
    }

    if (responseDetails.statusCode === "OTS0000") {
      return {
        booking: await this.completeBooking(
          booking.id,
          String(payDetails.atomTxnId)
        ),
        isSuccessful: true,
      };
    }

    if (booking.status === "PENDING") {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: "FAILED" },
      });
    }

    return { booking, isSuccessful: false };
  }

  static createReceiptToken(bookingId) {
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const payload = `${bookingId}.${expiresAt}`;
    const signature = crypto
      .createHmac("sha256", envConfig.QR_SECRET)
      .update(payload)
      .digest("hex");

    return `${Buffer.from(payload).toString("base64url")}.${signature}`;
  }

  static isValidReceiptToken(bookingId, token) {
    if (!envConfig.QR_SECRET || typeof token !== "string") return false;

    const [encodedPayload, receivedSignature] = token.split(".");
    if (!encodedPayload || !receivedSignature) return false;

    let payload;
    try {
      payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
    } catch {
      return false;
    }

    const [tokenBookingId, expiresAt] = payload.split(".");
    if (
      tokenBookingId !== bookingId ||
      !Number.isFinite(Number(expiresAt)) ||
      Number(expiresAt) <= Date.now()
    ) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac("sha256", envConfig.QR_SECRET)
      .update(payload)
      .digest();
    const receivedSignatureBuffer = Buffer.from(receivedSignature, "hex");

    return (
      receivedSignatureBuffer.length === expectedSignature.length &&
      crypto.timingSafeEqual(receivedSignatureBuffer, expectedSignature)
    );
  }

  static async getPublicReceipt(bookingId, receiptToken) {
    if (!this.isValidReceiptToken(bookingId, receiptToken)) {
      throw ApiError.unauthorized("Invalid or expired payment receipt link");
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        totalSeats: true,
        slotDateTime: true,
        ticketPdfUrl: true,
        place: {
          select: {
            name: true,
            location: true,
          },
        },
      },
    });

    if (!booking || booking.status !== "PAID") {
      throw ApiError.notFound("Paid booking not found");
    }

    return booking;
  }

  static async completeBooking(bookingId, paymentId = null) {
    const booking = await prisma.booking.findUnique({
      where: {
        id: bookingId,
      },
      include: {
        place: true,
        tickets: true,
      },
    });

    if (!booking) {
      throw ApiError.notFound("Booking not found");
    }

    // ----------------------------------------------------------
    // ALREADY COMPLETED
    // ----------------------------------------------------------

    if (booking.status === "PAID" && booking.ticketPdfUrl) {
      return booking;
    }

    // ----------------------------------------------------------
    // UPDATE PAYMENT STATUS
    // ----------------------------------------------------------

    let updatedBooking = booking;

    if (booking.status !== "PAID") {
      updatedBooking = await prisma.booking.update({
        where: {
          id: booking.id,
        },
        data: {
          status: "PAID",
          paymentId: paymentId || booking.paymentId,
        },
        include: {
          place: true,
          tickets: true,
        },
      });
    } else if (paymentId && !booking.paymentId) {
      updatedBooking = await prisma.booking.update({
        where: {
          id: booking.id,
        },
        data: {
          paymentId,
        },
        include: {
          place: true,
          tickets: true,
        },
      });
    }

    // ----------------------------------------------------------
    // CREATE TICKETS
    // ----------------------------------------------------------

    const existingTickets = await prisma.ticket.count({
      where: {
        bookingId: booking.id,
      },
    });

    const ticketPayload = Array.isArray(booking.ticketPayload)
      ? booking.ticketPayload
      : [];

    if (existingTickets === 0 && ticketPayload.length > 0) {
      for (const item of ticketPayload) {
        const quantity = Number(item.quantity);

        for (let i = 0; i < quantity; i++) {
          await prisma.ticket.create({
            data: {
              bookingId: booking.id,
              userId: booking.userId,
              placeId: booking.placeId,
              slotDateTime: booking.slotDateTime,
              typeId: item.typeId,
              qrCode: crypto.randomUUID(),
              status: "PENDING",
            },
          });
        }
      }
    }

    // ----------------------------------------------------------
    // GENERATE PDF
    // ----------------------------------------------------------

    const pdfBuffer = await TicketService.generatePDF(booking.id);

    const tempFile = path.join(os.tmpdir(), `ticket-${booking.id}.pdf`);

    fs.writeFileSync(tempFile, pdfBuffer);

    let uploadedFile;

    try {
      uploadedFile = await upload(tempFile);
    } finally {
      // Delete local temporary PDF
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch (error) {
        console.error("Temporary PDF cleanup failed:", error);
      }
    }

    // ----------------------------------------------------------
    // SAVE PDF URL
    // ----------------------------------------------------------

    updatedBooking = await prisma.booking.update({
      where: {
        id: booking.id,
      },
      data: {
        status: "PAID",
        paymentId: paymentId || booking.paymentId,
        ticketPdfUrl: uploadedFile.url,
        ticketPdfKey: uploadedFile.key,
      },
      include: {
        place: true,
        tickets: true,
      },
    });

    // ----------------------------------------------------------
    // EMAIL + WHATSAPP
    // ----------------------------------------------------------

    const message = `🎟️ *Dear ${booking.name},*

Thank you for booking with *${booking.place.name}*! 🥳

Here are your entry ticket details:

📅 Date: ${new Date(booking.slotDateTime).toLocaleDateString("en-IN")}

🎫 Total Tickets: ${booking.totalSeats}

💰 Total Price: Rs ${booking.totalAmount}

💳 Payment Method: ${booking.paymentMethod}

🛑 Important: Please keep your QR code safe and do NOT share it with anyone!

📲 Show it only at the entry gate to authorized staff.

We can't wait to welcome you! 🎉`;

    try {
      await EmailService.sendTicket({
        to: booking.email,
        name: booking.name,
        booking: updatedBooking,
        pdfBuffer,
      });
    } catch (error) {
      console.error("Email sending failed:", error);
    }

    try {
      await WhatsappService.sendTicket(
        booking.phone,
        message,
        uploadedFile.url
      );
    } catch (error) {
      console.error("WhatsApp sending failed:", error);
    }

    return updatedBooking;
  }

  // ============================================================
  // EXPIRE BOOKINGS
  // ============================================================

  static async expireBookings() {
    await prisma.booking.updateMany({
      where: {
        status: "PENDING",
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        status: "EXPIRED",
      },
    });
  }

  // ============================================================
  // SLOT CAPACITY
  // ============================================================
  static async getSlotCapacity(tx, placeId, slotDateTime) {
    const dateObj = new Date(slotDateTime);

    const startOfDay = new Date(dateObj);
    startOfDay.setHours(0, 0, 0, 0);

    const time = new Date(slotDateTime).toISOString().slice(11, 16);

    // ----------------------------------------------------------
    // SLOT OVERRIDE
    // ----------------------------------------------------------

    const override = await tx.slotOverride.findFirst({
      where: {
        placeId,
        date: startOfDay,
        startTime: time,
      },
    });

    if (override) {
      if (override.isClosed) {
        throw ApiError.badRequest("Slot is closed");
      }

      if (override.capacity !== null) {
        return override.capacity;
      }
    }

    // ----------------------------------------------------------
    // SLOT TEMPLATE
    // ----------------------------------------------------------

    const template = await tx.slotTemplate.findFirst({
      where: {
        placeId,
        startTime: {
          lte: time,
        },
        endTime: {
          gt: time,
        },
      },
    });

    if (!template) {
      throw ApiError.notFound("Slot not found");
    }

    return template.capacity;
  }

  // ============================================================
  // GENERATE TICKET QR
  // ============================================================
  static async generateTicketQR(ticket) {
    const payload = JSON.stringify({
      ticketId: ticket.id,
      ts: Date.now(),
    });

    const signature = crypto
      .createHmac("sha256", envConfig.QR_SECRET)
      .update(payload)
      .digest("hex");

    const finalData = JSON.stringify({
      payload,
      signature,
    });

    const qrImage = await QRCode.toDataURL(finalData);

    return qrImage;
  }

  // ============================================================
  // GET ALL BOOKINGS
  // ============================================================
  static async getAllBookings() {
    const bookings = await prisma.booking.findMany({
      include: {
        place: true,
        user: true,
        tickets: {
          include: {
            type: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return bookings;
  }

  // ============================================================
  // GET BOOKING BY ID
  // ============================================================
  static async getBookingById(id) {
    const booking = await prisma.booking.findUnique({
      where: {
        id,
      },
      include: {
        place: true,
        user: true,
        tickets: {
          include: {
            type: true,
          },
        },
      },
    });

    if (!booking) {
      throw ApiError.notFound("Booking not found");
    }

    return booking;
  }
}

export default BookingService;
