-- ============================================================================
-- 健澜科技 jlmedaios - M146-D 推荐策略自学习权重留痕表（越用越聪明深化）
--
-- 用途：沉淀推荐策略「采纳率驱动权重自动调优」的每一次决策结果——
--       高采纳率权重提升 / 低采纳率权重下降 / 新场景积累样本后自动上线，
--       并把每次调整前后的权重分布、整体采纳率、本次调整幅度、上线状态
--       落库留痕，供 admin 自学习监控页回溯与审计。
--
-- 自学习可控红线（生产安全加固）：
--   - 单次权重调整幅度严格限制在 ±20%（应用层 clamp，本表留痕 adjustment_ratio）；
--   - 权重上下限 [0.1, 3.0]，防止权重发散或塌陷；
--   - 样本不足的新场景标记 status='held'，不直接上线，等积累够样本再自动放开；
--   - 只存权重分布（jsonb）与聚合反馈计数，不存患者直接标识符，最小必要原则。
--
-- 写入口径：由 POST /api/v1/admin/self-learning/optimize 触发后 INSERT；
--           只增不改，历史留痕不覆盖、不删除，便于必要时回滚。
--
-- 权限：self-learning:view（仅 admin 可读自学习日志）。
-- 幂等：CREATE SCHEMA / TABLE / INDEX IF NOT EXISTS，可重入。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- ---------------------------------------------------------------------------
-- 策略权重自学习留痕表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.strategy_weight_log (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date           date        NOT NULL,
  strategy_id        text        NOT NULL,
  old_weights        jsonb       NOT NULL,
  new_weights        jsonb       NOT NULL,
  adopted_count      int         NOT NULL DEFAULT 0,
  rejected_count     int         NOT NULL DEFAULT 0,
  adopted_rate       double      NOT NULL DEFAULT 0,
  adjustment_ratio   double      NOT NULL DEFAULT 0,
  accepted_delta     numeric     NOT NULL DEFAULT 0,
  rejected_delta     numeric     NOT NULL DEFAULT 0,
  -- applied = 本次权重已生效；held = 样本不足 / 调整被 hold，未上线
  status             text        NOT NULL DEFAULT 'applied',
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- 按策略 + 运行日期回溯自学习历史（监控页主力查询路径）
CREATE INDEX IF NOT EXISTS idx_strategy_weight_log_strategy_run
  ON medmuse.strategy_weight_log(strategy_id, run_date DESC);

-- 按时间倒序拉取全量自学习流水（admin 日志列表）
CREATE INDEX IF NOT EXISTS idx_strategy_weight_log_created
  ON medmuse.strategy_weight_log(created_at DESC);

-- 权限：仅 admin 可读自学习监控与日志
INSERT INTO iam.permissions(code, name, module) VALUES
  ('self-learning:view', '自学习监控-查看', 'system')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('admin', 'self-learning:view')
ON CONFLICT DO NOTHING;
