// ============================================================================
// Category routes
//
// A route file only maps an HTTP method + path to a controller function.
// Every route here is protected: authMiddleware runs first and puts
// { id, email } on req.user before the controller is reached.
// ============================================================================

import { Router } from 'express';
import {
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
  updateCategory,
} from '../controllers/category.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const categoryRouter = Router();

// One line instead of repeating the middleware on all five routes.
categoryRouter.use(authMiddleware);

categoryRouter.post('/', createCategory);
categoryRouter.get('/', listCategories);
categoryRouter.get('/:id', getCategory);
categoryRouter.patch('/:id', updateCategory);
categoryRouter.delete('/:id', deleteCategory);

export default categoryRouter;
