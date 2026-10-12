-- ============================================================================
-- 健澜科技 jlmedaios · M22-E 整改效果回看闭环（PDCA Check）
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.improvement_outcome_reviews (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id               uuid NOT NULL REFERENCES clinical.clinical_improvement_tasks(id) ON DELETE CASCADE,
  cohort_window_days    int NOT NULL DEFAULT 90,
  baseline_visits       int NOT NULL DEFAULT 0,
  baseline_overspend_rate numeric NOT NULL DEFAULT 0,
  followup_visits       int NOT NULL DEFAULT 0,
  followup_overspend_rate numeric NOT NULL DEFAULT 0,
  followup_readmit_rate numeric NOT NULL DEFAULT 0,
  verdict               text NOT NULL DEFAULT 'pending' CHECK (verdict IN ('pending','effective','partial','no_improvement','worse')),
  evaluated_at          timestamptz NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id)
);

-- 权限码
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('improvement_outcome:view', '整改效果回看查看', 'operations', '质控/医生看整改前后超支率对比')
ON CONFLICT (code) DO NOTHING;

-- 角色授权（幂等：先查后插）
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.role_code, r.code
FROM (VALUES ('admin','improvement_outcome:view'), ('doctor','improvement_outcome:view')) AS r(role_code, code)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp
  WHERE rp.role_code = r.role_code AND rp.permission_code = r.code
);
