-- ============================================================================
-- 健澜科技 jlmedaios · M116-A 护士 MUSE 专属功能数据模型
--
-- 依据宪法第七章 7.6（护士 Personal Agent：护理经验沉淀与风险识别闭环）：
--   为每一位护士沉淀「个人护理经验记忆」——每一次护理操作（care_type）所在科室、
--   风险等级（risk_level）、干预措施（intervention）与结局（outcome），
--   使 MUSE 越用越懂这位护士：风险识别统计、交班经验提取、护理技巧标签云。
--
-- 表结构：
--   medmuse.nurse_care_memory  护理经验记忆流水：一行 = 一次护理操作记录，
--                              nurse_id 关联护士本人，patient_dept 为科室
--                              （脱敏到科室级，不落患者直接标识符）。
--
-- 医疗安全红线：
--   - 本表只存「护士本人」的操作复盘，Agent 绝不跨护士读取他人记忆；
--   - patient_dept 仅记录科室名称，严禁落患者姓名 / 床号 / 身份证号；
--   - outcome 仅用于个人学习闭环（交班经验提取），不用于绩效处罚。
--
-- 幂等：CREATE SCHEMA / TABLE / INDEX IF NOT EXISTS，可重入。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- ---------------------------------------------------------------------------
-- 护理经验记忆流水（一行 = 一次护理操作；outcome 三态：success/failure/mixed）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.nurse_care_memory (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nurse_id     text NOT NULL,
  patient_dept text,
  care_type    text NOT NULL,
  risk_level   text,
  intervention text,
  outcome      text CHECK (outcome IN ('success', 'failure', 'mixed')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 按护士拉取其护理经验记忆（新→旧），护士 MUSE 主页主查询路径
CREATE INDEX IF NOT EXISTS idx_nurse_care_memory_nurse
  ON medmuse.nurse_care_memory (nurse_id, created_at DESC);

-- 风险事件专项索引：风险识别统计场景高频扫描该护士带风险等级的记录
CREATE INDEX IF NOT EXISTS idx_nurse_care_memory_risk
  ON medmuse.nurse_care_memory (nurse_id)
  WHERE risk_level IS NOT NULL;
