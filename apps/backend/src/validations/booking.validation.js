import { z } from "zod";

class BookingValidation {
 
static get createBooking() {
  return z.object({
    placeId: z.string().uuid(),
    locationId: z.string().min(1),

    slotDateTime: z.string().nullable().optional(),

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
