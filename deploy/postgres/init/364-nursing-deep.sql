-- ============================================================================
-- 健澜科技 jlmedaios · M179-A 医院护理管理深化——真关心护士，不是监控
-- 364-nursing-deep.sql
--
-- 业务定位（护理院感医保药事 · 护理主线）：
--   护理管理的目的不是盯着护士有没有偷懒，而是把「排班、质量、培训、科研」
--   四件事做成对护士的支持系统——缺人时补位而不是逼加班，质量出问题先查流程
--   而不是先扣钱，培训给路径而不是走形式，科研给时间而不是摊指标。
--
--   护理排班：护士人力配置（床护比）+ 班次安排（白/中/夜三班）+ 加班管理（上限预警）；
--   护理质量：基础护理合格率 + 危重护理合格率 + 护理不良事件（分级上报，根因分析）；
--   护理培训：三基三严 + 专科技能 + 应急演练，学分与技能双记录；
--   护理科研：护理论文 + 专利 + 品管圈（QCC），给临床护士的成长通道。
--
-- 核心红线（关怀而非监控）：
--   - 床护比不达标时，系统提示「增补人力」而非「现有护士延长当班」；
--   - 加班时长累计超过阈值（单月 36 小时）即橙色预警，建议调休；
--   - 不良事件按 SSE/II/III/IV 分级上报，先做根因分析（RCA），不与个人奖金简单挂钩；
--   - 风险识别输出的是「关怀动作」（翻身/陪护/交接/宣教），不是监控摄像头式打分。
--
-- 设计边界：
--   - 扩展 clinical.nursing_records（既有护理记录单）：ADD COLUMN IF NOT EXISTS
--     增补护理等级/Braden/跌倒/风险标识等列，可重入；
--   - 新建 nursing 模式下五张从表：ward_staffing（科室人力）、shift_assignment（班次）、
--     adverse_event（不良事件）、training_plan（培训）、research_output（科研）；
--   - 纯演示种子，不碰 WebSocket、不新增依赖；
--   - 幂等：CREATE SCHEMA IF NOT EXISTS / CREATE TABLE IF NOT EXISTS /
--           ALTER TABLE ... ADD COLUMN IF NOT EXISTS / ON CONFLICT DO NOTHING。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS nursing;

-- ---------------------------------------------------------------------------
-- 零、扩展既有护理记录单 clinical.nursing_records（幂等 ADD COLUMN）
--   把护理等级、压疮 Braden、跌倒风险、管路、风险标识等落到每条护理记录上，
--   与 BFF 纯函数 identifyNursingRisk / calculateNursingRatio 对齐。
-- ---------------------------------------------------------------------------
ALTER TABLE clinical.nursing_records
  ADD COLUMN IF NOT EXISTS care_level        text NOT NULL DEFAULT 'general'
    CHECK (care_level IN ('special','first','second','third','general')),  -- 护理等级：特级/一级/二级/三级/普通
  ADD COLUMN IF NOT EXISTS braden_score      numeric(4,1),                  -- Braden 压疮评分 6~23，越低越危险
  ADD COLUMN IF NOT EXISTS fall_risk         text NOT NULL DEFAULT 'low'
    CHECK (fall_risk IN ('low','medium','high')),                          -- 跌倒/坠床风险
  ADD COLUMN IF NOT EXISTS impaired_consciousness boolean NOT NULL DEFAULT false, -- 意识障碍
  ADD COLUMN IF NOT EXISTS has_tube          boolean NOT NULL DEFAULT false,     -- 带管路（引流/尿管/静脉置管）
  ADD COLUMN IF NOT EXISTS risk_flags        text[] NOT NULL DEFAULT '{}',       -- 命中的风险标识（人读，供关怀动作）
  ADD COLUMN IF NOT EXISTS overtime_flag     boolean NOT NULL DEFAULT false;     -- 本条记录是否由加班护士书写（关怀疲劳）

COMMENT ON COLUMN clinical.nursing_records.care_level   IS '【护理院感医保药事】护理等级：特级/一级/二级/三级/普通';
COMMENT ON COLUMN clinical.nursing_records.braden_score IS '【护理院感医保药事】Braden 压疮评分（≤12 高危，≤16 中危）';
COMMENT ON COLUMN clinical.nursing_records.fall_risk    IS '【护理院感医保药事】跌倒/坠床风险等级';
COMMENT ON COLUMN clinical.nursing_records.risk_flags IS '【护理院感医保药事】风险标识，输出关怀动作而非监控打分';

-- ---------------------------------------------------------------------------
-- 一、nursing.ward_staffing 科室护理人力配置（床护比 + 加班关怀）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nursing.ward_staffing (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_code       text NOT NULL,                        -- 病区编码：GEN 普通病房 / ICU / PED 儿科 / ER 急诊
  ward_name       text NOT NULL,
  ward_type       text NOT NULL DEFAULT 'general'
                    CHECK (ward_type IN ('general','icu','pediatrics','emergency')),
  patients        integer NOT NULL DEFAULT 0 CHECK (patients >= 0),   -- 在院患者（占用床位数）
  nurses_on_duty  integer NOT NULL DEFAULT 0 CHECK (nurses_on_duty >= 0), -- 当班护士数
  overtime_hours  numeric(5,1) NOT NULL DEFAULT 0.0 CHECK (overtime_hours >= 0), -- 本月累计加班（小时），关怀疲劳
  is_active       boolean NOT NULL DEFAULT true,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ward_code)
);

COMMENT ON TABLE nursing.ward_staffing IS '【护理院感医保药事】病区护理人力配置：床护比 + 加班时长（缺人补位不逼加班）';
COMMENT ON COLUMN nursing.ward_staffing.overtime_hours IS '本月累计加班小时数；超 36h 橙色预警，建议调休';
CREATE INDEX IF NOT EXISTS idx_nursing_staffing_type ON nursing.ward_staffing(ward_type);

-- ---------------------------------------------------------------------------
-- 二、nursing.shift_assignment 班次安排（白/中/夜三班，公平排休）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nursing.shift_assignment (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_code       text NOT NULL,
  nurse_id        text NOT NULL,                        -- 护士工号（演示脱敏 Nxxxx）
  nurse_name      text NOT NULL,
  shift_date      date NOT NULL DEFAULT CURRENT_DATE,
  shift_slot      text NOT NULL DEFAULT 'day'
                    CHECK (shift_slot IN ('day','swing','night')),  -- 白班/中班/夜班
  hours           numeric(4,1) NOT NULL DEFAULT 8.0 CHECK (hours > 0),
  overtime        boolean NOT NULL DEFAULT false,       -- 本次是否加班（关怀：记录但不监控个人）
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE nursing.shift_assignment IS '【护理院感医保药事】护理排班：白/中/夜三班轮转，夜班与加班有调休补偿';
CREATE INDEX IF NOT EXISTS idx_nursing_shift_ward ON nursing.shift_assignment(ward_code, shift_date);

-- ---------------------------------------------------------------------------
-- 三、nursing.adverse_event 护理不良事件（分级上报 + 根因分析，不简单扣钱）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nursing.adverse_event (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        text NOT NULL,                        -- 事件单号（如 AE-2026-001）
  ward_code       text NOT NULL,
  level           text NOT NULL DEFAULT 'iv'
                    CHECK (level IN ('sentinel','ii','iii','iv')),  -- 警讯事件 / II / III / IV 级
  category        text NOT NULL DEFAULT 'other',       -- 跌倒/压疮/管路滑脱/给药错误/跌倒坠床/其他
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  rca_done        boolean NOT NULL DEFAULT false,       -- 是否已完成根因分析
  care_action     text NOT NULL DEFAULT '',             -- 关怀/流程改进动作（不是处罚决定）
  period          text NOT NULL                         -- 统计周期（如 2026Q3）
);

COMMENT ON TABLE nursing.adverse_event IS '【护理院感医保药事】护理不良事件：分级上报+根因分析(RCA)，先改进流程不与个人奖金简单挂钩';
CREATE INDEX IF NOT EXISTS idx_nursing_event_period ON nursing.adverse_event(period, level);

-- ---------------------------------------------------------------------------
-- 四、nursing.training_plan 护理培训（三基三严 + 专科技能 + 应急演练）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nursing.training_plan (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_name     text NOT NULL,
  category        text NOT NULL DEFAULT 'general'
                    CHECK (category IN ('sanji_sanyan','specialty','emergency')), -- 三基三严/专科技能/应急演练
  period          text NOT NULL,
  trainees        integer NOT NULL DEFAULT 0 CHECK (trainees >= 0),   -- 参训人数
  passed          integer NOT NULL DEFAULT 0 CHECK (passed >= 0),     -- 考核合格人数
  drill           boolean NOT NULL DEFAULT false,                     -- 是否应急演练
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE nursing.training_plan IS '【护理院感医保药事】护理培训：三基三严+专科技能+应急演练，给路径不走形式';
CREATE INDEX IF NOT EXISTS idx_nursing_training_period ON nursing.training_plan(period, category);

-- ---------------------------------------------------------------------------
-- 五、nursing.research_output 护理科研（论文 + 专利 + 品管圈）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nursing.research_output (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  output_type     text NOT NULL DEFAULT 'paper'
                    CHECK (output_type IN ('paper','patent','qcc')),   -- 护理论文/专利/品管圈
  title           text NOT NULL,
  authors         text NOT NULL DEFAULT '',             -- 完成护士（多名，给成长通道）
  period          text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE nursing.research_output IS '【护理院感医保药事】护理科研：论文+专利+品管圈(QCC)，给临床护士成长通道与时间';
CREATE INDEX IF NOT EXISTS idx_nursing_research_period ON nursing.research_output(period, output_type);

-- ---------------------------------------------------------------------------
-- 六、演示种子（与 BFF 内置台账对齐；ON CONFLICT DO NOTHING 可重入）
-- ---------------------------------------------------------------------------
INSERT INTO nursing.ward_staffing
  (ward_code, ward_name, ward_type, patients, nurses_on_duty, overtime_hours)
VALUES
  ('GEN-01','心内科普通病房','general',42,6,28.0),
  ('GEN-02','普外科普通病房','general',38,5,41.0),   -- 床护比偏紧 + 加班超 36h 预警
  ('ICU-01','中心监护室','icu',12,8,18.0),
  ('PED-01','儿科病房','pediatrics',24,4,9.0)
ON CONFLICT (ward_code) DO NOTHING;

INSERT INTO nursing.shift_assignment
  (ward_code, nurse_id, nurse_name, shift_date, shift_slot, hours, overtime)
VALUES
  ('GEN-01','N1001','王护士','2026-10-15','day',8.0,false),
  ('GEN-01','N1002','李护士','2026-10-15','swing',8.0,false),
  ('GEN-01','N1003','赵护士','2026-10-15','night',8.0,false),
  ('GEN-02','N2001','陈护士','2026-10-15','day',8.0,true),    -- 加班关怀：记录并提示调休
  ('ICU-01','N3001','周护士','2026-10-15','day',8.0,false)
ON CONFLICT DO NOTHING;

INSERT INTO nursing.adverse_event
  (event_id, ward_code, level, category, rca_done, care_action, period)
VALUES
  ('AE-2026-001','GEN-01','iii','fall',true,'增设床边护栏+家属陪护宣教+交接班挂牌','2026Q3'),
  ('AE-2026-002','GEN-02','iv','pressure_ulcer',true,'Braden 高危每 2h 翻身+减压垫申请','2026Q3'),
  ('AE-2026-003','ICU-01','ii','tube_displacement',true,'管路双重固定+镇静评分复评','2026Q3')
ON CONFLICT DO NOTHING;

INSERT INTO nursing.training_plan
  (course_name, category, period, trainees, passed, drill)
VALUES
  ('心肺复苏(CPR)考核','sanji_sanyan','2026Q3',40,38,false),
  ('静脉治疗(静疗)专科技能','specialty','2026Q3',24,22,false),
  ('病房火灾/停电应急演练','emergency','2026Q3',30,30,true)
ON CONFLICT DO NOTHING;

INSERT INTO nursing.research_output
  (output_type, title, authors, period)
VALUES
  ('paper','Braden 评分在心内科压疮预防中的应用','王护士,李护士','2026Q3'),
  ('qcc','降低外科病区管路滑脱率 QCC','陈护士等','2026Q3'),
  ('patent','一种防压疮翻身垫（实用新型）','赵护士','2026Q3')
ON CONFLICT DO NOTHING;
