import { Router } from 'express'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { requireAuth } from '../services/auth.js'
import { query } from '../services/db.js'
import type { SessionUser } from '../services/auth.js'
import type { DocumentRecord } from '../types.js'

const router = Router()
router.use(requireAuth)

// Step 1: register a pending document row so we have a stable id to scope
// the blob path and the client-upload clientPayload to.
router.post('/', async (req, res) => {
  const { filename, requesterArea } = req.body as {
    filename?: string
    requesterArea?: string
  }
  if (!filename || !filename.toLowerCase().endsWith('.pdf')) {
    return res.status(400).json({ error: 'filename must be a .pdf' })
  }
  const user = req.user as SessionUser
  const result = await query<{ id: string }>(
    `insert into documents (filename, sha256, size_bytes, requester_area, blob_url_original, status, uploaded_by)
     values ($1, '', 0, $2, '', 'PENDING_UPLOAD', $3)
     returning id`,
    [filename, requesterArea ?? null, user.id],
  )
  res.status(201).json({ documentId: result.rows[0].id })
})

// Step 2: Vercel Blob client-upload handshake. The browser SDK
// (`upload()` from `@vercel/blob/client`) posts here twice: once to get a
// signed token, and again (via Vercel's infra) when the upload completes.
router.post('/:id/upload-url', async (req, res) => {
  const { id } = req.params
  try {
    const jsonResponse = await handleUpload({
      body: req.body as HandleUploadBody,
      request: req,
      onBeforeGenerateToken: async () => {
        const doc = await query<{ filename: string }>(
          `select filename from documents where id = $1 and status = 'PENDING_UPLOAD'`,
          [id],
        )
        if (doc.rows.length === 0) {
          throw new Error('Unknown or already-uploaded document id')
        }
        return {
          allowedContentTypes: ['application/pdf'],
          addRandomSuffix: false,
          maximumSizeInBytes: 50 * 1024 * 1024,
          pathname: `originals/${id}/${doc.rows[0].filename}`,
          tokenPayload: JSON.stringify({ documentId: id }),
        }
      },
      // NOTE: this webhook only actually fires when deployed on Vercel; it
      // does not fire against `vercel dev`/local dev servers. The client
      // also calls POST /:id/complete-upload right after `upload()`
      // resolves, which is what local dev and the sha256 dedupe check rely
      // on - this callback is a best-effort second write for prod.
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const { documentId } = JSON.parse(tokenPayload ?? '{}') as {
          documentId: string
        }
        await query(
          `update documents set blob_url_original = $1, updated_at = now()
           where id = $2 and status = 'PENDING_UPLOAD'`,
          [blob.url, documentId],
        )
      },
    })
    res.json(jsonResponse)
  } catch (err) {
    res.status(400).json({ error: (err as Error).message })
  }
})

// Explicit completion call from the client right after `upload()` resolves -
// this is the path that actually runs locally (see comment above
// onUploadCompleted) and is what enforces the sha256 dedupe check.
router.post('/:id/complete-upload', async (req, res) => {
  const { blobUrl, sha256, sizeBytes } = req.body as {
    blobUrl?: string
    sha256?: string
    sizeBytes?: number
  }
  if (!blobUrl || !sha256) {
    return res.status(400).json({ error: 'blobUrl and sha256 are required' })
  }
  try {
    const result = await query<{ id: string }>(
      `update documents
       set blob_url_original = $1, sha256 = $2, size_bytes = $3, status = 'UPLOADED', updated_at = now()
       where id = $4 and status = 'PENDING_UPLOAD'
       returning id`,
      [blobUrl, sha256, sizeBytes ?? 0, req.params.id],
    )
    if (result.rows.length === 0) {
      return res.status(409).json({ error: 'Document is not awaiting an upload' })
    }
    res.status(204).end()
  } catch (err: any) {
    if (err?.code === '23505') {
      await query(
        `update documents set status = 'DUPLICATE_REJECTED', updated_at = now() where id = $1`,
        [req.params.id],
      )
      return res.status(409).json({
        error: 'This exact document (by content hash) has already been uploaded.',
      })
    }
    throw err
  }
})

// Vercel Blob has no private-object tier: a `blob_url_*` is a capability
// URL that works for anyone who has it, indefinitely. So the API never
// hands one to the client - documents.ts strips them from every JSON
// response, and PDF bytes are only ever served through the authenticated
// proxy routes below, which check the session on every request instead of
// relying on the blob URL itself being secret.
function toClientDocument(doc: DocumentRecord) {
  const { blob_url_original, blob_url_public, ...clientSafe } = doc
  return clientSafe
}

router.get('/', async (req, res) => {
  const result = await query<DocumentRecord>(
    `select * from documents where status != 'PENDING_UPLOAD' order by created_at desc limit 100`,
  )
  res.json(result.rows.map(toClientDocument))
})

router.get('/:id', async (req, res) => {
  const result = await query<DocumentRecord>(
    'select * from documents where id = $1',
    [req.params.id],
  )
  if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' })
  res.json(toClientDocument(result.rows[0]))
})

async function streamBlob(res: import('express').Response, blobUrl: string) {
  const upstream = await fetch(blobUrl)
  if (!upstream.ok) {
    return res.status(502).json({ error: 'Could not fetch stored file' })
  }
  const buffer = Buffer.from(await upstream.arrayBuffer())
  res.set('Content-Type', 'application/pdf')
  // Never let a browser or intermediate cache/proxy retain a copy of a
  // private document response.
  res.set('Cache-Control', 'private, no-store')
  res.send(buffer)
}

router.get('/:id/file', async (req, res) => {
  const result = await query<DocumentRecord>(
    'select blob_url_original, status from documents where id = $1',
    [req.params.id],
  )
  const doc = result.rows[0]
  if (!doc || !doc.blob_url_original || doc.status === 'PENDING_UPLOAD') {
    return res.status(404).json({ error: 'Not found' })
  }
  await streamBlob(res, doc.blob_url_original)
})

router.get('/:id/public-file', async (req, res) => {
  const result = await query<DocumentRecord>(
    'select blob_url_public from documents where id = $1',
    [req.params.id],
  )
  const doc = result.rows[0]
  if (!doc || !doc.blob_url_public) {
    return res.status(404).json({ error: 'This document has not been exported yet' })
  }
  await streamBlob(res, doc.blob_url_public)
})

export default router
