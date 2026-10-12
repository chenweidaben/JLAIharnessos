-- ============================================================================
-- 健澜科技 jlmedaios · M17-B 医嘱给药三查七对闭环（MAR）
--
-- 路线图 M2 要求"高风险医嘱双签 + CDS 拦截/提醒在真实流程触发、override 留痕"。
-- 既有 clinical.order_administrations 仅记录裸执行（who/when/dose），无三查七对/双人核对/
-- 签名/CDS override 留痕；本迁移补结构化 MAR 执行记录：
--   clinical.med_administrations 一次给药一行：五对结果 + 高危药双人核对 + 本人电子签名
--     + CDS 拦截与 override 理由 + 状态机(planned->given/held/waste/cancelled) + 差错分类。
--
-- 医疗安全红线：
--  - 给药前必跑五对核对（患者/药名/剂量/途径/时间），任一项 fail 且无 override 理由 -> 拒绝；
--  - 高危药（毒麻精放/高警示）执行时 double_check_by 必填且 ≠ administered_by（双人核对）；
--  - 执行人本人电子签名 signature 必填；idempotency_key 唯一防重放；
--  - error_type 结构化差错分类，自动喂给 NQI_MED_ERROR 分子。
--
-- 权限码：med_admin:read      给药记录只读（护士/医生/admin 全员）；
--         med_admin:execute   给药执行/五对核对/本人签名（护士/admin）；
--         med_admin:doublecheck 高危药双人核对（护士/医生/admin）。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING / WHERE NOT EXISTS，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 给药执行记录（三查七对 MAR）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.med_administrations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL,
  visit_id        uuid NOT NULL REFERENCES clinical.visits(id),
  patient_id      uuid NOT NULL,
  med_name        text NOT NULL,
  dose            text NOT NULL,
  route           text NOT NULL DEFAULT '',
  med_freq        text NOT NULL DEFAULT '',

  -- 五对结果（check_patient/check_med/check_dose/check_time/check_expire）
  check_patient   boolean NOT NULL DEFAULT false,
  check_med       boolean NOT NULL DEFAULT false,
  check_dose      boolean NOT NULL DEFAULT false,
  check_time      boolean NOT NULL DEFAULT false,
  check_expire    boolean NOT NULL DEFAULT false,

  high_risk       boolean NOT NULL DEFAULT false,
  double_check_by uuid REFERENCES iam.users(id),           -- 高危药必填且 ≠ administered_by

  administered_by uuid NOT NULL REFERENCES iam.users(id), -- 执行人
  signature       text NOT NULL,                          -- 本人电子签名

  cds_blocked     boolean NOT NULL DEFAULT false,
  override_reason text,                                   -- 被 CDS 拦时必填理由

  status          text NOT NULL DEFAULT 'planned'
                  CHECK (status IN ('planned','arrived','given','held','waste','cancelled')),
  error_type      text CHECK (error_type IS NULL OR error_type IN (
                    'none','medication_error','adr','wrong_patient','wrong_med')),

  occurred_at     timestamptz NOT NULL DEFAULT now(),
  idempotency_key text NOT NULL UNIQUE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_med_admin_visit
  ON clinical.med_administrations(visit_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_med_admin_order
  ON clinical.med_administrations(order_id);
CREATE INDEX IF NOT EXISTS idx_med_admin_status
  ON clinical.med_administrations(status);
DROP TRIGGER IF EXISTS trg_med_admin_updated ON clinical.med_administrations;
CREATE TRIGGER trg_med_admin_updated BEFORE UPDATE ON clinical.med_administrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 权限码（幂等）
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('med_admin:read',       '给药记录只读',   'med_admin', '查看 MAR 给药执行记录与差错指标（护士/医生只读）'),
  ('med_admin:execute',    '给药执行',       'med_admin', 'PDA 三查七对核对与给药执行、本人电子签名（护士/admin）'),
  ('med_admin:doublecheck', '高危药双人核对', 'med_admin', '毒麻精放/高警示药双人核对（护士/医生/admin，须≠执行人）')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 角色授权（幂等）：read 授 nurse/doctor/admin；execute 授 nurse/admin；doublecheck 授 nurse/doctor/admin
-- ---------------------------------------------------------------------------
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'med_admin:read'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='med_admin:read');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'med_admin:execute'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='med_admin:execute');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'med_admin:doublecheck'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='med_admin:doublecheck');

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'doctor', 'med_admin:read'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='doctor' AND permission_code='med_admin:read');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'doctor', 'med_admin:doublecheck'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='doctor' AND permission_code='med_admin:doublecheck');

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'nurse', 'med_admin:read'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='nurse' AND permission_code='med_admin:read');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'nurse', 'med_admin:execute'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='nurse' AND permission_code='med_admin:execute');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'nurse', 'med_admin:doublecheck'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='nurse' AND permission_code='med_admin:doublecheck');

-- ---------------------------------------------------------------------------
-- 迁移 98 种子：NQI_MED_ERROR(pending) -> auto，口径=给药差错率
--   分母 = status='given' 给药总例次；分子 = error_type ∈ (medication_error,adr,wrong_patient,wrong_med) 的例数。
-- ---------------------------------------------------------------------------
UPDATE clinical.nursing_indicators
SET source_type = 'auto',
    description = '来自 clinical.med_administrations：分母=given 给药例次，分子=error_type 为差错类(medication_error/adr/wrong_patient/wrong_med) 的例数'
WHERE code = 'NQI_MED_ERROR';
