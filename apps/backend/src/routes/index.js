import { Router } from "express";
import bookingRoute from "./booking.routes.js";
import slotRoute from "./slot.routes.js";
import authRoute from "./auth.routes.js";
import placeRoute from "./place.routes.js";
import ticketTypeRoute from "./ticketType.routes.js";
import addonRoute from "./addon.routes.js";
import ticketRoutes from "./ticket.routes.js";  
import scanLogRoutes from "./scanLog.routes.js";
import settingRoute from "./setting.routes.js";
import roleRoute from "./role.routes.js";
import userRoute from "./user.routes.js";
import permissionRoute from "./permission.routes.js";

const router = Router();

// 📦 all routes
router.use("/auth", authRoute);
router.use("/place", placeRoute);
router.use("/booking", bookingRoute);
router.use("/slot", slotRoute);
router.use("/ticket-type", ticketTypeRoute);
router.use("/addon", addonRoute);
router.use("/ticket", ticketRoutes);
router.use("/scan-log", scanLogRoutes);
router.use("/setting", settingRoute);
router.use("/role", roleRoute);
router.use("/user", userRoute);
router.use("/permission", permissionRoute);



export default router;
