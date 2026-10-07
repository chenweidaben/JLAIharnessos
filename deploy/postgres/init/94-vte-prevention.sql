-- ============================================================================
-- 健澜科技 jlmedaios · M13-A VTE 智能防治闭环
--
--  依据全国《肺栓塞和深静脉血栓形成防治能力建设项目（VTE 防治中心）建设标准》
--  与 Caprini / Padua 评分、抗凝相关指南，补齐 VTE 防治闭环的数据底座：
--   - clinical.vte_assessments  VTE 风险与出血风险评估（版本化历史，同就诊多版本）；
--   - clinical.vte_preventions  预防措施（机械 / 药物，一措施一行，状态机留痕）；
--   - clinical.vte_outcomes     结局与不良事件（DVT/PE/出血/抗凝相关不良事件）。
--  质控指标（风险评估率 / 高危患者预防实施率 / 医院获得性 VTE 发生率）由应用层
--  实时聚合，不在此冗余建表。
--  权限码：vte:read 查看，vte:assess 风险评估（医师），vte:prevent 药物预防确认
--  （医师），vte:execute 机械预防执行（护士），vte:audit 质控与复核（admin/质控）。
--
-- 医疗安全：药物预防一律 suggested，须医师确认并生成医嘱走既有审方流程；
-- 高出血风险下药物预防默认拦截，须显式 override 留痕。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ---------------------------------------------------------------------------
-- VTE + 出血风险评估（版本化历史）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.vte_assessments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id       uuid NOT NULL REFERENCES clinical.visits(id),
  patient_id     uuid NOT NULL,
  department     text,
  assessment_no  text NOT NULL UNIQUE,
  -- 量表：caprini 外科/手术，padua 内科
  scale          text NOT NULL CHECK (scale IN ('caprini','padua')),
  -- 评估时点：admission 入院 / postop 术后 / condition_change 病情变化 / reassessment 重评
  occasion       text NOT NULL CHECK (occasion IN ('admission','postop','condition_change','reassessment')),
  vte_score      integer NOT NULL DEFAULT 0,
  -- padua 仅 low/high；caprini 四档
  vte_level      text NOT NULL CHECK (vte_level IN ('low','medium','high','very_high')),
  -- 命中危险因素明细数组：[{key,label,points}]
  vte_factors    jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- 出血风险：low / high
  bleeding_level text NOT NULL CHECK (bleeding_level IN ('low','high')),
  -- 出血命中因素数组：[{key,label}]
  bleeding_factors jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- high / very_high 触发建议性预警（非阻断）
  alert_raised   boolean NOT NULL DEFAULT false,
  version        integer NOT NULL DEFAULT 1,
  assessed_by    uuid REFERENCES iam.users(id),
  assessed_at    timestamptz,
  note           text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- 同一 visit 允许多版本（不设 visit 唯一约束），当前评估 = 该 visit 最新一条
CREATE INDEX IF NOT EXISTS idx_vte_assess_visit ON clinical.vte_assessments(visit_id, assessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_vte_assess_level ON clinical.vte_assessments(vte_level, assessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_vte_assess_patient ON clinical.vte_assessments(patient_id);

-- ---------------------------------------------------------------------------
-- 预防措施（一措施一行）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.vte_preventions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id      uuid NOT NULL REFERENCES clinical.visits(id),
  patient_id    uuid NOT NULL,
  assessment_id uuid REFERENCES clinical.vte_assessments(id),
  prevention_no text NOT NULL UNIQUE,
  -- mechanical 机械预防 / pharmacological 药物预防
  category      text NOT NULL CHECK (category IN ('mechanical','pharmacological')),
  -- mechanical: ipc / gcs / foot_pump；pharmacological: lmwh / ufh / fondaparinux / rivaroxaban / other
  method        text NOT NULL,
  -- suggested 建议 / confirmed 医师已确认 / executed 已执行 / contraindicated 禁忌停用 / discontinued 停用
  status        text NOT NULL DEFAULT 'suggested'
                CHECK (status IN ('suggested','confirmed','executed','contraindicated','discontinued')),
  dosage        text,
  frequency     text,
  -- 关联医嘱（药物预防确认时生成 clinical.orders，不强 FK 避免跨域耦合）
  order_id      uuid,
  -- 关联护理任务（机械预防执行时生成/完成 clinical.nursing_tasks）
  nursing_task_id uuid,
  suggested_by  uuid,
  confirmed_by  uuid REFERENCES iam.users(id),
  executed_by   uuid REFERENCES iam.users(id),
  confirmed_at  timestamptz,
  executed_at   timestamptz,
  contraindication_note text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vte_prev_visit ON clinical.vte_preventions(visit_id);
CREATE INDEX IF NOT EXISTS idx_vte_prev_status ON clinical.vte_preventions(status);
CREATE INDEX IF NOT EXISTS idx_vte_prev_category ON clinical.vte_preventions(category);

-- ---------------------------------------------------------------------------
-- 结局与不良事件
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.vte_outcomes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id         uuid NOT NULL REFERENCES clinical.visits(id),
  patient_id       uuid NOT NULL,
  -- dvt 深静脉血栓 / pe 肺栓塞 / bleeding 出血 / anticoag_adverse 抗凝相关不良事件
  event_type       text NOT NULL CHECK (event_type IN ('dvt','pe','bleeding','anticoag_adverse')),
  -- bleeding: major/minor；pe: high_risk/non_high_risk；可空
  severity         text,
  -- hospital_acquired 医院获得性 / present_on_admission 入院已有
  source           text NOT NULL DEFAULT 'hospital_acquired'
                   CHECK (source IN ('hospital_acquired','present_on_admission')),
  imaging_report_id uuid,
  lab_result_id    uuid,
  description      text,
  recorded_by      uuid REFERENCES iam.users(id),
  occurred_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vte_out_visit ON clinical.vte_outcomes(visit_id);
CREATE INDEX IF NOT EXISTS idx_vte_out_type ON clinical.vte_outcomes(event_type);
CREATE INDEX IF NOT EXISTS idx_vte_out_source ON clinical.vte_outcomes(source);

-- ---------------------------------------------------------------------------
-- 权限码 + 角色授权（幂等）
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('vte:read',    'VTE防治查看',   'clinical', '查看VTE风险评估、预防与结局'),
  ('vte:assess',  'VTE风险评估',   'clinical', 'Caprini/Padua风险评估与出血风险评估'),
  ('vte:prevent', 'VTE药物预防确认', 'clinical', '确认药物预防建议并生成抗凝医嘱'),
  ('vte:execute', 'VTE机械预防执行', 'clinical', '执行机械预防并记录护理任务'),
  ('vte:audit',   'VTE防治质控',   'clinical', 'VTE防治质控指标与复核')
ON CONFLICT (code) DO NOTHING;

-- admin 全五项
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'vte:read'    WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='vte:read');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'vte:assess'  WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='vte:assess');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'vte:prevent' WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='vte:prevent');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'vte:execute' WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='vte:execute');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'vte:audit'   WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='vte:audit');

-- 医师：评估 + 药物预防确认
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'doctor', 'vte:read'   WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='doctor' AND permission_code='vte:read');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'doctor', 'vte:assess' WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='doctor' AND permission_code='vte:assess');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'doctor', 'vte:prevent' WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='doctor' AND permission_code='vte:prevent');

-- 护士：查看 + 机械预防执行
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'nurse', 'vte:read'   WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='nurse' AND permission_code='vte:read');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'nurse', 'vte:execute' WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='nurse' AND permission_code='vte:execute');

-- 技师：仅查看
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'technician', 'vte:read' WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='technician' AND permission_code='vte:read');
