-- ============================================================================
-- 健澜科技 jlmedaios - Mxxx 智能推荐进化调度（Recommendation Evolution）
--
-- 在 M108（medmuse.ai_feedback_log，医生采纳/修改/拒绝信号回流）之上，
-- 把「按建议类型统计的反馈」升级为「可版本化的推荐策略」：
--   - 每条记录是某条策略（strategy_name）的一个版本（version），
--     weights_json 保存该版本对各建议类型（diagnosis/drug/pathway/...）的权重分布；
--   - 每次进化（evolveWeights）生成 version+1 的新行，旧版本保留不删，
--     作为回滚（rollback）候选；active 标记当前生效版本；
--   - 同一 strategy_name 任意时刻只允许一个 active 版本（部分唯一索引兜底）。
--
-- 医疗安全：策略只影响推荐排序/版面权重，不直接产生诊疗行为；
--           权重调整结果须经运营确认（active 切换）后方可生效。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- 推荐策略版本表：一条 = 某策略的一个权重快照版本
CREATE TABLE IF NOT EXISTS medmuse.recommendation_strategy (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_name text NOT NULL,
  target_role   text,
  weights_json  jsonb NOT NULL DEFAULT '{}'::jsonb,
  version       int  NOT NULL DEFAULT 1,
  active        boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 按策略名拉取版本历史（回滚列表）的常用索引
CREATE INDEX IF NOT EXISTS idx_recommendation_strategy_name
  ON medmuse.recommendation_strategy(strategy_name, version DESC);

-- 在线查询当前生效策略（部分索引，仅扫 active 行）
CREATE INDEX IF NOT EXISTS idx_recommendation_strategy_active
  ON medmuse.recommendation_strategy(strategy_name) WHERE active;

-- 同一策略名只允许一个激活版本：切换 active 即「发布/回滚」，杜绝双激活
CREATE UNIQUE INDEX IF NOT EXISTS uq_recommendation_strategy_one_active
  ON medmuse.recommendation_strategy(strategy_name) WHERE active;
