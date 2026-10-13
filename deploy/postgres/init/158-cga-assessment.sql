-- ============================================================================
-- 健澜科技 jlmedaios · M56-A 老年综合评估 CGA（>=80 岁入院常规）
-- 幂等建表 + 权限码。
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.cga_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL,
  adl_score int NOT NULL CHECK (adl_score BETWEEN 0 AND 100),
  iadl_score int NOT NULL CHECK (iadl_score BETWEEN 0 AND 28),
  mmse_score int NOT NULL CHECK (mmse_score BETWEEN 0 AND 30),
  fall_risk boolean NOT NULL DEFAULT false,
  mna_score int NOT NULL CHECK (mna_score BETWEEN 0 AND 14),
  gds_score int NOT NULL CHECK (gds_score BETWEEN 0 AND 15),
  risk_level text NOT NULL DEFAULT 'low'
    CHECK (risk_level IN ('low','moderate','high')),
  assessor uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cga_assessments_visit ON clinical.cga_assessments (visit_id);

INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('cga:assess', '老年综合评估录入', 'nursing', '录入 CGA 六维评分并分级'),
  ('cga:view', '老年综合评估查看', 'nursing', '查看 CGA 评估结果与风险分级')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (
  VALUES
    ('admin','cga:assess'),('doctor','cga:assess'),('nurse','cga:assess'),
    ('admin','cga:view'),('doctor','cga:view'),('nurse','cga:view')
) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code = t.r AND rp.permission_code = t.p
);
