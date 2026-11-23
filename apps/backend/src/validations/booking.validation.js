import { z } from "zod";

class BookingValidation {
 
static get createBooking() {
  return z.object({
    placeId: z.string().uuid(),
    locationId: z.string().min(1),

    slotDateTime: z.string().nullable().optional(),

    bookingType: z.enum(["TICKET", "PASS", "ENTRY_FEE", "ANNEXURE"]).optional(),

    name: z.string().min(2).nullable().optional(),
    email: z.string().email().nullable().optional(),
    phone: z.string().min(10),


    paymentMethod: z.enum(["CASH", "UPI", "ONLINE"]).optional(),

    tickets: z.array(
      z.object({
        typeId: z.string().uuid(),
        quantity: z.number().min(1),
      })
    ).optional(),
    annexureItems: z.array(
      z.object({
        placeId: z.string().uuid(),
        slotDateTime: z.string().min(1),
        slotEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).nullable().optional(),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
        durationHours: z.number().int().nullable().optional(),
        persons: z.number().int().min(0).optional(),
        students: z.number().int().min(0).optional(),
        placeOrSchoolName: z.string().trim().max(191).optional(),
        programAddress: z.string().trim().max(500).optional(),
        audienceSize: z.number().int().min(0).optional(),
        staffCount: z.number().int().min(0).optional(),
        programType: z.enum(["Academic", "Cultural", "Others"]).optional(),
        otherProgramType: z.string().trim().max(191).optional(),
        vipPersonName: z.string().trim().max(191).optional(),
        termsAndConditionsAccepted: z.boolean().optional(),
      })
    ).optional(),
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

    if (data.bookingType === "ANNEXURE") {
      if (!data.annexureItems?.length) {
        ctx.addIssue({
          code: "custom",
          path: ["annexureItems"],
          message: "Select at least one Annexure option",
        });
      }
      data.annexureItems?.forEach((item, index) => {
        if (item.durationHours == null) return;

        const requiredTextFields = [
          ["placeOrSchoolName", item.placeOrSchoolName],
          ["programAddress", item.programAddress],
          ["programType", item.programType],
        ];
        requiredTextFields.forEach(([field, value]) => {
          if (!value) {
            ctx.addIssue({
              code: "custom",
              path: ["annexureItems", index, field],
              message: "This field is required for duration bookings",
            });
          }
        });

        if (item.programType === "Others" && !item.otherProgramType) {
          ctx.addIssue({
            code: "custom",
            path: ["annexureItems", index, "otherProgramType"],
            message: "Specify the program type when Others is selected",
          });
        }

        ["audienceSize", "staffCount"].forEach((field) => {
          if (item[field] === undefined) {
            ctx.addIssue({
              code: "custom",
              path: ["annexureItems", index, field],
              message: "This field is required for duration bookings",
            });
          }
        });

        if (item.termsAndConditionsAccepted !== true) {
          ctx.addIssue({
            code: "custom",
            path: ["annexureItems", index, "termsAndConditionsAccepted"],
            message: "Accept the venue terms and conditions to continue",
          });
        }
      });
    } else if (!data.tickets?.length) {
      ctx.addIssue({
        code: "custom",
        path: ["tickets"],
        message: "At least one ticket is required",
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

  static get annexureRefund() {
    return {
      params: z.object({ id: z.string().uuid() }),
      body: z.object({
        externallyRefunded: z.literal(true),
        items: z
          .array(
            z.object({
              placeId: z.string().uuid(),
              electricityUnits: z.number().min(0).max(10000000),
              damageDeduction: z.number().min(0).max(10000000),
            }),
          )
          .min(1),
      }),
    };
  }

  static get bookingIdParam() {
    return { params: z.object({ id: z.string().uuid() }) };
  }
}

export default BookingValidation;
