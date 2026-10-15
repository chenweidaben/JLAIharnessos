-- ============================================================================
-- 健澜科技 jlmedaios · M114-A Doctor MUSE / 全角色 Personal Agent 数据模型
--
-- 依据宪法第七章（全角色 Personal Agent：医生 / 护士 / 药师 / 行政人员）：
--   为每一位医护技管员工沉淀独立的 MUSE 个人画像——专业方向（specialty）、
--   经验标签（experience_tags）、决策记忆（staff_decision_memory）与
--   滚动统计（staff_muse_stats），使 Agent 越用越懂「这位员工」。
--
-- 表结构：
--   medmuse.staff_muse_profile       员工画像主键：staff_id → role / specialty /
--                                    experience_tags[]，一行一员工
--   medmuse.staff_decision_memory    决策记忆流水：每条决策的上下文（jsonb）、
--                                    决策内容、结局（success/failure/mixed）与
--                                    事后复盘 lesson，供个人经验库召回
--   medmuse.staff_muse_stats         滚动统计：total/success/failure 计数与
--                                    accuracy_rate（成功率），与画像 1:1
--
-- 医疗安全红线：
--   - 本表只存「员工本人」的聚合画像与决策复盘，Agent 绝不跨员工读取他人画像；
--   - context jsonb 内严禁落患者姓名 / 身份证号等直接标识符（脱敏后入库存）；
--   - outcome 仅用于个人学习闭环，不用于绩效处罚。
--
-- 幂等：CREATE SCHEMA / TABLE / INDEX IF NOT EXISTS，可重入。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- ---------------------------------------------------------------------------
-- 员工画像（一行一员工；role 限定四类岗位）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.staff_muse_profile (
  staff_id       text PRIMARY KEY,
  role           text NOT NULL CHECK (role IN ('doctor', 'nurse', 'pharma', 'admin')),
  specialty      text,
  experience_tags text[] DEFAULT ARRAY[]::text[],
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 决策记忆流水（每条决策一行；outcome 三态：成功 / 失败 / 混合）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.staff_decision_memory (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id    text NOT NULL,
  role        text NOT NULL CHECK (role IN ('doctor', 'nurse', 'pharma', 'admin')),
  context     jsonb NOT NULL DEFAULT '{}'::jsonb,
  decision    text NOT NULL,
  outcome     text NOT NULL CHECK (outcome IN ('success', 'failure', 'mixed')),
  lesson      text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 按员工拉取其决策记忆（新→旧），个人经验召回主查询路径
CREATE INDEX IF NOT EXISTS idx_staff_decision_memory_staff
  ON medmuse.staff_decision_memory (staff_id, created_at DESC);

-- 失败经验专项索引：复盘 / 错题本场景高频扫描该员工的 failure 记录
CREATE INDEX IF NOT EXISTS idx_staff_decision_memory_failure
  ON medmuse.staff_decision_memory (staff_id)
  WHERE outcome = 'failure';

-- ---------------------------------------------------------------------------
-- 滚动统计（与 staff_muse_profile 1:1；accuracy_rate = success_count/total_decisions）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.staff_muse_stats (
  staff_id        text PRIMARY KEY,
  total_decisions int NOT NULL DEFAULT 0,
  success_count   int NOT NULL DEFAULT 0,
  failure_count   int NOT NULL DEFAULT 0,
  accuracy_rate   numeric NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now()
);
