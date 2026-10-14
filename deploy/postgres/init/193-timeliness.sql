-- M87-C: 病历时效监控
CREATE TABLE IF NOT EXISTS clinical.document_timeliness (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id      uuid NOT NULL REFERENCES clinical.visits(id),
  doc_type      text NOT NULL CHECK (doc_type IN ('admission_note','first_progress','daily_progress','discharge_summary','consent','surgery_record')),
  required_minutes integer NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  due_at        timestamptz NOT NULL,
  completed_at  timestamptz,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ontime','late')),
  late_minutes  integer,
  created_by    uuid REFERENCES iam.users(id)
);
CREATE INDEX IF NOT EXISTS idx_timeliness_visit ON clinical.document_timeliness(visit_id);
CREATE INDEX IF NOT EXISTS idx_timeliness_status ON clinical.document_timeliness(status);

INSERT INTO iam.permissions(code, name, module) VALUES
  ('timeliness:view', '病历时效-查看', 'emr'),
  ('timeliness:alert', '病历时效-预警', 'emr')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('admin','timeliness:view'), ('doctor','timeliness:view'),
  ('admin','timeliness:alert')
ON CONFLICT DO NOTHING;
