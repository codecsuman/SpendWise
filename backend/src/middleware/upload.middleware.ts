// ============================================================================
// CSV upload middleware
//
// Accepts exactly one multipart field named "file", keeps it in memory, and
// caps it at 5 MB. The route still has to reject a file with no rows — that
// check belongs to the parser, not here.
//
// Multer reports its own MulterError for size/field problems. The error
// middleware does not know that class, so we translate it into AppError(400)
// here. Without this wrapper a too-large file would answer 500.
// ============================================================================

import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { AppError } from '../utils/AppError.js';

// 5 MB. AGENTS.md §5.8 caps CSV uploads at this size.
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Browsers disagree about the MIME type of a .csv file. These are the ones
// seen in practice, so the extension check plus this allow-list is the rule.
const CSV_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'text/plain',
  'application/octet-stream',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter(_req, file, callback) {
    const hasCsvExtension = file.originalname.toLowerCase().endsWith('.csv');
    const hasCsvMimeType = CSV_MIME_TYPES.has(file.mimetype);

    if (!hasCsvExtension || !hasCsvMimeType) {
      callback(new AppError('Only .csv files are allowed', 400));
      return;
    }

    callback(null, true);
  },
});

const singleCsvFile = upload.single('file');

// Wrap multer so every failure becomes a 400 with a readable message.
export function uploadCsvMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  singleCsvFile(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof AppError) {
      next(error);
      return;
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        next(new AppError('CSV file must be 5 MB or smaller', 400));
        return;
      }

      next(new AppError(`Upload failed: ${error.message}`, 400));
      return;
    }

    next(error);
  });
}
