-- ============================================================================
-- 健澜科技 jlmedaios · M29-A 入院营养风险筛查（NRS-2002）
--
-- clinical.nutrition_screenings：营养状态(0-3)+疾病严重度(0-3)+年龄>=70加1
--   总分>=3 => 营养风险，建议营养科会诊。
-- 权限码：nutrition:screen（护士筛查）、nutrition:view（医护查看）。
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING / WHERE NOT EXISTS。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.nutrition_screenings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id          uuid NOT NULL REFERENCES clinical.visits(id),
  nutrition_score   int  NOT NULL CHECK (nutrition_score BETWEEN 0 AND 3),
  disease_severity  int  NOT NULL CHECK (disease_severity BETWEEN 0 AND 3),
  age_bonus         int  NOT NULL DEFAULT 0,
  total_score       int  NOT NULL,
  nutrition_risk    boolean NOT NULL,
  result_note       text,
  created_by        uuid NOT NULL REFERENCES iam.users(id),
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_nutrition_screening_visit ON clinical.nutrition_screenings(visit_id);

-- ---------------------------------------------------------------------------
-- 权限码（幂等）
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('nutrition:screen', '营养风险筛查录入', 'nutrition', '护士对入院患者做 NRS-2002 营养风险筛查（nurse/doctor/admin）'),
  ('nutrition:view',   '营养风险筛查查看', 'nutrition', '查看在院患者营养风险筛查记录与风险结论（nurse/doctor/admin）')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 角色授权（幂等）：screen+view 授 nurse/doctor/admin
-- ---------------------------------------------------------------------------
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (VALUES ('admin','nutrition:screen'),('admin','nutrition:view'),
  ('doctor','nutrition:screen'),('doctor','nutrition:view'),
  ('nurse','nutrition:screen'),('nurse','nutrition:view')) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code=t.r AND rp.permission_code=t.p
);
