import prisma from "../db/db.js";

const locationSelect = {
  id: true,
  name: true,
  description: true,
  address: true,
  city: true,
  state: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
};

export const locationService = {
  async getActiveBookingOptions() {
    const locations = await prisma.location.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
      },
      orderBy: [{ city: "asc" }, { name: "asc" }],
    });

    if (!locations.length) return [];

    const places = await prisma.place.findMany({
      where: {
        OR: locations.flatMap(({ name }) => [
          { name },
          { location: name },
          { location: { startsWith: `${name} (` } },
          { location: { startsWith: `${name},` } },
        ]),
      },
      select: {
        id: true,
        name: true,
        location: true,
        latitude: true,
        longitude: true,
        imageUrl: true,
        shortDescription: true,
        ticketTypes: {
          where: { isAvailable: true },
          select: {
            id: true,
            name: true,
            center: true,
            price: true,
            maxPerBooking: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    });

    return locations.map((location) => {
      const normalizedName = location.name.trim().toLowerCase();
      const venues = places.filter((place) => {
        const placeName = place.name.trim().toLowerCase();
        const placeLocation = place.location?.trim().toLowerCase() || "";

        return (
          placeName === normalizedName ||
          placeLocation === normalizedName ||
          placeLocation.startsWith(`${normalizedName} (`) ||
          placeLocation.startsWith(`${normalizedName},`)
        );
      });

      return {
        ...location,
        venues,
        entryFees: venues.flatMap((venue) =>
          venue.ticketTypes.map((ticketType) => ({
            ...ticketType,
            venueId: venue.id,
            venueName: venue.name,
          })),
        ),
      };
    });
  },

  async getAll({
    search = "",
    status,
    locationId,
    page = 1,
    limit = 10,
  }) {
    const where = {
      ...(locationId !== undefined ? { id: locationId } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { description: { contains: search } },
              { address: { contains: search } },
              { city: { contains: search } },
              { state: { contains: search } },
            ],
          }
        : {}),
    };

    const [locations, total] = await prisma.$transaction([
      prisma.location.findMany({
        where,
        select: locationSelect,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.location.count({ where }),
    ]);

    return {
      locations,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getById(id) {
    return prisma.location.findUnique({
      where: { id },
      select: locationSelect,
    });
  },

  async create(data) {
    return prisma.location.create({
      data,
      select: locationSelect,
    });
  },

  async update(id, data) {
    return prisma.location.update({
      where: { id },
      data,
      select: locationSelect,
    });
  },

  async delete(id) {
    return prisma.location.delete({
      where: { id },
      select: locationSelect,
    });
  },
};