// ============================================================================
// Validation for /api/analytics routes.
//
// Only the query string is accepted. There is no body: analytics is read-only.
// `months` controls how many months the trend chart covers.
// ============================================================================

import { z } from 'zod';

// Same month format as Budget.model.ts, so the UI can reuse its month input.
const monthField = z
  .string()
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must look like YYYY-MM');

export const overviewSchema = z.object({
  query: z.strictObject({
    // Omit it and the service uses the current month.
    month: monthField.optional(),
    // Coerce turns "6" from the URL into the number 6.
    months: z.coerce.number().int().min(1).max(24).default(6),
  }),
});

export type AnalyticsQuery = z.infer<typeof overviewSchema>['query'];
