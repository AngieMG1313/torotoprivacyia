# Toroto Privacy IA

AI-assisted redaction of sensitive information in Toroto's assembly minutes
and annexes, with **mandatory human review** before any public PDF is
generated. Gemini only ever proposes detections — it never approves or
generates the public document (see `src/prompts/system-prompt-v1.md`).

```
Private PDF → Gemini analysis → structured detections → human review → approved redactions → secure PDF redaction → public PDF
```

## Stack

- **Backend**: Express + TypeScript (`src/`), deployed as a single Vercel
  Node function (`vercel.json`).
- **Redaction**: a Python Vercel function (`api/redact.py`) using
  **PyMuPDF** to truly delete content under approved regions (not a visual
  overlay) — verified against `docs/fixtures/TRAIN-001/original.pdf`.
- **Frontend**: React + TypeScript SPA (`client/`), built with Vite and
  Tailwind, using the design tokens from the Stitch mockup package.
- **Storage**: Vercel Blob (PDFs) + Postgres (documents, detections, review
  decisions, audit log, UAT feedback).
- **Auth**: Google OAuth restricted to `@toroto.mx` (or `ALLOWED_EMAIL_DOMAIN`).

## Local development

1. Copy `.env.example` to `.env` and fill in `DATABASE_URL`,
   `BLOB_READ_WRITE_TOKEN`, `GEMINI_API_KEY`, and the Google OAuth vars —
   see `docs/SETUP-CREDENTIALS.md` for exactly where to get each one.
2. `npm install && npm run db:migrate`
3. `cd client && npm install && cd ..`
4. `npm run dev` (API on `:3000`) and, in another terminal,
   `cd client && npm run dev` (Vite dev server, proxies `/api` to `:3000`).

For a production-shaped run: `npm run build` (builds server + client) then
`npm start`.

## Knowledge package

- `src/knowledge/privacy-rules.json` — the 11 `TOR-PRIV-*` categories, the
  single source of truth for what must be reviewed for redaction.
- `src/prompts/system-prompt-v1.md` / `document-analysis-prompt-v1.md` —
  Gemini system + per-analysis prompts.
- `src/knowledge/gemini-response-schema-v1.json` — the strict JSON schema
  Gemini's output is validated against (`src/services/gemini.ts`).
- `docs/fixtures/TRAIN-001/` — the one visually-reviewed original→redacted
  pair; used as the regression fixture in `src/services/gemini.test.ts` and
  for manually validating the redaction pipeline.
- `src/knowledge/uat-manifest.json` / `docs/fixtures/uat_candidates/` — the
  10 unlabeled UAT candidate PDFs; do **not** treat these as training
  examples until a team member produces and saves an `expected.pdf` for
  them. Recommended first round (per the package's own next-step note):
  pick 3–5, have the team redact them normally or validate Privacy IA's
  output, save the result as `expected.pdf`, and only then start tracking
  precision/recall against them.

## Testing

- `npm test` — schema-validation unit tests (valid + intentionally
  malformed Gemini responses, using the knowledge package's own example).
- Redaction pipeline was manually verified against `TRAIN-001/original.pdf`:
  pixels inside an approved region become solid black (0,0,0) while pixels
  outside are untouched, and output PDF metadata is stripped.

## Known gaps / follow-ups

- ~~Vercel Blob's current access model has no true "private" tier~~ —
  mitigated: the API never returns a raw `blob_url_*` to the client (see
  `toClientDocument()` in `src/routes/documents.ts`). PDFs are only ever
  served through `GET /api/documents/:id/file` and `/:id/public-file`,
  which check the session on every request and respond
  `Cache-Control: private, no-store`. The underlying Blob object is still
  technically fetchable by anyone who somehow obtains its exact URL (Blob
  itself has no auth), but the app never discloses that URL to a browser,
  so there's no realistic path to it outside the server. One exception:
  the browser necessarily learns its *own* file's Blob URL for the instant
  of the direct-to-Blob upload (`client/src/pages/Upload.tsx`, required by
  Vercel Blob's client-upload pattern to avoid routing large files through
  our server) — that's the uploader's own just-authored content, not a new
  disclosure, and the client discards the URL immediately after upload.
- ~~The Stitch mockup's copy implies local/on-device inference~~ — checked:
  the actual React pages never carried over that copy ("Nodo local", "Sin
  transferencia externa", "Toroto Core NLP") from the raw mockup HTML, which
  isn't part of this repo to begin with. The app's real UI text doesn't make
  a data-locality claim, and it uses the cloud Gemini API, matching what's
  documented above. No action needed here.
- No automated end-to-end test exercises the full HTTP flow with a real
  Google login yet (needs a real OAuth app + Gemini key); the pipeline
  pieces (schema validation, redaction) are verified individually.
