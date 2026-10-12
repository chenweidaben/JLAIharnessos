-- ============================================================================
-- 健澜科技 jlmedaios · M21-A 在线问诊续方流转闭环
--
-- internet_prescriptions 补续方编排列；状态 CHECK 加 ready_dispense。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

ALTER TABLE clinical.internet_prescriptions ADD COLUMN IF NOT EXISTS is_renewal boolean NOT NULL DEFAULT false;
ALTER TABLE clinical.internet_prescriptions ADD COLUMN IF NOT EXISTS prior_prescription_id uuid NULL;

-- 状态机补 ready_dispense（paid 后配药）
ALTER TABLE clinical.internet_prescriptions DROP CONSTRAINT IF EXISTS internet_prescriptions_status_check;
ALTER TABLE clinical.internet_prescriptions ADD CONSTRAINT internet_prescriptions_status_check
  CHECK (status IN ('pending_review','approved','rejected','returned','cancelled','paid','ready_dispense'));

CREATE INDEX IF NOT EXISTS idx_e_rx_renewal ON clinical.internet_prescriptions(is_renewal, status);

-- 权限码
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('renewal:prescribe', '续方开方', 'internet', '医生对已结束会话发起续方'),
  ('renewal:pay', '续方支付', 'internet', '患者对自己待付处方发起支付')
ON CONFLICT (code) DO NOTHING;

-- 角色授权（幂等：先查后插）
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.role_code, r.code
FROM (VALUES ('doctor','renewal:prescribe'), ('admin','renewal:prescribe'),
             ('patient','renewal:pay'), ('admin','renewal:pay')) AS r(role_code, code)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp
  WHERE rp.role_code = r.role_code AND rp.permission_code = r.code
);
