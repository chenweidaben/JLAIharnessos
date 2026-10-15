-- ============================================================================
-- 健澜科技 jlmedaios - M145-C 系统监控指标表（生产化收尾）
--
-- 监控要有告警，不能只看图表：API 响应时间(P50/P95/P99)、错误率、内存使用率、
-- CPU 使用率、数据库连接数、在线用户数统一收敛到 medmuse.system_metrics，
-- 供 admin 仪表盘展示趋势，并由 BFF 按阈值（P95>1s / 错误率>1% / 内存>90%）
-- 实时评估、超阈值自动产出告警。
--
-- 表结构：medmuse.system_metrics
--   id           bigserial    主键（指标流水号）
--   metric_type  text         指标类型：api_latency_p50 / api_latency_p95 /
--                              api_latency_p99 / error_rate / memory_usage /
--                              cpu_usage / db_connections / online_users
--   metric_value double       指标数值（延迟单位 ms；使用率单位 %；比率为 0..1）
--   tags         jsonb        维度标签（如 route / scope，不含患者 PII）
--   recorded_at  timestamptz  指标采样时间（趋势分桶基准）
--   created_at   timestamptz  落库时间（默认 now()）
--
-- 医疗安全红线（生产安全加固）：
--   - 仅落运维指标与聚合维度，严禁落患者标识 / 请求体 / 查询串；
--   - 仅 admin 角色可读；普通员工 / 患者侧一律不下发；
--   - 历史样本由应用层按 retention 清理（只增不改，避免 UPDATE 热点）。
--
-- 兼容：CREATE SCHEMA / TABLE IF NOT EXISTS，可重复执行。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- ---------------------------------------------------------------------------
-- 系统指标流水（采样驱动；索引按「类型 + 时间」建，趋势查询主力路径）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.system_metrics (
  id           bigserial PRIMARY KEY,
  metric_type  text         NOT NULL,
  metric_value double       NOT NULL,
  tags         jsonb        NOT NULL DEFAULT '{}'::jsonb,
  recorded_at  timestamptz  NOT NULL DEFAULT now(),
  created_at   timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_metrics_type_time
  ON medmuse.system_metrics (metric_type, recorded_at DESC);

-- 权限：仅 admin 可读监控指标与告警
INSERT INTO iam.permissions(code, name, module) VALUES
  ('system:metrics:view', '系统监控指标-查看', 'system')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('admin', 'system:metrics:view')
ON CONFLICT DO NOTHING;
