-- ============================================================================
-- 健澜科技 jlmedaios · M22-B 在院病例费用实时滚动监控（事中管控）
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.inpatient_cost_monitor (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id                 uuid NOT NULL,
  group_code               text NULL,
  budget_cost              numeric NULL,
  accumulated_cost         numeric NOT NULL DEFAULT 0,
  ratio                    numeric NULL,
  level                    text NOT NULL DEFAULT 'ok' CHECK (level IN ('ok','warn','over')),
  last_snapshot_at         timestamptz NOT NULL DEFAULT now(),
  discharge_review_reminded boolean NOT NULL DEFAULT false,
  created_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (visit_id)
);

CREATE INDEX IF NOT EXISTS idx_inpatient_cost_level ON clinical.inpatient_cost_monitor(level, last_snapshot_at);

-- 权限码
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('inpatient_cost:view', '在院费用监控查看', 'operations', '医护看在院病例费用滚动看板')
ON CONFLICT (code) DO NOTHING;

-- 角色授权（幂等：先查后插）
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.role_code, r.code
FROM (VALUES ('admin','inpatient_cost:view'), ('doctor','inpatient_cost:view'), ('nurse','inpatient_cost:view')) AS r(role_code, code)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp
  WHERE rp.role_code = r.role_code AND rp.permission_code = r.code
);
