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

    const locationNames = [
      ...new Set(
        locations
          .flatMap(({ name, city }) => [name, city])
          .filter(Boolean)
          .map((name) => name.trim()),
      ),
    ];

    const places = await prisma.place.findMany({
      where: {
        OR: [
          { locationId: { in: locations.map(({ id }) => id) } },
          ...locations.flatMap(({ name }) => [
            { name },
            { location: name },
            { location: { startsWith: `${name} (` } },
            { location: { startsWith: `${name},` } },
          ]),
        ],
      },
      select: {
        id: true,
        locationId: true,
        name: true,
        location: true,
        annexure: true,
        annexureOption: true,
        rate4Hours: true,
        rate8Hours: true,
        ratePerPerson: true,
        ratePerStudent: true,
        latitude: true,
        longitude: true,
        imageUrl: true,
        shortDescription: true,
      },
      orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    });

    const ticketTypes = await prisma.ticketType.findMany({
      where: {
        isAvailable: true,
        center: { in: locationNames },
      },
      select: {
        id: true,
        name: true,
        center: true,
        price: true,
        taxPercent: true,
        placeId: true,
        place: {
          select: {
            id: true,
            locationId: true,
            name: true,
            location: true,
            annexure: true,
            annexureOption: true,
            rate4Hours: true,
            rate8Hours: true,
            ratePerPerson: true,
            ratePerStudent: true,
            latitude: true,
            longitude: true,
            imageUrl: true,
            shortDescription: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return locations.map((location) => {
      const locationNames = [location.name, location.city]
        .filter(Boolean)
        .map((name) => name.trim().toLowerCase());
      const matchesLocation = (value = "") => {
        const normalizedValue = value.trim().toLowerCase();
        return locationNames.some(
          (name) =>
            normalizedValue === name ||
            normalizedValue.startsWith(`${name} (`) ||
            normalizedValue.startsWith(`${name},`),
        );
      };
      const locationTicketTypes = ticketTypes.filter((ticketType) =>
        matchesLocation(ticketType.center),
      );
      const venueMap = new Map();

      for (const place of places) {
        const belongsToLocation = place.locationId
          ? place.locationId === location.id
          : matchesLocation(place.name) || matchesLocation(place.location);
        if (belongsToLocation) {
          venueMap.set(place.id, place);
        }
      }

      for (const ticketType of locationTicketTypes) {
        const ticketPlace = ticketType.place;
        const belongsToLocation = ticketPlace.locationId
          ? ticketPlace.locationId === location.id
          : matchesLocation(ticketPlace.name) ||
            matchesLocation(ticketPlace.location);
        if (belongsToLocation) {
          venueMap.set(ticketPlace.id, ticketPlace);
        }
      }

      const venues = [...venueMap.values()];

      return {
        ...location,
        venues,
        entryFees: locationTicketTypes.map((ticketType) => ({
          ...ticketType,
          venueId: ticketType.placeId,
          venueName: ticketType.place.name,
        })),
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