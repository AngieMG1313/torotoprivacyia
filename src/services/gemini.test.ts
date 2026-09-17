import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { validateAndParse } from './gemini.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const knowledgeDir = join(__dirname, '..', 'knowledge')

test('accepts the knowledge package example response', () => {
  const example = readFileSync(join(knowledgeDir, 'gemini-example-response-v1.json'), 'utf8')
  const result = validateAndParse(example)
  assert.equal(result.status, 'COMPLETED')
  assert.ok(result.response)
  assert.equal(result.response!.detections.length, 3)
  // Human-in-the-loop guarantee is re-asserted regardless of model output.
  assert.equal(result.response!.publication.human_approval_required, true)
})

test('rejects a response with an unknown rule_id', () => {
  const example = JSON.parse(
    readFileSync(join(knowledgeDir, 'gemini-example-response-v1.json'), 'utf8'),
  )
  example.detections[0].rule_id = 'TOR-PRIV-999' // not in the 11-category enum
  const result = validateAndParse(JSON.stringify(example))
  assert.equal(result.status, 'FAILED')
  assert.match(result.errorMessage ?? '', /schema validation/)
})

test('rejects a response missing the required publication field', () => {
  const example = JSON.parse(
    readFileSync(join(knowledgeDir, 'gemini-example-response-v1.json'), 'utf8'),
  )
  delete example.publication
  const result = validateAndParse(JSON.stringify(example))
  assert.equal(result.status, 'FAILED')
})

test('rejects non-JSON output outright', () => {
  const result = validateAndParse('not json at all')
  assert.equal(result.status, 'FAILED')
  assert.match(result.errorMessage ?? '', /not valid JSON/)
})
