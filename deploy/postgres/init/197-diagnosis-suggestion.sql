-- M88-C: AI鉴别诊断
CREATE TABLE IF NOT EXISTS clinical.diagnosis_suggestions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id      uuid NOT NULL REFERENCES clinical.visits(id),
  chief_complaint text NOT NULL,
  symptoms     text[],
  suggestions  jsonb NOT NULL,
  confidence   numeric,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  selected_diagnosis text,
  reviewed_by  uuid REFERENCES iam.users(id),
  reviewed_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_diag_visit ON clinical.diagnosis_suggestions(visit_id);

INSERT INTO iam.permissions(code, name, module) VALUES
  ('ai_diagnosis:view', 'AI诊断-查看', 'emr')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('doctor','ai_diagnosis:view'), ('admin','ai_diagnosis:view')
ON CONFLICT DO NOTHING;
