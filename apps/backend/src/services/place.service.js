import prisma from "../db/db.js";
import { ApiError } from "../utils/ApiError.js";
import { upload, deleteByKey } from "../utils/s3Service.js";

const throwIfAnnexureOptionConflict = (error) => {
  const target = JSON.stringify(error?.meta?.target ?? "");

  if (error?.code === "P2002" && target.includes("annexure")) {
    throw ApiError.conflict("This field already exists.");
  }

  throw error;
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
      name,
      location,
      shortDescription,
      description,
      latitude,
      longitude,
    } = payload;

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

    const existingAnnexureOption = await prisma.place.findFirst({
      where: { annexure, annexureOption },
      select: { id: true },
    });

    if (existingAnnexureOption) {
      throw ApiError.conflict("This field already exists.");
    }

    let imageUrl = null;
    let imageKey = null;

    // Upload image
    if (file) {
      console.log("=== CREATE PLACE IMAGE ===");
      console.log("Original name:", file.originalname);
      console.log("Mimetype:", file.mimetype);
      console.log("Path:", file.path);

      if (!file.path) {
        throw ApiError.badRequest("Uploaded file path is missing");
      }

      const uploaded = await upload(file.path);

      console.log("S3 uploaded:", uploaded);

      imageUrl = uploaded?.url || null;
      imageKey = uploaded?.key || null;
    }

    try {
      return await prisma.place.create({
        data: {
          createdById: currentUser.id,
          annexure,
          annexureOption,
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
    } catch (error) {
      throwIfAnnexureOptionConflict(error);
    }
  }


  // =========================================================
  // GET ALL PLACES BY USER LEVEL
  // =========================================================

  static async getAllPlaces(currentUser) {
    if (!currentUser?.id) {
      throw ApiError.unauthorized("Authentication required");
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
        select: { name: true },
      });

      if (!location?.name && !isAdmin) {
        return [];
      }

      let where = { createdById: user.id };

      if (location?.name) {
        where = isAdmin
          ? {
              OR: [
                { location: location.name },
                { createdById: user.id },
              ],
            }
          : { location: location.name };
      }

      return prisma.place.findMany({
        where,
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
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    if (isAdmin) {
      return prisma.place.findMany({
        where: { createdById: user.id },
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
      throw ApiError.unauthorized("Authentication required");
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
      name,
      location,
      shortDescription,
      description,
      latitude,
      longitude,
    } = payload;

    const nextName = name ?? existing.name;
    const nextLocation = location ?? existing.location;
    const nextAnnexure = annexure ?? existing.annexure;
    const nextAnnexureOption = annexureOption ?? existing.annexureOption;

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

    const duplicateAnnexureOption =
      nextAnnexure && nextAnnexureOption
        ? await prisma.place.findFirst({
            where: {
              annexure: nextAnnexure,
              annexureOption: nextAnnexureOption,
              NOT: { id },
            },
            select: { id: true },
          })
        : null;

    if (duplicateAnnexureOption) {
      throw ApiError.conflict("This field already exists.");
    }

    let imageUrl = existing.imageUrl;
    let imageKey = existing.imageKey;

    // =======================================================
    // UPLOAD NEW IMAGE
    // =======================================================
    if (file) {
      console.log("=== UPDATE PLACE IMAGE ===");
      console.log("Original name:", file.originalname);
      console.log("Mimetype:", file.mimetype);
      console.log("Path:", file.path);

      if (!file.path) {
        throw ApiError.badRequest("Uploaded file path is missing");
      }

      const uploaded = await upload(file.path);

      console.log("S3 uploaded:", uploaded);

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
      nextAnnexure === existing.annexure &&
      nextAnnexureOption === existing.annexureOption &&
      nextName === existing.name &&
      nextLocation === existing.location &&
      nextLatitude === Number(existing.latitude) &&
      nextLongitude === Number(existing.longitude) &&
      nextShortDescription === existing.shortDescription &&
      nextDescription === existing.description &&
      imageUrl === existing.imageUrl &&
      imageKey === existing.imageKey;

    if (isSame) {
      throw ApiError.badRequest("Already updated");
    }

    // =======================================================
    // UPDATE DATABASE
    // =======================================================
    let updatedPlace;

    try {
      updatedPlace = await prisma.place.update({
        where: {
          id,
        },
        data: {
          annexure: nextAnnexure,
          annexureOption: nextAnnexureOption,
          name: nextName,
          location: nextLocation,
          latitude: nextLatitude,
          longitude: nextLongitude,
          shortDescription: nextShortDescription,
          description: nextDescription,
          imageUrl,
          imageKey,
        },
      });
    } catch (error) {
      throwIfAnnexureOptionConflict(error);
    }

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