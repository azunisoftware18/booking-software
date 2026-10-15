import { z } from "zod";

class BookingValidation {
  static get createBooking() {
    return z.object({
      placeId: z.string().uuid(),
      locationId: z.string().min(1),
      slotDateTime: z.string(),

      bookingType: z.enum(["TICKET", "PASS"]).optional(),

      name: z.string().min(2),
      email: z.string().email(),
      phone: z.string().min(10),
      paymentMethod: z.enum(["CASH", "UPI", "ONLINE"]).optional(),

      tickets: z.array(
        z.object({
          typeId: z.string().uuid(),
          quantity: z.number().min(1),
        })
      ),
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
