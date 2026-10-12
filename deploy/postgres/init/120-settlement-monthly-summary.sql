-- ============================================================================
-- 健澜科技 jlmedaios · M23-C 双轨月度结算报表
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.settlement_monthly_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period text NOT NULL CHECK (period ~ '^[0-9]{4}-[0-9]{2}$'),
  drg_cases int NOT NULL DEFAULT 0,
  dip_cases int NOT NULL DEFAULT 0,
  total_score numeric NOT NULL DEFAULT 0,
  point_value numeric NOT NULL DEFAULT 0,
  insurance_settlement numeric NOT NULL DEFAULT 0,
  patient_out_of_pocket numeric NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_settlement_summary UNIQUE (period)
);

-- 权限码（幂等）
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('settlement_report:view', '月度结算对账报表查看与导出', 'operations', '医保办查看月度 DRG/DIP 结算汇总并导出 CSV')
ON CONFLICT (code) DO NOTHING;

-- 角色授权（幂等）
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.role_code, 'settlement_report:view' FROM (VALUES ('admin'), ('doctor')) AS r(role_code)
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions rp WHERE rp.permission_code='settlement_report:view' AND rp.role_code=r.role_code);
