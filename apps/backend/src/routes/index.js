import { Router } from "express";
import bookingRoute from "./booking.routes.js";
import slotRoute from "./slot.routes.js";
import authRoute from "./auth.routes.js";
import placeRoute from "./place.routes.js";
import ticketTypeRoute from "./ticketType.routes.js";
import ticketRoutes from "./ticket.routes.js";  
import scanLogRoutes from "./scanLog.routes.js";
import settingRoute from "./setting.routes.js";
import roleRoute from "./role.routes.js";
import userRoute from "./user.routes.js";
import permissionRoute from "./permission.routes.js";
import locationRoute from "./location.routes.js"
import adminRoutes from "./admin.routes.js"

const router = Router();

// 📦 all routes
router.use("/auth", authRoute);
router.use("/place", placeRoute);
router.use("/booking", bookingRoute);
router.use("/slot", slotRoute);
router.use("/ticket-type", ticketTypeRoute);
router.use("/ticket", ticketRoutes);
router.use("/scan-log", scanLogRoutes);
router.use("/setting", settingRoute);
router.use("/role", roleRoute);
router.use("/user", userRoute);
router.use("/permission", permissionRoute);
router.use("/location", locationRoute)
router.use("/admin", adminRoutes)



export default router;
