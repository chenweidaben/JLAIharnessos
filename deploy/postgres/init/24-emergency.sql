-- ============================================================================
-- 健澜科技 jlmedaios - 急诊核心事务表（M1-B1）
-- 24-emergency.sql
--
-- 覆盖急诊核心事务：分诊分级（I–IV）、绿色通道（胸痛/卒中/创伤）、
--   抢救记录、急诊留观、急诊转归。全部真实落 PostgreSQL，去 mock。
--
-- 设计目标（医疗级严谨 / 一院多区）：
--  - emergency_triage 急诊分诊主记录：一次急诊就诊 1:1，记录到达/分诊时间、
--      生命体征、NEWS2/GCS/卒中量表、规则与 AI 建议级别、护士最终确认级别；
--  - green_channels / green_channel_nodes 绿色通道：通道头 + 时间节点链
--      （如卒中 D-to-CT≤25min、D-to-needle≤60min；胸痛 D-to-B≤90min）；
--  - resuscitations 抢救记录：抢救时间轴、生命体征趋势、用药、团队、转归；
--  - observations 急诊留观：留观床位、护理等级、状态、待办、预计转归；
--  - emergency_dispositions 急诊转归：入院/手术/留观/离院/转科/死亡。
--
-- 并发安全：分诊号由序列 clinical.emergency_triage_no_seq 生成，
--   triage_no / visit_no 在同事务取同一序列值，并以 UNIQUE 约束兜底，
--   并发接诊不重号、不串单。
--
-- 严谨性：AI 仅给出建议级别（ai_suggested_level），最终级别由分诊护士确认
--   （level + confirmed）；规则引擎（rule_suggested_level）给出确定性基线。
--
-- 幂等：全部 CREATE TABLE IF NOT EXISTS / CREATE SEQUENCE IF NOT EXISTS，可重入。
--
-- Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 扩展 clinical.visits：急诊就诊所需
--  - campus_id：急诊就诊所在院区（一院多区）；
--  - status 增加 waiting（候诊）/ admitted（急诊收入院）/ deceased（抢救无效死亡）。
--    急诊终态由 syncVisitStatus 映射到 discharged/transferred，waiting 用于接诊后候诊。
-- ---------------------------------------------------------------------------
ALTER TABLE clinical.visits
  ADD COLUMN IF NOT EXISTS campus_id uuid REFERENCES clinical.campuses(id);

ALTER TABLE clinical.visits DROP CONSTRAINT IF EXISTS visits_status_check;
ALTER TABLE clinical.visits ADD CONSTRAINT visits_status_check CHECK (
  status IN ('ongoing','waiting','discharged','transferred','cancelled','admitted','deceased')
);

-- ---------------------------------------------------------------------------
-- 急诊分诊主记录（1:1 关联急诊就诊）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.emergency_triage (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  triage_no           text NOT NULL UNIQUE,            -- 分诊号，如 FN200001
  visit_id            uuid NOT NULL REFERENCES clinical.visits(id),
  patient_id          uuid NOT NULL REFERENCES clinical.patients(id),
  triage_nurse_id     uuid REFERENCES iam.users(id),   -- 分诊护士（责任护士）
  arrive_time         timestamptz NOT NULL,            -- 到达急诊时间
  triage_time         timestamptz,                     -- 完成分诊时间
  chief_complaint     text,                            -- 主诉
  vitals              jsonb NOT NULL DEFAULT '{}',     -- 生命体征（T/P/R/BP/SpO2/意识/疼痛）
  -- GCS 格拉斯哥昏迷量表（E/V/M 分项 + 总分 3–15）
  gcs_eye             smallint CHECK (gcs_eye BETWEEN 1 AND 4),
  gcs_verbal          smallint CHECK (gcs_verbal BETWEEN 1 AND 5),
  gcs_motor           smallint CHECK (gcs_motor BETWEEN 1 AND 6),
  gcs_total           smallint CHECK (gcs_total BETWEEN 3 AND 15),
  news_score          integer,                         -- NEWS2 评分
  stroke_scale        jsonb NOT NULL DEFAULT '{}',     -- 卒中量表 FAST + LAMS
  -- 分诊级别 I–IV（1 濒危 / 2 危重 / 3 急症 / 4 非急症）
  level               smallint CHECK (level BETWEEN 1 AND 4),
  rule_suggested_level smallint CHECK (rule_suggested_level BETWEEN 1 AND 4), -- 规则引擎建议
  ai_suggested_level  smallint CHECK (ai_suggested_level BETWEEN 1 AND 4),    -- AI 建议（仅参考）
  ai_advice           jsonb NOT NULL DEFAULT '{}',     -- AI 建议明细（处置/鉴别/检查）
  vital_score         integer,                         -- 生命体征评分
  complaint_score     integer,                         -- 主诉评分
  total_score         integer,                         -- 综合评分
  basis               text,                            -- 分诊依据
  confirmed           boolean NOT NULL DEFAULT false,  -- 护士是否确认
  green_channel_active boolean NOT NULL DEFAULT false, -- 是否在绿色通道中
  -- 急诊工作流状态
  em_status           text NOT NULL DEFAULT 'waiting_triage'
                        CHECK (em_status IN (
                          'waiting_triage','triaged','in_treatment',
                          'resuscitation','observation',
                          'admitted','transferred','discharged','deceased'
                        )),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
-- 一次急诊就诊仅对应一条分诊记录
CREATE UNIQUE INDEX IF NOT EXISTS idx_em_triage_visit
  ON clinical.emergency_triage(visit_id);
CREATE INDEX IF NOT EXISTS idx_em_triage_patient
  ON clinical.emergency_triage(patient_id);
CREATE INDEX IF NOT EXISTS idx_em_triage_status
  ON clinical.emergency_triage(em_status, arrive_time);
CREATE TRIGGER trg_clinical_em_triage_updated BEFORE UPDATE ON clinical.emergency_triage
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 绿色通道（胸痛/卒中/创伤/孕产妇/新生儿）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.green_channels (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_no      text NOT NULL UNIQUE,                -- 通道号，如 GC200001
  visit_id        uuid NOT NULL REFERENCES clinical.visits(id),
  patient_id      uuid NOT NULL REFERENCES clinical.patients(id),
  type            text NOT NULL
                    CHECK (type IN ('chest_pain','stroke','trauma','maternal','neonatal')),
  subtype         text NOT NULL DEFAULT '',            -- 亚型，如 STEMI / 急性缺血性卒中
  status          text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','completed','cancelled')),
  arrive_time     timestamptz NOT NULL,               -- 到达急诊（时间节点基准）
  activate_time   timestamptz NOT NULL,               -- 通道激活时间
  end_time        timestamptz,                         -- 关闭/完成时间
  notified_teams  jsonb NOT NULL DEFAULT '[]',         -- 已通知团队
  dbn_minutes     integer,                            -- D-to-B 入门-球囊（胸痛，目标≤90）
  dct_minutes     integer,                            -- D-to-CT 入门-CT（卒中，目标≤25）
  dnt_minutes     integer,                            -- D-to-needle 入门-溶栓（卒中，目标≤60）
  outcome         text,                               -- 通道转归
  quality_note    text,                               -- 质量评估
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gc_visit ON clinical.green_channels(visit_id);
CREATE INDEX IF NOT EXISTS idx_gc_patient ON clinical.green_channels(patient_id);
CREATE INDEX IF NOT EXISTS idx_gc_status ON clinical.green_channels(status);
CREATE TRIGGER trg_clinical_gc_updated BEFORE UPDATE ON clinical.green_channels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 绿色通道时间节点（只追加的时间链，按 sort_order 排序）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.green_channel_nodes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id      uuid NOT NULL REFERENCES clinical.green_channels(id) ON DELETE CASCADE,
  node_key        text NOT NULL,                       -- 节点键，如 ct_scan / thrombolysis
  label           text NOT NULL,                       -- 节点名称
  target_minutes  integer,                             -- 自到达起目标分钟数
  actual_time     timestamptz,                         -- 实际完成时间（NULL 未完成）
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_gcn_channel_key
  ON clinical.green_channel_nodes(channel_id, node_key);
CREATE INDEX IF NOT EXISTS idx_gcn_channel
  ON clinical.green_channel_nodes(channel_id, sort_order);

-- ---------------------------------------------------------------------------
-- 抢救记录
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.resuscitations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resus_no        text NOT NULL UNIQUE,                -- 抢救记录号，如 RS200001
  visit_id        uuid NOT NULL REFERENCES clinical.visits(id),
  patient_id      uuid NOT NULL REFERENCES clinical.patients(id),
  bed_no          text,                                -- 抢救床号
  bed_id          uuid REFERENCES clinical.beds(id),
  start_time      timestamptz NOT NULL,
  end_time        timestamptz,
  diagnosis       text,                                -- 抢救诊断
  lead_doctor_id  uuid REFERENCES iam.users(id),
  lead_nurse_id   uuid REFERENCES iam.users(id),
  status          text NOT NULL DEFAULT 'resuscitating'
                    CHECK (status IN ('resuscitating','stabilized','transferred_icu','deceased')),
  events          jsonb NOT NULL DEFAULT '[]',         -- 抢救时间轴事件
  vital_trend     jsonb NOT NULL DEFAULT '[]',         -- 生命体征趋势点
  medications     jsonb NOT NULL DEFAULT '[]',         -- 抢救用药
  team            jsonb NOT NULL DEFAULT '[]',         -- 抢救团队
  outcome         text,                                -- 转归
  summary         text,                                -- 抢救小结
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_resus_visit ON clinical.resuscitations(visit_id);
CREATE INDEX IF NOT EXISTS idx_resus_patient ON clinical.resuscitations(patient_id);
CREATE INDEX IF NOT EXISTS idx_resus_status ON clinical.resuscitations(status);
CREATE TRIGGER trg_clinical_resus_updated BEFORE UPDATE ON clinical.resuscitations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 急诊留观
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.observations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obs_no          text NOT NULL UNIQUE,                -- 留观号，如 OB200001
  visit_id        uuid NOT NULL REFERENCES clinical.visits(id),
  patient_id      uuid NOT NULL REFERENCES clinical.patients(id),
  bed_no          text,                                -- 留观床号
  start_time      timestamptz NOT NULL,
  end_time        timestamptz,
  diagnosis       text,
  nursing_level   text NOT NULL DEFAULT 'level2',      -- 护理等级 special/level1/level2
  vitals          jsonb NOT NULL DEFAULT '{}',         -- 最近生命体征
  iv_status       text,                                -- 输液/治疗状态
  pending_tasks   jsonb NOT NULL DEFAULT '[]',         -- 待处理事项
  status          text NOT NULL DEFAULT 'observing'
                    CHECK (status IN ('observing','stable','worsening','discharged','admitted')),
  expected_outcome text,                               -- 预计转归
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_obs_visit ON clinical.observations(visit_id);
CREATE INDEX IF NOT EXISTS idx_obs_patient ON clinical.observations(patient_id);
CREATE INDEX IF NOT EXISTS idx_obs_status ON clinical.observations(status);
CREATE TRIGGER trg_clinical_obs_updated BEFORE UPDATE ON clinical.observations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 急诊转归（一次急诊就诊一条终末转归）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.emergency_dispositions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id          uuid NOT NULL UNIQUE REFERENCES clinical.visits(id),
  patient_id        uuid NOT NULL REFERENCES clinical.patients(id),
  disposition       text NOT NULL
                      CHECK (disposition IN (
                        'admitted','surgery','observation',
                        'discharged','transferred','deceased'
                      )),
  destination       text,                             -- 去向（科室/病区/手术室）
  ward_id           uuid REFERENCES clinical.wards(id),
  bed_id            uuid REFERENCES clinical.beds(id),
  remark            text,
  operator_id       uuid REFERENCES iam.users(id),
  disposition_time  timestamptz NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_em_disp_patient ON clinical.emergency_dispositions(patient_id);

-- ---------------------------------------------------------------------------
-- 分诊号序列（与住院 100001 区分，从 200001 起；同事务派生 triage_no/visit_no）
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS clinical.emergency_triage_no_seq
  START WITH 200001 INCREMENT BY 1 CACHE 20;
