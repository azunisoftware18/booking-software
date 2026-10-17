import prisma from "../db/db.js";
import { ApiError } from "../utils/ApiError.js";
import { upload, deleteByKey } from "../utils/s3Service.js";

const publicPlaceSelect = {
  id: true,
  name: true,
  locationId: true,
  annexure: true,
  annexureOption: true,
  rate4Hours: true,
  rate8Hours: true,
  ratePerPerson: true,
  ratePerStudent: true,
  location: true,
  latitude: true,
  longitude: true,
  imageUrl: true,
  shortDescription: true,
  description: true,
  createdAt: true,
  slotTemplates: {
    select: {
      id: true,
      startTime: true,
      endTime: true,
      capacity: true,
    },
    orderBy: { startTime: "asc" },
  },
};

const placeListInclude = {
  slotTemplates: {
    orderBy: { startTime: "asc" },
  },
};

class PlaceService {
  // =========================================================
  // CREATE PLACE
  // =========================================================
  static async createPlace(payload, file, currentUser) {
    if (!currentUser?.id) {
      throw ApiError.unauthorized("Authentication required");
    }

    const {
      annexure,
      annexureOption,
      rate4Hours,
      rate8Hours,
      ratePerPerson,
      ratePerStudent,
      name,
      location,
      shortDescription,
      description,
      latitude,
      longitude,
      slotTemplates = [],
    } = payload;

    const assignedLocationId =
      currentUser.locationId ||
      (
        await prisma.location.findFirst({
          where: {
            OR: [{ name: location }, { city: location }],
            status: "ACTIVE",
          },
          select: { id: true },
        })
      )?.id ||
      null;

    // Check duplicate
    const existing = await prisma.place.findFirst({
      where: {
        name,
        location,
      },
    });

    if (existing) {
      throw ApiError.conflict("Place already exists");
    }

    let imageUrl = null;
    let imageKey = null;

    // Upload image
    if (file) {
      

      if (!file.path) {
        throw ApiError.badRequest("Uploaded file path is missing");
      }

      const uploaded = await upload(file.path);

   

      imageUrl = uploaded?.url || null;
      imageKey = uploaded?.key || null;
    }

    return await prisma.$transaction(async (tx) => {
      const place = await tx.place.create({
        data: {
          createdById: currentUser.id,
          locationId: assignedLocationId,
          annexure,
          annexureOption,
          rate4Hours: rate4Hours == null ? null : Number(rate4Hours),
          rate8Hours: rate8Hours == null ? null : Number(rate8Hours),
          ratePerPerson:
            ratePerPerson == null ? null : Number(ratePerPerson),
          ratePerStudent:
            ratePerStudent == null ? null : Number(ratePerStudent),
          name,
          location,
          latitude: Number(latitude),
          longitude: Number(longitude),
          shortDescription: shortDescription || null,
          description: description || null,
          imageUrl,
          imageKey,
        },
      });

      if (slotTemplates.length) {
        await tx.slotTemplate.createMany({
          data: slotTemplates.map(({ startTime, endTime, capacity }) => ({
            placeId: place.id,
            startTime,
            endTime,
            capacity,
          })),
        });
      }

      return place;
    });
  }

  static async ensureLocationPlace(currentUser) {
    if (!currentUser?.locationId) {
      throw ApiError.badRequest("A location must be assigned to this account");
    }

    const location = await prisma.location.findUnique({
      where: { id: currentUser.locationId },
      select: { name: true, city: true, state: true },
    });

    if (!location) {
      throw ApiError.notFound("Assigned location not found");
    }

    const name = location.name.trim();
    const placeLocation =
      [location.city, location.state].filter(Boolean).join(", ") || name;

    return prisma.place.upsert({
      where: {
        name_location: {
          name,
          location: placeLocation,
        },
      },
      update: {},
      create: {
        name,
        location: placeLocation,
        createdById: currentUser.id,
      },
    });
  }


  // =========================================================
  // GET ALL PLACES BY USER LEVEL
  // =========================================================

  static async getAllPlaces(currentUser) {
    if (!currentUser?.id) {
      return prisma.place.findMany({
        select: publicPlaceSelect,
        orderBy: { createdAt: "desc" },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: {
        id: true,
        level: true,
        placeId: true,
        locationId: true,
        role: {
          select: { roleCode: true },
        },
      },
    });

    if (!user) {
      throw ApiError.notFound("User not found");
    }

    if (user.role?.roleCode === "SUPER_ADMIN") {
      return prisma.place.findMany({
        include: placeListInclude,
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    const isAdmin = ["ADMIN", "LOCATION_ADMIN"].includes(
      user.role?.roleCode,
    );

    if (user.locationId) {
      const location = await prisma.location.findUnique({
        where: { id: user.locationId },
        select: { name: true, city: true },
      });

      if (!location?.name && !location?.city && !isAdmin) {
        return [];
      }

      const locationTerms = [...new Set([location?.name, location?.city])].filter(
        Boolean,
      );
      const locationFilters = locationTerms.flatMap((term) => [
        { name: term },
        { location: term },
        { location: { startsWith: `${term} (` } },
        { location: { startsWith: `${term},` } },
      ]);

      let where = { createdById: user.id };

      if (locationFilters.length) {
        where = isAdmin
          ? {
              OR: [
                ...locationFilters,
                { createdById: user.id },
              ],
            }
          : { OR: locationFilters };
      }

      return prisma.place.findMany({
        where,
        include: placeListInclude,
        orderBy: { createdAt: "desc" },
      });
    }

    // Preserve existing access for legacy level-one users.
    if (
      user.level === 1 &&
      user.role?.roleCode !== "ADMIN" &&
      user.role?.roleCode !== "LOCATION_ADMIN"
    ) {
      return prisma.place.findMany({
        include: placeListInclude,
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    if (isAdmin) {
      return prisma.place.findMany({
        where: { createdById: user.id },
        include: placeListInclude,
        orderBy: { createdAt: "desc" },
      });
    }

    // Level 2 and 3: Only assigned place
    if (!user.placeId) {
      return [];
    }

    return prisma.place.findMany({
      where: {
        id: user.placeId,
      },
      include: placeListInclude,
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  // =========================================================
  // GET PLACE BY ID WITH LEVEL RESTRICTION
  // =========================================================

  static async getPlaceById(id, currentUser) {
    if (!currentUser?.id) {
      const place = await prisma.place.findUnique({
        where: { id },
        select: publicPlaceSelect,
      });

      if (!place) {
        throw ApiError.notFound("Place not found");
      }

      return place;
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: {
        id: true,
        level: true,
        placeId: true,
        locationId: true,
        role: {
          select: { roleCode: true },
        },
      },
    });

    if (!user) {
      throw ApiError.notFound("User not found");
    }

    const availablePlaces = await this.getAllPlaces(currentUser);
    const place = availablePlaces.find(
      (availablePlace) => availablePlace.id === id,
    );

    if (!place) {
      throw ApiError.notFound("Place not found");
    }

    return place;
  }


  // =========================================================
  // UPDATE PLACE
  // =========================================================
  static async updatePlace(id, payload, file) {
    const existing = await prisma.place.findUnique({
      where: {
        id,
      },
    });

    if (!existing) {
      throw ApiError.notFound("Place not found");
    }

    const {
      annexure,
      annexureOption,
      rate4Hours,
      rate8Hours,
      ratePerPerson,
      ratePerStudent,
      name,
      location,
      shortDescription,
      description,
      latitude,
      longitude,
    } = payload;

    const nextName = name ?? existing.name;
    const nextLocation = location ?? existing.location;
    const nextLocationId =
      nextLocation === existing.location
        ? existing.locationId
        : (
            await prisma.location.findFirst({
              where: {
                OR: [{ name: nextLocation }, { city: nextLocation }],
                status: "ACTIVE",
              },
              select: { id: true },
            })
          )?.id || null;
    const nextAnnexure = annexure ?? existing.annexure;
    const nextAnnexureOption = annexureOption ?? existing.annexureOption;
    const nextRate4Hours =
      rate4Hours !== undefined ? Number(rate4Hours) : existing.rate4Hours;
    const nextRate8Hours =
      rate8Hours !== undefined ? Number(rate8Hours) : existing.rate8Hours;
    const nextRatePerPerson =
      ratePerPerson !== undefined
        ? Number(ratePerPerson)
        : existing.ratePerPerson;
    const nextRatePerStudent =
      ratePerStudent !== undefined
        ? Number(ratePerStudent)
        : existing.ratePerStudent;

    // Check duplicate
    const duplicate = await prisma.place.findFirst({
      where: {
        name: nextName,
        location: nextLocation,
        NOT: {
          id,
        },
      },
    });

    if (duplicate) {
      throw ApiError.conflict("Place already exists");
    }

    let imageUrl = existing.imageUrl;
    let imageKey = existing.imageKey;

    // =======================================================
    // UPLOAD NEW IMAGE
    // =======================================================
    if (file) {
     

      if (!file.path) {
        throw ApiError.badRequest("Uploaded file path is missing");
      }

      const uploaded = await upload(file.path);


      imageUrl = uploaded?.url || null;
      imageKey = uploaded?.key || null;
    }

    // =======================================================
    // CHECK CHANGES
    // =======================================================
    const nextLatitude =
      latitude !== undefined
        ? Number(latitude)
        : Number(existing.latitude);

    const nextLongitude =
      longitude !== undefined
        ? Number(longitude)
        : Number(existing.longitude);

    const nextShortDescription =
      shortDescription !== undefined
        ? shortDescription || null
        : existing.shortDescription;

    const nextDescription =
      description !== undefined
        ? description || null
        : existing.description;

    const isSame =
      nextName === existing.name &&
      nextLocation === existing.location &&
      nextLocationId === existing.locationId &&
      nextAnnexure === existing.annexure &&
      nextAnnexureOption === existing.annexureOption &&
      nextRate4Hours === existing.rate4Hours &&
      nextRate8Hours === existing.rate8Hours &&
      nextRatePerPerson === existing.ratePerPerson &&
      nextRatePerStudent === existing.ratePerStudent &&
      nextLatitude === Number(existing.latitude) &&
      nextLongitude === Number(existing.longitude) &&
      nextShortDescription === existing.shortDescription &&
      nextDescription === existing.description &&
      imageUrl === existing.imageUrl &&
      imageKey === existing.imageKey;

    if (isSame) {
      return existing;
    }

    // =======================================================
    // UPDATE DATABASE
    // =======================================================
    const updatedPlace = await prisma.place.update({
      where: {
        id,
      },
      data: {
        name: nextName,
        location: nextLocation,
        locationId: nextLocationId,
        annexure: nextAnnexure,
        annexureOption: nextAnnexureOption,
        rate4Hours: nextRate4Hours,
        rate8Hours: nextRate8Hours,
        ratePerPerson: nextRatePerPerson,
        ratePerStudent: nextRatePerStudent,
        latitude: nextLatitude,
        longitude: nextLongitude,
        shortDescription: nextShortDescription,
        description: nextDescription,
        imageUrl,
        imageKey,
      },
    });

    // =======================================================
    // DELETE OLD S3 IMAGE
    // =======================================================
    if (
      file &&
      existing.imageKey &&
      existing.imageKey !== imageKey
    ) {
      try {
        await deleteByKey(existing.imageKey);
      } catch (error) {
        console.error(
          "Failed to delete old place image:",
          error
        );
      }
    }

    return updatedPlace;
  }

  // =========================================================
  // DELETE PLACE
  // =========================================================
  static async deletePlace(id) {
    const existing = await prisma.place.findUnique({
      where: {
        id,
      },
    });

    if (!existing) {
      throw ApiError.notFound("Place not found");
    }

    // Delete image from S3
    if (existing.imageKey) {
      try {
        await deleteByKey(existing.imageKey);
      } catch (error) {
        console.error(
          "Failed to delete place image:",
          error
        );
      }
    }

    await prisma.place.delete({
      where: {
        id,
      },
    });

    return true;
  }
}

export default PlaceService;