-- M90-B: 病历终末质控评分（甲级/乙级/丙级判定）
-- 健澜科技 jlmedaios
CREATE TABLE IF NOT EXISTS clinical.terminal_qc (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id    uuid NOT NULL,
  grade       text,
  score       integer,
  issues      jsonb NOT NULL DEFAULT '[]',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_terminal_qc_visit ON clinical.terminal_qc(visit_id);

INSERT INTO iam.permissions(code, name, module) VALUES
  ('terminal_qc:view', '病历终末质控评分', 'emr')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('doctor','terminal_qc:view'), ('admin','terminal_qc:view')
ON CONFLICT DO NOTHING;
