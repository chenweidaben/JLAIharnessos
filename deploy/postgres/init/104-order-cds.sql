-- ============================================================================
-- 健澜科技 jlmedaios · M18-A 医嘱开方 CDS 拦截与 override 留痕
--
-- clinical.order_cds_alerts：医生下医嘱时跑确定性规则，命中即落 alert；
-- hard 级拦截须医生填 override_reason 才放行（否则 422），soft 级仅提醒。
--
-- 权限码：cds:read（读告警）、cds:override（hard override 留痕），授 doctor/nurse/admin。
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING / WHERE NOT EXISTS。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.order_cds_alerts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       uuid NOT NULL,
  visit_id       uuid NOT NULL,
  patient_id     uuid NOT NULL,
  rule_code      text NOT NULL CHECK (rule_code IN ('allergy','duplicate_active_order','dose_range','frequent_dose')),
  severity       text NOT NULL CHECK (severity IN ('info','warn','hard')),
  message        text NOT NULL,
  override_by    uuid,
  override_reason text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_cds_order ON clinical.order_cds_alerts(order_id);
CREATE INDEX IF NOT EXISTS idx_order_cds_visit ON clinical.order_cds_alerts(visit_id);

-- ---------------------------------------------------------------------------
-- 权限码（幂等）
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('cds:read', 'CDS 告警只读', 'order_cds', '查看医嘱开方 CDS 告警（医生/护士/admin）'),
  ('cds:override', 'CDS override', 'order_cds', 'hard 级拦截 override 并留痕理由（医生/护士/admin）')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 角色授权（幂等）
-- ---------------------------------------------------------------------------
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (VALUES ('admin','cds:read'),('admin','cds:override'),
  ('doctor','cds:read'),('doctor','cds:override'),
  ('nurse','cds:read'),('nurse','cds:override')) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code=t.r AND rp.permission_code=t.p
);
