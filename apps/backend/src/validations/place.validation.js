import { z } from "zod";

const slotTemplateSchema = z.object({
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  capacity: z.coerce.number().int().min(1),
});

const slotTemplatesSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}, z.array(slotTemplateSchema).superRefine((slots, context) => {
  const startTimes = new Set();

  slots.forEach((slot, index) => {
    if (slot.startTime >= slot.endTime) {
      context.addIssue({
        code: "custom",
        path: [index, "endTime"],
        message: "End time must be later than start time",
      });
    }

    if (startTimes.has(slot.startTime)) {
      context.addIssue({
        code: "custom",
        path: [index, "startTime"],
        message: "Slot start times must be unique",
      });
    }

    startTimes.add(slot.startTime);
  });
}).optional());

const annexureOptions = [
  "A1",
  "A2",
  "A3",
  "A4",
  "A5",
  "A6",
  "A7",
  "B1",
  "B2",
  "B3",
  "B4",
  "B5",
  "B6",
  "B7",
  "C1",
  "D1",
  "D2",
  "D3",
  "D4",
];

const optionalDescription = z.string().optional();
const optionalRate = z.coerce.number().min(0).nullable().optional();

class PlaceValidation {
  static get create() {
    return z.object({
      annexure: z.enum(["A", "B", "C", "D"]),
      annexureOption: z.enum(annexureOptions),
      rate4Hours: optionalRate,
      rate8Hours: optionalRate,
      ratePerPerson: optionalRate,
      ratePerStudent: optionalRate,
      name: z.string().min(2, "Name required"),
      // location: z.string().min(2, "Location required"),
      shortDescription: optionalDescription,
      description: optionalDescription,
      slotTemplates: slotTemplatesSchema,
      // latitude: z.number().min(-90).max(90),
      // longitude: z.number().min(-180).max(180),
      // latitude: z
      //   .coerce
      //   .number()
      //   .min(-90, "Latitude must be between -90 and 90")
      //   .max(90, "Latitude must be between -90 and 90"),

      // longitude: z
      //   .coerce
      //   .number()
      //   .min(-180, "Longitude must be between -180 and 180")
      //   .max(180, "Longitude must be between -180 and 180"),
      image: z.string().url("Invalid image URL").optional(),
    }).refine(
      (data) => data.annexureOption.startsWith(data.annexure),
      {
        message: "Annexure option does not match the selected annexure",
        path: ["annexureOption"],
      },
    );
  }

  static get update() {
    return z.object({
      annexure: z.enum(["A", "B", "C", "D"]).optional(),
      annexureOption: z.enum(annexureOptions).optional(),
      rate4Hours: optionalRate,
      rate8Hours: optionalRate,
      ratePerPerson: optionalRate,
      ratePerStudent: optionalRate,
      name: z.string().min(2).optional(),
      // location: z.string().min(2, "Location required").optional(),
      shortDescription: optionalDescription,
      description: optionalDescription,
      slotTemplates: slotTemplatesSchema,
      // latitude: z.number().min(-90).max(90).optional(),
      // longitude: z.number().min(-180).max(180).optional(),
      // latitude: z
      //   .coerce
      //   .number()
      //   .min(-90, "Latitude must be between -90 and 90")
      //   .max(90, "Latitude must be between -90 and 90"),

      // longitude: z
      //   .coerce
      //   .number()
      //   .min(-180, "Longitude must be between -180 and 180")
      //   .max(180, "Longitude must be between -180 and 180"),
      image: z.string().url("Invalid image URL").optional(),
    }).refine(
      ({ annexure, annexureOption }) =>
        (annexure === undefined && annexureOption === undefined) ||
        (annexure !== undefined &&
          annexureOption !== undefined &&
          annexureOption.startsWith(annexure)),
      {
        message: "Annexure option does not match the selected annexure",
        path: ["annexureOption"],
      },
    );
  }
}

export default PlaceValidation;
