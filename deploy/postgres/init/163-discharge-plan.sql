-- ============================================================================
-- 健澜科技 jlmedaios · M61-A 出院计划与随访自动生成
-- 幂等建表 + 权限码。
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.discharge_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL UNIQUE,
  discharge_guidance text NOT NULL,
  medication_summary text NOT NULL,
  followup_date date NOT NULL,
  followup_department text NOT NULL,
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned','pushed','completed')),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discharge_plans_followup_date
  ON clinical.discharge_plans (followup_date);

INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('discharge_plan:manage', '出院计划', 'discharge', '生成出院指导与随访计划并推送患者端'),
  ('discharge_plan:view', '出院计划查看', 'discharge', '查看出院计划与随访安排')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (
  VALUES
    ('admin','discharge_plan:manage'),('doctor','discharge_plan:manage'),('nurse','discharge_plan:manage'),
    ('admin','discharge_plan:view'),('doctor','discharge_plan:view'),('nurse','discharge_plan:view')
) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code = t.r AND rp.permission_code = t.p
);
