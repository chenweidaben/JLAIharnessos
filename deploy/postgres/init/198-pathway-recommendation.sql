-- M88-D: AI临床路径推荐
CREATE TABLE IF NOT EXISTS clinical.pathway_recommendations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id      uuid NOT NULL REFERENCES clinical.visits(id),
  diagnosis     text NOT NULL,
  pathway_name  text NOT NULL,
  pathway_code  text,
  steps        jsonb NOT NULL DEFAULT '[]',
  expected_days integer,
  confidence    numeric,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  accepted_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pathway_visit ON clinical.pathway_recommendations(visit_id);

INSERT INTO iam.permissions(code, name, module) VALUES
  ('ai_pathway:view', 'AI路径-推荐', 'emr')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('doctor','ai_pathway:view'), ('admin','ai_pathway:view')
ON CONFLICT DO NOTHING;
