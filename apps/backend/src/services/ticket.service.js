import prisma from "../db/db.js";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { ApiError } from "../utils/ApiError.js";
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
    const margin = 48;
    let cursorY = 50;

    doc
      .font("Helvetica-Bold")
      .fontSize(22)
      .fillColor("#0b2149")
      .text("Annexure Booking Confirmation", margin, cursorY, {
        width: pageWidth - margin * 2,
        align: "center",
      });
    cursorY += 42;

    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor("#333333")
      .text(`Booking ID: ${booking.id}`, margin, cursorY);
    cursorY += 18;
    doc.text(`Customer: ${booking.name}`, margin, cursorY);
    cursorY += 18;
    doc.text(`Payment status: ${booking.status}`, margin, cursorY);
    cursorY += 30;

    for (const item of booking.annexureItems || []) {
      if (cursorY > doc.page.height - 170) {
        doc.addPage();
        cursorY = 50;
      }

      const slot = new Date(item.slotDateTime);
      const date = slot.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      const time = slot.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      const attendance =
        item.durationHours != null
          ? `Duration: ${item.durationHours} hours`
          : `Persons: ${item.persons}; Students: ${item.students}`;

      doc
        .roundedRect(margin, cursorY, pageWidth - margin * 2, 112, 10)
        .fillAndStroke("#f8f5ef", "#b8860b");
      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor("#0b2149")
        .text(
          `${item.place.annexure || ""}${item.place.annexureOption ? ` - ${item.place.annexureOption}` : ""}`,
          margin + 14,
          cursorY + 12,
          { width: pageWidth - margin * 2 - 28 }
        );
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#333333")
        .text(item.place.name, margin + 14, cursorY + 31, {
          width: pageWidth - margin * 2 - 28,
        })
        .text(`Date and time: ${date}, ${time}`, margin + 14, cursorY + 54)
        .text(attendance, margin + 14, cursorY + 70)
        .text(
          `Amount: Rs ${Number(item.amount).toFixed(2)}`,
          margin + 14,
          cursorY + 86
        );
      cursorY += 128;
    }

    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor("#994113")
      .text(
        `Combined total: Rs ${Number(booking.totalAmount).toFixed(2)}`,
        margin,
        cursorY + 2,
        { width: pageWidth - margin * 2, align: "right" }
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
