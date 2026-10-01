-- ============================================================================
-- 健澜科技 jlmedaios · M3-L 互联网医院 · 电子处方 + 药师审方
-- 65-internet-prescription.sql
--
-- 电子处方闭环：医生在图文问诊会话内开方（本人签名、禁止 AI 自动处方）
--   → 提交待审方（pending_review）→ 药师审方（通过/驳回/退回）
--   → 状态机：pending_review → approved / rejected / returned；
--     returned →（医生修改重提）→ pending_review；医生/患者可取消（cancelled）。
--
-- 两表：
--  （1）clinical.internet_prescriptions      电子处方头（含幂等键防重复提交）
--  （2）clinical.internet_prescription_items 处方明细（级联删除）
--
-- 合规要点：
--  · 开方医生 = 接诊医生本人（prescriber_id 由聚合器强制取 auth.id，签名语义）；
--  · 无 AI 自动处方：药品明细必须由医生显式录入，聚合器校验非空且逐项人工选择；
--  · 开方/审方职责分离：医生权限 internet:prescription，药师 internet:prescription:audit；
--  · 退回/驳回必须填写审核意见（聚合器校验）。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING，可重入。
-- 注释全角括号，避免朴素括号配平检查误报。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ----------------------------------------------------------------------------
-- （1）电子处方头
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.internet_prescriptions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rx_no             text NOT NULL UNIQUE,
  session_id        uuid NOT NULL REFERENCES clinical.consultation_sessions(id),
  account_id        uuid NOT NULL REFERENCES clinical.patient_accounts(id),
  profile_id        uuid NOT NULL REFERENCES clinical.patient_profiles(id),
  patient_id        uuid NOT NULL REFERENCES clinical.patients(id),
  prescriber_id     uuid NOT NULL REFERENCES iam.users(id),
  department        text,
  status            text NOT NULL DEFAULT 'pending_review'
                      CHECK (status IN ('pending_review','approved',
                                        'rejected','returned','cancelled')),
  risk_level        text,
  counsel           text,
  total_fee         numeric(12,2),
  idempotency_key   text NOT NULL UNIQUE,
  reviewer_id       uuid REFERENCES iam.users(id),
  audit_comment     text,
  audited_at        timestamptz,
  return_reason     text,
  cancelled_by      text,
  cancelled_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_e_rx_session ON clinical.internet_prescriptions(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_e_rx_patient ON clinical.internet_prescriptions(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_e_rx_status ON clinical.internet_prescriptions(status, created_at);
CREATE INDEX IF NOT EXISTS idx_e_rx_prescriber ON clinical.internet_prescriptions(prescriber_id);

DROP TRIGGER IF EXISTS trg_e_rx_updated ON clinical.internet_prescriptions;
CREATE TRIGGER trg_e_rx_updated BEFORE UPDATE ON clinical.internet_prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- （2）处方明细
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.internet_prescription_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES clinical.internet_prescriptions(id) ON DELETE CASCADE,
  drug_code      text,
  drug_name      text NOT NULL,
  specification  text,
  dosage         numeric(10,2),
  dosage_unit    text,
  frequency      text,
  route          text,
  days_supply    numeric(6,2),
  quantity       numeric(10,2),
  quantity_unit  text,
  skin_test      boolean NOT NULL DEFAULT false,
  remark         text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_e_rxitem_rx ON clinical.internet_prescription_items(prescription_id);

-- ----------------------------------------------------------------------------
-- 权限点与角色授权
-- ----------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('internet:prescription',       '互联网电子处方', 'internet-hospital',
     '医生在互联网问诊中开立电子处方并签名'),
  ('internet:prescription:audit', '互联网处方审方', 'internet-hospital',
     '药师审方：通过/驳回/退回互联网电子处方'),
  ('internet:prescription:view',  '互联网处方查看', 'internet-hospital',
     '患者查看本人电子处方')
ON CONFLICT (code) DO NOTHING;

-- 医生：开方
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM iam.roles r
 CROSS JOIN iam.permissions p
 WHERE r.code = 'doctor'
   AND p.code IN ('internet:prescription')
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- 药师：审方
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM iam.roles r
 CROSS JOIN iam.permissions p
 WHERE r.code = 'pharmacist'
   AND p.code IN ('internet:prescription:audit','internet:prescription:view')
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- 管理端：监管查看
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM iam.roles r
 CROSS JOIN iam.permissions p
 WHERE r.code = 'admin'
   AND p.code IN ('internet:prescription:audit','internet:prescription:view')
ON CONFLICT (role_code, permission_code) DO NOTHING;
