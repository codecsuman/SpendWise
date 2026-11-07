// ============================================================================
// Analytics routes
//
// A route file only maps an HTTP method + path to a controller function.
// Every route here is protected: authMiddleware runs first and puts
// { id, email } on req.user before the controller is reached.
// ============================================================================

import { Router } from 'express';
import { getOverview } from '../controllers/analytics.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const analyticsRouter = Router();

// One line instead of repeating the middleware on every route.
analyticsRouter.use(authMiddleware);

// GET /api/analytics?month=YYYY-MM&months=6
analyticsRouter.get('/', getOverview);

export default analyticsRouter;
