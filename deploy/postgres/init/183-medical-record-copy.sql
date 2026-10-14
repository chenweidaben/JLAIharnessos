-- M85-E: 病历复印申请
CREATE TABLE IF NOT EXISTS clinical.medical_record_copy_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id      uuid NOT NULL REFERENCES clinical.visits(id),
  applicant_name text NOT NULL,
  applicant_relation text NOT NULL CHECK (applicant_relation IN ('patient','family','lawyer','court','insurance')),
  id_card_no    text NOT NULL,
  contact_phone text NOT NULL,
  purpose       text NOT NULL,
  copies        int NOT NULL DEFAULT 1,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','completed')),
  reviewed_at    timestamptz,
  reviewed_by    uuid REFERENCES iam.users(id),
  reject_reason text,
  completed_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_copy_status ON clinical.medical_record_copy_requests(status);

INSERT INTO iam.permissions(code, name, module) VALUES
  ('medical_copy:review', '病历复印-审批', 'emr'),
  ('medical_copy:complete', '病历复印-完成', 'emr')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('admin','medical_copy:review'),
  ('admin','medical_copy:complete')
ON CONFLICT DO NOTHING;
