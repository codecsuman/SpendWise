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

let isConnected = false

export async function connectDB(): Promise<void> {
  if (isConnected) {
    console.log('📦 MongoDB already connected')
    return
  }

  try {
    const conn = await mongoose.connect(env.MONGODB_URI)

    isConnected = true
    console.log(`📦 MongoDB connected: ${conn.connection.host}`)

    // Connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err)
      isConnected = false
    })

    mongoose.connection.on('disconnected', () => {
      console.log('📦 MongoDB disconnected')
      isConnected = false
    })

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close()
      console.log('📦 MongoDB connection closed due to app termination')
      process.exit(0)
    })

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error)
    process.exit(1)
  }
}

export function getConnectionStatus(): boolean {
  return isConnected
}