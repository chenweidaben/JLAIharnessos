-- ============================================================================
-- 健澜科技 jlmedaios · M116-B 药师 MUSE 个人审方经验沉淀
--
-- 依据宪法第七章 7.6（药师 Personal Agent）：
--   为每一位药师沉淀独立的审方经验记忆——每次前置审方拦截/干预都记录在案：
--   命中了哪个问题药物组合（drug_pair）、属于哪类问题（issue_type）、
--   药师提出了什么干预建议（intervention）、结局如何（outcome）。
--   buildPharmaMuse 据此聚合出拦截统计 / 采纳率 / 高频问题药物组合 Top10
--   与个人审方准确率学习曲线，形成「越审越准」的药师个人成长闭环。
--
-- 医疗安全红线（依据宪法第七章 7.6）：
--  - 本表只存「药师本人」的审方经验沉淀，Agent 绝不跨药师读取他人记忆；
--  - drug_pair / intervention 为脱敏后的药品与建议摘要，不落患者直接标识符；
--  - 本表为统计学习用途，不用于绩效处罚；最终放行/拦截由药师本人签名执行。
--
-- 权限码：medmuse:view（已由 230-pharmacy-audit-learning.sql 种子写入，此处幂等复用）。
--
-- 幂等：CREATE SCHEMA / TABLE / INDEX IF NOT EXISTS，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- 审方经验记忆归属 medmuse schema（首次部署兜底建 schema）
CREATE SCHEMA IF NOT EXISTS medmuse;

-- ---------------------------------------------------------------------------
-- 药师个人审方经验记忆表：一行 = 一次审方拦截/干预事件
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.pharma_audit_memory (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid,
  pharmacist_id text NOT NULL,
  drug_pair     text NOT NULL,
  issue_type    text NOT NULL DEFAULT '',
  intervention  text NOT NULL DEFAULT '',
  outcome       text NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 按药师拉取其审方经验记忆（新→旧），个人经验召回主查询路径
CREATE INDEX IF NOT EXISTS idx_pharma_audit_memory_pharmacist
  ON medmuse.pharma_audit_memory (pharmacist_id, created_at DESC);
