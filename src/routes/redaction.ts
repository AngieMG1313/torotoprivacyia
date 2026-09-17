import { createHash } from 'crypto'
import { Router } from 'express'
import { requireAuth } from '../services/auth.js'
import { query } from '../services/db.js'
import { storePublicPdf } from '../services/blob.js'
import type { SessionUser } from '../services/auth.js'
import type { DetectionRecord, DocumentRecord } from '../types.js'

const router = Router()
router.use(requireAuth)

function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex')
}

function internalBaseUrl(req: import('express').Request): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return `${req.protocol}://${req.get('host')}`
}

router.post('/documents/:id/export', async (req, res) => {
  const { confirmedAudit } = req.body as { confirmedAudit?: boolean }

  // The HITL checkbox is re-checked server-side - a client-only check is not
  // sufficient authorization to publish a document (see system-prompt-v1.md
  // "Human control": Gemini/the app never self-authorizes publication).
  if (confirmedAudit !== true) {
    return res.status(400).json({
      error:
        'confirmedAudit must be true: a human reviewer must explicitly attest to having audited every detection before export.',
    })
  }

  const docResult = await query<DocumentRecord>('select * from documents where id = $1', [
    req.params.id,
  ])
  const document = docResult.rows[0]
  if (!document) return res.status(404).json({ error: 'Not found' })

  const detectionsResult = await query<DetectionRecord>(
    'select * from detections where document_id = $1',
    [document.id],
  )
  const detections = detectionsResult.rows

  const unresolved = detections.filter((d) => d.review_status === 'PENDING')
  if (unresolved.length > 0) {
    return res.status(409).json({
      error: `${unresolved.length} detection(s) still pending human review.`,
      pendingDetectionIds: unresolved.map((d) => d.id),
    })
  }

  const regionsToRedact = detections
    .filter((d) => d.review_status === 'APPROVED' || d.review_status === 'PSEUDONYMIZED')
    .map((d) => {
      const loc = d.manual_location ?? d.location
      return {
        page: d.page,
        x: loc.x,
        y: loc.y,
        width: loc.width,
        height: loc.height,
      }
    })

  const originalResponse = await fetch(document.blob_url_original)
  if (!originalResponse.ok) {
    return res.status(502).json({ error: 'Could not fetch original PDF from storage' })
  }
  const originalBuffer = Buffer.from(await originalResponse.arrayBuffer())
  const inputSha256 = sha256(originalBuffer)

  // Delegate the actual content removal to the Python function - PyMuPDF is
  // the tool doing real redaction (apply_redactions), not this Node process.
  const redactResponse = await fetch(`${internalBaseUrl(req)}/api/redact`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      pdfUrl: document.blob_url_original,
      regions: regionsToRedact,
    }),
  })

  if (!redactResponse.ok) {
    const errorBody = await redactResponse.text()
    return res.status(502).json({ error: `Redaction function failed: ${errorBody}` })
  }

  const redactedBuffer = Buffer.from(await redactResponse.arrayBuffer())
  const outputSha256 = sha256(redactedBuffer)

  const { url: publicUrl } = await storePublicPdf(document.id, redactedBuffer)

  const user = req.user as SessionUser
  await query(
    `insert into exports (document_id, exported_by, approved_detection_ids, input_sha256, output_sha256, blob_url)
     values ($1, $2, $3, $4, $5, $6)`,
    [
      document.id,
      user.id,
      JSON.stringify(
        detections
          .filter((d) => d.review_status === 'APPROVED' || d.review_status === 'PSEUDONYMIZED')
          .map((d) => d.id),
      ),
      inputSha256,
      outputSha256,
      publicUrl,
    ],
  )

  await query(
    `update documents set status = 'EXPORTED', blob_url_public = $1, updated_at = now() where id = $2`,
    [publicUrl, document.id],
  )

  res.json({ publicUrl, inputSha256, outputSha256 })
})

export default router
