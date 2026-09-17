import { waitUntil } from '@vercel/functions'
import { Router } from 'express'
import { requireAuth } from '../services/auth.js'
import { query } from '../services/db.js'
import { analyzeDocumentWithRetry } from '../services/gemini.js'
import type { DocumentRecord } from '../types.js'

const router = Router()
router.use(requireAuth)

router.post('/:id/analyze', async (req, res) => {
  const docResult = await query<DocumentRecord>(
    'select * from documents where id = $1',
    [req.params.id],
  )
  const document = docResult.rows[0]
  if (!document) return res.status(404).json({ error: 'Not found' })
  if (document.status === 'PENDING_UPLOAD') {
    return res.status(409).json({ error: 'Document upload has not completed yet' })
  }

  const jobResult = await query<{ id: string }>(
    `insert into analysis_jobs (document_id, status) values ($1, 'RUNNING') returning id`,
    [document.id],
  )
  const jobId = jobResult.rows[0].id
  await query(`update documents set status = 'ANALYZING', updated_at = now() where id = $1`, [
    document.id,
  ])

  res.status(202).json({ jobId })

  // The client polls GET /:id/analysis-status for progress. Sending the
  // response above does NOT guarantee this serverless invocation keeps
  // running afterwards - `waitUntil` is Vercel's supported way to extend
  // execution for background work past the response (paired with the
  // raised maxDuration in vercel.json); locally it's a no-op wrapper that
  // just runs the promise.
  waitUntil(
    runAnalysis(document, jobId).catch((err) => {
      console.error(`analysis job ${jobId} crashed`, err)
    }),
  )
})

async function runAnalysis(document: DocumentRecord, jobId: string) {
  try {
    const pdfResponse = await fetch(document.blob_url_original)
    if (!pdfResponse.ok) {
      throw new Error(`Could not fetch original PDF: ${pdfResponse.status}`)
    }
    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer())

    const result = await analyzeDocumentWithRetry(
      document.id,
      document.filename,
      pdfBuffer,
    )

    if (result.status === 'FAILED' || !result.response) {
      await query(
        `update analysis_jobs set status = 'FAILED', error_message = $1, raw_response = $2, finished_at = now() where id = $3`,
        [result.errorMessage ?? 'Unknown error', jsonOrNull(result.rawText), jobId],
      )
      await query(`update documents set status = 'ANALYSIS_FAILED', updated_at = now() where id = $1`, [
        document.id,
      ])
      return
    }

    await query(
      `update analysis_jobs
       set status = $1, schema_version = $2, raw_response = $3, warnings = $4, finished_at = now()
       where id = $5`,
      [
        result.status,
        result.response.schema_version,
        JSON.stringify(result.response),
        JSON.stringify(result.warnings),
        jobId,
      ],
    )

    for (const detection of result.response.detections) {
      await query(
        `insert into detections
           (document_id, analysis_job_id, source_detection_id, page, rule_id, category, content_type,
            exact_text, context, reason, recommendation, confidence, location, requires_human_confirmation)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          document.id,
          jobId,
          detection.detection_id,
          detection.page,
          detection.rule_id,
          detection.category,
          detection.content_type,
          detection.exact_text,
          detection.context,
          detection.reason,
          detection.recommendation,
          detection.confidence,
          JSON.stringify(detection.location),
          detection.requires_human_confirmation,
        ],
      )
    }

    await query(
      `update documents set status = 'READY_FOR_REVIEW', pages = $1, updated_at = now() where id = $2`,
      [result.response.document.pages_analyzed, document.id],
    )
  } catch (err) {
    console.error(err)
    await query(
      `update analysis_jobs set status = 'FAILED', error_message = $1, finished_at = now() where id = $2`,
      [(err as Error).message, jobId],
    )
    await query(`update documents set status = 'ANALYSIS_FAILED', updated_at = now() where id = $1`, [
      document.id,
    ])
  }
}

function jsonOrNull(text: string): string | null {
  try {
    JSON.parse(text)
    return text
  } catch {
    return null
  }
}

router.get('/:id/analysis-status', async (req, res) => {
  const result = await query(
    `select id, status, warnings, error_message, started_at, finished_at
     from analysis_jobs where document_id = $1 order by started_at desc limit 1`,
    [req.params.id],
  )
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'No analysis job found for this document' })
  }
  res.json(result.rows[0])
})

export default router
