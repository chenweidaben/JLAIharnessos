-- M90-A: AI病历质控
CREATE TABLE IF NOT EXISTS clinical.ai_note_qc (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id    uuid NOT NULL,
  note_type   text,
  issues      jsonb NOT NULL DEFAULT '[]',
  score       integer,
  status      text NOT NULL DEFAULT 'pending',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_note_qc_visit ON clinical.ai_note_qc(visit_id);

INSERT INTO iam.permissions(code, name, module) VALUES
  ('ai_note_qc:view', 'AI病历质控查看', 'emr')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('doctor','ai_note_qc:view'), ('admin','ai_note_qc:view')
ON CONFLICT DO NOTHING;
