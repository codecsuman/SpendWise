// Select production configuration before importing modules that read env.ts.
process.env.NODE_ENV = 'production'
await import('./server.js')
