import 'dotenv/config'
import { connectDB } from './config/database.js'
import { env } from './config/env.js'
import app from './app.js'

async function startServer(): Promise<void> {
  // Connect to MongoDB
  await connectDB()

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