-- ============================================================================
-- 健澜科技 jlmedaios · M59-A STOP-BANG 睡眠呼吸暂停筛查
-- 幂等建表 + 权限码。
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.stopbang_screenings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL,
  s_snoring boolean NOT NULL,
  t_tired boolean NOT NULL,
  o_observed boolean NOT NULL,
  p_pressure boolean NOT NULL,
  b_bmi boolean NOT NULL,
  a_age boolean NOT NULL,
  n_neck boolean NOT NULL,
  g_gender boolean NOT NULL,
  score int NOT NULL CHECK (score BETWEEN 0 AND 8),
  risk_level text NOT NULL CHECK (risk_level IN ('low','high')),
  assessor uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stopbang_screenings_visit
  ON clinical.stopbang_screenings (visit_id);

INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('stopbang:assess', 'STOP-BANG筛查', 'sleep', '录入睡眠呼吸暂停筛查 8 项'),
  ('stopbang:view', 'STOP-BANG查看', 'sleep', '查看筛查记录与风险分级')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (
  VALUES
    ('admin','stopbang:assess'),('doctor','stopbang:assess'),('nurse','stopbang:assess'),
    ('admin','stopbang:view'),('doctor','stopbang:view'),('nurse','stopbang:view')
) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code = t.r AND rp.permission_code = t.p
);
