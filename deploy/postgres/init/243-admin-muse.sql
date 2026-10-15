-- ============================================================================
-- 健澜科技 jlmedaios · M116-C 管理员 MUSE 专属功能 / 管理决策经验记忆
--
-- 依据宪法第七章 7.6（管理员 MUSE：院长 / 职能科室主任的决策经验沉淀）：
--   为每一位医院行政管理者沉淀独立的「决策经验记忆」——每一次管理决策
--   （decision_type：预算分配 / 人事调度 / 流程再造 / 设备采购 / 绩效方案…）
--   的上下文（context）、所采取的行动（action）、事后量化效果
--   （result_metric，如成本下降率 / 床位周转提升率 / 平均住院日变化）与
--   结局（outcome：success / failure / mixed），使 MUSE 越用越懂
--   「这位管理员」的决策偏好与 ROI 规律。
--
-- 表结构：
--   medmuse.admin_decision_memory  管理决策经验流水：每条决策一行。
--     id            uuid 主键（默认 gen_random_uuid()）
--     admin_id      管理员脱敏工号（对应 staff_muse_profile.staff_id）
--     decision_type 决策类别（预算 / 人事 / 流程 / 采购 / 绩效 …）
--     context       决策上下文摘要（脱敏文本，不落患者直接标识符）
--     action        实际采取的管理动作
--     result_metric 事后量化效果（数值；正=改善，负=恶化，可空=未量化）
--     outcome       结局三态：success / failure / mixed
--     created_at    决策发生时间（默认 now()）
--
-- 医疗安全红线：
--   - 本表只存「管理员本人」的决策复盘，MUSE 绝不跨管理员读取他人记忆；
--   - context 为脱敏文本，严禁落患者姓名 / 身份证号 / 病历号等直接标识符；
--   - result_metric / outcome 仅用于个人管理能力成长闭环，不用于绩效考核处罚。
--
-- 幂等：CREATE SCHEMA / TABLE / INDEX IF NOT EXISTS，可重入。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- ---------------------------------------------------------------------------
-- 管理决策经验记忆流水（每条决策一行；outcome 三态）
-- 依据宪法第七章 7.6：管理员个人决策经验库
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.admin_decision_memory (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id      text   NOT NULL,
  decision_type text   NOT NULL,
  context       text   NOT NULL DEFAULT '',
  action        text   NOT NULL DEFAULT '',
  result_metric numeric,
  outcome       text   NOT NULL DEFAULT 'mixed'
                CHECK (outcome IN ('success', 'failure', 'mixed')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 按管理员拉取其决策经验（新→旧），个人管理经验召回主查询路径
CREATE INDEX IF NOT EXISTS idx_admin_decision_memory_admin
  ON medmuse.admin_decision_memory (admin_id, created_at DESC);

-- 按决策类别索引：ROI 分析 / 同类决策横向对比高频扫描
CREATE INDEX IF NOT EXISTS idx_admin_decision_memory_type
  ON medmuse.admin_decision_memory (admin_id, decision_type);

-- 失败经验专项索引：管理复盘 / 错题本场景高频扫描该管理员的 failure 记录
CREATE INDEX IF NOT EXISTS idx_admin_decision_memory_failure
  ON medmuse.admin_decision_memory (admin_id)
  WHERE outcome = 'failure';
