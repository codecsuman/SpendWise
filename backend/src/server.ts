import 'dotenv/config'
import { connectDB } from './config/database.js'
import { env } from './config/env.js'
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
    console.log(`🚀 Server running on http://localhost:${env.PORT}`)
    console.log(`🌍 Environment: ${env.NODE_ENV}`)
  })
}

startServer().catch((err) => {
  console.error('❌ Failed to start server:', err)
  process.exit(1)
})