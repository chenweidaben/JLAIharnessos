-- ============================================================================
-- 健澜科技 jlmedaios — 【AI深化与智能运营】患者全旅程管理：旅程事件表（M168-C）
--
-- 设计原则：患者旅程要真实，不能虚构。
--   一条门诊就诊天然走完八个节点：
--     预约挂号 → 分诊候诊 → 就诊 → 开单缴费 → 检查检验 → 取药 → 离院 → 随访
--   传统 HIS 把这八段散落在挂号/收费/药房/随访系统里，拼不出「一个患者
--   一次就诊到底等了多久、卡在哪一步」。本表把每个节点的发生时间、
--   等待时长、服务时长、完成状态落为一行事件，让全旅程可回放、可对比基准、
--   可定位瓶颈——而不是事后靠问卷猜患者哪里不满意。
--
-- 八个节点与门诊真实流程一一对应（与聚合器 JOURNEY_NODES 对齐）：
--   appointment  预约挂号   线上/窗口建档挂号，预约制下现场等待趋近 0；
--   triaging     分诊候诊   到院签到分诊后候诊叫号，基准等待约 30 分钟；
--   consultation 就诊       医师面诊（接诊时间计入服务时长，不计入等待）；
--   billing      开单缴费   检查/药品划价缴费，基准排队约 10 分钟；
--   exam         检查检验   检验采样/检查执行/等报告，基准约 45 分钟；
--   pharmacy     取药       药房调配发药，基准排队约 10 分钟；
--   discharge    离院       就诊结束离场；
--   followup     随访       离院后 24-72 小时电话/线上回访。
--
-- 效果计算由纯函数 src/bff/aggregators/patientJourneyAggregator.ts 完成：
--   buildPatientJourney / identifyJourneyBottleneck / optimizePatientFlow /
--   predictPatientSatisfaction，纯函数不触库、便于单测；
--   数据库读写由路由层 routes/patientJourney.ts 负责（断库时内存台账亦可回读）。
--
-- 医疗安全红线：
--   * 本表只存就诊流程量（节点/时间/等待/状态），不存诊断、处方明细等
--     诊疗内容；满意度字段为节点级主观评分，不与诊断结论关联；
--   * patient_id 为院内业务就诊号，对外接口脱敏展示；禁止存身份证号/手机号；
--   * 瓶颈识别与满意度预测为运营改进辅助，不作为考核一线人员的扣分项，
--     不用于末位处罚；
--   * 随访触须必须经患者授权同意，遵守《个人信息保护法》最小必要原则。
--
-- 权限码：patient:journey:view（门诊运营/客服中心只读旅程回放）、
--         patient:journey:manage（导诊/随访登记节点事件）。
-- 幂等：CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS，可重入。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- 【AI深化与智能运营】旅程节点枚举（八个节点固定顺序，与聚合器对齐）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'journey_node_code') THEN
    CREATE TYPE medmuse.journey_node_code AS ENUM (
      'appointment',   -- 预约挂号
      'triaging',      -- 分诊候诊
      'consultation',  -- 就诊
      'billing',       -- 开单缴费
      'exam',          -- 检查检验
      'pharmacy',      -- 取药
      'discharge',     -- 离院
      'followup'       -- 随访
    );
  END IF;
END$$;

-- 节点事件状态：completed 已完成 / skipped 跳过（如免检查直接取药）/
--               in_progress 进行中（患者仍在该节点）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'journey_event_status') THEN
    CREATE TYPE medmuse.journey_event_status AS ENUM (
      'completed',
      'skipped',
      'in_progress'
    );
  END IF;
END$$;

-- 患者旅程事件：一个节点 = 一行（同一就诊同一节点重复签到取最新一次）
CREATE TABLE IF NOT EXISTS medmuse.patient_journey_event (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 就诊标识（最小化 PII：只存业务就诊号/流水号，不存身份证/手机号）
  patient_id        text NOT NULL,                        -- 患者就诊业务号
  visit_id          text NOT NULL DEFAULT '',             -- 一次就诊流水号（同次就诊聚合用）

  -- 【AI深化与智能运营】八节点留痕
  node_code         medmuse.journey_node_code NOT NULL,   -- 旅程节点
  node_name         text NOT NULL DEFAULT '',             -- 节点中文名（冗余展示用）
  occurred_at       timestamptz NOT NULL,                 -- 该节点发生（签到/完成）时间

  -- 等待与服务时长：等待是患者时间，服务是医护时间，分开记
  wait_minutes      numeric(6,1) NOT NULL DEFAULT 0,     -- 该节点前/节点内排队等待（分钟）
  duration_minutes  numeric(6,1) NOT NULL DEFAULT 0,      -- 该节点实际服务时长（分钟）

  status            medmuse.journey_event_status NOT NULL DEFAULT 'completed',
  satisfaction_score numeric(2,1),                         -- 节点级满意度 0-5（可空，患者未评）
  note              text NOT NULL DEFAULT '',             -- 脱敏备注（如「超声设备临时故障」）

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  -- 时长不能为负
  CONSTRAINT chk_patient_journey_wait CHECK (wait_minutes >= 0),
  CONSTRAINT chk_patient_journey_duration CHECK (duration_minutes >= 0),
  -- 满意度限定 0-5 分（五分制问卷口径）
  CONSTRAINT chk_patient_journey_score CHECK (
    satisfaction_score IS NULL
    OR (satisfaction_score >= 0 AND satisfaction_score <= 5)
  )
);

COMMENT ON TABLE medmuse.patient_journey_event IS
  '【AI深化与智能运营】患者全旅程事件（M168-C）：一行=一次就诊的一个流程节点（挂号→候诊→就诊→缴费→检查→取药→离院→随访），旅程回放与瓶颈识别的事实表';

-- 按患者回放全旅程（核心查询：GET /api/v1/patient/journey/:patientId）
CREATE INDEX IF NOT EXISTS idx_patient_journey_patient
  ON medmuse.patient_journey_event(patient_id, occurred_at);

-- 按就诊流水聚合（一次就诊八节点拼时间线）
CREATE INDEX IF NOT EXISTS idx_patient_journey_visit
  ON medmuse.patient_journey_event(visit_id);

-- 按节点盘点全院等待时长（运营看板：哪个环节最慢）
CREATE INDEX IF NOT EXISTS idx_patient_journey_node
  ON medmuse.patient_journey_event(node_code, occurred_at DESC);

-- 仅门诊运营/客服中心（patient:journey:view）可读，导诊/随访岗
-- （patient:journey:manage）可登记事件；本表不含诊疗明细，与临床库隔离。
