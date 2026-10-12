-- ============================================================================
-- 健澜科技 jlmedaios · M43-A 化疗 T-1 天患者通知
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

ALTER TABLE clinical.chemo_cycles ADD COLUMN IF NOT EXISTS reminder_sent boolean NOT NULL DEFAULT false;

INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('chemo:remind', '化疗提醒触发', 'oncology', '扫描明日化疗周期并发患者通知（admin/doctor）')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (
  VALUES ('admin','chemo:remind'),('doctor','chemo:remind')
) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code=t.r AND rp.permission_code=t.p
);
