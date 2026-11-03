// ============================================================================
// Validation for /api/users routes.
//
// Each schema validates the *whole request* ({ body }, { params }, ...), the
// same shape auth.validator.ts uses, so the controller can do:
//   const { body } = updateProfileSchema.parse({ body: req.body });
//
// z.strictObject = unknown keys are a validation ERROR, not silently stripped.
// That stops a client from sneaking `role: "admin"` or `emailVerified: true`
// into a profile update.
// ============================================================================

import { z } from 'zod';

import { passwordField } from './auth.validator.js';

// Keep these lists identical to the enums in User.model.ts.
const currencyField = z.enum(['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD']);
const languageField = z.enum(['en', 'hi', 'es', 'fr', 'de']);

// Node's Intl knows every real IANA zone, so this rejects typos like
// "Asia/Kolkta" without needing a package.
const timezoneField = z
  .string()
  .min(1, 'Timezone is required')
  .max(64, 'Timezone is too long')
  .refine(
    (tz) => {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    },
    'Provide a valid IANA timezone, e.g. Asia/Kolkata'
  );

// --- PATCH /api/users/me ---------------------------------------------------
// Every field is optional, but an empty body is not a useful update.
export const updateProfileSchema = z.object({
  body: z
    .strictObject({
      name: z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(50, 'Name cannot exceed 50 characters')
        .trim()
        .optional(),
      currency: currencyField.optional(),
      timezone: timezoneField.optional(),
      language: languageField.optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: 'Provide at least one field to update',
    }),
});

// --- PATCH /api/users/me/password ------------------------------------------
// Email, role and password hashes are never editable here.
export const changePasswordSchema = z
  .object({
    body: z.strictObject({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: passwordField,
    }),
  })
  .refine(({ body }) => body.currentPassword !== body.newPassword, {
    message: 'New password must be different from the current password',
    path: ['body', 'newPassword'],
  });

// --- TYPES -----------------------------------------------------------------
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];
