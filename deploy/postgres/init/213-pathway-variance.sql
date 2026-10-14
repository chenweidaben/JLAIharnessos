-- ============================================================================
-- 健澜科技 jlmedaios - 临床路径变异管理（213）
-- 213-pathway-variance.sql
--
-- 就诊级变异登记表（轻量，区别于 pathway_variations 的入径级变异分类）：
-- 按就诊登记变异原因与变异类型，供变异率统计与变异原因列表查询。
-- 权限码复用既有 pathway:read（查看）/ pathway:manage（登记），不新增权限码。
-- Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.pathway_variance (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pathway_id    uuid,                            -- 关联路径定义（可空：未入径路径的就诊级变异）
  visit_id      uuid NOT NULL,                   -- 就诊 id
  reason        text NOT NULL,                   -- 变异原因
  variance_type text NOT NULL,                   -- 变异类型：positive / negative / neutral
  recorded_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pathway_variance_visit ON clinical.pathway_variance (visit_id);
CREATE INDEX IF NOT EXISTS idx_pathway_variance_pathway ON clinical.pathway_variance (pathway_id) WHERE pathway_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pathway_variance_recorded_at ON clinical.pathway_variance (recorded_at);
