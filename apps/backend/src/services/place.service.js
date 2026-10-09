import prisma from "../db/db.js";
import { ApiError } from "../utils/ApiError.js";
import { upload, deleteByKey } from "../utils/s3Service.js";

class PlaceService {
  // =========================================================
  // CREATE PLACE
  // =========================================================
  static async createPlace(payload, file) {
    const {
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

    return await prisma.place.create({
      data: {
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
      },
    });

    if (!user) {
      throw ApiError.notFound("User not found");
    }

    // Level 1: All places
    if (user.level === 1) {
      return prisma.place.findMany({
        orderBy: {
          createdAt: "desc",
        },
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
      },
    });

    if (!user) {
      throw ApiError.notFound("User not found");
    }

    // Level 1 can access any place
    // Level 2 and 3 can access only their assigned place
    if (user.level !== 1 && user.placeId !== id) {
      throw ApiError.notFound("Place not found");
    }

    const place = await prisma.place.findUnique({
      where: { id },
    });

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
      name,
      location,
      shortDescription,
      description,
      latitude,
      longitude,
    } = payload;

    const nextName = name ?? existing.name;
    const nextLocation = location ?? existing.location;

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
    const updatedPlace = await prisma.place.update({
      where: {
        id,
      },
      data: {
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