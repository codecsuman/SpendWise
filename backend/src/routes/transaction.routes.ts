// ============================================================================
// Transaction routes
//
// A route file only maps an HTTP method + path to a controller function.
// Every route here is protected: authMiddleware runs first and puts
// { id, email } on req.user before the controller is reached.
// ============================================================================

import { Router } from 'express';
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  listTransactions,
  updateTransaction,
} from '../controllers/transaction.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const transactionRouter = Router();

// One line instead of repeating the middleware on all five routes.
transactionRouter.use(authMiddleware);

transactionRouter.post('/', createTransaction);
transactionRouter.get('/', listTransactions);
transactionRouter.get('/:id', getTransaction);
transactionRouter.patch('/:id', updateTransaction);
transactionRouter.delete('/:id', deleteTransaction);

export default transactionRouter;
