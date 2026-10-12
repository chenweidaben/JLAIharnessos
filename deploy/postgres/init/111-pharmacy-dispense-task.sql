-- ============================================================================
-- 健澜科技 jlmedaios · M21-B 药房配药任务队列
--
-- 支付成功后自动建 pending 任务；药师完成 → 处方 ready_dispense。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.pharmacy_dispense_tasks (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id     uuid NOT NULL,
  patient_id          uuid NOT NULL,
  status              text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','cancelled')),
  assigned_pharmacist uuid NULL,
  completed_at        timestamptz NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prescription_id)
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_tasks_status ON clinical.pharmacy_dispense_tasks(status, patient_id);

-- 权限码
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('pharmacy:dispense', '药房配药', 'pharmacy', '药师完成配药任务')
ON CONFLICT (code) DO NOTHING;

-- 角色授权（幂等：先查后插）
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.role_code, r.code
FROM (VALUES ('doctor','pharmacy:dispense'), ('admin','pharmacy:dispense'), ('nurse','pharmacy:dispense')) AS r(role_code, code)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp
  WHERE rp.role_code = r.role_code AND rp.permission_code = r.code
);
