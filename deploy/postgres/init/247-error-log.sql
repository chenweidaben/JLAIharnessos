-- ============================================================================
-- 健澜科技 jlmedaios - M123-C 系统错误日志（生产安全加固）
--
-- 依据宪法第四十五条（国家发展医疗卫生事业，保护人民健康）：
-- 医疗信息系统的稳定运行本身即患者安全的一部分。未捕获异常、路由报错、
-- 依赖故障必须可追溯、可聚合、可闭环解决，避免静默失败演变为临床事故。
--
-- 表结构：
--   medmuse.system_error_log
--     id          bigserial   主键（错误流水号）
--     error_type  text        错误类别（如 DB_DOWN / TIMEOUT / VALIDATION / UNHANDLED）
--     message     text        错误摘要（人读，长度截断，不落敏感业务参数）
--     stack_trace text        堆栈快照（可空；生产环境脱敏后落库）
--     route       text        触发路由（如 /api/v1/xxx，便于定位故障面）
--     staff_id    text        触发时登录员工工号（可空；未登录/匿名请求为空串）
--     created_at  timestamptz 首次发生时间（默认 now()，用于今日计数与趋势）
--     resolved    boolean     是否已闭环解决（默认 false；管理员置位后进入 resolved 视图）
--
-- 医疗安全红线（生产安全加固）：
--   - 本表仅落错误元信息与堆栈摘要，严禁落患者姓名 / 身份证号 / 病案号 /
--     请求体明文；落库前由 BFF 做长度截断与敏感字段剥离；
--   - 仅 admin 角色可读本表聚合与明细；普通员工 / 患者侧一律不下发；
--   - stack_trace 可能含路径 / 内部主机名，仅管理员可见，不外抛前端日志。
--
-- 兼容：CREATE SCHEMA / TABLE IF NOT EXISTS，可重复执行。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- ---------------------------------------------------------------------------
-- 系统错误日志（运行时未捕获异常 / 依赖故障的统一落地点）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.system_error_log (
  id           bigserial PRIMARY KEY,
  error_type   text        NOT NULL,
  message      text        NOT NULL DEFAULT '',
  stack_trace  text        NOT NULL DEFAULT '',
  route        text        NOT NULL DEFAULT '',
  staff_id     text        NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  resolved     boolean     NOT NULL DEFAULT false
);

-- 今日计数 / 趋势：按时间倒序拉近期窗口
CREATE INDEX IF NOT EXISTS idx_system_error_log_created
  ON medmuse.system_error_log (created_at DESC);

-- 按错误类型聚合 topTypes：先按类型分组，配合时间窗口
CREATE INDEX IF NOT EXISTS idx_system_error_log_type_created
  ON medmuse.system_error_log (error_type, created_at DESC);

-- 未解决工单视图：管理员看板默认只看待闭环
CREATE INDEX IF NOT EXISTS idx_system_error_log_unresolved
  ON medmuse.system_error_log (resolved, created_at DESC);
