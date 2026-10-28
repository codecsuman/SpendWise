// ============================================================================
// LoginPage.tsx — the SpendWise login screen.
//
// Big picture of how this file works:
//   1. We define a SCHEMA (zod) that describes what a valid login looks like.
//   2. react-hook-form watches the inputs and checks them against that schema.
//   3. On submit, we send the email + password to the backend with axios.
//   4. The backend replies with httpOnly cookies, so the browser is now logged
//      in. We just redirect to /dashboard — no token is stored in JavaScript.
// ============================================================================

// --- IMPORTS ---------------------------------------------------------------
// Each import pulls a tool into this file. Think of imports as "borrowing"
// code that someone else already wrote so we don't reinvent it.

// zodResolver is the BRIDGE between react-hook-form and zod.
// react-hook-form doesn't know how to validate on its own, so we hand it a
// resolver that says "use THIS zod schema to check the fields".
import { zodResolver } from '@hookform/resolvers/zod'

// axios is an HTTP client. It lets us send network requests to our backend
// (POST a login, GET data, etc.) and gives us nice error objects back.
import axios from 'axios'

// Icons from lucide-react. Each is just a small React component that draws
// an SVG. Wallet = brand logo, Eye/EyeOff = show/hide password toggle,
// Loader2 = the spinning circle while the request is in flight.
import { Eye, EyeOff, Loader2, Wallet } from 'lucide-react'

// useState is a React "hook" that gives a component memory.
// When the value changes, React re-renders the UI to match.
import { useState } from 'react'

// useForm is the main hook from react-hook-form. It manages the form state:
// the values the user typed, the validation errors, and whether we're saving.
import { useForm } from 'react-hook-form'

// useNavigate lets us change the URL from JavaScript code (e.g. after login).
// Link is like an <a> tag but swaps pages WITHOUT a full browser reload.
import { Link, useNavigate } from 'react-router-dom'

// z is the main object from zod, our validation library.
// We describe the shape of the data and zod checks it at runtime.
import { z } from 'zod'

// --- VALIDATION SCHEMA -----------------------------------------------------
// This describes the exact shape of a valid login form.
//   - email must be a real email address
//   - password must be a string of at least 6 characters
// If the user violates a rule, zod produces the message we passed in.
const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

// z.infer "reads" the schema and turns it into a TypeScript type.
// This means LoginFormValues is automatically { email: string; password: string }
// If we ever change the schema, this type updates by itself — no duplication.
type LoginFormValues = z.infer<typeof loginSchema>

// The backend base URL. In development this falls back to localhost:5000 if
// you haven't created a .env file. Calling it "API_URL" keeps it in one place.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

// --- THE COMPONENT ---------------------------------------------------------
// A React component is just a function that returns JSX (the UI).
// The "default export" makes it importable elsewhere:
//   import LoginPage from '@/pages/LoginPage'
export default function LoginPage() {
  // --- FORM SETUP ----------------------------------------------------------
  // useForm returns an object full of helpers. We "destructure" the ones we
  // need out of it:
  //   register       -> connects an <input> to the form (tracks its value)
  //   handleSubmit   -> wraps our submit function, running validation first
  //   errors         -> validation messages for each field
  //   isSubmitting   -> true while the async submit handler is running
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    // Use zod to validate the fields.
    resolver: zodResolver(loginSchema),
    // Start the inputs empty so they are "controlled" from the first render.
    defaultValues: { email: '', password: '' },
  })

  // useNavigate gives us a function to move the user to another page.
  const navigate = useNavigate()

  // Local UI state (does NOT go to the server).
  // showPassword toggles the password field between dots and plain text.
  const [showPassword, setShowPassword] = useState(false)
  // serverError holds a message like "Invalid credentials" sent by the backend.
  const [serverError, setServerError] = useState('')

  // --- SUBMIT HANDLER ------------------------------------------------------
  // handleSubmit only calls this function if zod validation PASSES.
  // "async" lets us use "await" for the network request.
  const onSubmit = async (values: LoginFormValues) => {
    // Clear any previous error before a new attempt.
    setServerError('')

    try {
      // Send a POST request to the backend with the typed email + password.
      // withCredentials: true is required: it tells the browser to ACCEPT the
      // Set-Cookie headers the server sends back. Without it, the login
      // "succeeds" but no cookie is stored, so the user stays logged out.
      await axios.post(`${API_URL}/api/auth/login`, values, {
        withCredentials: true,
      })

      // Deliberately nothing is saved here. The tokens live in httpOnly
      // cookies that JavaScript cannot read, so an XSS bug cannot steal them.
      // The response body only contains the safe public user object.

      // Send the user to the dashboard.
      navigate('/dashboard')
    } catch (error) {
      // Anything in the try block that throws lands here.
      // axios.isAxiosError narrows the type so we can safely read .response.
      if (axios.isAxiosError(error)) {
        // Prefer the backend's message; fall back to a generic one.
        setServerError(
          error.response?.data?.message ?? 'Login failed. Please try again.',
        )
      } else {
        // Some non-network error (a bug, etc.).
        setServerError('Something went wrong. Please try again.')
      }
    }
  }

  // --- THE UI (JSX) --------------------------------------------------------
  // JSX looks like HTML but it is JavaScript. The className values are
  // Tailwind utility classes, and {curly braces} let us drop JS values in.
  return (
    // Full-screen area, centered both ways, with a soft background.
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      {/* The white "card" that holds the form. */}
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg">
        {/* Brand header: logo badge, title and subtitle. */}
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Wallet className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your SpendWise account
          </p>
        </div>

        {/*
          Conditional rendering: the && means "show this only if serverError
          is a non-empty string". When there's no error, React renders nothing.
        */}
        {serverError && (
          <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {serverError}
          </p>
        )}

        {/*
          <form> wraps all inputs. onSubmit={handleSubmit(onSubmit)} is key:
          when the user clicks the submit button, react-hook-form validates
          first and only then runs our onSubmit function.
          noValidate turns off the browser's built-in validation so zod owns it.
        */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          {/* EMAIL FIELD */}
          <div className="flex flex-col gap-1.5">
            {/* htmlFor ties the label to the input for accessibility/clicking. */}
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              // register('email') hooks this input into the form state AND
              // tags it to the matching rule in the zod schema.
              {...register('email')}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50"
              // Lock the input while the request is running.
              disabled={isSubmitting}
            />
            {/* Show zod's message for this field only if it exists. */}
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* PASSWORD FIELD */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            {/* relative lets the eye button be positioned inside this box. */}
            <div className="relative">
              <input
                id="password"
                // Ternary: dots when hidden, plain text when shown.
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                {...register('password')}
                className="h-10 w-full rounded-md border border-input bg-background px-3 pr-10 text-sm outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50"
                disabled={isSubmitting}
              />
              {/*
                This is a plain button, not a submit button, so type="button"
                stops it from submitting the form. Clicking flips showPassword.
                setShowPassword((v) => !v) reads the previous value and inverts it.
              */}
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
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

          {/* SUBMIT BUTTON. type="submit" triggers the form's onSubmit. */}
          <button
            type="submit"
            // Disabling prevents double-submits while the request runs.
            disabled={isSubmitting}
            className="mt-2 flex h-10 items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            {/* Show a spinner only while submitting. */}
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            {/* Label changes depending on state. */}
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* Footer link. Link changes the URL without reloading the page. */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  )
}
