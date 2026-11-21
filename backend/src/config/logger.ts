import pino from 'pino'
import { env } from './env.js'

// One structured logger for the whole server. Request logs come from
// pino-http, and every log line redacts cookies and tokens.
export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'password',
      'accessToken',
      'refreshToken',
    ],
    censor: '[redacted]',
  },
})
