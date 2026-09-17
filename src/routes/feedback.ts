import { Router } from 'express'
import { requireAuth } from '../services/auth.js'
import { query } from '../services/db.js'
import type { SessionUser } from '../services/auth.js'

const router = Router()
router.use(requireAuth)

router.post('/', async (req, res) => {
  const { documentId, sentiment, message } = req.body as {
    documentId?: string
    sentiment?: 'MUY_PRECISA' | 'FALSOS_POSITIVOS'
    message?: string
  }
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'message is required' })
  }
  const user = req.user as SessionUser
  await query(
    `insert into feedback (document_id, submitted_by, sentiment, message) values ($1, $2, $3, $4)`,
    [documentId ?? null, user.id, sentiment ?? null, message.trim()],
  )
  res.status(201).end()
})

router.get('/', async (_req, res) => {
  const result = await query(
    `select f.*, u.email as submitted_by_email
     from feedback f left join users u on u.id = f.submitted_by
     order by f.created_at desc limit 200`,
  )
  res.json(result.rows)
})

export default router
