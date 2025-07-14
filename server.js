const express = require('express')
const path = require('path')
const compression = require('compression')

const app = express()
const PORT = process.env.PORT || 3000

// Enable gzip compression
app.use(compression())

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  next()
})

// Serve static files from the dist directory
app.use(
  express.static(path.join(__dirname, 'packages/web/dist'), {
    maxAge: '1h',
    setHeaders: (res, filePath) => {
      // Set longer cache for assets with hash in filename
      if (
        filePath.match(/\.(js|css|woff2?|ttf|eot)$/) &&
        filePath.includes('.')
      ) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      }
      // Service worker should not be cached
      if (filePath.endsWith('sw.js')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
      }
    },
  })
)

// Health check endpoint for monitoring
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// SPA fallback - serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'packages/web/dist', 'index.html'))
})

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`SpecifAI server running on http://0.0.0.0:${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})
