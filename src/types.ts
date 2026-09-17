// Shared types mirroring src/knowledge/gemini-response-schema-v1.json

export type Recommendation = 'REDACT' | 'KEEP' | 'HUMAN_REVIEW_REQUIRED'

export type ContentType =
  | 'TEXT'
  | 'TABLE'
  | 'HANDWRITING'
  | 'SIGNATURE'
  | 'FINGERPRINT'
  | 'IMAGE'
  | 'OTHER'

export type RuleId =
  | 'TOR-PRIV-001'
  | 'TOR-PRIV-002'
  | 'TOR-PRIV-003'
  | 'TOR-PRIV-004'
  | 'TOR-PRIV-005'
  | 'TOR-PRIV-006'
  | 'TOR-PRIV-007'
  | 'TOR-PRIV-008'
  | 'TOR-PRIV-009'
  | 'TOR-PRIV-010'
  | 'TOR-PRIV-011'

export interface DetectionLocation {
  coordinate_system: 'NORMALIZED_0_1'
  x: number | null
  y: number | null
  width: number | null
  height: number | null
  location_confidence: number
}

export interface GeminiDetection {
  detection_id: string
  page: number
  rule_id: RuleId
  category: string
  content_type: ContentType
  exact_text: string | null
  context: string
  reason: string
  recommendation: Recommendation
  confidence: number
  location: DetectionLocation
  requires_human_confirmation: boolean
}

export interface GeminiAnalysisResponse {
  schema_version: '1.0'
  document: {
    document_id: string
    filename: string
    pages_analyzed: number
    analysis_status: 'COMPLETED' | 'COMPLETED_WITH_WARNINGS' | 'FAILED'
  }
  summary: {
    total_detections: number
    redact: number
    keep: number
    human_review_required: number
    warnings: string[]
  }
  detections: GeminiDetection[]
  publication: {
    status: 'NOT_READY_FOR_PUBLICATION' | 'READY_FOR_HUMAN_REVIEW'
    human_approval_required: true
  }
}

// Human review decision recorded per detection - never trust the model's
// own `recommendation` as the final word, this is what the app persists.
export type ReviewStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'PSEUDONYMIZED'
  | 'HUMAN_EDITED'

export type DocumentStatus =
  | 'PENDING_UPLOAD'
  | 'UPLOADED'
  | 'ANALYZING'
  | 'READY_FOR_REVIEW'
  | 'REVIEW_IN_PROGRESS'
  | 'EXPORTED'
  | 'ANALYSIS_FAILED'
  | 'DUPLICATE_REJECTED'

export interface DocumentRecord {
  id: string
  filename: string
  sha256: string
  size_bytes: number
  pages: number | null
  requester_area: string | null
  blob_url_original: string
  blob_url_public: string | null
  status: DocumentStatus
  uploaded_by: number | null
  created_at: string
  updated_at: string
}

export interface DetectionRecord {
  id: string
  document_id: string
  analysis_job_id: string
  source_detection_id: string
  page: number
  rule_id: RuleId
  category: string
  content_type: ContentType
  exact_text: string | null
  context: string
  reason: string
  recommendation: Recommendation
  confidence: number
  location: DetectionLocation
  manual_location: DetectionLocation | null
  requires_human_confirmation: boolean
  review_status: ReviewStatus
  reviewed_by: number | null
  reviewed_at: string | null
  created_at: string
}
