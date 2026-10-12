-- ============================================================================
-- 健澜科技 jlmedaios · M23-B DRG/DIP 双轨病组选择
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.payment_group_selection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL,
  drg_group_code text,
  drg_expected_payment numeric,
  dip_packet_code text,
  dip_score numeric,
  dip_point_value numeric,
  dip_payment numeric,
  selected_path text NOT NULL CHECK (selected_path IN ('drg','dip','auto_drg','auto_dip','manual')),
  rationale text,
  override_by uuid,
  override_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_payment_selection UNIQUE (visit_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_selection_path ON clinical.payment_group_selection(selected_path);

-- 权限码（幂等）
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('payment_select:view', 'DRG/DIP 双轨病组选择查看', 'operations', '医护查看病例 DRG vs DIP 自动选组结果'),
  ('payment_select:adjust', 'DRG/DIP 病组选择人工调整', 'operations', '医保办人工 override 选组路径并留痕')
ON CONFLICT (code) DO NOTHING;

-- 角色授权（幂等）
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.role_code, 'payment_select:view' FROM (VALUES ('admin'), ('doctor'), ('nurse')) AS r(role_code)
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions rp WHERE rp.permission_code='payment_select:view' AND rp.role_code=r.role_code);

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.role_code, 'payment_select:adjust' FROM (VALUES ('admin'), ('doctor')) AS r(role_code)
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions rp WHERE rp.permission_code='payment_select:adjust' AND rp.role_code=r.role_code);
