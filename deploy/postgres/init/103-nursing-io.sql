-- ============================================================================
-- 健澜科技 jlmedaios · M17-E 护理出入量记录闭环（I&O balance）
--
-- clinical.nursing_io_records：口服/鼻饲/静脉/血制品入量 vs
--   尿/便/引流/呕吐/出汗出量；8h 班 + 24h 平衡由纯函数聚合。
--
-- 权限码：nursing_io:read（护士/医生/admin）、nursing_io:write（护士/医生/admin）。
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING / WHERE NOT EXISTS。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.nursing_io_records (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id     uuid NOT NULL REFERENCES clinical.visits(id),
  patient_id   uuid NOT NULL,
  direction    text NOT NULL CHECK (direction IN ('intake','output')),
  category     text NOT NULL CHECK (category IN (
                 'oral','tube_feed','iv','blood_product',
                 'urine','stool','drain','vomit','sweat','other')),
  amount_ml    numeric NOT NULL CHECK (amount_ml >= 0 AND amount_ml <= 10000),
  record_time  timestamptz NOT NULL DEFAULT now(),
  note         text,
  recorded_by  uuid NOT NULL REFERENCES iam.users(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_nursing_io_visit_time ON clinical.nursing_io_records(visit_id, record_time);

-- ---------------------------------------------------------------------------
-- 权限码（幂等）
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('nursing_io:read', '出入量只读', 'nursing_io', '查看在院患者出入量与 24h/班次平衡（护士/医生/admin）'),
  ('nursing_io:write', '出入量录入', 'nursing_io', 'PDA 出入量录入（护士/医生/admin）')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 角色授权（幂等）：read+write 授 nurse/doctor/admin
-- ---------------------------------------------------------------------------
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (VALUES ('admin','nursing_io:read'),('admin','nursing_io:write'),
  ('doctor','nursing_io:read'),('doctor','nursing_io:write'),
  ('nurse','nursing_io:read'),('nurse','nursing_io:write')) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code=t.r AND rp.permission_code=t.p
);
