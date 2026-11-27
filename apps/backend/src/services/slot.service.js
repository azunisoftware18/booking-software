import prisma from "../db/db.js";
import { ApiError } from "../utils/ApiError.js";
import PlaceService from "./place.service.js";
import { isSlotPast } from "../utils/slotTime.js";

async function assertPlaceAccess(placeId, currentUser) {
  const places = await PlaceService.getAllPlaces(currentUser);

  if (!places.some((place) => place.id === placeId)) {
    throw ApiError.forbidden("Access to this place denied");
  }
}

function assertWeekdayDate(date) {
  if (date.getUTCDay() === 1) {
    throw ApiError.badRequest("Slots cannot be scheduled on Mondays");
  }
}

class SlotTemplateService {
  static async create(payload, currentUser) {
    const { placeId, date, startTime, endTime, capacity } = payload;
    const parsedDate = new Date(`${date}T00:00:00.000Z`);
    assertWeekdayDate(parsedDate);
    await assertPlaceAccess(placeId, currentUser);

    const place = await prisma.place.findUnique({
      where: { id: placeId },
    });

    if (!place) throw ApiError.notFound("Place not found");

    const [existingTemplate, sameStartTemplates] = await Promise.all([
      prisma.slotTemplate.findFirst({
        where: { placeId, date: parsedDate, startTime, endTime },
      }),
      prisma.slotTemplate.findMany({
        where: { placeId, date: parsedDate, startTime },
        select: { capacity: true },
      }),
    ]);

    if (existingTemplate) {
      throw ApiError.conflict("Slot template already exists");
    }

    if (sameStartTemplates.some((template) => template.capacity !== capacity)) {
      throw ApiError.conflict(
        "Slots with the same start time must have the same capacity"
      );
    }

    return prisma.slotTemplate.create({
      data: { placeId, date: parsedDate, startTime, endTime, capacity },
    });
  }

  static async getAll(placeId, currentUser) {
    await assertPlaceAccess(placeId, currentUser);

    return prisma.slotTemplate.findMany({
      where: { placeId },
      orderBy: [{ startTime: "asc" }, { endTime: "asc" }],
    });
  }

  static async update(id, payload, currentUser) {
    const existing = await prisma.slotTemplate.findUnique({
      where: { id },
    });

    if (!existing) throw ApiError.notFound("Slot template not found");
    await assertPlaceAccess(existing.placeId, currentUser);

    if (payload.placeId && payload.placeId !== existing.placeId) {
      throw ApiError.forbidden(
        "A slot template cannot be moved to another place"
      );
    }

    const startTime = payload.startTime ?? existing.startTime;
    const endTime = payload.endTime ?? existing.endTime;
    const date = payload.date ?? (existing.date ? existing.date.toISOString().slice(0, 10) : undefined);
    const parsedDate = date ? new Date(`${date}T00:00:00.000Z`) : null;
    const capacity = payload.capacity ?? existing.capacity;

    if (payload.date !== undefined && parsedDate) {
      assertWeekdayDate(parsedDate);
    }

    if (startTime >= endTime) {
      throw ApiError.badRequest("End time must be later than start time");
    }

    const [duplicateTemplate, sameStartTemplates] = await Promise.all([
      prisma.slotTemplate.findFirst({
        where: {
          placeId: existing.placeId,
          date: parsedDate,
          startTime,
          endTime,
          id: { not: id },
        },
      }),
      prisma.slotTemplate.findMany({
        where: { placeId: existing.placeId, date: parsedDate, startTime, id: { not: id } },
        select: { capacity: true },
      }),
    ]);

    if (duplicateTemplate) {
      throw ApiError.conflict("Slot template already exists");
    }

    if (
      payload.capacity === undefined &&
      sameStartTemplates.some((template) => template.capacity !== capacity)
    ) {
      throw ApiError.conflict(
        "Slots with the same start time must have the same capacity"
      );
    }

    return prisma.$transaction(async (tx) => {
      if (payload.capacity !== undefined && sameStartTemplates.length) {
        await tx.slotTemplate.updateMany({
          where: { placeId: existing.placeId, date: parsedDate, startTime },
          data: { capacity },
        });
      }

      return tx.slotTemplate.update({
        where: { id },
        data: { ...payload, placeId: existing.placeId, ...(parsedDate ? { date: parsedDate } : {}) },
      });
    });
  }

  static async delete(id, currentUser) {
    const existing = await prisma.slotTemplate.findUnique({
      where: { id },
      select: { placeId: true },
    });

    if (!existing) throw ApiError.notFound("Slot template not found");
    await assertPlaceAccess(existing.placeId, currentUser);

    await prisma.slotTemplate.delete({ where: { id } });
    return true;
  }
}

class SlotOverrideService {
  static async upsert(payload, currentUser) {
    const { placeId, date, startTime, capacity, isClosed } = payload;
    await assertPlaceAccess(placeId, currentUser);

    const parsedDate = new Date(`${date}T00:00:00.000Z`);
    assertWeekdayDate(parsedDate);

    return prisma.slotOverride.upsert({
      where: {
        placeId_date_startTime: {
          placeId,
          date: parsedDate,
          startTime,
        },
      },
      update: {
        capacity,
        isClosed,
        date: parsedDate,
      },
      create: {
        placeId,
        date: parsedDate,
        startTime,
        capacity,
        isClosed,
      },
    });
  }
  static async getAll(placeId, date, currentUser) {
    await assertPlaceAccess(placeId, currentUser);

    const start = new Date(`${date}T00:00:00.000Z`);

    const end = new Date(`${date}T23:59:59.999Z`);

    return prisma.slotOverride.findMany({
      where: {
        placeId,
        date: {
          gte: start,
          lte: end,
        },
      },

      orderBy: {
        startTime: "asc",
      },
    });
  }
}

const formatTime12Hour = (time) => {
  const [hour, minute] = time.split(":");

  const date = new Date();

  date.setHours(hour);
  date.setMinutes(minute);

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const getTimeMinutes = (time) => {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
};

class SlotService {
  static async getTemplatesForDate(placeId, date, client = prisma) {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);
    const orderBy = [{ startTime: "asc" }, { endTime: "asc" }];

    const [recurringTemplates, dateTemplates] = await Promise.all([
      client.slotTemplate.findMany({
        where: { placeId, date: null },
        orderBy,
      }),
      client.slotTemplate.findMany({
        where: { placeId, date: { gte: start, lte: end } },
        orderBy,
      }),
    ]);

    let applicableDateTemplates = dateTemplates;
    if (!applicableDateTemplates.length) {
      const previousTemplate = await client.slotTemplate.findFirst({
        where: { placeId, date: { lt: start } },
        orderBy: { date: "desc" },
        select: { date: true },
      });

      if (previousTemplate?.date) {
        applicableDateTemplates = await client.slotTemplate.findMany({
          where: { placeId, date: previousTemplate.date },
          orderBy,
        });
      }
    }

    return [...recurringTemplates, ...applicableDateTemplates].sort(
      (first, second) =>
        first.startTime.localeCompare(second.startTime) ||
        first.endTime.localeCompare(second.endTime)
    );
  }

  static async getSlotsByDate(placeId, date, currentUser) {
    await assertPlaceAccess(placeId, currentUser);

    const start = new Date(`${date}T00:00:00.000Z`);
    if (start.getUTCDay() === 1) return [];

    const end = new Date(`${date}T23:59:59.999Z`);

    const templates = await SlotService.getTemplatesForDate(
      placeId,
      date
    );

    const overrides = await prisma.slotOverride.findMany({
      where: {
        placeId,
        date: { gte: start, lte: end },
      },
    });

    const now = new Date();

    // Get current date and time in India timezone.
    const activeBookingFilter = {
      OR: [
        { status: "PAID" },
        {
          status: "PENDING",
          expiresAt: { gt: now },
        },
      ],
    };

    const [bookings, annexureBookings] = await Promise.all([
      prisma.booking.findMany({
        where: {
          placeId,
          slotDateTime: {
            gte: start,
            lt: end,
          },
          bookingType: { not: "ANNEXURE" },
          ...activeBookingFilter,
        },
        select: {
          slotDateTime: true,
          totalSeats: true,
        },
      }),

      prisma.bookingAnnexureItem.findMany({
        where: {
          placeId,
          slotDateTime: {
            gte: start,
            lt: end,
          },
          booking: {
            is: activeBookingFilter,
          },
        },
        select: {
          slotDateTime: true,
          seatCount: true,
        },
      }),
    ]);

    return templates.map((t) => {
      const override = overrides.find(
        (o) => o.startTime === t.startTime,
      );

      const capacity = override?.capacity ?? t.capacity;

      const bookedRegularSeats = bookings.reduce(
        (total, booking) => {
          const bookingTime = new Date(booking.slotDateTime)
            .toISOString()
            .slice(11, 16);

          return bookingTime === t.startTime
            ? total + booking.totalSeats
            : total;
        },
        0,
      );

      const bookedAnnexureSeats = annexureBookings.reduce(
        (total, booking) => {
          const bookingTime = new Date(booking.slotDateTime)
            .toISOString()
            .slice(11, 16);

          return bookingTime === t.startTime
            ? total + booking.seatCount
            : total;
        },
        0,
      );

      const booked = bookedRegularSeats + bookedAnnexureSeats;
      const available = Math.max(capacity - booked, 0);

      let status = "available";

      if (isSlotPast(date, t.endTime, now)) {
        status = "expired";
      } else if (override?.isClosed) {
        status = "unavailable";
      } else if (available === 0) {
        status = "Slot full";
      }

      return {
        time: t.startTime,
        startTime: formatTime12Hour(t.startTime),
        endTime: formatTime12Hour(t.endTime),
        endTimeValue: t.endTime,
        durationMinutes: getTimeMinutes(t.endTime) - getTimeMinutes(t.startTime),
        capacity,
        booked,
        available,
        status,
      };
    });
  }
}


export { SlotTemplateService, SlotOverrideService, SlotService };
