import { Router } from 'express'
import passport from 'passport'
import { devLoginEnabled } from '../services/auth.js'
import { query } from '../services/db.js'
import type { SessionUser } from '../services/auth.js'

const router = Router()

router.get('/config', (_req, res) => {
  res.json({ devLoginEnabled })
})

// Demo-only login for when Google OAuth hasn't been set up yet - see
// devLoginEnabled's definition in services/auth.ts for exactly when this is
// reachable (never in production, never once real OAuth vars are set).
if (devLoginEnabled) {
  router.post('/dev-login', async (req, res, next) => {
    const email = `dev@${process.env.ALLOWED_EMAIL_DOMAIN ?? 'toroto.mx'}`
    try {
      const existing = await query<SessionUser>(
        'select id, email, name from users where email = $1',
        [email],
      )
      const user =
        existing.rows[0] ??
        (
          await query<SessionUser>(
            'insert into users (email, name, last_login_at) values ($1, $2, now()) returning id, email, name',
            [email, 'Usuario de prueba (modo local)'],
          )
        ).rows[0]

      req.login(user, (err) => {
        if (err) return next(err)
        res.status(204).end()
      })
    } catch (err) {
      next(err)
    }
  })
}

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }),
)

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login?error=access_denied',
  }),
  (_req, res) => {
    res.redirect('/')
  },
)

router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err)
    res.status(204).end()
  })
})

router.get('/me', (req, res) => {
  if (!req.isAuthenticated?.()) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  const user = req.user as SessionUser
  res.json({ id: user.id, email: user.email, name: user.name })
})

export default router
