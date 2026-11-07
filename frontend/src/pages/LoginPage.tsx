// ============================================================================
// LoginPage.tsx — the SpendWise sign-in / sign-up screen.
//
// Big picture of how this file works:
//   1. Two zod schemas describe what a valid sign-in and sign-up look like.
//   2. react-hook-form watches the inputs and checks them against those schemas.
//   3. On submit we call the auth API. The backend replies with httpOnly
//      cookies, so the browser is now logged in. We just redirect to
//      /dashboard — no token is ever stored in JavaScript.
//   4. The CSS-only tabs flip between the two forms. A hidden radio input keeps
//      the state; the :checked selector in index.css rotates the right pane.
// ============================================================================

// zodResolver is the BRIDGE between react-hook-form and zod.
import { zodResolver } from '@hookform/resolvers/zod'

// Eye/EyeOff = show/hide password toggle.
import { Eye, EyeOff } from 'lucide-react'

// useState gives this component memory (active tab, password visibility, errors).
import { useState } from 'react'

// useForm manages the values, errors and submitting state of each form.
import { useForm } from 'react-hook-form'

// useNavigate moves the user in code after a successful sign-in/sign-up.
import { useNavigate } from 'react-router-dom'

// z is the main object from zod, our runtime validation library.
import { z } from 'zod'

// The RTK Query hooks. They already send cookies (credentials: 'include') and
// invalidate the cached "User" query, so the dashboard sees the new session.
import {
  useLoginMutation,
  useRegisterMutation,
} from '../features/auth/services/authApi'

// --- VALIDATION SCHEMAS ----------------------------------------------------
// Sign in: email must be real, password at least 6 characters.
const signInSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

// Sign up: same rules as RegisterPage and the backend validator.
// confirmPassword is frontend-only — it never goes to the server.
const signUpSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name cannot exceed 50 characters'),
    email: z.email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Add at least one uppercase letter')
      .regex(/[a-z]/, 'Add at least one lowercase letter')
      .regex(/[0-9]/, 'Add at least one number')
      .regex(/[^A-Za-z0-9]/, 'Add at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

// z.infer turns each schema into a TypeScript type automatically.
type SignInValues = z.infer<typeof signInSchema>
type SignUpValues = z.infer<typeof signUpSchema>

// The spinner is drawn with 12 bars. Keep the count in one place so the JSX
// below can map over it instead of repeating 12 elements by hand.
const LOADER_BARS = Array.from({ length: 12 }, (_, index) => index)

// --- SMALL HELPERS ---------------------------------------------------------
// RTK Query puts HTTP errors in an object like { status: 409, data: {...} }.
// Express sends the safe message as data.message, so we dig it out here.
function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: { message?: string } }).data
    if (data && typeof data.message === 'string') return data.message
  }
  return fallback
}

// The 20x20 spinner used inside the submit button while a request runs.
function ButtonSpinner() {
  return (
    <span
      className="spinner-loader spinner-loader--sm spinner-loader--on-color"
      aria-hidden="true"
    >
      {LOADER_BARS.map((bar) => (
        <span key={bar} className="spinner-item" />
      ))}
    </span>
  )
}

// --- THE COMPONENT ---------------------------------------------------------
export default function LoginPage() {
  const navigate = useNavigate()

  // Two independent forms, one per tab. Each keeps its own values and errors.
  const signIn = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  })

  const signUp = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  })

  // [trigger, state] — trigger sends the request, state tells us if it is busy.
  const [login] = useLoginMutation()
  const [registerUser] = useRegisterMutation()

  // Which pane is visible. The radio inputs also control the CSS flip; this
  // state lets us mark the hidden pane as inert so its fields cannot be tabbed.
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin')

  // One toggle hides/shows every password field on the page.
  const [showPassword, setShowPassword] = useState(false)

  // Server messages ("Invalid email or password", "Email already in use").
  const [signInError, setSignInError] = useState('')
  const [signUpError, setSignUpError] = useState('')

  // Disable both forms while either request is running.
  const busy = signIn.formState.isSubmitting || signUp.formState.isSubmitting

  // --- SUBMIT HANDLERS -----------------------------------------------------
  // handleSubmit only calls these functions if zod validation PASSES.
  const onSignIn = async (values: SignInValues) => {
    setSignInError('')

    try {
      // The hook POSTs to /api/auth/login and stores the cookies.
      await login(values).unwrap()
      navigate('/dashboard')
    } catch (error) {
      setSignInError(getErrorMessage(error, 'Login failed. Please try again.'))
    }
  }

  const onSignUp = async (values: SignUpValues) => {
    setSignUpError('')

    try {
      // Send ONLY the three fields the backend accepts.
      // confirmPassword is deliberately dropped here.
      await registerUser({
        name: values.name,
        email: values.email,
        password: values.password,
      }).unwrap()

      // The cookie is already set, so the new user is logged in.
      navigate('/dashboard')
    } catch (error) {
      setSignUpError(
        getErrorMessage(error, 'Could not create your account. Please try again.'),
      )
    }
  }

  // --- THE UI (JSX) --------------------------------------------------------
  return (
    // auth-screen supplies the moving deep-blue gradient and the waves.
    // Do not add `aurora` or `fx` here — the login page has its own background.
    <main className="page-wrap page-login auth-screen">
      <div className="auth-waves" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="auth-wrap">
        <div className="auth-html">
          {/*
            These two radio inputs are the CSS-only tab state. They are hidden
            by .auth-radio, but the labels below still toggle them. The order
            matters: index.css uses the + sibling selector to find .auth-form.
          */}
          <input
            id="tab-1"
            type="radio"
            name="auth-tab"
            className="auth-radio auth-in"
            defaultChecked
            onChange={() => setActiveTab('signin')}
          />
          <label htmlFor="tab-1" className="auth-tab">
            Sign In
          </label>

          <input
            id="tab-2"
            type="radio"
            name="auth-tab"
            className="auth-radio auth-up"
            onChange={() => setActiveTab('signup')}
          />
          <label htmlFor="tab-2" className="auth-tab">
            Sign Up
          </label>

          <div className="auth-form">
            {/* ---------------- SIGN IN ---------------- */}
            <div
              className="auth-pane auth-pane-in"
              inert={activeTab !== 'signin'}
            >
              <form onSubmit={signIn.handleSubmit(onSignIn)} noValidate>
                {signInError && <p className="auth-error">{signInError}</p>}

                <div className="auth-group">
                  <label htmlFor="signin-email" className="auth-label">
                    Email
                  </label>
                  <input
                    id="signin-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="auth-input"
                    disabled={busy}
                    {...signIn.register('email')}
                  />
                  {signIn.formState.errors.email && (
                    <p className="auth-error">
                      {signIn.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="auth-group">
                  <label htmlFor="signin-password" className="auth-label">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="signin-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="auth-input auth-input--password"
                      disabled={busy}
                      {...signIn.register('password')}
                    />
                    <button
                      type="button"
                      className="auth-eye"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                  {signIn.formState.errors.password && (
                    <p className="auth-error">
                      {signIn.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="auth-group">
                  {/* Visual only for now: the backend always issues the same
                      7-day refresh cookie, so this box does not change it yet. */}
                  <input
                    id="keep"
                    type="checkbox"
                    className="auth-check"
                    defaultChecked
                  />
                  <label htmlFor="keep">
                    <span className="auth-icon"></span> Keep me signed in
                  </label>
                </div>

                <div className="auth-group">
                  <button className="btn-3d block" type="submit" disabled={busy}>
                    <span className="flex items-center justify-center gap-2">
                      {signIn.formState.isSubmitting && <ButtonSpinner />}
                      {signIn.formState.isSubmitting ? 'Signing in…' : 'Sign In'}
                    </span>
                  </button>
                </div>

                <div className="auth-hr"></div>
                <div className="auth-foot">
                  <button
                    type="button"
                    onClick={() =>
                      setSignInError('Password reset is not available yet.')
                    }
                  >
                    Forgot Password?
                  </button>
                </div>
              </form>
            </div>

            {/* ---------------- SIGN UP ---------------- */}
            <div
              className="auth-pane auth-pane-up"
              inert={activeTab !== 'signup'}
            >
              <form onSubmit={signUp.handleSubmit(onSignUp)} noValidate>
                {signUpError && <p className="auth-error">{signUpError}</p>}

                <div className="auth-group">
                  <label htmlFor="signup-name" className="auth-label">
                    Name
                  </label>
                  <input
                    id="signup-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Suman Jhanp"
                    className="auth-input"
                    disabled={busy}
                    {...signUp.register('name')}
                  />
                  {signUp.formState.errors.name && (
                    <p className="auth-error">
                      {signUp.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="auth-group">
                  <label htmlFor="signup-email" className="auth-label">
                    Email
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="auth-input"
                    disabled={busy}
                    {...signUp.register('email')}
                  />
                  {signUp.formState.errors.email && (
                    <p className="auth-error">
                      {signUp.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="auth-group">
                  <label htmlFor="signup-password" className="auth-label">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className="auth-input auth-input--password"
                      disabled={busy}
                      {...signUp.register('password')}
                    />
                    <button
                      type="button"
                      className="auth-eye"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                  {signUp.formState.errors.password && (
                    <p className="auth-error">
                      {signUp.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="auth-group">
                  <label htmlFor="signup-confirm" className="auth-label">
                    Repeat password
                  </label>
                  <div className="relative">
                    <input
                      id="signup-confirm"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className="auth-input auth-input--password"
                      disabled={busy}
                      {...signUp.register('confirmPassword')}
                    />
                    <button
                      type="button"
                      className="auth-eye"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                  {signUp.formState.errors.confirmPassword && (
                    <p className="auth-error">
                      {signUp.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <div className="auth-group">
                  <button className="btn-3d block" type="submit" disabled={busy}>
                    <span className="flex items-center justify-center gap-2">
                      {signUp.formState.isSubmitting && <ButtonSpinner />}
                      {signUp.formState.isSubmitting
                        ? 'Creating account…'
                        : 'Sign Up'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
