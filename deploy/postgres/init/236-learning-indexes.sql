-- ============================================================================
-- 健澜科技 jlmedaios - 学习引擎性能优化索引（Learning Engine Index Tuning）
--
-- 背景：M108 学习闭环上线后，四类学习表在高频读路径上的访问模式已稳定——
--   - medmuse.ai_feedback_log：按 agent_role 过滤 + created_at 倒序拉取近期样本；
--   - medmuse.patient_learning_profile：按 patient_id 单点读取画像快照；
--   - medmuse.dept_knowledge：按 dept_code + knowledge_type 两维等值过滤；
--   - medmuse.recommendation_strategy：按 target_role 过滤 + active 命中当前生效版本。
-- 本脚本为上述路径补充专用复合索引，避免全表扫描与排序溢出。
--
-- 幂等：全部 CREATE INDEX IF NOT EXISTS，可重复执行；不删表、不改既有数据。
-- 编号说明：避开 233 随访序列，落位 236（232-learning-metrics 之后）。
--
-- Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- ---------------------------------------------------------------------------
-- 1. 反馈日志：按 agent_role 分桶 + 创建时间倒序
--    读路径：WHERE agent_role = $1 ORDER BY created_at DESC LIMIT 500。
--    复合索引把「等值过滤 + 时间倒序」一并消化，无需额外排序。
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ai_feedback_role_created
  ON medmuse.ai_feedback_log (agent_role, created_at DESC);

-- ---------------------------------------------------------------------------
-- 2. 患者学习画像：按 patient_id 单点读取
--    说明：patient_id 本就是主键（pkey 自带唯一 btree），本索引为显式对齐
--    「按患者读取快照」的访问口径而建，与主键形成双路覆盖；未来若主键策略
--    调整（如改用 bigint），此索引可保证查询计划平滑迁移。
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_patient_learning_profile_patient
  ON medmuse.patient_learning_profile (patient_id);

-- ---------------------------------------------------------------------------
-- 3. 科室知识：按科室 + 知识类型两维等值过滤
--    说明：既有 idx_dept_knowledge_dept_type_rate 的左前缀同为
--    (dept_code, knowledge_type)，本索引将其前置列独立出来，
--    服务于「仅按两维过滤、按 id 返回」的轻量读路径，避免携带
--    success_rate / usage_count 排序列带来的额外索引宽度。
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_dept_knowledge_dept_type
  ON medmuse.dept_knowledge (dept_code, knowledge_type);

-- ---------------------------------------------------------------------------
-- 4. 推荐策略：按目标角色取当前生效版本
--    读路径：WHERE target_role = $1 AND active = true。
--    既有索引均以 strategy_name 为前导列，无法服务「按角色直查生效策略」；
--    本索引为该高频路径提供专用访问。
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_recommendation_strategy_role_active
  ON medmuse.recommendation_strategy (target_role, active);
