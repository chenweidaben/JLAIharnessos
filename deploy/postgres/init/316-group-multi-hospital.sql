-- ============================================================================
-- 健澜科技 jlmedaios — 【集团与科研】医院集团多院管理扩展表（M156-A）
--
-- 面向医疗集团（总院 + N 家分院 / 成员医院）的统一管理底座：
--   · 集团主表 grp.hospital_group：一个集团一条；
--   · 集团成员 grp.group_hospital_member：集团 ↔ 医院 的归属关系，
--     每家成员医院自带 hospital_id，作为全库数据隔离的硬边界；
--   · 院级核心指标快照 grp.hospital_metric_snapshot：
--     门诊量 / 住院量 / 手术量 / 收入 / 满意度 + 三类资源负载率，
--     每一行都强带 hospital_id —— 院级业务系统按 hospital_id 严格落库，
--     跨院对比只在集团聚合层（BFF aggregator）发生，院与院之间不串数；
--   · 跨院资源调配 grp.group_resource_dispatch：
--     专家 / 大型设备 / 床位的跨院调度留痕，调出院 → 调入院全程可审计；
--   · 集团统一标准 grp.group_unified_standard：
--     诊疗规范 / 质控标准 / 安全制度，集团下发、各成员院强制执行。
--
-- 数据隔离红线：
--   · 所有院级明细表（指标快照 / 资源调配）均以 hospital_id 为第一过滤列；
--   · 任何院端业务查询必须带 hospital_id 条件，禁止不带院别扫描全集团明细；
--   · 集团大屏 / 医院对比 / 资源优化只读取本 schema 的聚合结果，
--     不暴露任何单院患者级 PII。
--
-- 幂等：CREATE SCHEMA / TABLE / INDEX IF NOT EXISTS，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS grp;

-- ----------------------------------------------------------------------------
-- 1) 集团主表：一个医疗集团一条
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grp.hospital_group (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 集团业务编码（对外稳定标识，如 'GRP-JL-001'）
  group_code       text NOT NULL,
  -- 集团名称（如「健澜医疗集团」）
  group_name       text NOT NULL,
  -- 总院（牵头医院）的 hospital_id，作为集团管理锚点
  head_hospital_id uuid,
  -- 集团层级：province 省级 / city 地市级 / county 区县级
  group_level      text NOT NULL DEFAULT 'city',
  -- 所在区域
  region           text,
  -- 集团统一标准版本号（诊疗规范/质控/安全制度的统一发布版本）
  standard_version text NOT NULL DEFAULT 'v1.0.0',
  -- 扩展属性（集团章程、合作协议摘要等 jsonb）
  extras           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_code)
);

-- ----------------------------------------------------------------------------
-- 2) 集团成员医院：集团 ↔ 医院归属关系
--    一家医院只能归属一个集团（单成员约束），避免跨集团串数。
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grp.group_hospital_member (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 所属集团（外键逻辑引用 grp.hospital_group.id）
  group_id      uuid NOT NULL,
  -- 成员医院的稳定 hospital_id —— 数据隔离硬边界
  hospital_id   uuid NOT NULL,
  -- 医院名称（冗余展示，避免大屏反复 join 院籍表）
  hospital_name text NOT NULL,
  -- 医院等级：三级甲等 / 三级乙等 / 二级甲等 / 二级乙等 / 一级
  hospital_level text,
  -- 所在区域
  region        text,
  -- 成员角色：head 总院 / branch 分院 / member 协作医院
  member_role   text NOT NULL DEFAULT 'member',
  -- 入组时间
  joined_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hospital_id),
  UNIQUE (group_id, hospital_name)
);

-- 按集团反查成员医院（集团大屏核心查询）
CREATE INDEX IF NOT EXISTS idx_group_member_group
  ON grp.group_hospital_member(group_id);

-- ----------------------------------------------------------------------------
-- 3) 院级核心指标快照（按 hospital_id 严格隔离）
--    一行 = 某医院某周期的核心运营指标；
--    院级业务系统只写自己 hospital_id 的行，集团聚合层跨院只读汇总。
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grp.hospital_metric_snapshot (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 所属集团（冗余，便于按集团分片清理/归档）
  group_id         uuid NOT NULL,
  -- 数据隔离硬边界：本指标归属的成员医院
  hospital_id      uuid NOT NULL,
  -- 统计周期标签：'2026-10'（月）/ '2026Q3'（季）/ '2026-10-16'（日）
  period           text NOT NULL,
  -- 周期粒度：day / week / month / quarter
  period_type      text NOT NULL DEFAULT 'month',
  -- 核心运营指标
  outpatient_volume bigint NOT NULL DEFAULT 0,   -- 门诊量（人次）
  inpatient_volume  bigint NOT NULL DEFAULT 0,   -- 住院量（出院人次）
  surgery_volume    bigint NOT NULL DEFAULT 0,   -- 手术量（台）
  revenue           numeric(14,2) NOT NULL DEFAULT 0,  -- 业务收入（万元）
  satisfaction      numeric(5,2) NOT NULL DEFAULT 0,   -- 满意度（百分制 0~100）
  -- 三类资源负载率（0~100）：供跨院资源优化使用
  expert_load       numeric(5,2) NOT NULL DEFAULT 0,    -- 专家占用率
  equipment_load    numeric(5,2) NOT NULL DEFAULT 0,    -- 大型设备占用率
  bed_occupancy     numeric(5,2) NOT NULL DEFAULT 0,    -- 床位占用率
  -- 数据快照时间戳
  captured_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, period_type, period)
);

-- 隔离红线索引：任何院级查询必须带 hospital_id + period
CREATE INDEX IF NOT EXISTS idx_metric_hospital_period
  ON grp.hospital_metric_snapshot(hospital_id, period DESC);

-- 集团聚合层按集团 + 周期拉取全部成员院指标（只读汇总，不下钻患者明细）
CREATE INDEX IF NOT EXISTS idx_metric_group_period
  ON grp.hospital_metric_snapshot(group_id, period DESC);

-- ----------------------------------------------------------------------------
-- 4) 跨院资源调配留痕：专家 / 大型设备 / 床位
--    调出院 → 调入院，资源在集团内流动，全程可审计；
--    记录中同时落调出/调入双方 hospital_id，满足双向追溯。
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grp.group_resource_dispatch (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id         uuid NOT NULL,
  -- 资源类型：expert 专家 / equipment 大型设备 / bed 床位
  resource_type    text NOT NULL,
  -- 调出医院（资源原属院，隔离边界）
  from_hospital_id uuid NOT NULL,
  -- 调入医院（资源使用院，隔离边界）
  to_hospital_id   uuid NOT NULL,
  -- 资源数量（人/台/张）
  quantity         int NOT NULL DEFAULT 1,
  -- 调配事由（如「XX院手术量饱和，专家跨院支援」）
  reason           text,
  -- 状态：proposed 建议中 / approved 已批准 / active 执行中 / completed 已完成
  status           text NOT NULL DEFAULT 'proposed',
  -- 生效 / 结束时间
  effective_from   timestamptz,
  effective_to     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- 按集团 + 资源类型回读调配记录（资源优化建议列表）
CREATE INDEX IF NOT EXISTS idx_dispatch_group_type
  ON grp.group_resource_dispatch(group_id, resource_type, status);

-- ----------------------------------------------------------------------------
-- 5) 集团统一标准：诊疗规范 / 质控标准 / 安全制度
--    集团统一发布、各成员院强制执行，标准到院不串内容。
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grp.group_unified_standard (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      uuid NOT NULL,
  -- 标准类别：clinic 诊疗规范 / qc 质控标准 / safety 安全制度
  category      text NOT NULL,
  -- 标准名称（如「集团统一手术安全核查规范 v2.1」）
  name          text NOT NULL,
  -- 标准编号
  standard_code text NOT NULL,
  -- 版本号
  version       text NOT NULL DEFAULT 'v1.0.0',
  -- 标准正文摘要 / 附件链接
  content       text,
  -- 强制级别：mandatory 强制执行 / recommended 推荐执行
  enforce_level text NOT NULL DEFAULT 'mandatory',
  -- 生效日期
  effective_date date,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, standard_code, version)
);

-- 按集团 + 类别回读统一标准（集团大屏「统一标准」面板）
CREATE INDEX IF NOT EXISTS idx_standard_group_category
  ON grp.group_unified_standard(group_id, category);

-- 隔离声明：本 schema 所有院级明细（指标快照 / 资源调配）均以 hospital_id
-- 为第一过滤列；院端业务查询必须带 hospital_id 条件；跨院对比仅允许在
-- BFF 集团聚合层（aggregators/groupMultiHospitalAggregator.ts）发生。
