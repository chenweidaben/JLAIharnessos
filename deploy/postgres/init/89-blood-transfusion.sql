-- ============================================================================
-- 健澜科技 jlmedaios · M10-A 输血管理闭环
--
--  三甲输血安全全流程（真实落 PostgreSQL）：
--   - clinical.blood_transfusion_requests 输血申请：
--       医师按指征申请（成分/剂量/紧急度），血库交叉配血、发血，护士双人核对输注；
--       状态机：requested → crossmatched → dispensed → transfusing → completed；
--       任一环节可 cancel/stopped（拒绝/停输留原因）。
--   - clinical.blood_stock 血库库存：按血型×成分×批次管理，发血事务内扣减（不足 409）。
--   - clinical.blood_transfusions 输注记录：执行护士 + 双人核对护士（应用层强制互异）、
--       开始/结束时间、滴速、生命体征快照。
--   - clinical.blood_transfusion_reactions 不良反应：分级（mild/moderate/severe）、
--       症状/处置/结局，审计 riskLevel=high。
--   - 权限码：blood:apply（医师申请）/ blood:crossmatch（血库配血）/
--       blood:dispense（血库发血）/ blood:transfuse（护士输注）/ blood:review（质控复核）。
--   - 审计：业务变更与哈希链同事务提交（audit_chain 见应用层）。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.blood_transfusion_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_no        text NOT NULL UNIQUE,
  visit_id          uuid NOT NULL,
  patient_id        uuid NOT NULL,
  department        text NOT NULL,
  applicant_id      uuid NOT NULL REFERENCES iam.users(id),
  -- 输血指征（自由文本 + 关键指标快照，供 CDS 规则校验留痕）
  indication        text NOT NULL,
  indication_meta   jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- 血型：A / B / AB / O / unknown；成分：red_cell / plasma / platelet / cryo / whole
  blood_type        text NOT NULL,
  component         text NOT NULL,
  unit_count        numeric NOT NULL DEFAULT 1 CHECK (unit_count > 0),
  -- 紧急度：routine 常规 / urgent 紧急 / emergency 特急
  urgency           text NOT NULL DEFAULT 'routine',
  -- 状态机
  status            text NOT NULL DEFAULT 'requested',
  reject_reason     text,
  -- 交叉配血（血库）
  crossmatch_result text,
  crossmatch_note   text,
  crossmatched_by   uuid REFERENCES iam.users(id),
  crossmatched_at   timestamptz,
  -- 发血（血库）
  batch_no          text,
  dispensed_by      uuid REFERENCES iam.users(id),
  dispensed_at      timestamptz,
  -- 拒绝/取消留痕
  cancelled_by      uuid REFERENCES iam.users(id),
  cancelled_at      timestamptz,
  cancel_reason     text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blood_req_status ON clinical.blood_transfusion_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blood_req_visit ON clinical.blood_transfusion_requests(visit_id);

CREATE TABLE IF NOT EXISTS clinical.blood_stock (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blood_type text NOT NULL,
  component  text NOT NULL,
  batch_no   text NOT NULL,
  units      numeric NOT NULL DEFAULT 0 CHECK (units >= 0),
  expiry_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blood_type, component, batch_no)
);

CREATE TABLE IF NOT EXISTS clinical.blood_transfusions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id     uuid NOT NULL REFERENCES clinical.blood_transfusion_requests(id) ON DELETE CASCADE,
  -- 双人核对：执行护士与核对护士必须互异（应用层强制）
  transfused_by  uuid NOT NULL REFERENCES iam.users(id),
  co_sign_by     uuid NOT NULL REFERENCES iam.users(id),
  drip_rate      text,
  start_at       timestamptz,
  end_at         timestamptz,
  vital_signs    jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- ongoing 输注中 / completed 已完成 / stopped 异常停输
  status         text NOT NULL DEFAULT 'ongoing',
  stop_reason    text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_blood_transfusion_request ON clinical.blood_transfusions(request_id) WHERE status = 'ongoing';

CREATE TABLE IF NOT EXISTS clinical.blood_transfusion_reactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfusion_id  uuid NOT NULL REFERENCES clinical.blood_transfusions(id) ON DELETE CASCADE,
  -- 分级：mild 轻度 / moderate 中度 / severe 重度
  severity        text NOT NULL,
  symptom         text NOT NULL,
  -- 处置：stop 停输 / slow 减速 / observe 观察 / treat 治疗
  action          text NOT NULL,
  outcome         text,
  reported_by     uuid NOT NULL REFERENCES iam.users(id),
  reported_at     timestamptz NOT NULL DEFAULT now()
);

INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('blood:apply',      '输血申请',     'clinical', '医师按指征申请输血'),
  ('blood:crossmatch', '交叉配血',     'clinical', '血库技师完成交叉配血'),
  ('blood:dispense',   '血库发血',     'clinical', '血库技师发血并扣减库存'),
  ('blood:transfuse',  '执行输注',     'clinical', '护士双人核对执行输注'),
  ('blood:review',     '输血质控复核', 'clinical', '输血管理与不良反应审核')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'blood:apply'      WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='blood:apply');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'blood:crossmatch' WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='blood:crossmatch');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'blood:dispense'   WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='blood:dispense');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'blood:transfuse'  WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='blood:transfuse');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'blood:review'     WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='blood:review');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'doctor', 'blood:apply'     WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='doctor' AND permission_code='blood:apply');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'nurse', 'blood:transfuse'  WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='nurse' AND permission_code='blood:transfuse');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'technician', 'blood:crossmatch' WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='technician' AND permission_code='blood:crossmatch');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'technician', 'blood:dispense'   WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='technician' AND permission_code='blood:dispense');

-- 血库库存种子（幂等，重跑不重复）
INSERT INTO clinical.blood_stock (blood_type, component, batch_no, units, expiry_date) VALUES
  ('O', 'red_cell', 'RC-O-2026-001', 20, '2026-12-31'),
  ('A', 'red_cell', 'RC-A-2026-001', 15, '2026-12-31'),
  ('B', 'red_cell', 'RC-B-2026-001', 12, '2026-12-31'),
  ('AB', 'red_cell', 'RC-AB-2026-001', 6, '2026-12-31'),
  ('O', 'plasma',   'PL-O-2026-001', 10, '2026-11-30'),
  ('A', 'plasma',   'PL-A-2026-001', 8,  '2026-11-30'),
  ('O', 'platelet', 'PT-O-2026-001', 5,  '2026-10-20'),
  ('A', 'platelet', 'PT-A-2026-001', 4,  '2026-10-20')
ON CONFLICT (blood_type, component, batch_no) DO NOTHING;
