-- ============================================================================
-- 健澜科技 jlmedaios · M3-F 危急值闭环
-- 58-critical-value-loop.sql
--
-- 基于 clinical.lab_results.is_critical 自动产生危急值告警，驱动临床闭环：
--   raised（已报告待签收）-> acked（医师已签收）-> resolved（已处置闭环）。
-- 每条危急值检验结果最多一条告警（lab_result_id 唯一，扫描幂等）。
--
-- 合规：危急值须"报告-通知-签收-处置"留痕；签收/处置均由医师本人签名。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING，可重入。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.critical_value_alerts (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_result_id        uuid NOT NULL UNIQUE REFERENCES clinical.lab_results(id),
  visit_id             uuid NOT NULL REFERENCES clinical.visits(id),
  patient_id           uuid NOT NULL REFERENCES clinical.patients(id),
  department           text NOT NULL,

  -- 危急值快照（产生告警时固化，避免后续检验修正影响留痕）
  item_name            text NOT NULL,
  item_code            text,
  value                text,
  unit                 text,
  ref_low              numeric(14,4),
  ref_high             numeric(14,4),
  flag                 text,

  -- 状态机：raised 待签收 -> acked 医师已签收 -> resolved 已处置闭环
  status               text NOT NULL DEFAULT 'raised'
                         CHECK (status IN ('raised', 'acked', 'resolved')),
  raised_at            timestamptz NOT NULL DEFAULT now(),

  acked_by             uuid REFERENCES iam.users(id),
  acked_at             timestamptz,
  resolved_by          uuid REFERENCES iam.users(id),
  resolved_at          timestamptz,
  disposition_note     text,

  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_critical_status ON clinical.critical_value_alerts(status, raised_at DESC);
CREATE INDEX IF NOT EXISTS idx_critical_visit ON clinical.critical_value_alerts(visit_id);
CREATE INDEX IF NOT EXISTS idx_critical_department ON clinical.critical_value_alerts(department);

DROP TRIGGER IF EXISTS trg_critical_updated ON clinical.critical_value_alerts;
CREATE TRIGGER trg_critical_updated BEFORE UPDATE ON clinical.critical_value_alerts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 权限点与角色授权
-- ----------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('critical:view',    '危急值查看', 'lab', '查看危急值告警列表与详情'),
  ('critical:ack',     '危急值签收', 'lab', '医师签收危急值告警'),
  ('critical:resolve', '危急值处置', 'lab', '医师对已签收危急值记录处置并闭环')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM iam.roles r
  CROSS JOIN iam.permissions p
 WHERE r.code = 'admin'
   AND p.code IN ('critical:view', 'critical:ack', 'critical:resolve')
ON CONFLICT (role_code, permission_code) DO NOTHING;
