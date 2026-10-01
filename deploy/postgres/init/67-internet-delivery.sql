-- ============================================================================
-- 健澜科技 jlmedaios · M3-N 互联网医院 · 处方配送履约 + 在线报告查询
-- 67-internet-delivery.sql
--
-- 处方配送履约：已支付（paid）的互联网电子处方进入履约
--   → 药师建单（自取 / 快递）→ 打包 → 发货（快递单号）→ 确认送达 / 自取核销
--   → 取消（仅未发货可取消）。配送单全程可追溯、与处方一一对应。
--
-- 在线报告查询（本切片不建表，复用既有临床表）：
--   · clinical.lab_results        检验结果（异常/危急标记）
--   · clinical.imaging_reports    影像报告（含 AI 辅助发现）
--   · clinical.lab_interpretations AI 检验解读
-- 查询按 DataScope 过滤（患者本人 / 医生科室 / 全院），报告与院内一致。
--
-- 合规要点：
--  · 仅 paid 处方可建配送单；一张处方同时只有一个有效配送单（部分唯一）；
--  · 自取核销凭 6 位取货码（有效期内部分唯一，防串单）；
--  · 快递单必须留存地址快照与物流单号，履约状态机单向推进；
--  · 操作人字段不设外键（患者账户/内部用户混合），引用完整性由审计哈希链承担；
--  · 患者报告查询强制归属校验 + DataScope，杜绝越权窥视。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING，可重入。
-- 注释全角括号，避免朴素括号配平检查误报。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ----------------------------------------------------------------------------
-- （1）处方配送单
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.prescription_deliveries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_no      text NOT NULL UNIQUE,

  rx_id            uuid NOT NULL REFERENCES clinical.internet_prescriptions(id),
  patient_id       uuid NOT NULL REFERENCES clinical.patients(id),
  -- 患者账号与内部用户（药师/管理员）混合出现，不设外键
  account_id       uuid,

  channel          text NOT NULL CHECK (channel IN ('self_pick','express')),
  status           text NOT NULL DEFAULT 'created'
                    CHECK (status IN ('created','packed','shipped','delivered','picked_up','cancelled')),

  -- 快递：物流公司与单号（发货时必填）
  courier_company  text,
  tracking_no      text,
  -- 配送地址快照：建单时固化，防地址后续变更引发履约争议
  address_snapshot text,
  -- 自取：6 位取货码（核销凭码）
  pickup_code      text,

  created_by       uuid,
  fulfilled_by     uuid,
  confirmed_by     uuid,
  cancelled_by     uuid,

  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  fulfilled_at     timestamptz,
  confirmed_at     timestamptz,
  cancelled_at     timestamptz,

  -- 快递单必须固化配送地址
  CONSTRAINT chk_delivery_express_address
    CHECK (channel = 'self_pick' OR (channel = 'express' AND address_snapshot IS NOT NULL))
);
-- 一张处方同时仅一个有效配送单（未取消）
CREATE UNIQUE INDEX IF NOT EXISTS uq_open_delivery_per_rx
  ON clinical.prescription_deliveries(rx_id) WHERE status <> 'cancelled';
-- 有效取货码唯一（防串单核销）
CREATE UNIQUE INDEX IF NOT EXISTS uq_pickup_code_active
  ON clinical.prescription_deliveries(pickup_code)
  WHERE status IN ('created','packed') AND pickup_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_delivery_patient
  ON clinical.prescription_deliveries(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_status
  ON clinical.prescription_deliveries(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_rx
  ON clinical.prescription_deliveries(rx_id);

DROP TRIGGER IF EXISTS trg_deliveries_updated ON clinical.prescription_deliveries;
CREATE TRIGGER trg_deliveries_updated BEFORE UPDATE ON clinical.prescription_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- （2）权限点与角色授权
-- ----------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('internet:delivery:create', '互联网配送建单', 'internet-hospital',
     '药师/财务为已支付处方创建配送单（自取/快递）'),
  ('internet:delivery:fulfill', '互联网配送履约', 'internet-hospital',
     '药房打包/发货/确认送达/自取核销/取消配送单'),
  ('internet:delivery:view',   '互联网配送查看', 'internet-hospital',
     '查看配送单（患者本人/药师/管理员）'),
  ('internet:report:view',     '互联网报告查看', 'internet-hospital',
     '在线查看检验/影像报告（患者本人或授权医护）')
ON CONFLICT (code) DO NOTHING;

-- 药师：建单 + 履约 + 查看
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM iam.roles r
 CROSS JOIN iam.permissions p
 WHERE r.code = 'pharmacist'
   AND p.code IN ('internet:delivery:create','internet:delivery:fulfill','internet:delivery:view')
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- 管理端：建单 + 查看 + 报告
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM iam.roles r
 CROSS JOIN iam.permissions p
 WHERE r.code = 'admin'
   AND p.code IN ('internet:delivery:create','internet:delivery:view','internet:report:view')
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- 医生：配送查看 + 报告查看（院内协作）
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM iam.roles r
 CROSS JOIN iam.permissions p
 WHERE r.code = 'doctor'
   AND p.code IN ('internet:delivery:view','internet:report:view')
ON CONFLICT (role_code, permission_code) DO NOTHING;
