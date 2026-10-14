-- M90-B: AI护理计划推荐
CREATE TABLE IF NOT EXISTS clinical.ai_nursing_plans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id    uuid NOT NULL,
  diagnosis   text,
  plan        jsonb NOT NULL DEFAULT '[]',
  risk_level  text NOT NULL DEFAULT 'low',
  status      text NOT NULL DEFAULT 'pending',
  operator    uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_nursing_plan_visit ON clinical.ai_nursing_plans(visit_id);

INSERT INTO iam.permissions(code, name, module) VALUES
  ('ai_nursing_plan:view', 'AI护理计划推荐查看', 'emr')
ON CONFLICT DO NOTHING;

INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('doctor', 'ai_nursing_plan:view'),
  ('admin', 'ai_nursing_plan:view')
ON CONFLICT DO NOTHING;
