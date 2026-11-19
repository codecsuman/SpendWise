import type { Request, Response } from 'express';
import { csvService } from '../services/csv.service.js';
import { AppError } from '../utils/AppError.js';
import { importCsvSchema } from '../validators/csv.validator.js';

// The upload middleware stores the uploaded file in memory on req.file.
// Both handlers need those bytes, so they share this check.
function getCsvBuffer(req: Request): Buffer {
  if (!req.file) {
    throw new AppError('Upload a CSV file using the file field', 400);
  }

  return req.file.buffer;
}

// Preview reads the headers and sample rows without saving transactions.
export function previewCsv(req: Request, res: Response): void {
  const preview = csvService.preview(getCsvBuffer(req));

  res.status(200).json({ success: true, preview });
}

export async function importCsv(
  req: Request,
  res: Response
): Promise<void> {
  // The auth middleware supplies the user. Use that ID to scope the import.
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const buffer = getCsvBuffer(req);
  // Multipart text fields arrive in req.body. Parse them into import options.
  const { body } = importCsvSchema.parse({ body: req.body });
  // The service validates individual rows and saves the accepted transactions.
  const result = await csvService.import(req.user.id, buffer, body);

  res.status(200).json({ success: true, result });
}
