import asyncHandler from "../utils/AsyncHandler.js";
import PlaceService from "../services/place.service.js";

class PlaceController {
  static create = async (req, res) => {
    
    const data = await PlaceService.createPlace(req.body, req.file, req.user);
    return res.success(data, "Place created", 201);
  };


  static getAll = async (req, res) => {
    const data = await PlaceService.getAllPlaces(req.user);

    return res.success(data, "Places fetched");
  };

  static getById = async (req, res) => {
    const data = await PlaceService.getPlaceById(
      req.params.id,
      req.user
    );

    return res.success(data, "Place fetched");
  };


  static update = async (req, res) => {
    
    const data = await PlaceService.updatePlace(
      req.params.id,
      req.body,
      req.file
    );
    return res.success(data, "Place updated");
  };

  static delete = async (req, res) => {
    await PlaceService.deletePlace(req.params.id);
    return res.success(null, "Place deleted");
  };
}

export default PlaceController;
