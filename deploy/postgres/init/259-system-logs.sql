-- ============================================================================
-- 健澜科技 jlmedaios - M132-C 系统日志表（产品化收尾）
--
-- 依据宪法第四十五条（国家发展医疗卫生事业，保护人民健康）：
-- 医疗信息系统的每一次运行事件都必须结构化留痕——登录、配置变更、定时任务、
-- 外部依赖调用、人工干预等，统一收敛到 system_log，便于管理员检索、排障与审计。
--
-- 表结构：medmuse.system_log
--   id          bigserial   主键（日志流水号）
--   level       text        日志级别：debug / info / warn / error
--   module      text        模块名（如 auth / scheduler / billing / gateway / admin）
--   message     text        人读摘要（长度截断，不落患者姓名 / 身份证号等敏感明文）
--   metadata    jsonb       结构化上下文（员工工号、路由、耗时、业务单号等）
--   staff_id    text        触发日志的员工工号（系统自动事件为空串）
--   created_at  timestamptz 日志时间（默认 now()，倒序检索）
--
-- 医疗安全红线（生产安全加固）：
--   - 仅落运维元信息与结构化上下文，严禁落患者敏感身份字段；落库前由 BFF 做长度截断；
--   - 仅 admin 角色可读；普通员工 / 患者侧一律不下发；
--   - metadata 为 jsonb，便于按 key 检索（如 metadata->>'orderId'）。
--
-- 兼容：CREATE SCHEMA / TABLE IF NOT EXISTS，可重复执行。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- ---------------------------------------------------------------------------
-- 系统日志（运行事件统一落地点；只增不改，应用层不自造主键）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.system_log (
  id          bigserial PRIMARY KEY,
  level       text        NOT NULL,
  module      text        NOT NULL DEFAULT '',
  message     text        NOT NULL DEFAULT '',
  metadata    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  staff_id    text        NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 约束：level 仅允许 debug / info / warn / error 四档（产品化收尾）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_system_log_level'
  ) THEN
    ALTER TABLE medmuse.system_log
      ADD CONSTRAINT chk_system_log_level
      CHECK (level IN ('debug', 'info', 'warn', 'error'));
  END IF;
END $$;

-- 近期窗口：按时间倒序拉最近 N 条
CREATE INDEX IF NOT EXISTS idx_system_log_created
  ON medmuse.system_log (created_at DESC);

-- 按级别 + 时间：管理员看板默认过滤 error / warn
CREATE INDEX IF NOT EXISTS idx_system_log_level_created
  ON medmuse.system_log (level, created_at DESC);

-- 按模块 + 时间：按业务面收敛排障
CREATE INDEX IF NOT EXISTS idx_system_log_module_created
  ON medmuse.system_log (module, created_at DESC);
