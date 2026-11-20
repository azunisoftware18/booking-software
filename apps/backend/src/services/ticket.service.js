import prisma from "../db/db.js";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { ApiError } from "../utils/ApiError.js";
import {
  ELECTRICITY_CHARGE_BY_OPTION,
  ELECTRICITY_RATE_PER_UNIT,
  SECURITY_DEPOSIT_BY_OPTION,
} from "./annexurePricing.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGO_PATH = path.resolve(__dirname, "../../uploads/ticklogo.png");

class TicketService {
  static getPaymentReference(booking) {
    return booking?.paymentId || booking?.txnId || "—";
  }

  static async getAllTickets() {
    const tickets = await prisma.ticket.findMany({
      include: {
        booking: {
          select: {
            id: true,
            txnId: true,
            paymentId: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            totalAmount: true,
            slotDateTime: true,
            place: {
              select: {
                id: true,
                name: true,
                location: true,
              },
            },
          },
        },
        type: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return tickets;
  }

  static async generatePDF(bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
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
        tickets: { include: { type: true } },
        annexureItems: { include: { place: true } },
      },
    });

    if (!booking) throw new Error("Booking not found");

    const doc = new PDFDocument({ margin: 0, size: "A4" });
    const buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    const pdfPromise = new Promise((resolve) =>
      doc.on("end", () => resolve(Buffer.concat(buffers)))
    );

    if (booking.bookingType === "ANNEXURE") {
      const activityQrImage = booking.activityQrCode
        ? await QRCode.toDataURL(booking.activityQrCode, {
            width: 400,
            margin: 1,
          })
        : null;
      TicketService._drawAnnexureReceipt(doc, booking, activityQrImage);
      doc.end();
      return pdfPromise;
    }

    const isEntryFeeBooking = booking.bookingType === "ENTRY_FEE";
    const isGroupBooking = !isEntryFeeBooking && booking.tickets.length > 1;
    const entryFeeTicketGroups = isEntryFeeBooking
      ? [
          ...booking.tickets
            .reduce((groups, ticket) => {
              const group = groups.get(ticket.typeId) || [];
              group.push(ticket);
              groups.set(ticket.typeId, group);
              return groups;
            }, new Map())
            .values(),
        ].map((tickets) => ({
          ticket: tickets[0],
          quantity: tickets.length,
        }))
      : null;
    const ticketsToPrint = isEntryFeeBooking
      ? entryFeeTicketGroups
      : isGroupBooking
        ? [booking.tickets[0]]
        : booking.tickets;

    const qrImages = await Promise.all(
      ticketsToPrint.map((item) =>
        QRCode.toDataURL(
          isEntryFeeBooking ? item.ticket.qrCode : item.qrCode,
          { width: 400, margin: 1 }
        )
      )
    );

    const colors = {
      royalBlue: "#0b2149",
      gold: "#b8860b",
      jaipurDark: "#994113",
      sandstone: "#f5efe6",
      gray: "#8a8a8a",
    };

    const hasScheduledSlot = Boolean(booking.slotDateTime);
    const slot = new Date(booking.slotDateTime || booking.createdAt);
    const displayTimeZone = hasScheduledSlot ? "UTC" : "Asia/Kolkata";
    const formattedDate = slot.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: displayTimeZone,
    });
    const formattedTime = slot.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: displayTimeZone,
    });
    const gstBreakdown = booking.tickets.reduce(
      (summary, ticket) => {
        const type = ticket.type;
        const taxPercent = Number(type.taxPercent || 0);
        const total = Math.round(Number(type.price) * 100) / 100;
        const base =
          taxPercent > 0
            ? Math.round((total / (1 + taxPercent / 100)) * 100) / 100
            : total;
        const tax = Math.round((total - base) * 100) / 100;
        const cgst = Math.round((tax / 2) * 100) / 100;

        if (taxPercent > 0) {
          summary.base += base;
          summary.cgst += cgst;
          summary.sgst += Math.round((tax - cgst) * 100) / 100;
          summary.rates.add(taxPercent / 2);
        }

        return summary;
      },
      { base: 0, cgst: 0, sgst: 0, rates: new Set() }
    );
    gstBreakdown.base = Math.round(gstBreakdown.base * 100) / 100;
    gstBreakdown.cgst = Math.round(gstBreakdown.cgst * 100) / 100;
    gstBreakdown.sgst = Math.round(gstBreakdown.sgst * 100) / 100;
    gstBreakdown.rates = [...gstBreakdown.rates]
      .map((rate) => `${rate}%`)
      .join(", ");

    if (isEntryFeeBooking) {
      const ticketsPerPage = 2;
      const cardGap = 14;
      const cardMargin = 24;
      const cardHeight =
        (doc.page.height - cardMargin * 2 - cardGap) / ticketsPerPage;

      for (let i = 0; i < ticketsToPrint.length; i++) {
        if (i > 0 && i % ticketsPerPage === 0) doc.addPage();

        TicketService._drawEntryFeeTicket(doc, {
          booking,
          ticket: ticketsToPrint[i].ticket,
          quantity: ticketsToPrint[i].quantity,
          qrImage: qrImages[i],
          formattedDate,
          formattedTime,
          index: i,
          total: ticketsToPrint.length,
          cardY: cardMargin + (i % ticketsPerPage) * (cardHeight + cardGap),
          cardHeight,
          colors,
        });
      }
    } else {
      for (let i = 0; i < ticketsToPrint.length; i++) {
        if (i > 0) doc.addPage();

        TicketService._drawTicketPage(doc, {
          booking,
          ticket: ticketsToPrint[i],
          tickets: booking.tickets,
          qrImage: qrImages[i],
          formattedDate,
          formattedTime,
          colors,
          gstBreakdown,
          index: i,
          total: ticketsToPrint.length,
          isGroupBooking,
        });
      }
    }

    doc.end();
    return pdfPromise;
  }

  static async generateAnnexureRefundPDF(booking) {
    if (!booking.refundDetails?.items?.length || !booking.refundedAt) {
      throw ApiError.notFound("Refund receipt not found");
    }

    const doc = new PDFDocument({ margin: 0, size: "A4" });
    const buffers = [];
    doc.on("data", (buffer) => buffers.push(buffer));
    const pdfPromise = new Promise((resolve) =>
      doc.on("end", () => resolve(Buffer.concat(buffers)))
    );
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 42;
    const width = pageWidth - margin * 2;
    const colors = {
      navy: "#0b2149",
      brown: "#994113",
      muted: "#64748b",
      text: "#333333",
      border: "#e2e8f0",
      background: "#f8fafc",
      cream: "#f8f5ef",
    };
    const refundVenueNames = [
      ...new Set(
        (booking.refundDetails.items || [])
          .map((item) => item.placeName)
          .filter(Boolean)
      ),
    ];
    let cursorY = 0;

    const drawHeader = () => {
      if (fs.existsSync(LOGO_PATH)) {
        doc.image(LOGO_PATH, (pageWidth - 155) / 2, 12, {
          fit: [155, 60],
          align: "center",
          valign: "center",
        });
      }
      doc
        .font("Helvetica-Bold")
        .fontSize(15)
        .fillColor(colors.navy)
        .text("Annexure Refund Receipt", margin, 72, {
          width,
          align: "center",
        });
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(colors.muted)
        .text(`Location: ${booking.location?.name || "—"}`, margin, 98, {
          width,
          align: "center",
        });
      cursorY = 132;
    };

    drawHeader();
    doc
      .roundedRect(margin, cursorY, width, 112, 8)
      .fillAndStroke(colors.background, colors.border);
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor(colors.navy)
      .text("Booking and refund details", margin + 14, cursorY + 12);

    const detailRows = [
      [`Booking ID: ${booking.id}`, `Phone: ${booking.phone || "—"}`],
      [
        `Payment method: ${booking.paymentMethod || "—"}`,
        `Status: ${booking.status || "—"}`,
      ],
      [
        `Original payment: Rs ${Number(booking.totalAmount || 0).toFixed(2)}`,
        `Refund date: ${new Date(booking.refundedAt).toLocaleString("en-IN")}`,
      ],
      [
        `Venue: ${refundVenueNames.join(", ") || "—"}`,
        `Venue contact: ${booking.location?.contactNumber || booking.location?.email || "—"}`,
      ],
    ];
    detailRows.forEach(([left, right], index) => {
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(colors.text)
        .text(left, margin + 14, cursorY + 34 + index * 17, {
          width: width / 2 - 20,
          ellipsis: true,
        })
        .text(right, margin + width / 2, cursorY + 34 + index * 17, {
          width: width / 2 - 14,
          ellipsis: true,
        });
    });
    cursorY += 130;

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(colors.navy)
      .text("Refund calculation", margin, cursorY);
    cursorY += 22;

    for (const item of booking.refundDetails.items) {
      const cardHeight = 205;
      if (cursorY + cardHeight > pageHeight - margin) {
        doc.addPage();
        drawHeader();
        doc
          .font("Helvetica-Bold")
          .fontSize(12)
          .fillColor(colors.navy)
          .text("Refund calculation (continued)", margin, cursorY);
        cursorY += 22;
      }

      doc
        .roundedRect(margin, cursorY, width, cardHeight, 8)
        .fillAndStroke(colors.cream, "#b8860b");
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(colors.navy)
        .text(
          `${item.annexure || "Annexure"} - ${item.annexureOption || "Option"}: ${item.placeName}`,
          margin + 12,
          cursorY + 10,
          { width: width - 24, ellipsis: true }
        );
      const firstDate = item.dates?.[0]
        ? new Date(item.dates[0]).toLocaleDateString("en-IN")
        : "—";
      const lastDate = item.dates?.length
        ? new Date(item.dates[item.dates.length - 1]).toLocaleDateString(
            "en-IN"
          )
        : firstDate;
      const bookingDetails =
        item.durationHours != null
          ? `${item.durationHours} hours · ${item.days} ${item.days === 1 ? "day" : "days"}`
          : `${item.persons} persons · ${item.students} students · ${item.days} ${item.days === 1 ? "day" : "days"}`;
      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor(colors.muted)
        .text(
          `Dates: ${firstDate}${lastDate !== firstDate ? ` to ${lastDate}` : ""} · ${bookingDetails}`,
          margin + 12,
          cursorY + 27,
          { width: width - 24, ellipsis: true }
        );

      const electricityRatePerUnit =
        item.electricityRatePerUnit || ELECTRICITY_RATE_PER_UNIT;
      const electricityUnits =
        item.electricityUnits ??
        item.electricityCharge / electricityRatePerUnit;
      const damageCoveredByDeposit =
        item.damageCoveredByDeposit ??
        Math.min(item.securityDepositHeld, item.damageDeduction);
      const damageCollection =
        item.damageCollection ??
        Math.max(0, item.damageDeduction - item.securityDepositHeld);
      const depositAfterDamage = Math.max(
        0,
        item.securityDepositHeld - item.damageDeduction
      );
      const electricityOverageFromDeposit =
        item.electricityOverageFromDeposit ??
        Math.min(depositAfterDamage, item.electricityOverage);
      const electricityCollection =
        item.electricityCollection ??
        Math.max(0, item.electricityOverage - depositAfterDamage);
      const rows = [
        ["Venue charges (not refunded)", item.venueCharges],
        ["Security deposit held", item.securityDepositHeld],
        ["Damage assessed", item.damageDeduction],
        ["Damage covered by security deposit", -damageCoveredByDeposit],
        ["Damage amount to collect", damageCollection],
        [
          `Electricity consumed (${electricityUnits} units x Rs ${electricityRatePerUnit}/unit)`,
          -item.electricityCharge,
        ],
        [
          "Electricity overage settled from deposit",
          -electricityOverageFromDeposit,
        ],
        ["Electricity amount to collect", electricityCollection],
        ["Security deposit refunded", item.securityDepositRefund],
        ["Electricity held", item.electricityHeld],
        ["Electricity refunded", item.electricityRefund],
      ];
      rows.forEach(([label, amount], index) => {
        const y = cursorY + 39 + index * 14;
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor(colors.text)
          .text(label, margin + 12, y);
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor(colors.text)
          .text(`Rs ${Number(amount).toFixed(2)}`, margin + 12, y, {
            width: width - 24,
            align: "right",
          });
      });
      cursorY += cardHeight + 10;
    }

    if (cursorY + 72 > pageHeight - margin) {
      doc.addPage();
      drawHeader();
    }
    doc
      .roundedRect(margin, cursorY, width, 68, 8)
      .fillAndStroke("#fff7ed", "#fed7aa");
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(colors.brown)
      .text(
        `Total refund: Rs ${Number(booking.refundAmount).toLocaleString(
          "en-IN",
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }
        )}`,
        margin + 14,
        cursorY + 12,
        { width: width - 28, align: "right" }
      );
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(colors.brown)
      .text(
        `Total amount to collect: Rs ${Number(
          booking.refundDetails.collectionAmount ??
            booking.refundDetails.items.reduce((total, item) => {
              const damageCollection =
                item.damageCollection ??
                Math.max(0, item.damageDeduction - item.securityDepositHeld);
              const depositAfterDamage = Math.max(
                0,
                item.securityDepositHeld - item.damageDeduction
              );
              const electricityOverage =
                item.electricityOverage ??
                Math.max(0, item.electricityCharge - item.electricityHeld);
              const electricityCollection =
                item.electricityCollection ??
                Math.max(0, electricityOverage - depositAfterDamage);
              return total + damageCollection + electricityCollection;
            }, 0)
        ).toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        margin + 14,
        cursorY + 38,
        { width: width - 28, align: "right" }
      );

    doc.end();
    return pdfPromise;
  }

  static _drawAnnexureReceipt(doc, booking, activityQrImage) {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 42;
    const contentWidth = pageWidth - margin * 2;
    const colors = {
      navy: "#0b2149",
      brown: "#994113",
      gold: "#b8860b",
      text: "#333333",
      muted: "#64748b",
      border: "#e2e8f0",
      background: "#f8fafc",
      cream: "#f8f5ef",
    };
    const venueNames = [
      ...new Set(
        (booking.annexureItems || [])
          .map((item) => item.place?.name)
          .filter(Boolean)
      ),
    ];
    const receiptTitle =
      venueNames.join(", ") || booking.place?.name || "Venue Booking";
    let cursorY = 0;

    const drawHeader = () => {
      if (fs.existsSync(LOGO_PATH))
        doc.image(LOGO_PATH, (pageWidth - 155) / 2, 12, {
          fit: [155, 60],
          align: "center",
          valign: "center",
        });
      doc
        .font("Helvetica-Bold")
        .fontSize(14)
        .fillColor(colors.navy)
        .text(receiptTitle, margin, 72, {
          width: contentWidth,
          height: 20,
          align: "center",
          ellipsis: true,
        });
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(colors.muted)
        .text(`Location: ${booking.location?.name || "—"}`, margin, 98, {
          width: contentWidth,
          align: "center",
        });
      cursorY = 132;
    };

    const drawField = (label, value, x, y, width) => {
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(colors.muted)
        .text(label.toUpperCase(), x, y, { width });
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(colors.text)
        .text(String(value || "—"), x, y + 12, {
          width,
          height: 14,
          lineBreak: false,
          ellipsis: true,
        });
    };

    drawHeader();

    const locationDetails = [
      booking.location?.name,
      booking.location?.city,
      booking.location?.state,
      booking.location?.address,
    ].filter(Boolean);
    const columnGap = 18;
    const columnWidth = (contentWidth - columnGap) / 2;
    const rightColumnX = margin + columnWidth + columnGap;

    doc
      .roundedRect(margin, cursorY, contentWidth, 264, 8)
      .fillAndStroke(colors.background, colors.border);
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor(colors.navy)
      .text("Booking and payment details", margin + 14, cursorY + 12);
    drawField(
      "Booking ID",
      String(booking.id || "")
        .slice(-12)
        .toUpperCase(),
      margin + 14,
      cursorY + 34,
      columnWidth - 14
    );
    drawField(
      "Contact number",
      booking.phone,
      rightColumnX,
      cursorY + 34,
      columnWidth - 14
    );
    drawField(
      "Payment method",
      booking.paymentMethod,
      margin + 14,
      cursorY + 64,
      columnWidth - 14
    );
    drawField(
      "Booking status",
      booking.status,
      rightColumnX,
      cursorY + 64,
      columnWidth - 14
    );
    drawField(
      "Selected location",
      locationDetails.join(", "),
      margin + 14,
      cursorY + 94,
      contentWidth - 28
    );

    drawField(
      "Transaction ID",
      booking.txnId,
      margin + 14,
      cursorY + 124,
      contentWidth - 28
    );

    if (activityQrImage) {
      const qrSize = 92;
      const qrY = cursorY + 151;
      doc.image(activityQrImage, (pageWidth - qrSize) / 2, qrY, {
        fit: [qrSize, qrSize],
      });
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(colors.navy)
        .text("Activity entry QR", margin, qrY + qrSize + 2, {
          width: contentWidth,
          align: "center",
        });
    }

    // drawField(
    //   "Payment ID",
    //   TicketService.getPaymentReference(booking),
    //   margin + 14,
    //   cursorY + 154,
    //   contentWidth - 28
    // );
    
    // drawField(
    //   "Venue contact",
    //   [booking.location?.contactNumber, booking.location?.email]
    //     .filter(Boolean)
    //     .join(" · "),
    //   margin + 14,
    //   cursorY + 184,
    //   contentWidth - 28
    // );

    cursorY += 282;

    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor(colors.navy)
      .text("Selected annexure options", margin, cursorY);
    cursorY += 22;

    const groupedItems = new Map();
    for (const item of booking.annexureItems || []) {
      const time = new Date(item.slotDateTime).toISOString().slice(11, 16);
      const key = [
        item.placeId,
        time,
        item.durationHours ?? "",
        item.persons ?? 0,
        item.students ?? 0,
      ].join(":");
      const group = groupedItems.get(key) || {
        ...item,
        amount: 0,
        securityDeposit: 0,
        hasStoredSecurityDeposit: true,
        slotDates: [],
      };
      group.amount += Number(item.amount || 0);
      if (item.securityDeposit == null) {
        group.hasStoredSecurityDeposit = false;
      } else {
        group.securityDeposit += Number(item.securityDeposit);
      }
      group.slotDates.push(item.slotDateTime);
      groupedItems.set(key, group);
    }

    const sortedGroups = Array.from(groupedItems.values()).map((item) => {
      const sortedDates = item.slotDates.sort(
        (first, second) => new Date(first) - new Date(second)
      );
      return {
        ...item,
        firstSlotDateTime: sortedDates[0],
        lastSlotDateTime: sortedDates[sortedDates.length - 1],
      };
    });

    let venueChargesTotal = 0;
    let securityDepositTotal = 0;
    let electricityTotal = 0;

    for (const item of sortedGroups) {
      const cardHeight = 158;
      if (cursorY + cardHeight > pageHeight - margin) {
        doc.addPage();
        drawHeader();
        doc
          .font("Helvetica-Bold")
          .fontSize(13)
          .fillColor(colors.navy)
          .text("Selected annexure options", margin, cursorY);
        cursorY += 22;
      }

      const dateOptions = {
        day: "2-digit",
        month: "long",
        year: "numeric",
      };
      const startDate = new Date(item.firstSlotDateTime).toLocaleDateString(
        "en-IN",
        dateOptions
      );
      const endDate = new Date(item.lastSlotDateTime).toLocaleDateString(
        "en-IN",
        dateOptions
      );
      const dateRange =
        startDate === endDate ? startDate : `${startDate} to ${endDate}`;
      const slot = new Date(item.firstSlotDateTime);
      const time = slot.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      const dayCount = item.slotDates.length;
      const bookingDetails =
        item.durationHours != null
          ? `Duration: ${item.durationHours} hours · ${dayCount} ${dayCount === 1 ? "day" : "days"}`
          : `Persons: ${item.persons} · Students: ${item.students}`;
      const option = item.place.annexureOption;
      const venueCharges = Number(item.amount || 0);
      const securityDeposit = item.hasStoredSecurityDeposit
        ? item.securityDeposit
        : (SECURITY_DEPOSIT_BY_OPTION[option] || 0) * dayCount;
      const electricity =
        (ELECTRICITY_CHARGE_BY_OPTION[option]?.[item.durationHours] || 0) *
        dayCount;
      const itemTotal = venueCharges + securityDeposit + electricity;

      venueChargesTotal += venueCharges;
      securityDepositTotal += securityDeposit;
      electricityTotal += electricity;

      doc
        .roundedRect(margin, cursorY, contentWidth, cardHeight, 8)
        .fillAndStroke(colors.cream, colors.gold);
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(colors.navy)
        .text(
          `${item.place.annexure || "Annexure"}${option ? ` - ${option}` : ""}`,
          margin + 14,
          cursorY + 10,
          { width: contentWidth - 28 }
        );
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(colors.text)
        .text(`Venue: ${item.place.name}`, margin + 14, cursorY + 29, {
          width: contentWidth - 28,
          height: 14,
        })
        .text(
          `Visit: ${dateRange} · ${time} · ${dayCount} ${dayCount === 1 ? "day" : "days"}`,
          margin + 14,
          cursorY + 47,
          { width: contentWidth - 28, height: 14 }
        )
        .text(bookingDetails, margin + 14, cursorY + 65, {
          width: contentWidth - 28,
          height: 14,
        });

      const priceColumnWidth = (contentWidth - 42) / 2;
      const priceRightX = margin + 14 + priceColumnWidth + 14;
      drawField(
        "Venue charges",
        `Rs ${venueCharges.toFixed(2)}`,
        margin + 14,
        cursorY + 87,
        priceColumnWidth
      );
      drawField(
        "Security deposit",
        `Rs ${securityDeposit.toFixed(2)}`,
        priceRightX,
        cursorY + 87,
        priceColumnWidth
      );
      drawField(
        "Electricity",
        `Rs ${electricity.toFixed(2)}`,
        margin + 14,
        cursorY + 112,
        priceColumnWidth
      );
      drawField(
        "Option total",
        `Rs ${itemTotal.toFixed(2)}`,
        priceRightX,
        cursorY + 112,
        priceColumnWidth
      );
      cursorY += cardHeight + 10;
    }

    const totalSummaryHeight = 105;
    if (cursorY + totalSummaryHeight > pageHeight - margin) {
      doc.addPage();
      drawHeader();
    }

    doc
      .roundedRect(margin, cursorY, contentWidth, totalSummaryHeight, 8)
      .fillAndStroke("#fff7ed", "#fed7aa");
    const summaryRows = [
      ["Venue charges", venueChargesTotal],
      ["Security deposit", securityDepositTotal],
      ["Electricity (Rs.15 per unit)", electricityTotal],
    ];
    summaryRows.forEach(([label, amount], index) => {
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(colors.text)
        .text(label, margin + 14, cursorY + 13 + index * 19);
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(colors.text)
        .text(
          `Rs ${Number(amount).toFixed(2)}`,
          margin + 14,
          cursorY + 13 + index * 19,
          { width: contentWidth - 28, align: "right" }
        );
    });

    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor(colors.brown)
      .text(
        `Combined total: Rs ${Number(booking.totalAmount).toLocaleString(
          "en-IN",
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }
        )}`,
        margin + 14,
        cursorY + 73,
        { width: contentWidth - 28, align: "right" }
      );
  }

  static _drawEntryFeeTicket(
    doc,
    {
      booking,
      ticket,
      quantity,
      qrImage,
      formattedDate,
      formattedTime,
      index,
      total,
      cardY,
      cardHeight,
      colors,
    }
  ) {
    const pageWidth = doc.page.width;
    const cardX = 28;
    const cardW = pageWidth - cardX * 2;
    const contentX = cardX + 18;
    const contentW = cardW - 36;
    const ticketPrice = Number(ticket.type?.price || 0) * quantity;
    const savedBookingAmount = Number(booking.totalAmount);
    const price =
      total === 1 &&
      Number.isFinite(savedBookingAmount) &&
      savedBookingAmount > 0
        ? savedBookingAmount
        : ticketPrice;

    doc
      .roundedRect(cardX, cardY, cardW, cardHeight, 14)
      .fillAndStroke("#ffffff", colors.gold);
    doc
      .roundedRect(cardX + 7, cardY + 7, cardW - 14, cardHeight - 14, 10)
      .dash(3, { space: 3 })
      .lineWidth(0.5)
      .strokeColor(colors.gold)
      .stroke()
      .undash();

    if (fs.existsSync(LOGO_PATH)) {
      doc.image(LOGO_PATH, contentX, cardY + 12, {
        fit: [92, 40],
        align: "left",
        valign: "center",
      });
    }

    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(colors.jaipurDark)
      .text("OFFICIAL BOOKING TICKET", contentX, cardY + 17, {
        width: contentW,
        align: "center",
        characterSpacing: 2,
      })
      .font("Times-Bold")
      .fontSize(17)
      .fillColor(colors.royalBlue)
      .text("Entry Ticket", contentX, cardY + 34, {
        width: contentW,
        align: "center",
      })
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(colors.jaipurDark)
      .text(`TICKET ${index + 1} OF ${total}`, contentX, cardY + 57, {
        width: contentW,
        align: "center",
        characterSpacing: 1.5,
      });

    doc
      .moveTo(contentX, cardY + 76)
      .lineTo(contentX + contentW, cardY + 76)
      .dash(2, { space: 3 })
      .lineWidth(0.6)
      .strokeColor(colors.gold)
      .stroke()
      .undash();

    const drawField = (label, value, x, y, width) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(7)
        .fillColor(colors.gray)
        .text(label.toUpperCase(), x, y, { width });
      doc
        .font("Times-Bold")
        .fontSize(10)
        .fillColor(colors.royalBlue)
        .text(String(value ?? "-"), x, y + 10, {
          width,
          height: 15,
          ellipsis: true,
        });
    };

    const fieldGap = 18;
    const fieldW = (contentW - fieldGap) / 2;
    const rightX = contentX + fieldW + fieldGap;
    drawField(
      "Booking ID",
      String(booking.id || "").slice(-12).toUpperCase(),
      contentX,
      cardY + 88,
      fieldW
    );
    drawField("Phone", booking.phone || "-", rightX, cardY + 88, fieldW);
    drawField("Date of Visit", formattedDate, contentX, cardY + 119, fieldW);
    drawField("Visiting Time", formattedTime, rightX, cardY + 119, fieldW);
    drawField(
      "Ticket Type",
      `${ticket.type?.name || "Entry Fee"} x ${quantity}`,
      contentX,
      cardY + 150,
      fieldW
    );
    drawField("Entry Fee", `Rs ${price.toFixed(2)}`, rightX, cardY + 150, fieldW);

    const qrSize = Math.min(94, cardHeight * 0.26);
    const qrX = (pageWidth - qrSize) / 2;
    const qrY = cardY + 183;
    doc.rect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10).fill("#ffffff");
    doc.image(qrImage, qrX, qrY, { width: qrSize, height: qrSize });

    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(colors.gray)
      .text(
        quantity > 1
          ? `Scan once to admit all ${quantity} visitors`
          : "Scan this QR at entry gate",
        contentX,
        qrY + qrSize + 5,
        {
          width: contentW,
          align: "center",
        }
      );

    const footerY = cardY + cardHeight - 27;
    doc
      .moveTo(contentX, footerY - 8)
      .lineTo(contentX + contentW, footerY - 8)
      .dash(2, { space: 3 })
      .lineWidth(0.5)
      .strokeColor(colors.gold)
      .stroke()
      .undash()
      .font("Courier")
      .fontSize(7)
      .fillColor(colors.gray)
      .text(`Ticket ID: ${ticket.id}`, contentX, footerY, {
        width: contentW,
        ellipsis: true,
      });
  }

  static _drawTicketPage(
    doc,
    {
      booking,
      ticket,
      tickets,
      qrImage,
      formattedDate,
      formattedTime,
      colors,
      gstBreakdown,
      index,
      total,
      isGroupBooking,
    }
  ) {
    const isEntryFeeBooking = booking.bookingType === "ENTRY_FEE";
    const ticketTypeSummary = tickets.reduce((summary, item) => {
      const typeName = item.type?.name || "Ticket";
      summary.set(typeName, (summary.get(typeName) || 0) + 1);
      return summary;
    }, new Map());
    const ticketTypeLabel = isEntryFeeBooking
      ? "Entry Fee"
      : [...ticketTypeSummary]
          .map(([typeName, quantity]) => `${typeName} x ${quantity}`)
          .join(", ");
    const entryFee = isEntryFeeBooking
      ? Number(ticket.type?.price || 0)
      : tickets.reduce(
          (totalAmount, item) => totalAmount + Number(item.type?.price || 0),
          0
        );
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    const margin = 30;
    const cardX = margin;
    const cardY = margin;
    const cardW = pageWidth - margin * 2;
    const cardH = pageHeight - margin * 2;

    const leftX = cardX + 40;
    const rightX = cardX + cardW / 2 + 10;
    const colW = cardW / 2 - 60;

    // Background
    doc.rect(0, 0, pageWidth, pageHeight).fill(colors.sandstone);

    // Main white card
    doc.roundedRect(cardX, cardY, cardW, cardH, 20).fill("#ffffff");

    doc
      .roundedRect(cardX, cardY, cardW, cardH, 20)
      .lineWidth(1.2)
      .strokeColor(colors.gold)
      .stroke();

    // Inner border
    doc
      .roundedRect(cardX + 10, cardY + 10, cardW - 20, cardH - 20, 14)
      .dash(3, { space: 3 })
      .lineWidth(0.6)
      .strokeColor(colors.gold)
      .stroke()
      .undash();

    // ------------------------------------
    // HEADER + LARGE LOGO
    // ------------------------------------
    const logoWidth = 165;
    const logoHeight = 75;
    const logoX = cardX + 28;
    const logoY = cardY + 28;

    // Logo is optional; a missing file won't break PDF generation.
    if (fs.existsSync(LOGO_PATH)) {
      doc.image(LOGO_PATH, logoX, logoY, {
        fit: [logoWidth, logoHeight],
        align: "left",
        valign: "center",
      });
    }

    // Centered title below the logo
    let headerY = cardY + 120;

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(colors.jaipurDark)
      .text("OFFICIAL BOOKING TICKET", cardX + 20, headerY, {
        width: cardW - 40,
        align: "center",
        characterSpacing: 2.5,
      });

    headerY += 27;

    doc
      .font("Times-Bold")
      .fontSize(18)
      .fillColor(colors.royalBlue)
      .text(
        isEntryFeeBooking
          ? "Entry Ticket"
          : booking.place?.name || "Heritage Monument",
        cardX + 20,
        headerY,
        {
          width: cardW - 40,
          align: "center",
        }
      );

    headerY += 37;

    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor(colors.gray)
      .text(
        booking.place?.location || "Jaipur, Rajasthan",
        cardX + 20,
        headerY,
        {
          width: cardW - 40,
          align: "center",
        }
      );
    const venueContact = [
      booking.location?.contactNumber,
      booking.location?.email,
    ]
      .filter(Boolean)
      .join(" · ");
    if (venueContact) {
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(colors.gray)
        .text(`Contact: ${venueContact}`, cardX + 20, headerY + 15, {
          width: cardW - 40,
          align: "center",
        });
    }

    headerY += venueContact ? 42 : 25;

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(colors.jaipurDark)
      .text(
        isGroupBooking
          ? `GROUP ENTRY · ${booking.totalSeats} VISITORS`
          : `TICKET ${index + 1} OF ${total}`,
        cardX + 20,
        headerY,
        {
          width: cardW - 40,
          align: "center",
          characterSpacing: 2,
        }
      );

    // Header divider
    let cursorY = headerY + 28;

    doc
      .moveTo(cardX + 40, cursorY)
      .lineTo(cardX + cardW - 40, cursorY)
      .dash(2, { space: 3 })
      .lineWidth(0.7)
      .strokeColor(colors.gold)
      .stroke()
      .undash();

    cursorY += 28;

    // ------------------------------------
    // BOOKING INFORMATION
    // ------------------------------------
    const drawField = (x, y, label, value, width = colW) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(colors.gray)
        .text(label.toUpperCase(), x, y, {
          width,
          characterSpacing: 0.8,
        });

      doc
        .font("Times-Bold")
        .fontSize(12)
        .fillColor(colors.royalBlue)
        .text(String(value ?? "-"), x, y + 14, {
          width,
          height: 30,
          ellipsis: true,
        });
    };

    drawField(
      leftX,
      cursorY,
      "Booking ID",
      String(booking.id || "")
        .slice(-12)
        .toUpperCase()
    );

    drawField(rightX, cursorY, "Phone", booking.phone || "-");

    cursorY += 47;

    drawField(leftX, cursorY, "Date of Visit", formattedDate);
    drawField(rightX, cursorY, "Visiting Time", formattedTime);

    cursorY += 47;

    drawField(leftX, cursorY, "Ticket Type", ticketTypeLabel || "-");
    drawField(rightX, cursorY, "Payment Mode", booking.paymentMethod || "-");

    cursorY += 48;

    drawField(
      leftX,
      cursorY,
      "Entry Fee",
      `Rs ${entryFee.toFixed(2)}`
    );
    drawField(
      rightX,
      cursorY,
      "Venue",
      isEntryFeeBooking ? "Entry Fee" : booking.place?.name || "-"
    );

    cursorY += 48;

    // ------------------------------------
    // VENUE + PAYMENT ID
    // ------------------------------------
    const paymentReference = TicketService.getPaymentReference(booking);
    const venueWidth = booking.paymentId || booking.txnId ? cardW - 250 : cardW - 80;

    drawField(
      leftX,
      cursorY,
      "Venue location",
      booking.place?.location || "-",
      venueWidth
    );

    if (booking.paymentId || booking.txnId) {
      drawField(rightX, cursorY, "Payment ID", paymentReference);
    }

    cursorY += 55;

    // Details divider
    doc
      .moveTo(cardX + 40, cursorY)
      .lineTo(cardX + cardW - 40, cursorY)
      .dash(3, { space: 4 })
      .lineWidth(0.7)
      .strokeColor(colors.gold)
      .stroke()
      .undash();

    // ------------------------------------
    // FOOTER POSITION
    // Reserve enough room so QR never overlaps the footer.
    // ------------------------------------
    const hasGst =
      Number(gstBreakdown?.base || 0) > 0 ||
      Number(gstBreakdown?.cgst || 0) > 0 ||
      Number(gstBreakdown?.sgst || 0) > 0;

    const footerH = hasGst ? 95 : 75;
    const footerY = cardY + cardH - footerH - 18;

    // Start below the details divider and keep the QR block above the footer.
    const qrSize = Math.min(138, Math.max(70, footerY - cursorY - 34));

    const qrX = (pageWidth - qrSize) / 2;
    const qrY = cursorY + 12;

    // White quiet zone around QR helps scanning.
    doc.rect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16).fill("#ffffff");

    if (qrImage) {
      doc.image(qrImage, qrX, qrY, {
        width: qrSize,
        height: qrSize,
      });
    }

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(colors.gray)
      .text(
        isGroupBooking
          ? "Scan once to admit the full group"
          : "Scan this QR at entry gate",
        cardX + 20,
        qrY + qrSize + 10,
        {
          width: cardW - 40,
          align: "center",
        }
      );

    // ------------------------------------
    // FOOTER
    // ------------------------------------
    doc
      .moveTo(cardX + 25, footerY)
      .lineTo(cardX + cardW - 25, footerY)
      .dash(3, { space: 4 })
      .lineWidth(0.8)
      .strokeColor(colors.gold)
      .stroke()
      .undash();

    if (hasGst) {
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(colors.gray)
        .text(
          `Taxable amount: Rs ${Number(gstBreakdown.base || 0).toFixed(2)}`,
          leftX,
          footerY + 9
        )
        .text(
          `CGST (${gstBreakdown.rates || "0%"}): Rs ${Number(gstBreakdown.cgst || 0).toFixed(2)}`,
          leftX,
          footerY + 22
        )
        .text(
          `SGST (${gstBreakdown.rates || "0%"}): Rs ${Number(gstBreakdown.sgst || 0).toFixed(2)}`,
          leftX,
          footerY + 35
        );
    }

    const totalLabelY = footerY + (hasGst ? 52 : 15);
    const totalAmountY = totalLabelY + 13;

    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(colors.gray)
      .text("TOTAL FARE PAID", leftX, totalLabelY);

    doc
      .font("Times-Bold")
      .fontSize(22)
      .fillColor(colors.royalBlue)
      .text(
        `Rs ${
          isEntryFeeBooking
            ? Number(ticket.type?.price || 0).toFixed(2)
            : Number(booking.totalAmount || 0).toFixed(2)
        }`,
        leftX,
        totalAmountY
      );

    // Ticket ID and payment ID are kept away from QR.
    doc
      .font("Courier")
      .fontSize(7)
      .fillColor(colors.gray)
      .text(
        `${isGroupBooking ? "Booking ID" : "Ticket ID"}: ${
          isGroupBooking ? booking.id : ticket.id
        }`,
        cardX + 200,
        footerY + 15,
        {
          width: cardW - 240,
          align: "right",
          ellipsis: true,
        }
      );

    doc
      .font("Helvetica-Oblique")
      .fontSize(8)
      .fillColor(colors.gray)
      .text(
        "Please carry a valid ID proof. This ticket is non-transferable.",
        cardX + 20,
        cardY + cardH - 25,
        {
          width: cardW - 40,
          align: "center",
        }
      );
  }

  static async scanTicket(payload) {
    const { qrCode } = payload;

    const ticket = await prisma.ticket.findFirst({
      where: { qrCode },
      include: {
        booking: true,
        type: true,
        place: true,
        user: true,
      },
    });

    if (!ticket) {
      const activityBooking = await prisma.booking.findFirst({
        where: { activityQrCode: qrCode },
        include: {
          annexureItems: {
            include: { place: true },
          },
        },
      });

      if (!activityBooking) {
        throw ApiError.notFound("Invalid Ticket");
      }
      if (activityBooking.status !== "PAID") {
        throw ApiError.badRequest("Payment not completed");
      }

      const scannedAt = new Date();
      const updated = await prisma.booking.updateMany({
        where: {
          id: activityBooking.id,
          status: "PAID",
          activityScannedAt: null,
        },
        data: { activityScannedAt: scannedAt },
      });
      if (updated.count !== 1) {
        throw ApiError.badRequest("Activity booking already scanned");
      }

      return {
        ticket: { id: activityBooking.id, status: "SCANNED" },
        booking: { ...activityBooking, activityScannedAt: scannedAt },
        type: {
          name: [
            ...new Set(
              activityBooking.annexureItems.map((item) => item.place.name)
            ),
          ].join(", "),
        },
        groupSize: activityBooking.totalSeats,
      };
    }

    // booking unpaid
    if (ticket.booking.status !== "PAID") {
      throw ApiError.badRequest("Payment not completed");
    }

    const scanGroupWhere = {
      bookingId: ticket.bookingId,
      ...(ticket.booking.bookingType === "ENTRY_FEE"
        ? { typeId: ticket.typeId }
        : {}),
    };
    const groupTickets = await prisma.ticket.findMany({
      where: scanGroupWhere,
      select: { id: true, status: true },
    });
    const isGroupBooking = groupTickets.length > 1;

    if (isGroupBooking) {
      await prisma.$transaction(async (tx) => {
        const tickets = await tx.ticket.findMany({
          where: scanGroupWhere,
          select: { id: true, status: true },
        });

        if (tickets.some((groupTicket) => groupTicket.status === "SCANNED")) {
          throw ApiError.badRequest("Group booking already scanned");
        }

        const updated = await tx.ticket.updateMany({
          where: {
            ...scanGroupWhere,
            status: { not: "SCANNED" },
          },
          data: { status: "SCANNED" },
        });

        if (updated.count !== tickets.length) {
          throw ApiError.badRequest("Group booking already scanned");
        }

        await tx.scanLog.createMany({
          data: tickets.map((groupTicket) => ({
            ticketId: groupTicket.id,
            type: "ENTRY",
          })),
        });
      });

      return {
        ticket: { ...ticket, status: "SCANNED" },
        booking: ticket.booking,
        type: ticket.type,
        groupSize: groupTickets.length,
      };
    }

    // already scanned
    if (ticket.status === "SCANNED") {
      throw ApiError.badRequest("Ticket already scanned");
    }

    // update status
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: "SCANNED" },
    });

    // save logs
    await prisma.scanLog.create({
      data: {
        ticketId: ticket.id,
        type: "ENTRY",
      },
    });

    return {
      ticket: updatedTicket,
      booking: ticket.booking,
      type: ticket.type,
      groupSize: 1,
    };
  }
}

export default TicketService;
