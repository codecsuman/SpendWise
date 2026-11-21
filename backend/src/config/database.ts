/**
 * ===========================================
 * SpendWise - Database Configuration
 * ===========================================
 * 
 * PURPOSE:
 * - Connects to MongoDB using Mongoose
 * - Uses env.MONGODB_URI (validated at startup)
 * - Handles connection events and graceful shutdown
 * - Exports a `connectDB()` function to call in server.ts
 */

import mongoose from 'mongoose'
import { env } from './env.js'
import { logger } from './logger.js'

let isConnected = false

export async function connectDB(): Promise<void> {
  if (isConnected) {
    logger.debug('MongoDB already connected')
    return
  }

  try {
    const conn = await mongoose.connect(env.MONGODB_URI)

    isConnected = true
    logger.info({ host: conn.connection.host }, 'MongoDB connected')

    // Connection event listeners
    mongoose.connection.on('error', (err) => {
      logger.error({ err }, 'MongoDB connection error')
      isConnected = false
    })

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected')
      isConnected = false
    })

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close()
      logger.info('MongoDB connection closed due to app termination')
      process.exit(0)
    })

  } catch (error) {
    logger.error({ err: error }, 'MongoDB connection failed')
    process.exit(1)
  }
}

export function getConnectionStatus(): boolean {
  return isConnected
}