-- ============================================================================
-- 健澜科技 jlmedaios · M162-A 医院安全与应急管理——应急预案 / 演练留痕
--
-- 【应急预案要真能用，不能纸上谈兵】本模块覆盖医院全场景五类突发情景：
--   1) mass_casualty   批量伤员（交通事故 / 工伤群伤）
--   2) fire_evacuation 火灾疏散
--   3) power_outage    停电应急
--   4) it_failure      信息系统故障（HIS / EMR / PACS 宕机）
--   5) outbreak        传染病暴发
--
-- emergency_plan（应急预案快照）：
--   由 BFF 聚合层 buildEmergencyPlan 纯函数按 scenario 实时推导生成，
--   本表仅保存生成结果快照（指挥体系 / 响应阶段 / 关键动作 / 物资 / 通报链条），
--   便于事后追溯与演练对照。不替代院方正式红头文件，落地须经医务处 / 保卫处 /
--   后勤保障处会签后印发——【医院全场景】。
--
-- emergency_drill（应急演练）：
--   scheduleEmergencyDrill 纯函数生成演练计划（时间 / 参演部门 / 目标 / 提前提醒），
--   evaluateDrillResult 纯函数依据演练实测指标（响应时长 / 疏散率 / 通讯成功率 /
--   设备完好率）加权打分定级，并给出瓶颈与改进项。本表同时持久化计划与评估结果，
--   支撑「每半年至少一次实战演练、每年一次全院综合演练」的合规台账。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS，可重入。
-- 权限：admin（院领导 / 医务处 / 保卫处）可读写；其余角色仅本人参演记录可见。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) emergency_plan：应急预案快照（按情景版本化留存）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.emergency_plan (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 情景代码：mass_casualty / fire_evacuation / power_outage / it_failure / outbreak
  scenario          text NOT NULL,
  -- 情景中文名（批量伤员 / 火灾疏散 / 停电应急 / 信息系统故障 / 传染病暴发）
  scenario_name     text NOT NULL,
  -- 响应分级：Ⅰ级（特别重大）/ Ⅱ级（重大）/ Ⅲ级（较大）
  level             text NOT NULL DEFAULT 'Ⅱ级',
  -- 是否命中内置预案库（未命中时仍生成通用兜底骨架，matched=false）
  matched           boolean NOT NULL DEFAULT true,

  -- 指挥体系：总指挥 / 现场指挥 / 医疗救治组 / 疏散引导组 / 后勤保障组 / 通讯联络组
  command           jsonb NOT NULL,
  -- 响应阶段：预警 → 启动 → 处置 → 恢复，每阶段含目标与时限
  phases            jsonb NOT NULL,
  -- 分阶段关键动作清单（可直接照做，非空话）
  actions           jsonb NOT NULL,
  -- 物资与资源需求（急救箱 / 灭火器 / 应急照明 / 备用发电机 / 纸质病历等）
  resources         jsonb NOT NULL,
  -- 报告与通报链条（院内逐级上报 + 120 / 消防 / 公卫等外部通报时限）
  communication     jsonb NOT NULL,
  -- 建议演练频次（月 / 季 / 半年 / 年）
  drill_frequency   text NOT NULL DEFAULT '每半年一次实战演练',
  -- 现场处置核对表（emergencyResponseChecklist 输出快照）
  checklist         jsonb NOT NULL DEFAULT '[]'::jsonb,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  -- 同一情景仅保留最新版本，历史按 scenario + created_at 追溯
  UNIQUE (scenario)
);

-- 情景维度：按情景取最新预案
CREATE INDEX IF NOT EXISTS idx_emergency_plan_scenario
  ON clinical.emergency_plan(scenario, updated_at DESC);

COMMENT ON TABLE clinical.emergency_plan IS
  'M162-A 医院应急预案快照：五情景纯函数推导、版本化留痕，须经院方会签印发';

-- ----------------------------------------------------------------------------
-- 2) emergency_drill：演练计划 + 效果评估留痕
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.emergency_drill (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 关联预案（可空：演练也可针对历史预案快照 id）
  plan_id           uuid REFERENCES clinical.emergency_plan(id),
  -- 业务演练编号（DRILL-YYYYMMDD-xxx），由 scheduleEmergencyDrill 生成
  drill_code        text NOT NULL,
  -- 针对的情景代码（冗余，便于按情景统计演练覆盖率）
  scenario          text NOT NULL,
  -- 计划演练时间
  scheduled_date    timestamptz NOT NULL,
  -- 演练形式：tabletop 桌面推演 / functional 功能演练 / full_scale 实战综合演练
  drill_type        text NOT NULL DEFAULT 'functional',
  -- 状态：scheduled 已排期 / completed 已完成 / cancelled 已取消
  status            text NOT NULL DEFAULT 'scheduled',
  -- 提前提醒时间（默认演练前 3 天）
  remind_at         timestamptz,
  -- 参演部门 / 岗位
  participants      jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- 本次演练目标
  objectives        jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- 实测指标快照（响应时长 / 到达时长 / 疏散率 / 通讯成功率 / 设备完好率等）
  metrics          jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- 加权总分（0~100）
  score             int,
  -- 定级：优秀（≥90）/ 合格（70~89）/ 不合格（<70）
  grade             text,
  -- 暴露的瓶颈与整改建议（evaluateDrillResult 输出）
  bottlenecks       jsonb NOT NULL DEFAULT '[]'::jsonb,
  improvements      jsonb NOT NULL DEFAULT '[]'::jsonb,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- 按状态 + 计划时间扫描待演练台账
CREATE INDEX IF NOT EXISTS idx_emergency_drill_schedule
  ON clinical.emergency_drill(status, scheduled_date);

-- 按情景统计演练覆盖率
CREATE INDEX IF NOT EXISTS idx_emergency_drill_scenario
  ON clinical.emergency_drill(scenario, status);

COMMENT ON TABLE clinical.emergency_drill IS
  'M162-A 应急演练：排期 + 实测指标加权打分定级，支撑半年/年度演练合规台账';
