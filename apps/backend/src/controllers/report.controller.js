import ReportService from "../services/report.service.js";

class ReportController {
  static analytics = async (req, res) => {
    const data = await ReportService.getAnalytics(req.user, req.query);
    return res.json({ success: true, data, message: "Analytics fetched" });
  };
}

export default ReportController;
