import {
  SlotTemplateService,
  SlotOverrideService,
  SlotService,
} from "../services/slot.service.js";

class SlotTemplateController {
  static create = async (req, res) => {
    const data = await SlotTemplateService.create(req.body, req.user);
    res.success(data, "Template created");
  };

  static list = async (req, res) => {
    const data = await SlotTemplateService.getAll(req.params.placeId, req.user);
    res.success(data);
  };

  static update = async (req, res) => {
    const data = await SlotTemplateService.update(
      req.params.id,
      req.body,
      req.user,
    );
    res.success(data, "Updated");
  };

  static delete = async (req, res) => {
    await SlotTemplateService.delete(req.params.id, req.user);
    res.success(null, "Deleted");
  };
}

class SlotOverrideController {
  static upsert = async (req, res) => {
    const data = await SlotOverrideService.upsert(req.body, req.user);
    res.success(data, "Override saved");
  };
  static getAll = async (req, res) => {
    const { placeId, date } = req.params;
    const data = await SlotOverrideService.getAll(placeId, date, req.user);
    res.success(data);
  };
}

class SlotController {
  static getByDate = async (req, res) => {
    const { placeId, date } = req.params;

    const data = await SlotService.getSlotsByDate(placeId, date, req.user);

    res.success(data, "Slots fetched");
  };
}

export { SlotTemplateController, SlotOverrideController, SlotController };
