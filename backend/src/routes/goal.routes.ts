// ============================================================================
// Goal routes
//
// A route file only maps an HTTP method + path to a controller function.
// Every route here is protected: authMiddleware runs first and puts
// { id, email } on req.user before the controller is reached.
// ============================================================================

import { Router } from 'express';
import {
  contributeToGoal,
  createGoal,
  deleteGoal,
  getGoal,
  listGoals,
  updateGoal,
} from '../controllers/goal.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const goalRouter = Router();

// One line instead of repeating the middleware on all six routes.
goalRouter.use(authMiddleware);

goalRouter.post('/', createGoal);
goalRouter.get('/', listGoals);
goalRouter.get('/:id', getGoal);
goalRouter.patch('/:id', updateGoal);
goalRouter.post('/:id/contribute', contributeToGoal);
goalRouter.delete('/:id', deleteGoal);

export default goalRouter;
