import prisma from "../db/db.js";
import crypto from "node:crypto";
import QRCode from "qrcode";
import { ApiError } from "../utils/ApiError.js";
import { envConfig } from "../config/env.config.js";
import TicketService from "./ticket.service.js";
import { SlotService } from "./slot.service.js";
import { isSlotPast } from "../utils/slotTime.js";

import fs from "fs";
import os from "os";
import path from "path";

import { upload } from "../utils/s3Service.js";
import WhatsappService from "./whatsapp.service.js";
import {
  ELECTRICITY_CHARGE_BY_OPTION,
  ELECTRICITY_RATE_PER_UNIT,
  SECURITY_DEPOSIT_BY_OPTION,
} from "./annexurePricing.js";

const GROUP_STUDENT_TICKET_NAME = "Group of Student**";
const MIN_GROUP_STUDENT_QUANTITY = 10;

const roundCurrency = (amount) =>
  Math.round((Number(amount) + Number.EPSILON) * 100) / 100;

const isAtomGatewayLocation = (location) => {
  const values = [location?.name, location?.city]
    .filter(Boolean)
    .map((value) => value.trim().toLowerCase());

  return values.some(
    (value) =>
      value.includes("jaipur") ||
      value.includes("jodhpur") ||
      value.includes("kota")
  );
};

class BookingService {
  // ============================================================
  // CREATE BOOKING
  // ============================================================

  static async createBooking(payload, user) {
    const {
      placeId,
      locationId,
      slotDateTime,
      tickets = [],
      annexureItems = [],
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

    const isEntryFeeBooking = bookingType === "ENTRY_FEE";

    if (!isEntryFeeBooking && !slotDateTime) {
      throw ApiError.badRequest(
        "Slot date and time are required for ticket bookings"
      );
    }

    if (!["TICKET", "ENTRY_FEE", "ANNEXURE"].includes(bookingType)) {
      throw ApiError.badRequest("Invalid booking type");
    }

    const weekdayInIndia = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      timeZone: "Asia/Kolkata",
    }).format(new Date());
    if (weekdayInIndia === "Monday") {
      throw ApiError.badRequest(
        "Bookings are closed due to the Monday holiday"
      );
    }

    if (slotDateTime) {
      const requestedSlotDate = new Date(slotDateTime);
      if (
        !Number.isNaN(requestedSlotDate.getTime()) &&
        requestedSlotDate.getUTCDay() === 1
      ) {
        throw ApiError.badRequest("Bookings are not available on Mondays");
      }
    }

    // if (bookingType === "ANNEXURE") {
    //   throw ApiError.badRequest(
    //     "Venue booking is no longer available from the customer portal"
    //   );
    // }

    if (
      bookingType !== "ANNEXURE" &&
      (!Array.isArray(tickets) || tickets.length === 0)
    ) {
      throw ApiError.badRequest("At least one ticket is required");
    }

    if (
      bookingType === "ANNEXURE" &&
      (!Array.isArray(annexureItems) || annexureItems.length === 0)
    ) {
      throw ApiError.badRequest("Select at least one Annexure option");
    }

    if (typeof phone !== "string" || !phone.trim()) {
      throw ApiError.badRequest("Phone number is required");
    }

    const bookingPhone = phone.trim();
    const bookingName =
      typeof name === "string" && name.trim() ? name.trim() : null;
    const bookingEmail =
      typeof email === "string" && email.trim() ? email.trim() : null;

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
          select: { id: true, name: true, city: true, email: true },
        });

        if (!selectedLocation) {
          throw ApiError.badRequest(
            "Selected location is invalid or no longer available"
          );
        }

        if (
          paymentMethod === "ONLINE" &&
          !isAtomGatewayLocation(selectedLocation)
        ) {
          throw ApiError.badRequest(
            "Online payment gateway is not integrated for this location yet"
          );
        }

        if (bookingType === "ANNEXURE") {
          const placeIds = annexureItems.map((item) => item.placeId);

          if (placeId !== placeIds[0]) {
            throw ApiError.badRequest(
              "Primary place must match the first selected Annexure option"
            );
          }

          if (
            new Date(slotDateTime).getTime() !==
            new Date(annexureItems[0].slotDateTime).getTime()
          ) {
            throw ApiError.badRequest(
              "Primary slot must match the first selected Annexure option"
            );
          }

          if (new Set(placeIds).size !== placeIds.length) {
            throw ApiError.badRequest(
              "An Annexure option can only be selected once"
            );
          }

          const places = await tx.place.findMany({
            where: { id: { in: placeIds } },
            select: {
              id: true,
              locationId: true,
              location: true,
              name: true,
              annexure: true,
              annexureOption: true,
              rate4Hours: true,
              rate8Hours: true,
              ratePerPerson: true,
              ratePerStudent: true,
            },
          });

          if (places.length !== placeIds.length) {
            throw ApiError.badRequest(
              "One or more Annexure options are invalid"
            );
          }

          const expandedAnnexureItems = annexureItems.flatMap((item) => {
            const startDateTime = new Date(item.slotDateTime);
            if (Number.isNaN(startDateTime.getTime())) {
              throw ApiError.badRequest("Select a valid start date and slot");
            }

            const startDate = startDateTime.toISOString().slice(0, 10);
            const endDateValue = item.endDate || startDate;
            const endDate = new Date(`${endDateValue}T00:00:00.000Z`);
            if (
              !/^\d{4}-\d{2}-\d{2}$/.test(endDateValue) ||
              Number.isNaN(endDate.getTime()) ||
              endDate.toISOString().slice(0, 10) !== endDateValue ||
              endDateValue < startDate
            ) {
              throw ApiError.badRequest(
                "End date must be the same as or later than the start date"
              );
            }

            const startTime = startDateTime.toISOString().slice(11, 16);
            const dailyItems = [];
            const dateCursor = new Date(`${startDate}T00:00:00.000Z`);
            while (dateCursor <= endDate) {
              if (dateCursor.getUTCDay() === 1) {
                throw ApiError.badRequest(
                  "Bookings are not available on Mondays"
                );
              }

              const date = dateCursor.toISOString().slice(0, 10);
              dailyItems.push({
                ...item,
                slotDateTime: `${date}T${startTime}:00.000Z`,
              });
              dateCursor.setUTCDate(dateCursor.getUTCDate() + 1);
            }

            return dailyItems;
          });

          const requestedAnnexure = places[0]?.annexure;
          const normalizedLocationValues = [
            selectedLocation.name,
            selectedLocation.city,
          ]
            .filter(Boolean)
            .map((value) => value.trim().toLowerCase());
          const placeIsAtSelectedLocation = (place) => {
            if (place.locationId) {
              return place.locationId === selectedLocation.id;
            }

            return [place.location, place.name]
              .filter(Boolean)
              .some((value) => {
                const normalized = value.trim().toLowerCase();
                return normalizedLocationValues.some(
                  (locationName) =>
                    normalized === locationName ||
                    normalized.startsWith(`${locationName} (`) ||
                    normalized.startsWith(`${locationName},`)
                );
              });
          };

          const normalizedItems = [];
          const depositAssignedPlaces = new Set();
          const now = new Date();

          for (const item of expandedAnnexureItems) {
            const place = places.find(({ id }) => id === item.placeId);

            if (
              !place?.annexure ||
              !place.annexureOption ||
              place.annexure !== requestedAnnexure
            ) {
              throw ApiError.badRequest(
                "Selected place is not a valid Annexure option"
              );
            }

            if (!placeIsAtSelectedLocation(place)) {
              throw ApiError.badRequest(
                "An Annexure option does not belong to the selected location"
              );
            }

            const itemSlotDate = new Date(item.slotDateTime);
            if (Number.isNaN(itemSlotDate.getTime())) {
              throw ApiError.badRequest(
                `Select a valid future slot for ${place.name}`
              );
            }

            const slotDate = itemSlotDate.toISOString().slice(0, 10);
            const startTime = itemSlotDate.toISOString().slice(11, 16);
            const templates = await SlotService.getTemplatesForDate(
              place.id,
              slotDate,
              tx
            );
            const matchesDuration = (candidate) => {
              if (candidate.startTime !== startTime) return false;
              if (item.durationHours == null) return true;
              const [endHour, endMinute] = candidate.endTime
                .split(":")
                .map(Number);
              const [startHour, startMinute] = startTime.split(":").map(Number);
              return (
                endHour * 60 + endMinute - (startHour * 60 + startMinute) ===
                item.durationHours * 60
              );
            };
            const template = templates.find(
              (candidate) =>
                (!item.slotEndTime || candidate.endTime === item.slotEndTime) &&
                matchesDuration(candidate)
            );
            if (!template) {
              if (item.durationHours != null) {
                throw ApiError.badRequest(
                  `Select a ${item.durationHours}-hour slot for ${place.name}`
                );
              }
              throw ApiError.badRequest(
                `The selected slot is not available for ${place.name}`
              );
            }

            const annexureCode = String(place.annexure || "").toUpperCase();
            const isDurationBooking = ["A", "B"].includes(annexureCode);
            const isOtherActivity = ["C", "D"].includes(annexureCode);
            if (
              (isOtherActivity &&
                isSlotPast(slotDate, template.endTime, now)) ||
              (!isOtherActivity && itemSlotDate <= now)
            ) {
              throw ApiError.badRequest(
                `Select a valid future slot for ${place.name}`
              );
            }

            let amount;
            let seatCount;
            const persons = Number(item.persons || 0);
            const students = Number(item.students || 0);

            if (isDurationBooking) {
              if (persons !== 0 || students !== 0) {
                throw ApiError.badRequest(
                  `Headcount is not valid for ${place.name}`
                );
              }

              const rate =
                item.durationHours === 4
                  ? place.rate4Hours
                  : item.durationHours === 8
                    ? place.rate8Hours
                    : null;
              if (rate === null || rate === undefined) {
                throw ApiError.badRequest(
                  `Select a valid duration for ${place.name}`
                );
              }
              amount = Number(rate);
              seatCount = 1;
            } else if (
              place.ratePerPerson !== null ||
              place.ratePerStudent !== null
            ) {
              if (
                item.durationHours != null ||
                !Number.isInteger(persons) ||
                !Number.isInteger(students) ||
                persons < 0 ||
                students < 0 ||
                persons + students < 1 ||
                (persons > 0 && place.ratePerPerson === null) ||
                (students > 0 && place.ratePerStudent === null)
              ) {
                throw ApiError.badRequest(
                  `Enter a valid person/student count for ${place.name}`
                );
              }
              amount =
                persons * Number(place.ratePerPerson || 0) +
                students * Number(place.ratePerStudent || 0);
              seatCount = persons + students;
            } else {
              throw ApiError.badRequest(
                `Pricing is not configured for ${place.name}`
              );
            }

            amount = Math.round(amount * 100) / 100;
            const capacity = await this.getSlotCapacity(
              tx,
              place.id,
              itemSlotDate,
              template
            );
            const activeStatusFilter = {
              OR: [
                { status: "PAID" },
                {
                  status: "PENDING",
                  expiresAt: { gt: now },
                },
              ],
            };
            const [regularBookings, annexureReservations] = await Promise.all([
              tx.booking.findMany({
                where: {
                  placeId: place.id,
                  slotDateTime: itemSlotDate,
                  bookingType: { not: "ANNEXURE" },
                  ...activeStatusFilter,
                },
                select: { totalSeats: true },
              }),
              tx.bookingAnnexureItem.findMany({
                where: {
                  placeId: place.id,
                  slotDateTime: itemSlotDate,
                  booking: { is: activeStatusFilter },
                },
                select: { seatCount: true },
              }),
            ]);
            const usedSeats =
              regularBookings.reduce(
                (sum, booking) => sum + booking.totalSeats,
                0
              ) +
              annexureReservations.reduce(
                (sum, reservation) => sum + reservation.seatCount,
                0
              );

            if (usedSeats + seatCount > capacity) {
              throw ApiError.badRequest(
                `Not enough capacity remains for ${place.name}`
              );
            }

            const securityDeposit = depositAssignedPlaces.has(place.id)
              ? 0
              : SECURITY_DEPOSIT_BY_OPTION[place.annexureOption] || 0;
            depositAssignedPlaces.add(place.id);
            const electricityCharge =
              ELECTRICITY_CHARGE_BY_OPTION[place.annexureOption]?.[
                item.durationHours
              ] || 0;

            normalizedItems.push({
              placeId: place.id,
              slotDateTime: itemSlotDate,
              durationHours: item.durationHours || null,
              persons,
              students,
              placeOrSchoolName: item.placeOrSchoolName?.trim() || null,
              programAddress: item.programAddress?.trim() || null,
              audienceSize: item.audienceSize ?? null,
              staffCount: item.staffCount ?? null,
              programType: item.programType || null,
              otherProgramType:
                item.programType === "Others"
                  ? item.otherProgramType?.trim() || null
                  : null,
              vipPersonName: item.vipPersonName?.trim() || null,
              vipPersonPosition: item.vipPersonPosition?.trim() || null,
              termsAndConditionsAccepted:
                item.termsAndConditionsAccepted === true,
              seatCount,
              amount,
              securityDeposit,
              electricityCharge,
            });
          }

          const totalAmount =
            Math.round(
              normalizedItems.reduce((sum, item) => {
                return (
                  sum +
                  item.amount +
                  item.securityDeposit +
                  item.electricityCharge
                );
              }, 0) * 100
            ) / 100;
          const totalSeats = normalizedItems.reduce(
            (sum, item) => sum + item.seatCount,
            0
          );
          const primaryItem = normalizedItems[0];

          return tx.booking.create({
            data: {
              userId: user?.id || null,
              placeId: primaryItem.placeId,
              locationId: selectedLocation.id,
              slotDateTime: primaryItem.slotDateTime,
              bookingType: "ANNEXURE",
              name: bookingName,
              email: bookingEmail,
              phone: bookingPhone,
              paymentMethod,
              totalAmount,
              totalSeats,
              status: paymentMethod === "ONLINE" ? "PENDING" : "PAID",
              expiresAt,
              txnId,
              activityQrCode: places.every((place) => place.annexure === "C")
                ? crypto.randomUUID()
                : null,
              ticketPayload: [],
              annexureItems: {
                create: normalizedItems.map(
                  ({ electricityCharge, ...item }) => item
                ),
              },
            },
            include: { annexureItems: { include: { place: true } } },
          });
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

          if (
            type.name === GROUP_STUDENT_TICKET_NAME &&
            quantity < MIN_GROUP_STUDENT_QUANTITY
          ) {
            throw ApiError.badRequest(
              `${GROUP_STUDENT_TICKET_NAME} requires a minimum booking of ${MIN_GROUP_STUDENT_QUANTITY} tickets`
            );
          }

          const unitAmount = Math.round(type.price * 100) / 100;
          totalAmount += unitAmount * quantity;
          totalSeats += quantity;
        });

        let slotDate = null;

        if (!isEntryFeeBooking) {
          slotDate = new Date(slotDateTime);

          if (Number.isNaN(slotDate.getTime())) {
            throw ApiError.badRequest("Invalid slot date/time");
          }

          const capacity = await this.getSlotCapacity(
            tx,
            placeId,
            slotDateTime
          );

          const activeBookings = await tx.booking.findMany({
            where: {
              placeId,
              slotDateTime: slotDate,
              OR: [
                { status: "PAID" },
                {
                  status: "PENDING",
                  expiresAt: { gt: new Date() },
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
            name: bookingName,
            email: bookingEmail,
            phone: bookingPhone,
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

      const paymentLocation = await prisma.location.findUnique({
        where: {
          id: booking.locationId,
        },
        select: {
          id: true,
          name: true,
          city: true,
        },
      });

      if (!paymentLocation) {
        throw ApiError.badRequest("Booking location not found");
      }

      try {
        const payment = await AtomPaymentService.initiatePayment(
          {
            bookingId: booking.id,
            txnId: booking.txnId,
            amount: Number(booking.totalAmount).toFixed(2),
            name: booking.name,
            phone: booking.phone,
            userId: booking.userId || "",
          },
          paymentLocation
        );

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

  // static async processAtomResponse(formData) {
  //   const AtomPaymentService = (await import("./atom-payment.service.js"))
  //     .default;
  //   let response;

  //   try {
  //     response = AtomPaymentService.decodeCallback(formData.encData);
  //   } catch {
  //     throw ApiError.badRequest("Unable to verify ATOM payment response");
  //   }

  //   if (!AtomPaymentService.verifyCallbackSignature(response)) {
  //     throw ApiError.badRequest("Invalid ATOM payment signature");
  //   }

  //   const instrument = response.payInstrument;
  //   const { merchDetails, payDetails, responseDetails } = instrument;
  //   if (String(merchDetails.merchId) !== String(envConfig.ATOM_MERCHANT_ID)) {
  //     throw ApiError.badRequest("ATOM merchant ID does not match");
  //   }

  //   const booking = await prisma.booking.findUnique({
  //     where: { txnId: String(merchDetails.merchTxnId) },
  //   });
  //   if (!booking || booking.paymentMethod !== "ONLINE") {
  //     throw ApiError.notFound("Online booking not found");
  //   }

  //   // if (
  //   //   Number(payDetails.totalAmount).toFixed(2) !==
  //   //   Number(booking.totalAmount).toFixed(2)
  //   // ) {
  //   //   throw ApiError.badRequest("ATOM payment amount does not match booking");
  //   // }

  //   if (responseDetails.statusCode === "OTS0000") {
  //     return {
  //       booking: await this.completeBooking(
  //         booking.id,
  //         String(payDetails.atomTxnId)
  //       ),
  //       isSuccessful: true,
  //     };
  //   }

  //   if (booking.status === "PENDING") {
  //     await prisma.booking.update({
  //       where: { id: booking.id },
  //       data: { status: "FAILED" },
  //     });
  //   }

  //   return { booking, isSuccessful: false };
  // }

  static async processAtomResponse(formData) {
    const AtomPaymentService = (await import("./atom-payment.service.js"))
      .default;

    let response;
    let locationName;

    try {
      const verifiedCallback = AtomPaymentService.decodeAndVerifyCallback(
        formData.encData
      );

      response = verifiedCallback.response;
      locationName = verifiedCallback.locationName;
    } catch (error) {
      console.error("[ATOM CALLBACK] Verification failed:", error.message);

      throw ApiError.badRequest("Unable to verify ATOM payment response");
    }

    const instrument = response.payInstrument;

    const { merchDetails, payDetails, responseDetails } = instrument;

    const booking = await prisma.booking.findUnique({
      where: {
        txnId: String(merchDetails.merchTxnId),
      },
    });

    if (!booking || booking.paymentMethod !== "ONLINE") {
      throw ApiError.notFound("Online booking not found");
    }

    // Verify that the booking belongs to the location
    // whose merchant credentials verified this callback.
    const bookingLocation = await prisma.location.findUnique({
      where: {
        id: booking.locationId,
      },
      select: {
        name: true,
        city: true,
      },
    });

    const actualLocation = [bookingLocation?.name, bookingLocation?.city]
      .filter(Boolean)
      .map((value) => value.trim().toUpperCase());

    if (!actualLocation.some((value) => value.includes(locationName))) {
      throw ApiError.badRequest(
        "ATOM merchant does not match booking location"
      );
    }

    // Verify payment amount
    // if (
    //   Number(payDetails.totalAmount).toFixed(2) !==
    //   Number(booking.totalAmount).toFixed(2)
    // ) {
    //   throw ApiError.badRequest("ATOM payment amount does not match booking");
    // }

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
        where: {
          id: booking.id,
        },
        data: {
          status: "FAILED",
        },
      });
    }

    return {
      booking,
      isSuccessful: false,
    };
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
        bookingType: true,
        status: true,
        totalAmount: true,
        totalSeats: true,
        txnId: true,
        paymentId: true,
        name: true,
        email: true,
        phone: true,
        slotDateTime: true,
        createdAt: true,
        ticketPdfUrl: true,
        place: {
          select: {
            name: true,
            location: true,
          },
        },
        location: {
          select: {
            name: true,
            address: true,
            city: true,
            state: true,
            email: true,
            contactNumber: true,
          },
        },
        tickets: {
          select: {
            type: {
              select: {
                id: true,
                name: true,
                price: true,
                taxPercent: true,
              },
            },
          },
        },
        annexureItems: {
          select: {
            id: true,
            slotDateTime: true,
            durationHours: true,
            persons: true,
            students: true,
            amount: true,
            place: {
              select: {
                name: true,
                annexure: true,
                annexureOption: true,
              },
            },
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
        annexureItems: { include: { place: true } },
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
          annexureItems: { include: { place: true } },
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
          annexureItems: { include: { place: true } },
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
        annexureItems: { include: { place: true } },
      },
    });

    // ----------------------------------------------------------
    // WHATSAPP NOTIFICATION
    // ----------------------------------------------------------

    const annexureDetails = booking.annexureItems
      .map((item) => {
        const date = new Date(item.slotDateTime).toLocaleString("en-IN");
        return `• ${item.place.name} — ${date} — Rs ${item.amount}`;
      })
      .join("\n");
    const bookingDate = booking.slotDateTime || booking.createdAt;
    const formattedBookingDate = new Date(bookingDate).toLocaleDateString(
      "en-IN",
      { timeZone: "Asia/Kolkata" }
    );
    const message =
      booking.bookingType === "ANNEXURE"
        ? `⏳ *Venue Booking – Under Review*

Dear Customer,

Thank you for choosing us!

Your venue booking request has been successfully received and is currently *UNDER REVIEW* by our administration team.

📋 *Booking Details*
━━━━━━━━━━━━━━━━━━
${annexureDetails}

💰 *Combined Total:* Rs. ${booking.totalAmount}
💳 *Payment Method:* ${booking.paymentMethod}
📌 *Booking Status:* ${booking.reviewStatus}

Our team will review your request and notify you once a decision has been made.

Please keep the attached booking confirmation safe and present it when visiting the venue.

Thank you for your patience and cooperation.

Best Regards,
*Venue Booking Team*`
        : `🎟️ *Your ticket booking is confirmed!*

Thank you for booking! 🥳

Here are your entry ticket details:

📅 Date: ${formattedBookingDate}

🎫 Total Tickets: ${booking.totalSeats}

💰 Total Price: Rs ${booking.totalAmount}

💳 Payment Method: ${booking.paymentMethod}

🛑 Important: Please keep your QR code safe and do NOT share it with anyone!

📲 Show it only at the entry gate to authorized staff.

We can't wait to welcome you! 🎉`;

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
  static async getSlotCapacity(
    tx,
    placeId,
    slotDateTime,
    selectedTemplate = null
  ) {
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

    const template =
      selectedTemplate ||
      (await tx.slotTemplate.findFirst({
        where: {
          placeId,
          startTime: {
            lte: time,
          },
          endTime: {
            gt: time,
          },
        },
      }));

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
  static getBookingScope(currentUser) {
    if (currentUser?.role?.roleCode === "SUPER_ADMIN") return {};
    if (currentUser?.locationId) {
      return { locationId: currentUser.locationId };
    }
    if (currentUser?.placeId) {
      return { placeId: currentUser.placeId };
    }

    return null;
  }

  static assertAnnexureRefundable(booking) {
    if (booking.bookingType !== "ANNEXURE") {
      throw ApiError.badRequest(
        "Refunds are only available for Venue bookings"
      );
    }
    if (booking.status !== "PAID") {
      throw ApiError.badRequest("Only paid bookings can be refunded");
    }
    if (booking.refundedAt || booking.refundAmount !== null) {
      throw ApiError.conflict(
        "A refund has already been recorded for this booking"
      );
    }
    if (!booking.annexureItems?.length) {
      throw ApiError.badRequest("No Venue booking items were found");
    }
  }

  static buildAnnexureRefundGroups(booking) {
    const groups = new Map();
    for (const item of booking.annexureItems) {
      const group = groups.get(item.placeId) || {
        placeId: item.placeId,
        placeName: item.place.name,
        annexure: item.place.annexure,
        annexureOption: item.place.annexureOption,
        durationHours: item.durationHours,
        persons: item.persons,
        students: item.students,
        dates: [],
        venueCharges: 0,
        securityDepositHeld: 0,
        hasStoredSecurityDeposit: true,
      };
      group.dates.push(item.slotDateTime);
      group.venueCharges += Number(item.amount || 0);
      if (item.securityDeposit == null) {
        group.hasStoredSecurityDeposit = false;
      } else {
        group.securityDepositHeld += Number(item.securityDeposit);
      }
      groups.set(item.placeId, group);
    }

    return [...groups.values()].map((group) => {
      const days = group.dates.length;
      const securityDepositHeld = group.hasStoredSecurityDeposit
        ? group.securityDepositHeld
        : (SECURITY_DEPOSIT_BY_OPTION[group.annexureOption] || 0) * days;
      const electricityHeld =
        (ELECTRICITY_CHARGE_BY_OPTION[group.annexureOption]?.[
          group.durationHours
        ] || 0) * days;

      return {
        ...group,
        days,
        dates: group.dates
          .sort((first, second) => new Date(first) - new Date(second))
          .map((date) => date.toISOString()),
        venueCharges: roundCurrency(group.venueCharges),
        securityDepositHeld: roundCurrency(securityDepositHeld),
        electricityHeld: roundCurrency(electricityHeld),
      };
    });
  }

  static async getAnnexureRefundQuote(id, currentUser) {
    const booking = await this.getBookingById(id, currentUser);
    this.assertAnnexureRefundable(booking);
    return {
      bookingId: booking.id,
      customerName: booking.name,
      customerEmail: booking.email,
      totalAmount: booking.totalAmount,
      paymentMethod: booking.paymentMethod,
      electricityRatePerUnit: ELECTRICITY_RATE_PER_UNIT,
      groups: this.buildAnnexureRefundGroups(booking),
    };
  }

  static async processAnnexureRefund(id, payload, currentUser) {
    const booking = await this.getBookingById(id, currentUser);
    this.assertAnnexureRefundable(booking);
    const groups = this.buildAnnexureRefundGroups(booking);

    if (
      payload.externallyRefunded !== true ||
      payload.items.length !== groups.length
    ) {
      throw ApiError.badRequest(
        "Confirm the external refund and provide charges for every option"
      );
    }

    const submittedItems = new Map();
    for (const item of payload.items) {
      if (submittedItems.has(item.placeId)) {
        throw ApiError.badRequest(
          "Each Annexure option can only be submitted once"
        );
      }
      submittedItems.set(item.placeId, item);
    }

    const refundItems = groups.map((group) => {
      const submitted = submittedItems.get(group.placeId);
      if (!submitted) {
        throw ApiError.badRequest(
          "Refund charges are missing for an Annexure option"
        );
      }
      const electricityUnits = submitted.electricityUnits;
      const electricityCharge = roundCurrency(
        electricityUnits * ELECTRICITY_RATE_PER_UNIT
      );
      const damageDeduction = roundCurrency(submitted.damageDeduction);
      const electricityRefund = roundCurrency(
        Math.max(0, group.electricityHeld - electricityCharge)
      );
      const electricityOverage = roundCurrency(
        Math.max(0, electricityCharge - group.electricityHeld)
      );
      const depositAfterDamage = Math.max(
        0,
        group.securityDepositHeld - damageDeduction
      );
      const damageCoveredByDeposit = roundCurrency(
        Math.min(group.securityDepositHeld, damageDeduction)
      );
      const damageCollection = roundCurrency(
        Math.max(0, damageDeduction - group.securityDepositHeld)
      );
      const electricityOverageFromDeposit = roundCurrency(
        Math.min(depositAfterDamage, electricityOverage)
      );
      const electricityCollection = roundCurrency(
        Math.max(0, electricityOverage - depositAfterDamage)
      );
      const securityDepositRefund = roundCurrency(
        Math.max(0, depositAfterDamage - electricityOverage)
      );
      const collectionAmount = roundCurrency(
        damageCollection + electricityCollection
      );

      return {
        ...group,
        electricityUnits,
        electricityRatePerUnit: ELECTRICITY_RATE_PER_UNIT,
        electricityCharge,
        electricityOverage,
        damageDeduction,
        damageCoveredByDeposit,
        damageCollection,
        electricityOverageFromDeposit,
        electricityCollection,
        collectionAmount,
        electricityRefund,
        securityDepositRefund,
        refundAmount: roundCurrency(electricityRefund + securityDepositRefund),
      };
    });

    if (submittedItems.size !== groups.length) {
      throw ApiError.badRequest(
        "Refund data contains an unknown Annexure option"
      );
    }

    const refundAmount = roundCurrency(
      refundItems.reduce((total, item) => total + item.refundAmount, 0)
    );
    const collectionAmount = roundCurrency(
      refundItems.reduce((total, item) => total + item.collectionAmount, 0)
    );
    const refundedAt = new Date();
    const refundDetails = {
      method: "MANUAL",
      externallyRefunded: true,
      originalAmount: Number(booking.totalAmount),
      refundAmount,
      collectionAmount,
      items: refundItems,
    };

    const result = await prisma.booking.updateMany({
      where: {
        id: booking.id,
        status: "PAID",
        refundedAt: null,
        refundAmount: null,
      },
      data: {
        refundAmount,
        refundDetails,
        refundedAt,
        refundedById: currentUser.id,
      },
    });

    if (result.count !== 1) {
      throw ApiError.conflict("This booking has already been refunded");
    }

    return {
      booking: {
        ...booking,
        refundAmount,
        refundDetails,
        refundedAt,
        refundedById: currentUser.id,
      },
      refundDetails,
    };
  }

  static async getVenueBookings(currentUser) {
    const scope = this.getBookingScope(currentUser);
    if (!scope) return [];

    const bookings = await prisma.booking.findMany({
      where: {
        ...scope,
        bookingType: "ANNEXURE",
      },
      include: {
        place: true,
        location: true,
        annexureItems: { include: { place: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return bookings.filter((booking) =>
      (booking.annexureItems || []).some((item) => {
        const option = String(item.place?.annexureOption || "").toUpperCase();
        const annexure = String(item.place?.annexure || "").toUpperCase();
        return annexure === "A" && ["A1", "A2", "A3"].includes(option);
      })
    );
  }

  static async updateVenueReview(id, payload, currentUser) {
    const scope = this.getBookingScope(currentUser);
    if (!scope) throw ApiError.notFound("Venue booking not found");

    const reviewStatus = String(payload.reviewStatus || "").toUpperCase();
    if (!["APPROVED", "REJECTED"].includes(reviewStatus)) {
      throw ApiError.badRequest("Review status must be APPROVED or REJECTED");
    }

    const adminRemark =
      typeof payload.adminRemark === "string" ? payload.adminRemark.trim() : "";
    if (reviewStatus === "REJECTED" && !adminRemark) {
      throw ApiError.badRequest(
        "Remark is required when rejecting a venue booking"
      );
    }

    const booking = await prisma.booking.findFirst({
      where: {
        id,
        ...scope,
        bookingType: "ANNEXURE",
      },
    });

    if (!booking) {
      throw ApiError.notFound("Venue booking not found");
    }

    // Prevent changing an already reviewed booking
    const currentReviewStatus = String(
      booking.reviewStatus || "UNDER_REVIEW"
    ).toUpperCase();

    if (currentReviewStatus !== "UNDER_REVIEW") {
      throw ApiError.badRequest(
        `Venue booking is already ${currentReviewStatus}. Review status cannot be changed again.`
      );
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        reviewStatus,
        adminRemark: adminRemark || null,
        reviewedAt: new Date(),
        reviewedById: currentUser?.id || null,
      },
      include: {
        place: true,
        location: true,
        annexureItems: { include: { place: true } },
      },
    });

    const bookingId = String(booking.id || "")
      .slice(-12)
      .toUpperCase();

    const message =
      reviewStatus === "APPROVED"
        ? `🎉 *Venue Booking Approved!*

Dear Customer,

We are pleased to inform you that your venue booking request has been *APPROVED*.

📋 *Booking Details*
━━━━━━━━━━━━━━━━━━
🆔 Booking ID: ${bookingId}
💳 Payment Status: ${booking.status}
📝 Admin Remark: ${adminRemark || "No additional remarks"}

Thank you for choosing us. We look forward to serving you!

Best Regards,
*Venue Booking Team*`
        : `❌ *Venue Booking Request Rejected*

Dear Customer,

We regret to inform you that your venue booking request has been *REJECTED*.

📋 *Booking Details*
━━━━━━━━━━━━━━━━━━
🆔 Booking ID: ${bookingId}
💳 Payment Status: ${booking.status}
📝 Reason: ${adminRemark || "No reason provided"}

If you have any questions or need further clarification, please feel free to contact our support team.

Best Regards,
*Venue Booking Team*`;

    try {
      await WhatsappService.sendMessage(booking.phone, message);
    } catch (error) {
      console.error(
        "Venue booking WhatsApp notification failed:",
        error.message
      );
    }

    return updated;
  }

  static async getAllBookings(currentUser) {
    const scope = this.getBookingScope(currentUser);
    if (!scope) return [];

    const bookings = await prisma.booking.findMany({
      where: scope,
      include: {
        place: true,
        location: {
          select: {
            name: true,
            address: true,
            city: true,
            state: true,
            email: true,
            contactNumber: true,
          },
        },
        user: true,
        annexureItems: { include: { place: true } },
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
  static async getBookingById(id, currentUser) {
    const scope = this.getBookingScope(currentUser);
    if (!scope) throw ApiError.notFound("Booking not found");

    const booking = await prisma.booking.findFirst({
      where: {
        id,
        ...scope,
      },
      include: {
        place: true,
        location: true,
        user: true,
        annexureItems: { include: { place: true } },
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
