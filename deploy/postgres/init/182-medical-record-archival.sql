-- M85-D: 病历归档与封存
CREATE TABLE IF NOT EXISTS clinical.medical_record_archives (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id      uuid NOT NULL REFERENCES clinical.visits(id),
  archive_status text NOT NULL DEFAULT 'in_ward' CHECK (archive_status IN ('in_ward','archived','sealed')),
  archived_at   timestamptz,
  archived_by   uuid REFERENCES iam.users(id),
  sealed_at     timestamptz,
  sealed_by     uuid REFERENCES iam.users(id),
  seal_reason   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(visit_id)
);
CREATE INDEX IF NOT EXISTS idx_archive_status ON clinical.medical_record_archives(archive_status);

INSERT INTO iam.permissions(code, name, module) VALUES
  ('medical_archive:archive', '病历归档-归档', 'emr'),
  ('medical_archive:seal', '病历封存', 'emr')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('doctor','medical_archive:archive'),
  ('admin','medical_archive:archive'),
  ('admin','medical_archive:seal')
ON CONFLICT DO NOTHING;
