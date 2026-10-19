import { locationService } from "../services/location.service.js";
import {
  createLocationSchema,
  updateLocationSchema,
} from "../validations/location.validation.js";

function sendError(res, error) {
  if (error?.code === "P2002") {
    return res.status(409).json({
      success: false,
      message: "A location with this name already exists.",
    });
  }

  if (error?.code === "P2025") {
    return res.status(404).json({
      success: false,
      message: "Location not found.",
    });
  }

  if (error?.name === "ZodError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: error.issues ?? error.errors,
    });
  }

  console.error("Location API error:", error);

  return res.status(500).json({
    success: false,
    message: "Internal server error.",
  });
}

export const getLocations = async (req, res) => {
  try {
    const search = String(req.query.search ?? "").trim();
    const status = req.query.status
      ? String(req.query.status).toUpperCase()
      : undefined;

    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);

    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid page or limit.",
      });
    }

    if (status && !["ACTIVE", "INACTIVE"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be ACTIVE or INACTIVE.",
      });
    }

    const isSuperAdmin = req.user.role?.roleCode === "SUPER_ADMIN";
    if (!isSuperAdmin && !req.user.locationId) {
      return res.status(200).json({
        success: true,
        message: "Locations fetched successfully.",
        data: [],
        pagination: { total: 0, page, limit, totalPages: 0 },
      });
    }

    const result = await locationService.getAll({
      search,
      status,
      ...(isSuperAdmin ? {} : { locationId: req.user.locationId }),
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      message: "Locations fetched successfully.",
      data: result.locations,
      pagination: result.pagination,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getBookingLocationOptions = async (req, res) => {
  try {
    const locations = await locationService.getActiveBookingOptions();

    return res.status(200).json({
      success: true,
      message: "Available booking locations fetched successfully.",
      data: locations,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getLocationById = async (req, res) => {
  try {
    if (
      req.user.role?.roleCode !== "SUPER_ADMIN" &&
      req.user.locationId !== req.params.id
    ) {
      return res.status(404).json({
        success: false,
        message: "Location not found.",
      });
    }

    const location = await locationService.getById(req.params.id);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Location not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Location fetched successfully.",
      data: location,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const createLocation = async (req, res) => {
  try {
    const parsed = createLocationSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: parsed.error.issues,
      });
    }

    const location = await locationService.create({
      ...parsed.data,
      createdById: req.user.id,
    }, req.file);

    return res.status(201).json({
      success: true,
      message: "Location created successfully.",
      data: location,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const updateLocation = async (req, res) => {
  try {
    const parsed = updateLocationSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: parsed.error.issues,
      });
    }

    const existing = await locationService.getById(req.params.id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Location not found.",
      });
    }

    const location = await locationService.update(
      req.params.id,
      parsed.data,
      req.file,
    );

    return res.status(200).json({
      success: true,
      message: "Location updated successfully.",
      data: location,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const deleteLocation = async (req, res) => {
  try {
    const existing = await locationService.getById(req.params.id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Location not found.",
      });
    }

    const location = await locationService.delete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Location deleted successfully.",
      data: location,
    });
  } catch (error) {
    return sendError(res, error);
  }
};
