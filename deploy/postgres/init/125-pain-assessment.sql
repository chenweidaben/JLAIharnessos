-- ============================================================================
-- 健澜科技 jlmedaios · M29-B 疼痛评估（NRS 0-10）
--
-- clinical.pain_assessments：NRS 0-10 + 类型(admission/postop/cancer/followup)。
--   score>=4 触发镇痛建议；术后/癌痛需再评估。
-- 权限码：pain:assess（护士评估）、pain:view（医护查看）。
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING / WHERE NOT EXISTS。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.pain_assessments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id     uuid NOT NULL REFERENCES clinical.visits(id),
  score        int  NOT NULL CHECK (score BETWEEN 0 AND 10),
  assess_type  text NOT NULL CHECK (assess_type IN ('admission','postop','cancer','followup')),
  location     text,
  note         text,
  created_by   uuid NOT NULL REFERENCES iam.users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pain_assessment_visit ON clinical.pain_assessments(visit_id);

-- ---------------------------------------------------------------------------
-- 权限码（幂等）
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('pain:assess', '疼痛评估录入', 'pain', '护士/医生对患者做 NRS 疼痛评估（nurse/doctor/admin）'),
  ('pain:view',   '疼痛评估查看', 'pain', '查看在院患者疼痛评估记录与分级（nurse/doctor/admin）')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 角色授权（幂等）：assess+view 授 nurse/doctor/admin
-- ---------------------------------------------------------------------------
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (VALUES ('admin','pain:assess'),('admin','pain:view'),
  ('doctor','pain:assess'),('doctor','pain:view'),
  ('nurse','pain:assess'),('nurse','pain:view')) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code=t.r AND rp.permission_code=t.p
);
