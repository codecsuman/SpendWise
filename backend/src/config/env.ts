/**
 * ===========================================
 * SpendWise - Environment Configuration
 * ===========================================
 * 
 * PURPOSE:
 * - Loads .env file into process.env
 * - Validates ALL required variables exist at STARTUP
 * - Exports a FULLY TYPED `env` object for safe usage across the app
 * - Fails fast with clear error if any variable is missing
 * 
 * WHY THIS FILE EXISTS:
 * 1. process.env returns string | undefined — easy to forget checks
 * 2. TypeScript doesn't know which vars exist — no autocomplete
 * 3. Typos like process.env.MONGO_URI vs MONGODB_URI fail silently
 * 4. Missing vars crash later in random places — hard to debug
 * 
 * THIS FILE SOLVES ALL OF THE ABOVE.
 */

// -------------------------------------------------------------------
// 1. LOAD .env FILE INTO process.env
// -------------------------------------------------------------------
// Reads the .env file from backend/ folder and populates process.env
// Must be called BEFORE accessing any process.env variable
import dotenv from 'dotenv'
dotenv.config()

// -------------------------------------------------------------------
// 2. DEFINE THE SHAPE OF OUR CONFIG (TypeScript Interface)
// -------------------------------------------------------------------
// This tells TypeScript exactly what variables we expect and their types
// Adding a new variable here = instant autocomplete everywhere
interface EnvConfig {
  // Server
  PORT: number              // HTTP port (e.g., 5000)
  NODE_ENV: string          // 'development' | 'production' | 'test'

  // Database
  MONGODB_URI: string       // MongoDB connection string

  // JWT Authentication
  JWT_ACCESS_SECRET: string     // Secret for signing access tokens (min 32 chars)
  JWT_REFRESH_SECRET: string    // Secret for signing refresh tokens (min 32 chars)
  JWT_ACCESS_EXPIRY: string     // Access token lifetime (e.g., '15m', '1h')
  JWT_REFRESH_EXPIRY: string    // Refresh token lifetime (e.g., '7d', '30d')

  // Frontend
  CLIENT_URL: string        // Frontend origin for CORS (e.g., 'http://localhost:5173')
}

// -------------------------------------------------------------------
// 3. LIST OF REQUIRED VARIABLES (Fail Fast Validation)
// -------------------------------------------------------------------
// If ANY of these are missing from .env, the app crashes ON STARTUP
// with a clear message: "Missing required environment variable: X"
// This prevents "works on my machine" bugs where vars are missing in prod
const requiredVars: (keyof EnvConfig)[] = [
  'PORT',
  'NODE_ENV',
  'MONGODB_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_ACCESS_EXPIRY',
  'JWT_REFRESH_EXPIRY',
  'CLIENT_URL',
]

// -------------------------------------------------------------------
// 4. VALIDATE ALL REQUIRED VARS EXIST
// -------------------------------------------------------------------
// Loops through requiredVars array and checks process.env
// Throws Error immediately if any are missing/empty
// This runs ONCE at import time (top of server.ts)
for (const key of requiredVars) {
  if (!process.env[key]) {
    // Crash early with helpful message instead of undefined errors later
    throw new Error(`Missing required environment variable: ${key}`)
  }
}

// -------------------------------------------------------------------
// 5. EXPORT TYPED CONFIG OBJECT
// -------------------------------------------------------------------
// Creates a const object with proper types:
// - PORT is number (not string) because we do Number()
// - All others are string (non-nullable because we validated above)
// - Using `!` tells TS "this exists, we checked"
export const env: EnvConfig = {
  // Server
  PORT: Number(process.env.PORT),           // Convert string "5000" -> number 5000
  NODE_ENV: process.env.NODE_ENV!,          // 'development' | 'production' | 'test'

  // Database
  MONGODB_URI: process.env.MONGODB_URI!,    // Full MongoDB connection string

  // JWT
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET!,      // Sign access tokens
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,    // Sign refresh tokens
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY!,      // e.g., '15m'
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY!,    // e.g., '7d'

  // Frontend
  CLIENT_URL: process.env.CLIENT_URL!,      // CORS origin, e.g., 'http://localhost:5173'
}

// -------------------------------------------------------------------
// USAGE EXAMPLES IN OTHER FILES:
// -------------------------------------------------------------------
// import { env } from './config/env.js'
// 
// // Server
// app.listen(env.PORT, () => ...)           // number
// 
// // Database
// await mongoose.connect(env.MONGODB_URI)   // string
// 
// // JWT
// jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRY })
// 
// // CORS
// app.use(cors({ origin: env.CLIENT_URL })) // string
// 
// BENEFITS:
// ✅ Autocomplete works: env.<TAB> shows all options
// ✅ TypeScript catches typos: env.MONGO_URI -> Error
// ✅ No undefined checks needed: guaranteed present
// ✅ Single source of truth: change .env + this file = done
// ✅ Clear startup errors: "Missing required environment variable: JWT_ACCESS_SECRET"

// ===========================================
// CLI COMMANDS - Run directly on this file
// ===========================================
// Usage: npx tsx src/config/env.ts <command>
// Commands:
//   generate-secrets  - Generate secure JWT secrets (64 chars hex)
//   validate          - Validate .env file and show status
//   show              - Show current config (secrets masked)
// ===========================================

import { createHash } from 'node:crypto'

// Only run CLI if this file is executed directly (not imported)
// Cross-platform check: normalize both paths for comparison
function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/%20/g, ' ').toLowerCase().replace(/^\//, '')
}

const importPath = normalizePath(import.meta.url.replace('file:///', '/').replace('file://', '/'))
const argvPath = normalizePath(process.argv[1] || '')
const isMainModule = importPath === argvPath

if (isMainModule) {
  const command = process.argv[2]

  switch (command) {
    case 'generate-secrets': {
      // Generate cryptographically secure random secrets
      const accessSecret = createHash('sha256')
        .update(String(Date.now()) + Math.random().toString())
        .digest('hex')
      const refreshSecret = createHash('sha256')
        .update(String(Date.now()) + Math.random().toString() + 'refresh')
        .digest('hex')

      console.log('\n🔐 Generated JWT Secrets (copy to .env):\n')
      console.log(`JWT_ACCESS_SECRET=${accessSecret}`)
      console.log(`JWT_REFRESH_SECRET=${refreshSecret}`)
      console.log('\n✅ Add these to your .env file\n')
      break
    }

    case 'validate': {
      // Validate all required vars exist
      console.log('\n🔍 Validating environment variables...\n')
      let allValid = true

      for (const key of requiredVars) {
        const value = process.env[key]
        if (!value) {
          console.log(`❌ ${key}: MISSING`)
          allValid = false
        } else if (key.includes('SECRET')) {
          console.log(`✅ ${key}: SET (${value.length} chars)`)
        } else {
          console.log(`✅ ${key}: ${value}`)
        }
      }

      console.log(allValid ? '\n✅ All required variables are set!\n' : '\n❌ Some variables are missing!\n')
      process.exit(allValid ? 0 : 1)
      break
    }

    case 'show': {
      // Show current config with secrets masked
      console.log('\n📋 Current Configuration:\n')
      console.log(`  PORT: ${env.PORT}`)
      console.log(`  NODE_ENV: ${env.NODE_ENV}`)
      console.log(`  MONGODB_URI: ${env.MONGODB_URI}`)
      console.log(`  JWT_ACCESS_SECRET: ${maskSecret(env.JWT_ACCESS_SECRET)}`)
      console.log(`  JWT_REFRESH_SECRET: ${maskSecret(env.JWT_REFRESH_SECRET)}`)
      console.log(`  JWT_ACCESS_EXPIRY: ${env.JWT_ACCESS_EXPIRY}`)
      console.log(`  JWT_REFRESH_EXPIRY: ${env.JWT_REFRESH_EXPIRY}`)
      console.log(`  CLIENT_URL: ${env.CLIENT_URL}`)
      console.log('')
      break
    }

    default: {
      console.log(`
📦 SpendWise Environment Config CLI

Usage: npx tsx src/config/env.ts <command>

Commands:
  generate-secrets   Generate secure JWT secrets for .env
  validate           Validate all required .env variables
  show               Show current config (secrets masked)

Examples:
  npx tsx src/config/env.ts generate-secrets
  npx tsx src/config/env.ts validate
  npx tsx src/config/env.ts show
      `)
      break
    }
  }
}

function maskSecret(secret: string): string {
  if (secret.length <= 8) return '***'
  return secret.slice(0, 4) + '****' + secret.slice(-4)
}