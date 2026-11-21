import { connectDB } from './config/database.js'
import { env } from './config/env.js'
import { logger } from './config/logger.js'
import app from './app.js'
import { startRecurringScheduler } from './queues/recurringTransaction.queue.js'

async function startServer(): Promise<void> {
  // Connect to MongoDB
  await connectDB()

  // Turns due recurring rules into real transactions. Needs the database, so
  // it starts after connectDB and before the HTTP port opens.
  startRecurringScheduler()

  // Start HTTP server
  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Server listening')
  })
}

startServer().catch((err) => {
  logger.error({ err }, 'Failed to start server')
  process.exit(1)
})
