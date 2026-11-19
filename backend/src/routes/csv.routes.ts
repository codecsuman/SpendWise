import { Router } from 'express';
import { importCsv, previewCsv } from '../controllers/csv.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { uploadCsvMiddleware } from '../middleware/upload.middleware.js';

const csvRouter = Router();

// Check the session before accepting an upload on either endpoint.
csvRouter.use(authMiddleware);

// Read the multipart file, then return sample rows and suggested columns.
csvRouter.post('/preview', uploadCsvMiddleware, previewCsv);

// Read the file and mapping options, then save the accepted transactions.
csvRouter.post('/import', uploadCsvMiddleware, importCsv);

export default csvRouter;
