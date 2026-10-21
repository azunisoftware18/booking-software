import prisma from "../db/db.js";
import { ApiError } from "../utils/ApiError.js";
import PlaceService from "./place.service.js";

async function assertPlaceAccess(placeId, currentUser) {
  const places = await PlaceService.getAllPlaces(currentUser);

  if (!places.some((place) => place.id === placeId)) {
    throw ApiError.forbidden("Access to this place denied");
  }
}

class SlotTemplateService {
  static async create(payload, currentUser) {
    const { placeId, startTime, endTime, capacity } = payload;
    await assertPlaceAccess(placeId, currentUser);

    const place = await prisma.place.findUnique({
      where: { id: placeId },
    });

    if (!place) throw ApiError.notFound("Place not found");

    const [existingTemplate, sameStartTemplates] = await Promise.all([
      prisma.slotTemplate.findFirst({
        where: { placeId, startTime, endTime },
      }),
      prisma.slotTemplate.findMany({
        where: { placeId, startTime },
        select: { capacity: true },
      }),
    ]);

    if (existingTemplate) {
      throw ApiError.conflict("Slot template already exists");
    }

    if (sameStartTemplates.some((template) => template.capacity !== capacity)) {
      throw ApiError.conflict(
        "Slots with the same start time must have the same capacity",
      );
    }

    return prisma.slotTemplate.create({
      data: { placeId, startTime, endTime, capacity },
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
      throw ApiError.forbidden("A slot template cannot be moved to another place");
    }

    const startTime = payload.startTime ?? existing.startTime;
    const endTime = payload.endTime ?? existing.endTime;
    const capacity = payload.capacity ?? existing.capacity;

    if (startTime >= endTime) {
      throw ApiError.badRequest("End time must be later than start time");
    }

    const [duplicateTemplate, sameStartTemplates] = await Promise.all([
      prisma.slotTemplate.findFirst({
        where: {
          placeId: existing.placeId,
          startTime,
          endTime,
          id: { not: id },
        },
      }),
      prisma.slotTemplate.findMany({
        where: { placeId: existing.placeId, startTime, id: { not: id } },
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
        "Slots with the same start time must have the same capacity",
      );
    }

    return prisma.$transaction(async (tx) => {
      if (payload.capacity !== undefined && sameStartTemplates.length) {
        await tx.slotTemplate.updateMany({
          where: { placeId: existing.placeId, startTime },
          data: { capacity },
        });
      }

      return tx.slotTemplate.update({
        where: { id },
        data: { ...payload, placeId: existing.placeId },
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
class SlotService {
  static async getSlotsByDate(placeId, date, currentUser) {
    await assertPlaceAccess(placeId, currentUser);

    const templates = await prisma.slotTemplate.findMany({
      where: { placeId },
    });

    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);

    const overrides = await prisma.slotOverride.findMany({
      where: {
        placeId,
        date: {
          gte: start,
          lte: end,
        },
      },
    });

    const now = new Date();
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
            gte: new Date(`${date}T00:00:00.000Z`),
            lt: new Date(`${date}T23:59:59.999Z`),
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
            gte: new Date(`${date}T00:00:00.000Z`),
            lt: new Date(`${date}T23:59:59.999Z`),
          },
          booking: { is: activeBookingFilter },
        },
        select: {
          slotDateTime: true,
          seatCount: true,
        },
      }),
    ]);

    return templates.map((t) => {
      const override = overrides.find((o) => o.startTime === t.startTime);

      const capacity = override?.capacity ?? t.capacity;

      const slotDateTime = new Date(`${date}T${t.startTime}:00`);

      const bookedRegularSeats = bookings.reduce((total, booking) => {
        const bookingTime = new Date(booking.slotDateTime)
          .toISOString()
          .slice(11, 16);

        return bookingTime === t.startTime ? total + booking.totalSeats : total;
      }, 0);
      const bookedAnnexureSeats = annexureBookings.reduce((total, booking) => {
        const bookingTime = new Date(booking.slotDateTime)
          .toISOString()
          .slice(11, 16);

        return bookingTime === t.startTime ? total + booking.seatCount : total;
      }, 0);
      const booked = bookedRegularSeats + bookedAnnexureSeats;

      const available = Math.max(capacity - booked, 0);

      let status = "available";

      if (override?.isClosed) status = "unavailable";
      else if (slotDateTime < now) status = "unavailable";
      else if (available === 0) status = "Slot full";

      return {
        time: t.startTime,
        startTime: formatTime12Hour(t.startTime),
        endTime: formatTime12Hour(t.endTime),
        capacity,
        booked,
        available,
        status,
      };
    });
  }
}

export { SlotTemplateService, SlotOverrideService, SlotService };
