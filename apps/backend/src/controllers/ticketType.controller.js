import TicketTypeService from "../services/ticketType.service.js";
import PlaceService from "../services/place.service.js";
import { ApiError } from "../utils/ApiError.js";

class TicketTypeController {
  static handle = async (req, res) => {
    if (req.path.endsWith("/public") && req.body?.action !== "getAll") {
      throw ApiError.forbidden("The public entry fee endpoint is read-only");
    }

    if (!req.user && req.body?.action !== "getAll") {
      throw ApiError.forbidden("Only authenticated users can manage entry fees");
    }

    const payload = { ...req.body };

    if (payload.action === "getAll") {
      const roleCode = req.user?.role?.roleCode;
      const isSuperAdmin = roleCode === "SUPER_ADMIN";
      const isLocationAdmin =
        ["ADMIN", "LOCATION_ADMIN"].includes(roleCode) &&
        req.user?.locationId;
      const accessiblePlaces = isLocationAdmin
        ? await PlaceService.getAllPlaces(req.user)
        : [];

      payload.data = {
        ...payload.data,
        allPlaces: isSuperAdmin,
        ...(isLocationAdmin
          ? {
              placeIds: accessiblePlaces.map((place) => place.id),
              createdById: req.user.id,
            }
          : {}),
        includeCreator: isSuperAdmin,
      };
    }

    if (["create", "upsert"].includes(payload.action)) {
      let accessiblePlaces = await PlaceService.getAllPlaces(req.user);

      if (
        !accessiblePlaces.length &&
        req.user.role?.roleCode === "LOCATION_ADMIN" &&
        req.user.locationId
      ) {
        await PlaceService.ensureLocationPlace(req.user);
        accessiblePlaces = await PlaceService.getAllPlaces(req.user);
      }

      const requestedPlace = accessiblePlaces.find(
        (place) => place.id === payload.data?.placeId
      );
      const placeId =
        req.user.placeId ||
        requestedPlace?.id ||
        accessiblePlaces[0]?.id ||
        null;

      if (!placeId) {
        throw ApiError.badRequest(
          accessiblePlaces.length
            ? "Select a place before creating an entry fee"
            : "No place is assigned to your location. Ask an administrator to assign a place first."
        );
      }

      payload.data = {
        ...payload.data,
        placeId,
        createdById: req.user.id,
      };
    }

    const requiresPlaceAccess = ["create", "upsert", "update", "delete"].includes(
      payload.action,
    );
    const allowedPlaceIds =
      requiresPlaceAccess &&
      req.user?.role?.roleCode !== "SUPER_ADMIN"
        ? (await PlaceService.getAllPlaces(req.user)).map((place) => place.id)
        : null;
    const data = await TicketTypeService.handle(payload, allowedPlaceIds);
    res.success(data, "Success");
  };
}

export default TicketTypeController;
