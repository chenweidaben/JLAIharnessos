-- ============================================================================
-- 健澜科技 jlmedaios · M20-A 患者通知中心（outbox→WS 实时触达）
--
-- 业务发生时写通知 + outbox 事件；患者端未读铃铛。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.patient_notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  uuid NOT NULL,
  notif_type  text NOT NULL CHECK (notif_type IN ('report_pushed','appointment_booked','appointment_cancelled','critical')),
  title       text NOT NULL,
  body        text NOT NULL,
  ref_type    text NULL,
  ref_id      uuid NULL,
  read_at     timestamptz NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_notifications_unread ON clinical.patient_notifications(patient_id, read_at);

-- 权限码
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('notification:read', '通知读取', 'patient', '读取本人通知中心')
ON CONFLICT (code) DO NOTHING;

-- 角色授权（幂等：先查后插）
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.role_code, 'notification:read'
FROM (VALUES ('admin'), ('doctor'), ('nurse'), ('patient')) AS r(role_code)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp
  WHERE rp.role_code = r.role_code AND rp.permission_code = 'notification:read'
);
