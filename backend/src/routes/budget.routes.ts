// ============================================================================
// Budget routes
//
// A route file only maps an HTTP method + path to a controller function.
// Every route here is protected: authMiddleware runs first and puts
// { id, email } on req.user before the controller is reached.
// ============================================================================

import { Router } from "express";
import {
  createBudget,
  deleteBudget,
  getBudget,
  listBudgets,
  updateBudget,
} from "../controllers/budget.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const budgetRouter = Router();

// One line instead of repeating the middleware on all five routes.
budgetRouter.use(authMiddleware);

budgetRouter.post("/", createBudget);
budgetRouter.get("/", listBudgets);
budgetRouter.get("/:id", getBudget);
budgetRouter.patch("/:id", updateBudget);
budgetRouter.delete("/:id", deleteBudget);

export default budgetRouter;
