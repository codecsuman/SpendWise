// ============================================================================
// RegisterPage.tsx — the SpendWise sign-up screen.
//
// How it works:
//   1. A zod schema describes a valid registration form.
//   2. react-hook-form checks the inputs against that schema.
//   3. On submit we call useRegisterMutation (RTK Query) from authApi.ts.
//   4. The backend sets httpOnly cookies and returns the user, so we just
//      redirect to /dashboard. No token is ever stored in JavaScript.
// ============================================================================

// zodResolver is the bridge between react-hook-form and zod.
import { zodResolver } from '@hookform/resolvers/zod'

// Wallet = logo, Eye/EyeOff = show/hide password, Loader2 = spinner.
import { Eye, EyeOff, Loader2, Wallet } from 'lucide-react'

// useState gives this component memory (password visibility, server error).
import { useState } from 'react'

// useForm manages the values, errors and submitting state of the form.
import { useForm, useWatch } from 'react-hook-form'

// Link swaps pages without a full reload; useNavigate moves us in code.
import { Link, useNavigate } from 'react-router-dom'

// z is zod, our runtime validation library.
import { z } from 'zod'

// The generated hook from our RTK Query slice. It POSTs to /api/auth/register
// and already sends cookies (credentials: 'include').
import GoogleButton from '../features/auth/components/GoogleButton'
import SignupEmailCode from '../features/auth/components/SignupEmailCode'
import { googleSignInEnabled } from '../features/auth/services/googleIdentity'
import { useAuthOptionsQuery, useGoogleLoginMutation, useRegisterMutation } from '../features/auth/services/authApi'

// --- VALIDATION SCHEMA -----------------------------------------------------
// confirmPassword is a frontend-only field: it never goes to the server.
// The backend validator only accepts name, email, password (+ optional prefs).
const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name cannot exceed 50 characters'),
    email: z.email('Enter a valid email address'),
    // Same rules as passwordField in backend/src/validators/auth.validator.ts.
    // Keeping them identical means the user sees the error before the request.
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Add at least one uppercase letter')
      .regex(/[a-z]/, 'Add at least one lowercase letter')
      .regex(/[0-9]/, 'Add at least one number')
      .regex(/[^A-Za-z0-9]/, 'Add at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  // .refine runs after the per-field checks and compares the two passwords.
  // path: ['confirmPassword'] attaches the message to that field.
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

// z.infer turns the schema into a TypeScript type automatically.
type RegisterFormValues = z.infer<typeof registerSchema>

// --- ERROR HELPER ----------------------------------------------------------
// RTK Query puts HTTP errors in an object like { status: 409, data: {...} }.
// Express sends the safe message as data.message, so we dig it out here.
// Anything unexpected falls back to a generic message (never a stack trace).
function getErrorMessage(error: unknown, fallback = 'Could not create your account. Please try again.'): string {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: { message?: string } }).data
    if (data && typeof data.message === 'string') return data.message
  }
  return fallback
}

// --- THE COMPONENT ---------------------------------------------------------
export default function RegisterPage() {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    // Empty defaults keep the inputs "controlled" from the first render.
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const navigate = useNavigate()

  // [trigger, state] — trigger sends the request, state tells us if it's busy.
  const [registerUser, { isLoading }] = useRegisterMutation()
  const [googleLogin, { isLoading: googlePending }] = useGoogleLoginMutation()
  const { data: authOptions } = useAuthOptionsQuery()
  const signupEmail = useWatch({ control, name: 'email' })
  const [signupCode, setSignupCode] = useState('')

  // One toggle hides/shows both password fields.
  const [showPassword, setShowPassword] = useState(false)
  // Message sent back by the server (e.g. "Email already in use").
  const [serverError, setServerError] = useState('')

  // --- SUBMIT HANDLER ------------------------------------------------------
  // handleSubmit only calls this if zod validation passes.
  const onSubmit = async (values: RegisterFormValues) => {
    setServerError('')
    if (authOptions?.emailCodes && !/^\d{6}$/.test(signupCode)) {
      setServerError('Request and enter the six-digit email code.')
      return
    }

    try {
      // Send ONLY the three fields the backend accepts.
      // confirmPassword is deliberately dropped here.
      await registerUser({
        name: values.name,
        email: values.email,
        password: values.password,
        ...(authOptions?.emailCodes ? { code: signupCode } : {}),
      }).unwrap() // unwrap() throws on an HTTP error so catch{} runs

      // The cookie is already set by the server, so we're logged in.
      navigate('/dashboard')
    } catch (error) {
      setServerError(getErrorMessage(error))
    }
  }

  // Busy while the request runs OR while react-hook-form is finalising.
  const busy = isLoading || isSubmitting || googlePending

  const onGoogleCredential = async (credential: string) => {
    setServerError('')
    try {
      await googleLogin({ credential }).unwrap()
      navigate('/dashboard')
    } catch (error) {
      setServerError(getErrorMessage(error, 'Google sign-in failed. Please try again.'))
    }
  }

  // --- THE UI (JSX) --------------------------------------------------------
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="surface-card w-full max-w-md p-6 sm:p-8">
        {/* Brand header */}
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Wallet className="size-6" />
          </div>
          <h1 className="page-title">Create your account</h1>
          <p className="page-description">
            Start tracking your money with SpendWise
          </p>
        </div>

        {/* Server-side error, shown only when non-empty */}
        {serverError && (
          <p role="alert" className="mb-4 form-error">
            {serverError}
          </p>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          {/* NAME */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-medium">
              Full name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Suman Jhanp"
              {...register('name')}
              disabled={busy}
              className="h-10 form-control px-3"
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* EMAIL */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              {...register('email')}
              disabled={busy}
              className="h-10 form-control px-3"
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          {authOptions?.emailCodes && (
            <SignupEmailCode email={signupEmail} code={signupCode} onCodeChange={setSignupCode} disabled={busy} />
          )}

          {/* PASSWORD */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                {...register('password')}
                disabled={busy}
                className="h-10 w-full form-control px-3 pr-10"
              />
              {/* type="button" stops this from submitting the form */}
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* CONFIRM PASSWORD (frontend only) */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                {...register('confirmPassword')}
                disabled={busy}
                className="h-10 w-full form-control px-3 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={busy}
            className="relative mt-2 button-primary h-10"
          >
            {busy && <Loader2 className="absolute inset-0 m-auto size-4 animate-spin" aria-hidden="true" />}
            <span className={busy ? 'opacity-0' : undefined}>Create account</span>
          </button>
        </form>

        {googleSignInEnabled && (
          <div className="mt-4 space-y-3">
            <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">or</p>
            <GoogleButton disabled={busy} onCredential={onGoogleCredential} />
          </div>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
