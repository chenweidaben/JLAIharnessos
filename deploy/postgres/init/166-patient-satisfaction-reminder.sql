-- 健澜科技 jlmedaios - 满意度提醒推送（M64-A，幂等）
-- 复用 M63 satisfaction_surveys，加 reminder_stage 防重状态。

BEGIN;

ALTER TABLE clinical.satisfaction_surveys
  ADD COLUMN IF NOT EXISTS reminder_stage text NOT NULL DEFAULT 'none';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'satisfaction_surveys_reminder_stage_check'
  ) THEN
    ALTER TABLE clinical.satisfaction_surveys
      ADD CONSTRAINT satisfaction_surveys_reminder_stage_check
      CHECK (reminder_stage IN ('none', 'first_sent', 'second_sent', 'done'));
  END IF;
END $$;

-- 权限码（幂等）
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('satisfaction:notify', '满意度提醒推送', 'nursing', '管理员触发满意度待填扫描推送')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.permission_code
FROM iam.roles r
CROSS JOIN (VALUES ('satisfaction:notify')) AS p(permission_code)
WHERE r.code IN ('admin', 'doctor', 'nurse')
ON CONFLICT DO NOTHING;

COMMIT;
