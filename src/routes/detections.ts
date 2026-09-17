import { Router } from 'express'
import { requireAuth } from '../services/auth.js'
import { query } from '../services/db.js'
import type { SessionUser } from '../services/auth.js'
import type { DetectionLocation, ReviewStatus } from '../types.js'

const router = Router()
router.use(requireAuth)

router.get('/documents/:documentId/detections', async (req, res) => {
  const result = await query(
    `select * from detections where document_id = $1 order by page, created_at`,
    [req.params.documentId],
  )
  res.json(result.rows)
})

const VALID_STATUSES: ReviewStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'PSEUDONYMIZED',
  'HUMAN_EDITED',
]

router.patch('/detections/:id', async (req, res) => {
  const { reviewStatus, manualLocation } = req.body as {
    reviewStatus?: ReviewStatus
    manualLocation?: DetectionLocation
  }

  if (!reviewStatus || !VALID_STATUSES.includes(reviewStatus)) {
    return res.status(400).json({ error: 'Invalid reviewStatus' })
  }

  const existing = await query<{ location: DetectionLocation }>(
    'select location from detections where id = $1',
    [req.params.id],
  )
  if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' })

  const location = existing.rows[0].location
  const needsManualLocation =
    location.x === null || location.y === null || location.width === null || location.height === null

  if (
    (reviewStatus === 'APPROVED' || reviewStatus === 'PSEUDONYMIZED') &&
    needsManualLocation &&
    !manualLocation
  ) {
    return res.status(400).json({
      error:
        'This detection has no reliable auto-location; a manual redaction box is required before it can be approved.',
    })
  }

  const user = req.user as SessionUser
  await query(
    `update detections
     set review_status = $1, manual_location = $2, reviewed_by = $3, reviewed_at = now()
     where id = $4`,
    [reviewStatus, manualLocation ? JSON.stringify(manualLocation) : null, user.id, req.params.id],
  )

  res.status(204).end()
})

export default router
