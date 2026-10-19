// import prisma from "../db/db.js";
// import PDFDocument from "pdfkit";
// import QRCode from "qrcode";
// import { ApiError } from "../utils/ApiError.js";

// class TicketService {
//   static async getAllTickets() {
//     const tickets = await prisma.ticket.findMany({
//       include: {
//         booking: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//             phone: true,
//             status: true,
//             totalAmount: true,
//             slotDateTime: true,

//             place: {
//               select: {
//                 id: true,
//                 name: true,
//                 location: true,
//               },
//             },
//           },
//         },

//         type: {
//           select: {
//             id: true,
//             name: true,
//             price: true,
//           },
//         },
//       },

//       orderBy: {
//         createdAt: "desc",
//       },
//     });

//     return tickets;
//   }
//   // static async generatePDF(bookingId) {
//   //   const booking = await prisma.booking.findUnique({
//   //     where: {
//   //       id: bookingId,
//   //     },

//   //     include: {
//   //       place: true,

//   //       tickets: {
//   //         include: {
//   //           type: true,
//   //         },
//   //       },
//   //     },
//   //   });

//   //   if (!booking) {
//   //     throw new Error("Booking not found");
//   //   }

//   //   const doc = new PDFDocument({
//   //     margin: 50,
//   //   });

//   //   const buffers = [];

//   //   doc.on("data", buffers.push.bind(buffers));

//   //   const pdfPromise = new Promise((resolve) => {
//   //     doc.on("end", () => {
//   //       resolve(Buffer.concat(buffers));
//   //     });
//   //   });

//   //   // 🔥 LOOP ALL TICKETS
//   //   for (const [index, ticket] of booking.tickets.entries()) {
//   //     // HEADER
//   //     doc.fontSize(24).text("Ticket Booking", {
//   //       align: "center",
//   //     });

//   //     doc.moveDown();

//   //     // BOOKING DETAILS
//   //     doc.fontSize(16).text(`Booking ID: ${booking.id}`);

//   //     doc.text(`Customer: ${booking.name}`);

//   //     doc.text(`Email: ${booking.email}`);

//   //     doc.text(`Phone: ${booking.phone}`);

//   //     doc.text(`Place: ${booking.place.name}`);

//   //     doc.text(
//   //       `Slot: ${new Date(booking.slotDateTime).toLocaleString("en-IN")}`
//   //     );

//   //     doc.text(`Status: ${booking.status}`);

//   //     doc.text(`Total Amount: Rs${booking.totalAmount}`);

//   //     doc.moveDown();

//   //     // TICKET DETAILS
//   //     doc.fontSize(18).text(`Ticket ${index + 1}`, {
//   //       underline: true,
//   //     });

//   //     doc.moveDown();

//   //     doc.fontSize(14).text(`Ticket ID: ${ticket.id}`);

//   //     doc.text(`Type: ${ticket.type.name}`);

//   //     doc.text(`Ticket Status: ${ticket.status}`);

//   //     doc.moveDown();

//   //     // 🔥 GENERATE QR IMAGE
//   //     const qrImage = await QRCode.toDataURL(ticket.qrCode);

//   //     // 🔥 SHOW QR IMAGE
//   //     doc.image(qrImage, {
//   //       fit: [180, 180],
//   //       align: "center",
//   //     });

//   //     doc.moveDown(4);

//   //     // 🔥 NEXT PAGE
//   //     if (index !== booking.tickets.length - 1) {
//   //       doc.addPage();
//   //     }
//   //   }

//   //   doc.end();

//   //   return pdfPromise;
//   // }

//   static async generatePDF(bookingId) {
//   const booking = await prisma.booking.findUnique({
//     where: { id: bookingId },
//     include: {
//       place: true,
//       tickets: { include: { type: true } },
//     },
//   });

//   if (!booking) throw new Error("Booking not found");

//   const doc = new PDFDocument({ margin: 0, size: "A4" });
//   const buffers = [];
//   doc.on("data", buffers.push.bind(buffers));
//   const pdfPromise = new Promise((resolve) =>
//     doc.on("end", () => resolve(Buffer.concat(buffers)))
//   );

//   // Pre-generate all QR codes
//   const qrImages = await Promise.all(
//     booking.tickets.map((t) =>
//       QRCode.toDataURL(t.qrCode, { width: 400, margin: 1 })
//     )
//   );

//   const colors = {
//     royalBlue: "#0b2149",
//     gold: "#b8860b",
//     jaipurDark: "#994113",
//     sandstone: "#f5efe6",
//     gray: "#8a8a8a",
//   };

//   const slot = new Date(booking.slotDateTime);
//   const formattedDate = slot.toLocaleDateString("en-IN", {
//     weekday: "long",
//     day: "2-digit",
//     month: "long",
//     year: "numeric",
//   });
//   const formattedTime = slot.toLocaleTimeString("en-IN", {
//     hour: "numeric",
//     minute: "2-digit",
//     hour12: true,
//   });

//   for (let i = 0; i < booking.tickets.length; i++) {
//     if (i > 0) doc.addPage();

//     TicketService._drawTicketPage(doc, {
//       booking,
//       ticket: booking.tickets[i],
//       qrImage: qrImages[i],
//       formattedDate,
//       formattedTime,
//       colors,
//       index: i,
//       total: booking.tickets.length,
//     });
//   }

//   doc.end();
//   return pdfPromise;
// }

// // 🔥 Helper: draws one beautiful ticket page
// static _drawTicketPage(doc, { booking, ticket, qrImage, formattedDate, formattedTime, colors, index, total }) {
//   const pageWidth = doc.page.width;
//   const pageHeight = doc.page.height;
//   const margin = 30;
//   const cardX = margin;
//   const cardY = margin;
//   const cardW = pageWidth - margin * 2;
//   const cardH = pageHeight - margin * 2;

//   // Sandstone background
//   doc.rect(0, 0, pageWidth, pageHeight).fill(colors.sandstone);

//   // White card
//   doc.roundedRect(cardX, cardY, cardW, cardH, 20).fill("#ffffff");

//   // Gold outer border
//   doc
//     .roundedRect(cardX, cardY, cardW, cardH, 20)
//     .lineWidth(1)
//     .strokeColor(colors.gold)
//     .stroke();

//   // Inner dashed border
//   doc
//     .roundedRect(cardX + 10, cardY + 10, cardW - 20, cardH - 20, 14)
//     .dash(3, { space: 3 })
//     .lineWidth(0.5)
//     .strokeColor(colors.gold)
//     .stroke()
//     .undash();

//   const centerX = pageWidth / 2;
//   let cursorY = cardY + 45;

//   // ─── HEADER ───
//   doc
//     .fontSize(9)
//     .fillColor(colors.jaipurDark)
//     .font("Helvetica-Bold")
//     .text("OFFICIAL BOOKING TICKET", 0, cursorY, {
//       align: "center",
//       characterSpacing: 4,
//     });
//   cursorY += 22;

//   doc
//     .fontSize(26)
//     .fillColor(colors.royalBlue)
//     .font("Times-Bold")
//     .text(booking.place?.name || "Heritage Monument", 0, cursorY, {
//       align: "center",
//     });
//   cursorY += 32;

//   doc
//     .fontSize(10)
//     .fillColor(colors.gray)
//     .font("Helvetica")
//     .text(booking.place?.location || "Jaipur, Rajasthan", 0, cursorY, {
//       align: "center",
//     });
//   cursorY += 22;

//   // Ticket x of y badge
//   doc
//     .fontSize(9)
//     .fillColor(colors.jaipurDark)
//     .font("Helvetica-Bold")
//     .text(`TICKET ${index + 1} OF ${total}`, 0, cursorY, {
//       align: "center",
//       characterSpacing: 2,
//     });
//   cursorY += 24;

//   // Divider
//   doc
//     .moveTo(cardX + 50, cursorY)
//     .lineTo(cardX + cardW - 50, cursorY)
//     .dash(2, { space: 2 })
//     .lineWidth(0.6)
//     .strokeColor(colors.gold)
//     .stroke()
//     .undash();
//   cursorY += 25;

//   // ─── INFO GRID (2 columns) ───
//   const leftX = cardX + 50;
//   const rightX = cardX + cardW / 2 + 10;
//   const colW = cardW / 2 - 60;

//   const drawField = (x, y, label, value) => {
//     doc
//       .fontSize(8)
//       .fillColor(colors.gray)
//       .font("Helvetica-Bold")
//       .text(label.toUpperCase(), x, y, { width: colW, characterSpacing: 1 });
//     doc
//       .fontSize(12)
//       .fillColor(colors.royalBlue)
//       .font("Times-Bold")
//       .text(String(value ?? "-"), x, y + 12, { width: colW, ellipsis: true });
//   };

//   drawField(leftX, cursorY, "Booking ID", String(booking.id).slice(-12).toUpperCase());
//   drawField(rightX, cursorY, "Customer", booking.name || "Guest");
//   cursorY += 45;

//   drawField(leftX, cursorY, "Email", booking.email || "-");
//   drawField(rightX, cursorY, "Phone", booking.phone || "-");
//   cursorY += 45;

//   drawField(leftX, cursorY, "Date of Visit", formattedDate);
//   drawField(rightX, cursorY, "Visiting Time", formattedTime);
//   cursorY += 45;

//   drawField(leftX, cursorY, "Ticket Type", ticket.type?.name || "Adult");
//   drawField(rightX, cursorY, "Payment Mode", "Easebuzz");
//   cursorY += 45;

//   drawField(leftX, cursorY, "Ticket Type", ticket.type?.name || "Adult");
//   drawField(rightX, cursorY, "Venue", "Springfield School Kiran Path, Sector-3, Mansarovar, Jaipur, Rajasthan - 302020");
//   cursorY += 45;

//   // ─── DASHED DIVIDER before QR ───
//   doc
//     .moveTo(cardX + 50, cursorY)
//     .lineTo(cardX + cardW - 50, cursorY)
//     .dash(4, { space: 4 })
//     .lineWidth(0.6)
//     .strokeColor(colors.gold)
//     .stroke()
//     .undash();
//   cursorY += 30;

//   // ─── QR CODE ───
//   const qrSize = 170;
//   const qrX = (pageWidth - qrSize) / 2;
//   doc.image(qrImage, qrX, cursorY, { width: qrSize, height: qrSize });
//   cursorY += qrSize + 10;

//   doc
//     .fontSize(9)
//     .fillColor(colors.gray)
//     .font("Helvetica")
//     .text("Scan this QR at entry gate", 0, cursorY, { align: "center" });
//   cursorY += 16;

//   doc
//     .fontSize(8)
//     .fillColor(colors.gray)
//     .font("Courier")
//     .text(`Ticket ID: ${ticket.id}`, 0, cursorY, { align: "center" });
//   cursorY += 16;

//   // ─── STATUS PILL ───
//   // const statusText = (ticket.status || "PENDING").toUpperCase();
//   // const statusColor =
//   //   statusText === "PAID" || statusText === "SCANNED" || statusText === "VALID"
//   //     ? "#1b4332"
//   //     : "#994113";
//   // const pillW = 90;
//   // const pillH = 20;
//   // const pillX = (pageWidth - pillW) / 2;
//   // doc
//   //   .roundedRect(pillX, cursorY, pillW, pillH, 10)
//   //   .fill(statusColor);
//   // doc
//   //   .fontSize(9)
//   //   .fillColor("#ffffff")
//   //   .font("Helvetica-Bold")
//   //   .text(statusText, pillX, cursorY + 6, {
//   //     width: pillW,
//   //     align: "center",
//   //     characterSpacing: 1,
//   //   });

//   // ─── FOOTER AMOUNT BAR ───
//   const footerH = 80;
//   const footerY = cardY + cardH - footerH - 10;

//   // Divider above footer
//   doc
//     .moveTo(cardX + 20, footerY)
//     .lineTo(cardX + cardW - 20, footerY)
//     .dash(4, { space: 4 })
//     .lineWidth(0.8)
//     .strokeColor(colors.gold)
//     .stroke()
//     .undash();

//   doc
//     .fontSize(8)
//     .fillColor(colors.gray)
//     .font("Helvetica-Bold")
//     .text("TOTAL FARE PAID", cardX + 50, footerY + 18, {
//       characterSpacing: 1,
//     });

//   doc
//     .fontSize(24)
//     .fillColor(colors.royalBlue)
//     .font("Times-Bold")
//     .text(`Rs ${booking.totalAmount}`, cardX + 50, footerY + 30);

//   const txnId = `#ET-${String(booking.id).slice(-6).toUpperCase()}`;
//   doc
//     .fontSize(10)
//     .fillColor(colors.gray)
//     .font("Courier-Bold")
//     .text(txnId, cardX + cardW - 200, footerY + 40, {
//       width: 150,
//       align: "right",
//     });

//   // Bottom note
//   doc
//     .fontSize(8)
//     .fillColor(colors.gray)
//     .font("Helvetica-Oblique")
//     .text(
//       "Please carry a valid ID proof. This ticket is non-transferable.",
//       0,
//       cardY + cardH - 22,
//       { align: "center" }
//     );
// }  static async scanTicket(payload) {

//   const { qrCode } = payload;

//   const ticket = await prisma.ticket.findFirst({
//     where: {
//       qrCode,
//     },

//     include: {
//       booking: true,
//       type: true,
//       place: true,
//       user: true,
//     },
//   });

//   if (!ticket) {
//     throw ApiError.notFound("Invalid Ticket");
//   }

//   // already scanned
//   if (ticket.status === "SCANNED") {
//     throw ApiError.badRequest("Ticket already scanned");
//   }

//   // booking unpaid
//   if (ticket.booking.status !== "PAID") {
//     throw ApiError.badRequest("Payment not completed");
//   }

//   // update status
//   const updatedTicket = await prisma.ticket.update({
//     where: {
//       id: ticket.id,
//     },

//     data: {
//       status: "SCANNED",
//     },
//   });

//   // save logs
//   await prisma.scanLog.create({
//   data: {
//     ticketId: ticket.id,
//     type: "ENTRY",
//   },
// });

//   return {
//     ticket: updatedTicket,
//     booking: ticket.booking,
//     type: ticket.type,
//   };
// }
// }

// export default TicketService;

import prisma from "../db/db.js";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { ApiError } from "../utils/ApiError.js";

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

  // 🔥 Helper: draws one beautiful ticket page
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

    // Sandstone background
    doc.rect(0, 0, pageWidth, pageHeight).fill(colors.sandstone);

    // White card
    doc.roundedRect(cardX, cardY, cardW, cardH, 20).fill("#ffffff");

    // Gold outer border
    doc
      .roundedRect(cardX, cardY, cardW, cardH, 20)
      .lineWidth(1)
      .strokeColor(colors.gold)
      .stroke();

    // Inner dashed border
    doc
      .roundedRect(cardX + 10, cardY + 10, cardW - 20, cardH - 20, 14)
      .dash(3, { space: 3 })
      .lineWidth(0.5)
      .strokeColor(colors.gold)
      .stroke()
      .undash();

    const centerX = pageWidth / 2;
    let cursorY = cardY + 45;

    // ─── HEADER ───
    doc
      .fontSize(9)
      .fillColor(colors.jaipurDark)
      .font("Helvetica-Bold")
      .text("OFFICIAL BOOKING TICKET", 0, cursorY, {
        align: "center",
        characterSpacing: 4,
      });
    cursorY += 22;

    doc
      .fontSize(26)
      .fillColor(colors.royalBlue)
      .font("Times-Bold")
      .text(booking.place?.name || "Heritage Monument", 0, cursorY, {
        align: "center",
      });
    cursorY += 32;

    doc
      .fontSize(10)
      .fillColor(colors.gray)
      .font("Helvetica")
      .text(booking.place?.location || "Jaipur, Rajasthan", 0, cursorY, {
        align: "center",
      });
    cursorY += 22;

    // Ticket x of y badge
    doc
      .fontSize(9)
      .fillColor(colors.jaipurDark)
      .font("Helvetica-Bold")
      .text(`TICKET ${index + 1} OF ${total}`, 0, cursorY, {
        align: "center",
        characterSpacing: 2,
      });
    cursorY += 24;

    // Divider
    doc
      .moveTo(cardX + 50, cursorY)
      .lineTo(cardX + cardW - 50, cursorY)
      .dash(2, { space: 2 })
      .lineWidth(0.6)
      .strokeColor(colors.gold)
      .stroke()
      .undash();
    cursorY += 25;

    // ─── INFO GRID (2 columns) ───
    const leftX = cardX + 50;
    const rightX = cardX + cardW / 2 + 10;
    const colW = cardW / 2 - 60;

    // Modified drawField to accept custom width and allow text wrapping
    const drawField = (x, y, label, value, width = colW) => {
      doc
        .fontSize(8)
        .fillColor(colors.gray)
        .font("Helvetica-Bold")
        .text(label.toUpperCase(), x, y, { width, characterSpacing: 1 });
      doc
        .fontSize(12)
        .fillColor(colors.royalBlue)
        .font("Times-Bold")
        .text(String(value ?? "-"), x, y + 12, { width }); // Removed ellipsis: true to allow wrapping
    };

    drawField(
      leftX,
      cursorY,
      "Booking ID",
      String(booking.id).slice(-12).toUpperCase()
    );
    drawField(rightX, cursorY, "Customer", booking.name || "Guest");
    cursorY += 45;

    drawField(leftX, cursorY, "Email", booking.email || "-");
    drawField(rightX, cursorY, "Phone", booking.phone || "-");
    cursorY += 45;

    drawField(leftX, cursorY, "Date of Visit", formattedDate);
    drawField(rightX, cursorY, "Visiting Time", formattedTime);
    cursorY += 45;

    drawField(leftX, cursorY, "Ticket Type", ticket.type?.name || "Adult");
    drawField(rightX, cursorY, "Payment Mode", booking.paymentMethod);
    cursorY += 45;

    // ─── FIXED VENUE SECTION (Full Width) ───
    drawField(
      leftX,
      cursorY,
      "Venue",
      "Science Department",
      cardW - 100 // Full width
    );
    cursorY += 55; // Extra space for the longer address to wrap nicely

    // ─── DASHED DIVIDER before QR ───
    doc
      .moveTo(cardX + 50, cursorY)
      .lineTo(cardX + cardW - 50, cursorY)
      .dash(4, { space: 4 })
      .lineWidth(0.6)
      .strokeColor(colors.gold)
      .stroke()
      .undash();
    cursorY += 30;

    // ─── QR CODE ───
    const qrSize = 170;
    const qrX = (pageWidth - qrSize) / 2;
    doc.image(qrImage, qrX, cursorY, { width: qrSize, height: qrSize });
    cursorY += qrSize + 10;

    doc
      .fontSize(9)
      .fillColor(colors.gray)
      .font("Helvetica")
      .text("Scan this QR at entry gate", 0, cursorY, { align: "center" });
    cursorY += 16;

    doc
      .fontSize(8)
      .fillColor(colors.gray)
      .font("Courier")
      .text(`Ticket ID: ${ticket.id}`, 0, cursorY, { align: "center" });
    cursorY += 16;

    // ─── FOOTER AMOUNT BAR ───
    const hasGst = Boolean(gstBreakdown.rates);
    const footerH = hasGst ? 120 : 80;
    const footerY = cardY + cardH - footerH - 10;

    // Divider above footer
    doc
      .moveTo(cardX + 20, footerY)
      .lineTo(cardX + cardW - 20, footerY)
      .dash(4, { space: 4 })
      .lineWidth(0.8)
      .strokeColor(colors.gold)
      .stroke()
      .undash();

    if (hasGst) {
      doc
        .fontSize(8)
        .fillColor(colors.gray)
        .font("Helvetica-Bold")
        .text(
          `Taxable amount: Rs ${gstBreakdown.base.toFixed(2)}`,
          cardX + 50,
          footerY + 8
        );

      doc
        .fontSize(8)
        .fillColor(colors.gray)
        .font("Helvetica-Bold")
        .text(
          `CGST (${gstBreakdown.rates}): Rs ${gstBreakdown.cgst.toFixed(2)}`,
          cardX + 50,
          footerY + 20
        );

      doc
        .fontSize(8)
        .fillColor(colors.gray)
        .font("Helvetica-Bold")
        .text(
          `SGST (${gstBreakdown.rates}): Rs ${gstBreakdown.sgst.toFixed(2)}`,
          cardX + 50,
          footerY + 32
        );
    }

    doc
      .fontSize(8)
      .fillColor(colors.gray)
      .font("Helvetica-Bold")
      .text("TOTAL FARE PAID", cardX + 50, footerY + (hasGst ? 48 : 18), {
        characterSpacing: 1,
      });

    doc
      .fontSize(24)
      .fillColor(colors.royalBlue)
      .font("Times-Bold")
      .text(
        `Rs ${booking.totalAmount}`,
        cardX + 50,
        footerY + (hasGst ? 59 : 30)
      );

    const txnId = `#ET-${String(booking.id).slice(-6).toUpperCase()}`;
    doc
      .fontSize(10)
      .fillColor(colors.gray)
      .font("Courier-Bold")
      .text(txnId, cardX + cardW - 200, footerY + (hasGst ? 68 : 40), {
        width: 150,
        align: "right",
      });

    // Bottom note
    doc
      .fontSize(8)
      .fillColor(colors.gray)
      .font("Helvetica-Oblique")
      .text(
        "Please carry a valid ID proof. This ticket is non-transferable.",
        0,
        cardY + cardH - 22,
        { align: "center" }
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
