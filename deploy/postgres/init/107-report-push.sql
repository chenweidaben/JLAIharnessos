-- ============================================================================
-- 健澜科技 jlmedaios · M19-B 检查报告患者推送闭环
--
-- report_pushes：医护端推送报告到患者端；患者端查看回执（pushed→viewed，view_count 累加）。
-- 权限码：report_push:manage（doctor/nurse/admin 推送）、report:view_patient（患者端查看）。
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING / WHERE NOT EXISTS。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.report_pushes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type  text NOT NULL CHECK (report_type IN ('lab','imaging')),
  report_id    uuid NOT NULL,
  patient_id   uuid NOT NULL,
  visit_id     uuid,
  pushed_at    timestamptz NOT NULL DEFAULT now(),
  pushed_by    uuid NOT NULL,
  viewed_at    timestamptz,
  view_count   int NOT NULL DEFAULT 0,
  status       text NOT NULL DEFAULT 'pushed' CHECK (status IN ('pushed','viewed')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_type, report_id)
);
CREATE INDEX IF NOT EXISTS idx_pushes_patient_status ON clinical.report_pushes(patient_id, status);

-- ---------------------------------------------------------------------------
-- 权限码（幂等）
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('report_push:manage', '报告推送管理', 'report_push', '医护端推送检查/检验报告到患者端'),
  ('report:view_patient', '患者端报告查看', 'report_push', '患者查看本人已推送报告并回执')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (VALUES
  ('admin','report_push:manage'),('admin','report:view_patient'),
  ('doctor','report_push:manage'),('doctor','report:view_patient'),
  ('nurse','report_push:manage'),('nurse','report:view_patient'),
  ('patient','report:view_patient')
) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code=t.r AND rp.permission_code=t.p
);
