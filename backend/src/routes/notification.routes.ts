import { Router } from "express";

import {
  listNotifications,
  markNotificationAsRead,
} from "../controllers/notification.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const notificationRouter = Router();

notificationRouter.use(authMiddleware);
notificationRouter.get("/", listNotifications);
notificationRouter.patch("/:id/read", markNotificationAsRead);

export default notificationRouter;
