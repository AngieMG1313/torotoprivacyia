import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { query } from './db.js'

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN ?? 'toroto.mx'

export interface SessionUser {
  id: number
  email: string
  name: string | null
}

// Local/demo escape hatch: when there's no Google OAuth app configured yet
// (see docs/SETUP-CREDENTIALS.md) and we're not running in production, allow
// logging in as a fixed dev user instead. This only ever activates when
// BOTH conditions hold, so a real deployment with real OAuth vars set is
// unaffected regardless of NODE_ENV.
export const devLoginEnabled =
  process.env.NODE_ENV !== 'production' &&
  !(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL)

export function configurePassport(): void {
  // Registered unconditionally so a dev-login session (see routes/auth.ts)
  // serializes/deserializes correctly even when the Google strategy below
  // isn't configured.
  passport.serializeUser((user, done) => {
    done(null, (user as SessionUser).id)
  })

  passport.deserializeUser(async (id: number, done) => {
    try {
      const result = await query<SessionUser>(
        'select id, email, name from users where id = $1',
        [id],
      )
      done(null, result.rows[0] ?? false)
    } catch (err) {
      done(err as Error)
    }
  })

  const clientID = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const callbackURL = process.env.GOOGLE_CALLBACK_URL

  if (!clientID || !clientSecret || !callbackURL) {
    if (devLoginEnabled) {
      console.warn(
        'Google OAuth is not configured - running with POST /api/auth/dev-login enabled instead. ' +
          'Never leave this enabled in production (see .env.example / docs/SETUP-CREDENTIALS.md).',
      )
    } else {
      console.warn(
        'Google OAuth env vars are not fully set (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_CALLBACK_URL). ' +
          'Auth routes will fail until they are configured - see .env.example.',
      )
    }
    return
  }

  passport.use(
    new GoogleStrategy(
      { clientID, clientSecret, callbackURL },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase()
          if (!email) return done(new Error('Google profile had no email'))

          const domain = email.split('@')[1]
          if (domain !== ALLOWED_DOMAIN) {
            return done(null, false, {
              message: `Access restricted to @${ALLOWED_DOMAIN} accounts.`,
            })
          }

          const existing = await query<SessionUser>(
            'select id, email, name from users where email = $1',
            [email],
          )

          let user: SessionUser
          if (existing.rows.length > 0) {
            user = existing.rows[0]
            await query('update users set last_login_at = now() where id = $1', [
              user.id,
            ])
          } else {
            const inserted = await query<SessionUser>(
              'insert into users (email, name, last_login_at) values ($1, $2, now()) returning id, email, name',
              [email, profile.displayName ?? null],
            )
            user = inserted.rows[0]
          }

          return done(null, user)
        } catch (err) {
          return done(err as Error)
        }
      },
    ),
  )
}

export function requireAuth(
  req: import('express').Request,
  res: import('express').Response,
  next: import('express').NextFunction,
) {
  if (req.isAuthenticated?.()) return next()
  res.status(401).json({ error: 'Not authenticated' })
}
