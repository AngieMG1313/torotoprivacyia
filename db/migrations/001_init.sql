-- Toroto Privacy IA - initial schema
-- Run via: npm run db:migrate

create table if not exists users (
  id serial primary key,
  email text not null unique,
  name text,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  sha256 text not null,
  size_bytes bigint not null,
  pages integer,
  requester_area text,
  blob_url_original text not null,
  blob_url_public text,
  -- UPLOADED -> ANALYZING -> READY_FOR_REVIEW -> (REVIEW_IN_PROGRESS) -> EXPORTED | ANALYSIS_FAILED
  status text not null default 'UPLOADED',
  uploaded_by integer references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists documents_sha256_idx on documents (sha256);

create table if not exists analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  -- PENDING -> RUNNING -> COMPLETED | COMPLETED_WITH_WARNINGS | FAILED
  status text not null default 'PENDING',
  schema_version text,
  raw_response jsonb,
  warnings jsonb not null default '[]'::jsonb,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists analysis_jobs_document_id_idx on analysis_jobs (document_id);

create table if not exists detections (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  analysis_job_id uuid not null references analysis_jobs(id) on delete cascade,
  source_detection_id text not null,
  page integer not null,
  rule_id text not null,
  category text not null,
  content_type text not null,
  exact_text text,
  context text,
  reason text,
  recommendation text not null, -- REDACT | KEEP | HUMAN_REVIEW_REQUIRED (model's own suggestion)
  confidence numeric,
  location jsonb not null, -- {coordinate_system, x, y, width, height, location_confidence}
  manual_location jsonb, -- human-drawn override, same shape
  requires_human_confirmation boolean not null default true,
  -- PENDING -> APPROVED | REJECTED | PSEUDONYMIZED | HUMAN_EDITED
  review_status text not null default 'PENDING',
  reviewed_by integer references users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists detections_document_id_idx on detections (document_id);

create table if not exists exports (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  exported_by integer references users(id),
  approved_detection_ids jsonb not null,
  input_sha256 text not null,
  output_sha256 text not null,
  blob_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists exports_document_id_idx on exports (document_id);

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete set null,
  submitted_by integer references users(id),
  sentiment text, -- MUY_PRECISA | FALSOS_POSITIVOS | null
  message text not null,
  created_at timestamptz not null default now()
);
