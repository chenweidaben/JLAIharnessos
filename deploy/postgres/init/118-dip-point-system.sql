-- ============================================================================
-- 健澜科技 jlmedaios · M23-A DIP 分值点值体系
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.dip_packet_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  packet_code text NOT NULL,
  packet_name text NOT NULL,
  intervention_combo text,
  score numeric NOT NULL CHECK (score > 0),
  version text NOT NULL DEFAULT 'v1',
  effective_from date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_dip_packet UNIQUE (packet_code, version)
);

CREATE INDEX IF NOT EXISTS idx_dip_packet_code ON clinical.dip_packet_scores(packet_code);

CREATE TABLE IF NOT EXISTS clinical.dip_monthly_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period text NOT NULL CHECK (period ~ '^[0-9]{4}-[0-9]{2}$'),
  fund_pool numeric NOT NULL CHECK (fund_pool >= 0),
  total_score numeric NOT NULL CHECK (total_score >= 0),
  point_value numeric NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_dip_period UNIQUE (period)
);

CREATE INDEX IF NOT EXISTS idx_dip_period ON clinical.dip_monthly_points(period);

-- 权限码（幂等）
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('dip:manage', 'DIP 分值库维护与月度点值计算', 'operations', '医保办维护 DIP 分值库、录入月度基金池与全院总分值并算点值'),
  ('dip:view', 'DIP 结算查看与试算', 'operations', '医护查看 DIP 病种分值并按当月点值试算结算金额')
ON CONFLICT (code) DO NOTHING;

-- 角色授权（幂等）
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.role_code, 'dip:manage' FROM (VALUES ('admin'), ('doctor')) AS r(role_code)
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions rp WHERE rp.permission_code='dip:manage' AND rp.role_code=r.role_code);

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.role_code, 'dip:view' FROM (VALUES ('admin'), ('doctor'), ('nurse')) AS r(role_code)
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions rp WHERE rp.permission_code='dip:view' AND rp.role_code=r.role_code);
