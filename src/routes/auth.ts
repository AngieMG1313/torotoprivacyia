import { Router } from 'express'
import passport from 'passport'
import type { SessionUser } from '../services/auth.js'

const router = Router()

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
