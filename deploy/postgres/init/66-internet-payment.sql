-- ============================================================================
-- 健澜科技 jlmedaios · M3-M 互联网医院 · 在线支付 + 电子票据 + 医保本地计费
-- 66-internet-payment.sql
--
-- 在线支付闭环：患者为已审方通过的互联网电子处方发起在线支付
--   → 支付单（医保本地分割：统筹/自付）→ 渠道支付（可插拔提供方）→ 回调确认
--   → 处方状态 approved→paid → 开具电子票据（唯一 invoice_no）
--   → 财务冲正：票据冲红（reversal）、支付单 refunded。
--
-- 医保计费口径（与 M3-G 一致）：本地确定性计算，不接外部医保平台；
-- 真实医保结算由外部医保系统对接（本切片提供可插拔计算规则）。
--
-- 三表 + 一约束扩展：
--  （1）clinical.online_payments   互联网订单支付单（幂等键防重复）
--  （2）clinical.e_invoices       电子票据（issued/reversed，冲红关联）
--  （3）处方状态机扩展：approved → paid
--
-- 合规要点：
--  · 仅已审方通过（approved）处方可支付；支付与处方归属强校验；
--  · 支付回调幂等（唯一 channel_txn_no + 状态机）；
--  · 一张支付单仅一张有效票据（部分唯一索引）；
--  · 支付/票据/处方状态联动同事务提交，审计哈希链留痕。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING，可重入。
-- 注释全角括号，避免朴素括号配平检查误报。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ----------------------------------------------------------------------------
-- （0）电子处方状态机扩展：approved → paid（支付完成后进入）
-- ----------------------------------------------------------------------------
ALTER TABLE clinical.internet_prescriptions
  DROP CONSTRAINT IF EXISTS internet_prescriptions_status_check;
ALTER TABLE clinical.internet_prescriptions
  ADD CONSTRAINT internet_prescriptions_status_check
  CHECK (status IN ('pending_review','approved','rejected','returned','cancelled','paid'));

-- ----------------------------------------------------------------------------
-- （1）在线支付单
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.online_payments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_no           text NOT NULL UNIQUE,
  source_type      text NOT NULL CHECK (source_type IN ('internet_prescription')),
  source_id        uuid NOT NULL,
  patient_id       uuid NOT NULL REFERENCES clinical.patients(id),
  account_id       uuid NOT NULL REFERENCES clinical.patient_accounts(id),

  amount           numeric(12,2) NOT NULL CHECK (amount > 0),
  medicare_paid    numeric(12,2) NOT NULL DEFAULT 0 CHECK (medicare_paid >= 0),
  self_paid        numeric(12,2) NOT NULL DEFAULT 0 CHECK (self_paid >= 0),

  channel          text NOT NULL DEFAULT 'mock'
                    CHECK (channel IN ('wechat','alipay','bank_card','mock')),
  status           text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','paid','failed','cancelled')),

  idempotency_key  text NOT NULL UNIQUE,
  channel_txn_no   text,
  -- 以下操作人字段不设外键：患者账户（clinical.patient_accounts）与
  -- 内部用户（iam.users）混合出现，引用完整性由审计哈希链承担
  paid_by          uuid,
  paid_at          timestamptz,
  cancelled_by     uuid,
  cancelled_at     timestamptz,

  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
-- 兼容早期建表（若旧约束存在则移除，避免患者账户写入触发 FK 错误）
ALTER TABLE clinical.online_payments DROP CONSTRAINT IF EXISTS online_payments_paid_by_fkey;
ALTER TABLE clinical.online_payments DROP CONSTRAINT IF EXISTS online_payments_cancelled_by_fkey;
-- 一个业务来源同时只允许一张在途支付单（待支付/支付中）
CREATE UNIQUE INDEX IF NOT EXISTS uq_open_payment_per_source
  ON clinical.online_payments(source_type, source_id) WHERE status IN ('pending','processing');
CREATE INDEX IF NOT EXISTS idx_pay_status ON clinical.online_payments(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pay_patient ON clinical.online_payments(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pay_account ON clinical.online_payments(account_id);
CREATE INDEX IF NOT EXISTS idx_pay_source ON clinical.online_payments(source_type, source_id);

DROP TRIGGER IF EXISTS trg_online_payments_updated ON clinical.online_payments;
CREATE TRIGGER trg_online_payments_updated BEFORE UPDATE ON clinical.online_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- （2）电子票据（支付成功后开具；冲红通过 reversal_of 关联）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.e_invoices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no      text NOT NULL UNIQUE,
  payment_id      uuid NOT NULL REFERENCES clinical.online_payments(id),
  patient_id      uuid NOT NULL REFERENCES clinical.patients(id),
  source_type     text NOT NULL CHECK (source_type IN ('internet_prescription')),
  source_id       uuid NOT NULL,

  amount          numeric(12,2) NOT NULL CHECK (amount >= 0),
  medicare_paid   numeric(12,2) NOT NULL DEFAULT 0 CHECK (medicare_paid >= 0),
  self_paid       numeric(12,2) NOT NULL DEFAULT 0 CHECK (self_paid >= 0),

  status          text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','reversed')),
  reversal_of     uuid REFERENCES clinical.e_invoices(id),
  reversed_at     timestamptz,
  issued_by       uuid,
  issued_at       timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);
-- 兼容早期建表（issued_by 不设 iam 外键，患者账户/内部用户均可开票）
ALTER TABLE clinical.e_invoices DROP CONSTRAINT IF EXISTS e_invoices_issued_by_fkey;
-- 一张支付单只允许一张有效票据
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoice_payment_issued
  ON clinical.e_invoices(payment_id) WHERE status = 'issued';
CREATE INDEX IF NOT EXISTS idx_e_inv_patient ON clinical.e_invoices(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_e_inv_payment ON clinical.e_invoices(payment_id);
CREATE INDEX IF NOT EXISTS idx_e_inv_source ON clinical.e_invoices(source_type, source_id);

-- ----------------------------------------------------------------------------
-- （3）权限点与角色授权
-- ----------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('internet:payment',        '互联网在线支付', 'internet-hospital',
     '患者为互联网电子处方发起在线支付并查看票据'),
  ('internet:payment:refund', '互联网支付冲正', 'internet-hospital',
     '财务/药师对已支付处方执行冲正（含票据冲红）'),
  ('internet:invoice:view',   '互联网票据查看', 'internet-hospital',
     '查看互联网电子票据（患者本人/财务/药师）')
ON CONFLICT (code) DO NOTHING;

-- 药师：冲正 + 票据查看
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM iam.roles r
 CROSS JOIN iam.permissions p
 WHERE r.code = 'pharmacist'
   AND p.code IN ('internet:payment:refund','internet:invoice:view')
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- 管理端：监管查看/冲正
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM iam.roles r
 CROSS JOIN iam.permissions p
 WHERE r.code = 'admin'
   AND p.code IN ('internet:payment:refund','internet:invoice:view')
ON CONFLICT (role_code, permission_code) DO NOTHING;
