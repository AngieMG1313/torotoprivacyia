import { GoogleGenAI, createUserContent, createPartFromUri } from '@google/genai'
// gemini-response-schema-v1.json declares "$schema": draft/2020-12, which the
// base Ajv class (draft-07) doesn't understand - Ajv2020 does.
import { Ajv2020 } from 'ajv/dist/2020.js'
import type { ErrorObject } from 'ajv'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import type { GeminiAnalysisResponse } from '../types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const knowledgeDir = join(__dirname, '..', 'knowledge')
const promptsDir = join(__dirname, '..', 'prompts')

const systemPrompt = readFileSync(join(promptsDir, 'system-prompt-v1.md'), 'utf8')
const analysisPrompt = readFileSync(
  join(promptsDir, 'document-analysis-prompt-v1.md'),
  'utf8',
)
const privacyRules = readFileSync(join(knowledgeDir, 'privacy-rules.json'), 'utf8')
const responseSchema = JSON.parse(
  readFileSync(join(knowledgeDir, 'gemini-response-schema-v1.json'), 'utf8'),
)
// Reference-only lessons, explicitly subordinate to privacy-rules.json - see
// the rule-priority section of system-prompt-v1.md. Never let these
// introduce categories not already in privacy-rules.json.
const train001Analysis = readFileSync(
  join(knowledgeDir, 'train-001-analysis.json'),
  'utf8',
)

const ajv = new Ajv2020({ allErrors: true, strict: false })
const validateResponse = ajv.compile(responseSchema)

let client: GoogleGenAI | undefined
function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY is not set. This key must only ever live server-side.',
      )
    }
    client = new GoogleGenAI({ apiKey })
  }
  return client
}

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-pro'

export interface AnalyzeResult {
  status: 'COMPLETED' | 'COMPLETED_WITH_WARNINGS' | 'FAILED'
  response: GeminiAnalysisResponse | null
  rawText: string
  warnings: string[]
  errorMessage?: string
}

/**
 * Uploads the PDF to the Gemini Files API and runs the Toroto Privacy IA
 * analysis prompt against it, validating the result against
 * gemini-response-schema-v1.json. Gemini only ever proposes detections here
 * - nothing in this module writes or approves a public PDF.
 */
export async function analyzeDocument(
  documentId: string,
  filename: string,
  pdfBuffer: Buffer,
): Promise<AnalyzeResult> {
  const ai = getClient()

  const uploaded = await ai.files.upload({
    file: new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' }),
    config: { displayName: filename, mimeType: 'application/pdf' },
  })

  if (!uploaded.uri || !uploaded.mimeType) {
    return {
      status: 'FAILED',
      response: null,
      rawText: '',
      warnings: [],
      errorMessage: 'Gemini Files API did not return a usable file reference.',
    }
  }

  const userTurn = [
    `document_id: ${documentId}`,
    `filename: ${filename}`,
    '',
    analysisPrompt,
    '',
    '--- privacy-rules.json (authoritative) ---',
    privacyRules,
    '',
    '--- TRAIN-001 validated lessons (reference only, never overrides rules above) ---',
    train001Analysis,
  ].join('\n')

  const result = await ai.models.generateContent({
    model: MODEL,
    contents: createUserContent([
      userTurn,
      createPartFromUri(uploaded.uri, uploaded.mimeType),
    ]),
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
      responseSchema,
      temperature: 0,
    },
  })

  const rawText = result.text ?? ''
  return validateAndParse(rawText)
}

export function validateAndParse(rawText: string): AnalyzeResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch {
    return {
      status: 'FAILED',
      response: null,
      rawText,
      warnings: [],
      errorMessage: 'Gemini response was not valid JSON.',
    }
  }

  const valid = validateResponse(parsed)
  if (!valid) {
    const errors = (validateResponse.errors ?? [])
      .map((e: ErrorObject) => `${e.instancePath || '/'} ${e.message}`)
      .join('; ')
    return {
      status: 'FAILED',
      response: null,
      rawText,
      warnings: [],
      errorMessage: `Gemini response failed schema validation: ${errors}`,
    }
  }

  const response = parsed as GeminiAnalysisResponse

  // Backend independently re-asserts the human-in-the-loop guarantee rather
  // than trusting the model's own output for this field.
  response.publication = {
    status: 'READY_FOR_HUMAN_REVIEW',
    human_approval_required: true,
  }

  const status =
    response.document.analysis_status === 'FAILED'
      ? 'FAILED'
      : response.summary.warnings.length > 0
        ? 'COMPLETED_WITH_WARNINGS'
        : 'COMPLETED'

  return {
    status,
    response,
    rawText,
    warnings: response.summary.warnings,
  }
}

/**
 * One retry with a normalization instruction, per GEMINI-V1-README.md's
 * guidance for handling non-conforming output. Never surfaces a
 * schema-invalid response to the UI as an approved result.
 */
export async function analyzeDocumentWithRetry(
  documentId: string,
  filename: string,
  pdfBuffer: Buffer,
): Promise<AnalyzeResult> {
  const first = await analyzeDocument(documentId, filename, pdfBuffer)
  if (first.status !== 'FAILED') return first

  const ai = getClient()
  const retryResult = await ai.models.generateContent({
    model: MODEL,
    contents: createUserContent([
      'Your previous response did not validate against the required JSON schema. ' +
        'Return ONLY valid JSON matching the schema, with no markdown, no commentary, ' +
        'and no fields outside the schema. Previous invalid output:',
      first.rawText.slice(0, 8000),
    ]),
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
      responseSchema,
      temperature: 0,
    },
  })

  const retryText = retryResult.text ?? ''
  const retryParsed = validateAndParse(retryText)
  if (retryParsed.status === 'FAILED') {
    return {
      ...retryParsed,
      errorMessage: `Retry also failed: ${retryParsed.errorMessage}. Original error: ${first.errorMessage}`,
    }
  }
  return retryParsed
}
