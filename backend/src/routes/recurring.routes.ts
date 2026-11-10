// ============================================================================
// Recurring transaction routes
//
// A route file only maps an HTTP method + path to a controller function.
// Every route here is protected: authMiddleware runs first and puts
// { id, email } on req.user before the controller is reached.
// ============================================================================

import { Router } from 'express';
import {
  createRecurring,
  deleteRecurring,
  getRecurring,
  listRecurring,
  updateRecurring,
} from '../controllers/recurring.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const recurringRouter = Router();

// One line instead of repeating the middleware on all five routes.
recurringRouter.use(authMiddleware);

recurringRouter.post('/', createRecurring);
recurringRouter.get('/', listRecurring);
recurringRouter.get('/:id', getRecurring);
recurringRouter.patch('/:id', updateRecurring);
recurringRouter.delete('/:id', deleteRecurring);

export default recurringRouter;
