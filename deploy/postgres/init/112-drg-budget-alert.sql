-- ============================================================================
-- 健澜科技 jlmedaios · M22-A DRG/DIP 病组预算监控与超支预警
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.drg_group_budgets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_code    text NOT NULL,
  version       text NOT NULL DEFAULT 'v1',
  expected_cost numeric NOT NULL CHECK (expected_cost >= 0),
  warning_ratio numeric NOT NULL DEFAULT 1.1 CHECK (warning_ratio >= 1),
  effective_from date NOT NULL DEFAULT current_date,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_code, version)
);

CREATE TABLE IF NOT EXISTS clinical.drg_cost_alerts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id       uuid NULL,
  group_code     text NOT NULL,
  actual_cost    numeric NULL,
  budget_cost    numeric NULL,
  ratio          numeric NULL,
  level          text NOT NULL DEFAULT 'warn' CHECK (level IN ('warn','over')),
  acknowledged   boolean NOT NULL DEFAULT false,
  acknowledged_by uuid NULL,
  acknowledged_at timestamptz NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drg_budget_group ON clinical.drg_group_budgets(group_code);
CREATE INDEX IF NOT EXISTS idx_drg_alert_group ON clinical.drg_cost_alerts(group_code);
CREATE INDEX IF NOT EXISTS idx_drg_alert_visit ON clinical.drg_cost_alerts(visit_id);

-- 权限码
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('drg_budget:manage', 'DRG预算配置', 'operations', '医保办设病组预算'),
  ('drg_budget:view', 'DRG超支预警查看', 'operations', '医护看超支告警')
ON CONFLICT (code) DO NOTHING;

-- 角色授权（幂等：先查后插）
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.role_code, r.code
FROM (VALUES ('admin','drg_budget:manage'), ('admin','drg_budget:view'),
             ('doctor','drg_budget:view'), ('nurse','drg_budget:view')) AS r(role_code, code)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp
  WHERE rp.role_code = r.role_code AND rp.permission_code = r.code
);
