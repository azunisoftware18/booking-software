import { z } from "zod";

class BookingValidation {
 
static get createBooking() {
  return z.object({
    placeId: z.string().uuid(),
    locationId: z.string().min(1),

<<<<<<< HEAD
    slotDateTime: z.string().nullable().optional(),
=======
      bookingType: z.enum(["TICKET", "PASS", "ANNEXURE"]).optional(),
>>>>>>> 717a7dd6cd51cb7069ac529c487421cb4b460f59

    bookingType: z.enum(["TICKET", "PASS", "ENTRY_FEE"]).optional(),

    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(10),

    paymentMethod: z.enum(["CASH", "UPI", "ONLINE"]).optional(),

    tickets: z.array(
      z.object({
        typeId: z.string().uuid(),
        quantity: z.number().min(1),
      })
    ).min(1),
  }).superRefine((data, ctx) => {
    if (
      data.bookingType !== "ENTRY_FEE" &&
      !data.slotDateTime
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["slotDateTime"],
        message: "Please select a valid date and slot",
      });
    }
  });
}

<<<<<<< HEAD
=======
      tickets: z.array(
        z.object({
          typeId: z.string().uuid(),
          quantity: z.number().min(1),
        })
      ).optional().default([]),
      annexureItems: z.array(
        z.object({
          placeId: z.string().uuid(),
          slotDateTime: z.string().min(1),
          durationHours: z.union([z.literal(4), z.literal(8)]).nullable().optional(),
          persons: z.number().int().min(0).optional().default(0),
          students: z.number().int().min(0).optional().default(0),
        }),
      ).optional(),
    }).superRefine((data, context) => {
      if (data.bookingType === "ANNEXURE" && !data.annexureItems?.length) {
        context.addIssue({
          code: "custom",
          path: ["annexureItems"],
          message: "Select at least one Annexure option",
        });
      }
    });
  }
>>>>>>> 717a7dd6cd51cb7069ac529c487421cb4b460f59

  static get atomResponse() {
    return z.object({
      encData: z.string().min(1),
    });
  }

  static get publicReceipt() {
    return {
      params: z.object({ id: z.string().uuid() }),
      query: z.object({ receiptToken: z.string().min(1) }),
    };
  }

  static get publicReceiptDownload() {
    return {
      params: z.object({ bookingId: z.string().uuid() }),
      query: z.object({ receiptToken: z.string().min(1) }),
    };
  }
}

export default BookingValidation;
