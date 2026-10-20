import prisma from "../db/db.js";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { ApiError } from "../utils/ApiError.js";
import {
  ELECTRICITY_CHARGE_BY_OPTION,
  SECURITY_DEPOSIT_BY_OPTION,
} from "./annexurePricing.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGO_PATH = path.resolve(__dirname, "../../uploads/ticklogo.png");

class TicketService {
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
      TicketService._drawAnnexureReceipt(doc, booking);
      doc.end();
      return pdfPromise;
    }

    // Pre-generate all QR codes
    const qrImages = await Promise.all(
      booking.tickets.map((t) =>
        QRCode.toDataURL(t.qrCode, { width: 400, margin: 1 })
      )
    );

    const colors = {
      royalBlue: "#0b2149",
      gold: "#b8860b",
      jaipurDark: "#994113",
      sandstone: "#f5efe6",
      gray: "#8a8a8a",
    };

    const slot = new Date(booking.slotDateTime);
    const formattedDate = slot.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const formattedTime = slot.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
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

    for (let i = 0; i < booking.tickets.length; i++) {
      if (i > 0) doc.addPage();

      TicketService._drawTicketPage(doc, {
        booking,
        ticket: booking.tickets[i],
        qrImage: qrImages[i],
        formattedDate,
        formattedTime,
        colors,
        gstBreakdown,
        index: i,
        total: booking.tickets.length,
      });
    }

    doc.end();
    return pdfPromise;
  }

  static _drawAnnexureReceipt(doc, booking) {
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
          .filter(Boolean),
      ),
    ];
    const receiptTitle =
      venueNames.join(", ") || booking.place?.name || "Annexure Booking";
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
      .roundedRect(margin, cursorY, contentWidth, 234, 8)
      .fillAndStroke(colors.background, colors.border);
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor(colors.navy)
      .text("Customer and payment details", margin + 14, cursorY + 12);
    drawField("Customer", booking.name, margin + 14, cursorY + 34, columnWidth - 14);
    drawField("Email", booking.email, rightColumnX, cursorY + 34, columnWidth - 14);
    drawField("Contact number", booking.phone, margin + 14, cursorY + 64, columnWidth - 14);
    drawField(
      "Payment method",
      booking.paymentMethod,
      rightColumnX,
      cursorY + 64,
      columnWidth - 14,
    );
    drawField(
      "Selected location",
      locationDetails.join(", "),
      margin + 14,
      cursorY + 94,
      contentWidth - 28,
    );
    drawField(
      "Payment status",
      booking.status,
      margin + 14,
      cursorY + 124,
      contentWidth - 28,
    );

    drawField(
      "Transaction ID",
      booking.txnId,
      margin + 14,
      cursorY + 154,
      contentWidth - 28,
    );

    drawField(
      "Payment ID",
      booking.paymentId,
      margin + 14,
      cursorY + 184,
      contentWidth - 28,
    );
    cursorY += 252;

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
        slotDates: [],
      };
      group.amount += Number(item.amount || 0);
      group.slotDates.push(item.slotDateTime);
      groupedItems.set(key, group);
    }

    const sortedGroups = Array.from(groupedItems.values()).map((item) => {
      const sortedDates = item.slotDates.sort(
        (first, second) => new Date(first) - new Date(second),
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
        dateOptions,
      );
      const endDate = new Date(item.lastSlotDateTime).toLocaleDateString(
        "en-IN",
        dateOptions,
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
      const securityDeposit =
        (SECURITY_DEPOSIT_BY_OPTION[option] || 0) * dayCount;
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
          { width: contentWidth - 28 },
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
          { width: contentWidth - 28, height: 14 },
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
        priceColumnWidth,
      );
      drawField(
        "Security deposit",
        `Rs ${securityDeposit.toFixed(2)}`,
        priceRightX,
        cursorY + 87,
        priceColumnWidth,
      );
      drawField(
        "Electricity",
        `Rs ${electricity.toFixed(2)}`,
        margin + 14,
        cursorY + 112,
        priceColumnWidth,
      );
      drawField(
        "Option total",
        `Rs ${itemTotal.toFixed(2)}`,
        priceRightX,
        cursorY + 112,
        priceColumnWidth,
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
          { width: contentWidth - 28, align: "right" },
        );
    });

    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor(colors.brown)
      .text(
        `Combined total: Rs ${Number(booking.totalAmount).toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        margin + 14,
        cursorY + 73,
        { width: contentWidth - 28, align: "right" },
      );
  }

  static _drawTicketPage(
    doc,
    {
      booking,
      ticket,
      qrImage,
      formattedDate,
      formattedTime,
      colors,
      gstBreakdown,
      index,
      total,
    }
  ) {
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
      .fontSize(29)
      .fillColor(colors.royalBlue)
      .text(booking.place?.name || "Heritage Monument", cardX + 20, headerY, {
        width: cardW - 40,
        align: "center",
      });

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

    headerY += 25;

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(colors.jaipurDark)
      .text(`TICKET ${index + 1} OF ${total}`, cardX + 20, headerY, {
        width: cardW - 40,
        align: "center",
        characterSpacing: 2,
      });

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

    drawField(rightX, cursorY, "Customer", booking.name || "Guest");

    cursorY += 47;

    drawField(leftX, cursorY, "Email", booking.email || "-");
    drawField(rightX, cursorY, "Phone", booking.phone || "-");

    cursorY += 47;

    drawField(leftX, cursorY, "Date of Visit", formattedDate);
    drawField(rightX, cursorY, "Visiting Time", formattedTime);

    cursorY += 47;

    drawField(leftX, cursorY, "Ticket Type", ticket.type?.name || "-");
    drawField(rightX, cursorY, "Payment Mode", booking.paymentMethod || "-");

    cursorY += 48;

    // ------------------------------------
    // VENUE + PAYMENT ID
    // ------------------------------------
    const venueWidth = booking.paymentId ? cardW - 250 : cardW - 80;

    drawField(leftX, cursorY, "Venue", "Science Department", venueWidth);

    if (booking.paymentId) {
      drawField(rightX, cursorY, "Payment ID", booking.paymentId);
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

    const footerH = hasGst ? 112 : 82;
    const footerY = cardY + cardH - footerH - 18;
    const footerBottom = footerY - 12;

    // QR block fits in the available area above the footer.
    const qrSize = Math.min(138, Math.max(90, footerBottom - cursorY - 42));

    const qrX = (pageWidth - qrSize) / 2;
    const qrY =
      cursorY + Math.max(12, (footerBottom - cursorY - qrSize - 30) / 2);

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
      .text("Scan this QR at entry gate", cardX + 20, qrY + qrSize + 10, {
        width: cardW - 40,
        align: "center",
      });

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
        `Rs ${Number(booking.totalAmount || 0).toFixed(2)}`,
        leftX,
        totalAmountY
      );

    // Ticket ID and payment ID are kept away from QR.
    doc
      .font("Courier")
      .fontSize(7)
      .fillColor(colors.gray)
      .text(`Ticket ID: ${ticket.id}`, cardX + 200, footerY + 15, {
        width: cardW - 240,
        align: "right",
        ellipsis: true,
      });

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
      throw ApiError.notFound("Invalid Ticket");
    }

    // already scanned
    if (ticket.status === "SCANNED") {
      throw ApiError.badRequest("Ticket already scanned");
    }

    // booking unpaid
    if (ticket.booking.status !== "PAID") {
      throw ApiError.badRequest("Payment not completed");
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
    };
  }
}

export default TicketService;
