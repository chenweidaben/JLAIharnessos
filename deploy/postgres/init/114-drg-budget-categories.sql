-- ============================================================================
-- 健澜科技 jlmedaios · M22-C 超支病例成本归因明细
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.drg_budget_categories (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_code     text NOT NULL,
  category       text NOT NULL CHECK (category IN ('drug','exam','lab','material','treatment','ward','nursing','other')),
  expected_amount numeric NOT NULL CHECK (expected_amount >= 0),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_code, category)
);

-- 权限码
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('drg_attribution:view', 'DRG成本归因查看', 'operations', '医护看超支病例分类费用归因')
ON CONFLICT (code) DO NOTHING;

-- 角色授权（幂等：先查后插）
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.role_code, r.code
FROM (VALUES ('admin','drg_attribution:view'), ('doctor','drg_attribution:view'), ('nurse','drg_attribution:view')) AS r(role_code, code)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp
  WHERE rp.role_code = r.role_code AND rp.permission_code = r.code
);
