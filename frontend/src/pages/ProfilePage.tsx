// ============================================================================
// ProfilePage.tsx — view and edit the logged-in user's account.
//
// Two forms on one page:
//   1. Profile  -> name, currency, timezone, language   (PATCH /api/users/me)
//   2. Password -> current + new password                (PATCH /api/users/me/password)
//
// The page never asks "who is the user?" — the id comes from the JWT cookie on
// the server. The frontend only sends the fields, never an id.
// ============================================================================

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { useLogoutMutation } from '../features/auth/services/authApi'
import {
  useChangePasswordMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
} from '../features/profile/services/profileApi'

// --- SHARED BITS -----------------------------------------------------------

// Keep these lists identical to the enums in backend User.model.ts.
const currencyValues = ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const
const languageValues = ['en', 'hi', 'es', 'fr', 'de'] as const

const languageLabels: Record<(typeof languageValues)[number], string> = {
  en: 'English',
  hi: 'Hindi',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
}

// RTK Query puts HTTP errors in { status, data }. Express sends a safe message
// as data.message, so that is the only thing we show.
function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: { message?: string } }).data
    if (data && typeof data.message === 'string') return data.message
  }
  return 'Something went wrong. Please try again.'
}

// Shared input styling so both forms look the same.
const inputClass =
  'h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50'

// --- PROFILE FORM ----------------------------------------------------------

const profileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters'),
  currency: z.enum(currencyValues),
  // Same trick as the backend: Node's Intl knows every real IANA zone.
  timezone: z.string().min(1, 'Timezone is required').refine(
    (tz) => {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: tz })
        return true
      } catch {
        return false
      }
    },
    'Use a valid timezone, e.g. Asia/Kolkata'
  ),
  language: z.enum(languageValues),
})

type ProfileFormValues = z.infer<typeof profileSchema>

function ProfileForm() {
  const { data, isLoading } = useGetProfileQuery()
  const [updateProfile, { isLoading: isSaving }] = useUpdateProfileMutation()

  const [serverError, setServerError] = useState('')
  const [saved, setSaved] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    // Placeholders until the real profile arrives.
    defaultValues: {
      name: '',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      language: 'en',
    },
  })

  // When the profile arrives (or refetches), fill the form with real values.
  useEffect(() => {
    if (!data?.user) return

    // The server sends plain strings; the schema wants the literal unions.
    reset({
      name: data.user.name,
      currency: data.user.currency as ProfileFormValues['currency'],
      timezone: data.user.timezone,
      language: data.user.language as ProfileFormValues['language'],
    })
  }, [data, reset])

  const onSubmit = async (values: ProfileFormValues) => {
    setServerError('')
    setSaved(false)

    try {
      await updateProfile(values).unwrap()
      setSaved(true)
    } catch (error) {
      setServerError(getErrorMessage(error))
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading profile…
      </div>
    )
  }

  const busy = isSaving || isSubmitting

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      {serverError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}
      {saved && (
        <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
          Profile saved.
        </p>
      )}

      {/* NAME */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          Full name
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          {...register('name')}
          disabled={busy}
          className={inputClass}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* CURRENCY */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="currency" className="text-sm font-medium">
          Currency
        </label>
        <select
          id="currency"
          {...register('currency')}
          disabled={busy}
          className={inputClass}
        >
          {currencyValues.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </div>

      {/* TIMEZONE */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="timezone" className="text-sm font-medium">
          Timezone
        </label>
        <input
          id="timezone"
          type="text"
          placeholder="Asia/Kolkata"
          {...register('timezone')}
          disabled={busy}
          className={inputClass}
        />
        {errors.timezone ? (
          <p className="text-xs text-destructive">{errors.timezone.message}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            IANA name, e.g. Asia/Kolkata, Europe/London
          </p>
        )}
      </div>

      {/* LANGUAGE */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="language" className="text-sm font-medium">
          Language
        </label>
        <select
          id="language"
          {...register('language')}
          disabled={busy}
          className={inputClass}
        >
          {languageValues.map((code) => (
            <option key={code} value={code}>
              {languageLabels[code]}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="mt-2 flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        {busy ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}

// --- PASSWORD FORM ---------------------------------------------------------

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    // Same rules as passwordField in backend/src/validators/auth.validator.ts.
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Add at least one uppercase letter')
      .regex(/[a-z]/, 'Add at least one lowercase letter')
      .regex(/[0-9]/, 'Add at least one number')
      .regex(/[^A-Za-z0-9]/, 'Add at least one special character'),
    // Frontend only: never sent to the server.
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    message: 'New password must be different from the current password',
    path: ['newPassword'],
  })

type PasswordFormValues = z.infer<typeof passwordSchema>

function PasswordForm() {
  const [changePassword, { isLoading: isChanging }] = useChangePasswordMutation()
  const [logout] = useLogoutMutation()
  const navigate = useNavigate()

  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (values: PasswordFormValues) => {
    setServerError('')

    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }).unwrap()

      // The server revoked the refresh token, so this session is over.
      // Clear the cookies on the client too, then ask for a fresh login.
      try {
        await logout().unwrap()
      } catch {
        // Already invalid is fine — we are leaving anyway.
      }
      navigate('/login', { replace: true })
    } catch (error) {
      setServerError(getErrorMessage(error))
    }
  }

  const busy = isChanging || isSubmitting

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      {serverError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="currentPassword" className="text-sm font-medium">
          Current password
        </label>
        <input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          {...register('currentPassword')}
          disabled={busy}
          className={inputClass}
        />
        {errors.currentPassword && (
          <p className="text-xs text-destructive">
            {errors.currentPassword.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="newPassword" className="text-sm font-medium">
          New password
        </label>
        <input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          {...register('newPassword')}
          disabled={busy}
          className={inputClass}
        />
        {errors.newPassword && (
          <p className="text-xs text-destructive">
            {errors.newPassword.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register('confirmPassword')}
          disabled={busy}
          className={inputClass}
        />
        {errors.confirmPassword && (
          <p className="text-xs text-destructive">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={busy}
        className="mt-2 flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        {busy ? 'Updating…' : 'Update password'}
      </button>
    </form>
  )
}

// --- PAGE ------------------------------------------------------------------

export default function ProfilePage() {
  const { data } = useGetProfileQuery()
  const user = data?.user

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          {user
            ? `${user.email} · member since ${new Date(
                user.createdAt
              ).toLocaleDateString()}`
            : ''}
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">Account details</h2>
        <ProfileForm />
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-base font-semibold">Change password</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          You will be signed out and asked to log in again.
        </p>
        <PasswordForm />
      </section>
    </div>
  )
}
