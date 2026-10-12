-- ============================================================================
-- 健澜科技 jlmedaios · M16-B 护理管理后台：排班 + NQI 敏感指标采集
--
--  对标《护理质量指标监测基本数据集实施指南（2022 版）》与国家护理专业
--  质控指标 NQI（国卫办医函〔2020〕654 号），补齐两张底座：
--
--   排班域：
--    - clinical.nursing_shift_definitions  班次定义（按病区可配，ward_id 为空即全院默认）；
--    - clinical.nursing_schedules          病区×日期×护士排班（draft/published）；
--    - clinical.nursing_leave             休假登记（休假期间不可排班）。
--
--   指标域：
--    - clinical.nursing_indicators        NQI 指标库（编码/口径/分子分母/方向/阈值）；
--    - clinical.nursing_indicator_values   人工录入补全与上报快照（auto/manual）。
--
--  合规校验与指标计算均为应用层确定性纯函数（src/medical-tools/nursing/），
--  不在数据库内写业务逻辑。
--
--  权限码：nursing_admin:schedule 排班发布调整（护士长/护理部），
--          nursing_admin:indicator:view 指标只读（全员），
--          nursing_admin:indicator:enter 人工录入（护士长/护理部），
--          nursing_admin:indicator:audit 指标全量审计/上报（护理部/admin）。
--
--  医疗安全：排班建议为辅助、最终由护士长确认；指标口径对齐国家标准，
--   异常值须人工核实后方可上报；无数据源的指标标注 pending，绝不编造数字。
--
--  幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 班次定义
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.nursing_shift_definitions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_id      uuid REFERENCES clinical.wards(id) ON DELETE CASCADE,
  code         text NOT NULL,
  name         text NOT NULL,
  start_time   time NOT NULL,
  end_time     time NOT NULL,
  color        text,
  is_night     boolean NOT NULL DEFAULT false,
  hours        numeric(4,1) NOT NULL DEFAULT 8,
  status       text NOT NULL DEFAULT 'active' CHECK (status IN ('active','retired')),
  created_by   uuid REFERENCES iam.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ward_id, code)
);
CREATE INDEX IF NOT EXISTS idx_shiftdef_ward ON clinical.nursing_shift_definitions(ward_id);
-- 全院默认班次（ward_id 为空）按 code 唯一：NULL 在普通唯一索引中不互斥，需部分索引
CREATE UNIQUE INDEX IF NOT EXISTS uq_shiftdef_global_code ON clinical.nursing_shift_definitions(code) WHERE ward_id IS NULL;
DROP TRIGGER IF EXISTS trg_nursing_shiftdef_updated ON clinical.nursing_shift_definitions;
CREATE TRIGGER trg_nursing_shiftdef_updated BEFORE UPDATE ON clinical.nursing_shift_definitions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 排班表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.nursing_schedules (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_id      uuid NOT NULL REFERENCES clinical.wards(id),
  schedule_date date NOT NULL,
  nurse_id     uuid NOT NULL REFERENCES iam.users(id),
  shift_id     uuid NOT NULL REFERENCES clinical.nursing_shift_definitions(id),
  status       text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  published_by uuid REFERENCES iam.users(id),
  published_at timestamptz,
  created_by   uuid REFERENCES iam.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ward_id, schedule_date, nurse_id, shift_id)
);
CREATE INDEX IF NOT EXISTS idx_sched_date ON clinical.nursing_schedules(schedule_date);
CREATE INDEX IF NOT EXISTS idx_sched_nurse ON clinical.nursing_schedules(nurse_id);
CREATE INDEX IF NOT EXISTS idx_sched_ward ON clinical.nursing_schedules(ward_id, schedule_date);
DROP TRIGGER IF EXISTS trg_nursing_sched_updated ON clinical.nursing_schedules;
CREATE TRIGGER trg_nursing_sched_updated BEFORE UPDATE ON clinical.nursing_schedules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 休假登记
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.nursing_leave (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nurse_id     uuid NOT NULL REFERENCES iam.users(id),
  leave_date   date NOT NULL,
  leave_type   text NOT NULL DEFAULT 'personal'
               CHECK (leave_type IN ('personal','sick','annual','maternity','other')),
  reason       text,
  status       text NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected')),
  created_by   uuid REFERENCES iam.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (nurse_id, leave_date)
);
CREATE INDEX IF NOT EXISTS idx_leave_nurse ON clinical.nursing_leave(nurse_id, leave_date);

-- ---------------------------------------------------------------------------
-- NQI 指标库
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.nursing_indicators (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code           text NOT NULL UNIQUE,
  name           text NOT NULL,
  category       text,
  numerator_def  text,
  denominator_def text,
  unit           text,
  direction      text NOT NULL DEFAULT 'lower_is_better'
                 CHECK (direction IN ('lower_is_better','higher_is_better')),
  frequency      text,
  source_type    text NOT NULL DEFAULT 'manual'
                 CHECK (source_type IN ('auto','manual','pending')),
  threshold      numeric,
  description    text,
  sort_order     int NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_indicator_category ON clinical.nursing_indicators(category);

-- ---------------------------------------------------------------------------
-- 指标值（人工录入补全 / 上报快照）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.nursing_indicator_values (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_code  text NOT NULL REFERENCES clinical.nursing_indicators(code),
  ward_id        uuid REFERENCES clinical.wards(id),
  period         text NOT NULL,
  numerator      numeric,
  denominator    numeric,
  value          numeric,
  source         text NOT NULL DEFAULT 'manual' CHECK (source IN ('auto','manual')),
  note           text,
  entered_by     uuid REFERENCES iam.users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (indicator_code, ward_id, period, source)
);
CREATE INDEX IF NOT EXISTS idx_indval_period ON clinical.nursing_indicator_values(period);
CREATE INDEX IF NOT EXISTS idx_indval_code ON clinical.nursing_indicator_values(indicator_code);

-- ---------------------------------------------------------------------------
-- 权限码（幂等）
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('nursing_admin:schedule:view', '护理排班只读', 'nursing_admin', '查看班次定义、排班看板与休假（护士/医生只读）'),
  ('nursing_admin:schedule', '护理排班发布调整', 'nursing_admin', '病区班次定义、排班发布/调整与请假登记（护士长/护理部）'),
  ('nursing_admin:indicator:view', '护理指标只读', 'nursing_admin', '查看 NQI 敏感指标与趋势（全员护士只读）'),
  ('nursing_admin:indicator:enter', '护理指标人工录入', 'nursing_admin', '人工补全指标分子分母并校验（护士长/护理部）'),
  ('nursing_admin:indicator:audit', '护理指标审计上报', 'nursing_admin', '全院指标全量查看与上报（护理部/admin）')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 角色授权（幂等）：排班/录入授 nurse 与 admin；审计授 admin；只读授 nurse/doctor/admin
-- ---------------------------------------------------------------------------
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'nursing_admin:schedule:view'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='nursing_admin:schedule:view');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'nursing_admin:schedule'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='nursing_admin:schedule');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'nursing_admin:indicator:view'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='nursing_admin:indicator:view');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'nursing_admin:indicator:enter'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='nursing_admin:indicator:enter');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'nursing_admin:indicator:audit'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='nursing_admin:indicator:audit');

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'nurse', 'nursing_admin:schedule:view'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='nurse' AND permission_code='nursing_admin:schedule:view');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'nurse', 'nursing_admin:schedule'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='nurse' AND permission_code='nursing_admin:schedule');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'nurse', 'nursing_admin:indicator:view'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='nurse' AND permission_code='nursing_admin:indicator:view');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'nurse', 'nursing_admin:indicator:enter'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='nurse' AND permission_code='nursing_admin:indicator:enter');

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'doctor', 'nursing_admin:schedule:view'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='doctor' AND permission_code='nursing_admin:schedule:view');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'doctor', 'nursing_admin:indicator:view'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='doctor' AND permission_code='nursing_admin:indicator:view');

-- ---------------------------------------------------------------------------
-- 种子：默认班次（全院通用，ward_id 为空）
-- ---------------------------------------------------------------------------
INSERT INTO clinical.nursing_shift_definitions (ward_id, code, name, start_time, end_time, color, is_night, hours)
SELECT NULL, v.code, v.name, v.start_time::time, v.end_time::time, v.color, v.is_night, v.hours
FROM (VALUES
  ('DAY',   '白班', '08:00', '16:00', '#4F81BD', false, 8.0),
  ('MID',   '中班', '16:00', '24:00', '#9BBB59', false, 8.0),
  ('NIGHT', '夜班', '00:00', '08:00', '#1F3864', true, 8.0)
) AS v(code, name, start_time, end_time, color, is_night, hours)
WHERE NOT EXISTS (
  SELECT 1 FROM clinical.nursing_shift_definitions d
  WHERE d.ward_id IS NULL AND d.code = v.code
);

-- ---------------------------------------------------------------------------
-- 种子：NQI 指标库（方向/口径/数据源标注；pending 类暂无结构化数据源）
-- ---------------------------------------------------------------------------
INSERT INTO clinical.nursing_indicators
  (code, name, category, numerator_def, denominator_def, unit, direction, frequency, source_type, threshold, description, sort_order)
VALUES
  ('NQI_BED_NURSE_RATIO', '床护比', '人力配置', '开放床位数', '注册护士数', '1:x', 'higher_is_better', '月', 'auto', NULL,
   '开放床位与护士配置比，越低越紧张；由床位与排班人力自动计算', 1),
  ('NQI_NURSE_PATIENT_RATIO', '护患比', '人力配置', '当班护士数', '在院患者数', '1:x', 'higher_is_better', '班', 'auto', NULL,
   '当班护士与所辖患者比，自动计算', 2),
  ('NQI_PRESSURE_HIGH_RISK', '压疮高危率', '护理质量', '压疮高风险患者数', '住院患者数', '%', 'lower_is_better', '月', 'auto', NULL,
   '来自 nursing_records.pressure_sore_risk=high 的高危标识；非院内压力性损伤发生数', 3),
  ('NQI_FALL_HIGH_RISK', '跌倒高危率', '护理质量', '跌倒高风险患者数', '住院患者数', '%', 'lower_is_better', '月', 'auto', NULL,
   '来自 nursing_records.fall_risk=high 的高危标识；非实际跌倒发生数', 4),
  ('NQI_SHIFT_COMPLIANCE', '夜班排班合规率', '护理管理', '合规排班条数', '总排班条数', '%', 'higher_is_better', '月', 'auto', NULL,
   '连班/工时/覆盖合规的排班占比，由排班合规引擎自动判定', 5),
  ('NQI_PRESSURE_INJURY', '住院患者院内二期及以上压力性损伤发生率', '护理质量', '院内新发二期及以上压力性损伤例数', '住院患者数', '%', 'lower_is_better', '月', 'pending', NULL,
   '需接入不良事件/皮肤结局登记后自动统计，当前待人工录入', 6),
  ('NQI_FALL_INCIDENT', '跌倒发生率', '护理质量', '住院期间跌倒发生例数', '住院患者数', '%', 'lower_is_better', '月', 'pending', NULL,
   '需接入护理不良事件登记，当前待人工录入', 7),
  ('NQI_UNPLANNED_EXTUBATION', '非计划拔管率', '护理质量', '非计划拔管例数', '留置管路患者数', '%', 'lower_is_better', '月', 'pending', NULL,
   '需接入管路护理与不良事件登记，当前待人工录入', 8),
  ('NQI_MED_ERROR', '给药差错率', '护理安全', '给药差错例数', '给药总例次', '%', 'lower_is_better', '月', 'pending', NULL,
   '需接入给药不良事件登记，当前待人工录入', 9),
  ('NQI_NURSE_TURNOVER', '护士离职率', '人力配置', '周期内离职护士数', '周期初护士数', '%', 'lower_is_better', '年', 'pending', NULL,
   '需接入人事离职数据，当前待人工录入', 10)
ON CONFLICT (code) DO NOTHING;
