import connectPgSimple from 'connect-pg-simple'
import express from 'express'
import session from 'express-session'
import passport from 'passport'
import path from 'path'
import { fileURLToPath } from 'url'
import { configurePassport } from './services/auth.js'
import { getPool } from './services/db.js'
import authRoutes from './routes/auth.js'
import documentsRoutes from './routes/documents.js'
import analysisRoutes from './routes/analysis.js'
import detectionsRoutes from './routes/detections.js'
import redactionRoutes from './routes/redaction.js'
import feedbackRoutes from './routes/feedback.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const clientDist = path.join(__dirname, '..', 'client', 'dist')

const app = express()

app.use(express.json({ limit: '2mb' }))

if (process.env.DATABASE_URL) {
  const PgSession = connectPgSimple(session)
  app.use(
    session({
      store: new PgSession({ pool: getPool(), tableName: 'session', createTableIfMissing: true }),
      secret: process.env.SESSION_SECRET ?? 'toroto-privacy-ia-dev-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 12,
      },
    }),
  )
  configurePassport()
  app.use(passport.initialize())
  app.use(passport.session())
} else {
  console.warn(
    'DATABASE_URL not set - sessions/auth/API routes that touch the DB will fail. ' +
      'Set it (see .env.example) before using anything beyond /healthz.',
  )
}

app.use('/api/auth', authRoutes)
app.use('/api/documents', documentsRoutes)
app.use('/api/documents', analysisRoutes)
app.use('/api', detectionsRoutes)
app.use('/api', redactionRoutes)
app.use('/api/feedback', feedbackRoutes)

app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Serve the built React SPA (client/) for everything else, letting
// client-side routing handle the actual page.
app.use(express.static(clientDist))
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) {
      res
        .status(200)
        .type('html')
        .send(
          `<!doctype html><title>Toroto Privacy IA</title>
           <body style="font-family:system-ui;margin:2rem">
             <h1>Toroto Privacy IA</h1>
             <p>The client app hasn't been built yet. Run <code>npm run build:client</code>.</p>
           </body>`,
        )
    }
  })
})

// Vercel imports `app` directly and handles listening itself; for local dev
// (`npm run dev` / `npm start`) we need to actually bind a port ourselves.
if (!process.env.VERCEL) {
  const port = Number(process.env.PORT ?? 3000)
  app.listen(port, () => {
    console.log(`Toroto Privacy IA listening on http://localhost:${port}`)
  })
}

export default app
