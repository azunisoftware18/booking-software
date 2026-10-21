import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
class SlotValidation {
  static get createSlot() {
    return z.object({
      placeId: z.string().uuid(),
      startTime: z.string().regex(timeRegex, "Invalid time format (HH:mm)"),
      endTime: z.string().regex(timeRegex, "Invalid time format (HH:mm)"),
      capacity: z.number().int().min(1),
    }).refine((slot) => slot.startTime < slot.endTime, {
      message: "End time must be later than start time",
      path: ["endTime"],
    });
  }

  static get updateSlot() {
    return z.object({
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      capacity: z.number().int().min(1).optional(),
    }).refine(
      (slot) =>
        slot.startTime === undefined ||
        slot.endTime === undefined ||
        slot.startTime < slot.endTime,
      {
        message: "End time must be later than start time",
        path: ["endTime"],
      },
    );
  }
}

export default SlotValidation;
