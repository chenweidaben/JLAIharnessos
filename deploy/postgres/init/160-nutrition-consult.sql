-- ============================================================================
-- 健澜科技 jlmedaios · M58-A 营养科会诊执行（闭环 M29-C 营养工单）
-- 幂等建表 + 权限码。
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.nutrition_consults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL,
  consult_type text NOT NULL CHECK (consult_type IN ('routine','urgent')),
  nutrition_diagnosis text NOT NULL,
  plan text NOT NULL,
  calories_per_day int NOT NULL CHECK (calories_per_day BETWEEN 800 AND 4000),
  followup_days int NOT NULL DEFAULT 7,
  status text NOT NULL DEFAULT 'consulted'
    CHECK (status IN ('consulted','followed_up','closed')),
  dietitian uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nutrition_consults_visit_status
  ON clinical.nutrition_consults (visit_id, status);

INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('nutrition_consult:manage', '营养会诊执行', 'nutrition', '录入营养会诊方案与随访'),
  ('nutrition_consult:view', '营养会诊查看', 'nutrition', '查看营养会诊记录与方案')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (
  VALUES
    ('admin','nutrition_consult:manage'),('doctor','nutrition_consult:manage'),('nurse','nutrition_consult:manage'),
    ('admin','nutrition_consult:view'),('doctor','nutrition_consult:view'),('nurse','nutrition_consult:view')
) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code = t.r AND rp.permission_code = t.p
);
