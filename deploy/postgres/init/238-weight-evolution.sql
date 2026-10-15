-- ============================================================================
-- 健澜科技 jlmedaios - 学习引擎自进化权重变更留痕表（Weight Evolution Log）
--
-- 用途：沉淀学习引擎「最近 7 天采纳率驱动权重自动调整」的每一次进化结果——
--       记录调整前后权重分布、反馈窗口天数、被采纳（升权）与被拒绝（降权）的
--       权重总偏移量，供运营审计、效果回溯与必要时的版本回滚。
--
-- 依据宪法第三章：权重策略变更会影响临床推荐排序结果，属可审计决策；
--               每一次自动/手动进化均落一行留痕，不覆盖、不删除历史。
--
-- 写入口径：由 POST /api/v1/learning/auto-evolve 触发后 INSERT；
--           只存权重分布（jsonb）与偏移量，不存患者直接标识符，符合最小必要原则。
--
-- 权限：medmuse:view（查看进化历史）。
-- 幂等：CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS，可重入。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- 权重自进化留痕表
CREATE TABLE IF NOT EXISTS medmuse.weight_evolution_log (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date             date        NOT NULL,
  strategy_name        text        NOT NULL,
  old_weights          jsonb       NOT NULL,
  new_weights          jsonb       NOT NULL,
  feedback_window_days int         NOT NULL DEFAULT 7,
  accepted_delta       numeric     NOT NULL,
  rejected_delta       numeric     NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- 按策略 + 运行日期回溯进化历史
CREATE INDEX IF NOT EXISTS idx_weight_evolution_log_strategy_run
  ON medmuse.weight_evolution_log(strategy_name, run_date DESC);
