// Mirrors src/types.ts on the server (kept in sync manually - the client is
// a separate package so it can't import server TS directly).

export type Recommendation = 'REDACT' | 'KEEP' | 'HUMAN_REVIEW_REQUIRED'
export type ContentType =
  | 'TEXT' | 'TABLE' | 'HANDWRITING' | 'SIGNATURE' | 'FINGERPRINT' | 'IMAGE' | 'OTHER'
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PSEUDONYMIZED' | 'HUMAN_EDITED'
export type DocumentStatus =
  | 'PENDING_UPLOAD' | 'UPLOADED' | 'ANALYZING' | 'READY_FOR_REVIEW'
  | 'REVIEW_IN_PROGRESS' | 'EXPORTED' | 'ANALYSIS_FAILED' | 'DUPLICATE_REJECTED'

export interface DetectionLocation {
  coordinate_system: 'NORMALIZED_0_1'
  x: number | null
  y: number | null
  width: number | null
  height: number | null
  location_confidence: number
}

export interface Detection {
  id: string
  document_id: string
  source_detection_id: string
  page: number
  rule_id: string
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
}

export interface DocumentRecord {
  id: string
  filename: string
  sha256: string
  size_bytes: number
  pages: number | null
  requester_area: string | null
  // No raw Blob URLs here on purpose - the server strips them from every
  // response (see toClientDocument() in src/routes/documents.ts). Fetch
  // PDF bytes through /api/documents/:id/file or /public-file instead,
  // which check the session on every request.
  status: DocumentStatus
  created_at: string
  updated_at: string
}

export interface AnalysisStatus {
  id: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'COMPLETED_WITH_WARNINGS' | 'FAILED'
  warnings: string[]
  error_message: string | null
}

export interface SessionUser {
  id: number
  email: string
  name: string | null
}
