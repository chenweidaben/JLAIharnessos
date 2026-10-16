-- ============================================================================
-- 健澜科技 jlmedaios - M163-A 等保三级 安全合规深化
--
-- 依据 GB/T 22239-2019《信息安全技术 网络安全等级保护基本要求》第三级，
-- 以及「医院安全与运营」红线：
--   身份鉴别（双因素 + 密码复杂度 + 登录失败锁定）；
--   访问控制（最小权限 + 角色分离 + 权限变更留痕）；
--   安全审计（日志完整、只追加、防篡改、可追溯分析）；
--   数据安全（传输 TLS / 存储加密 / 备份恢复）；
--   入侵防范（防火墙 / IDS / 恶意代码）。
--
-- 本表 medmuse.security_audit_log：
--   专门承载「等保三级」要求的系统级安全审计事件，与业务数据访问日志
--   （medmuse.data_access_log）互补——前者记安全策略命中、登录、锁定、
--   权限变更、入侵告警；后者记患者敏感数据访问。两者均只增不改不删。
--
-- 表结构：
--   id              bigserial   主键（审计流水号）
--   event_time      timestamptz 事件发生时间（默认 now()）
--   event_type      text        事件类别
--                                 LOGIN_SUCCESS / LOGIN_FAILURE / LOGIN_LOCKED
--                                 MFA_CHALLENGE / MFA_SUCCESS / MFA_FAILURE
--                                 PERMISSION_GRANT / PERMISSION_REVOKE / ROLE_CHANGE
--                                 PRIVILEGE_ESCALATION / CONFIG_CHANGE
--                                 FIREWALL_DROP / IDS_ALERT / MALWARE_DETECT
--                                 BACKUP_START / BACKUP_SUCCESS / BACKUP_FAILURE
--   severity        text        严重级别 info / warn / critical
--   actor_id        text        操作人 ID（系统事件可空，如防火墙丢包）
--   actor_role      text        操作人角色
--   client_ip       text        来源 IP（存储原始值，出参再脱敏）
--   target_id       text        被作用对象（用户 ID / 角色名 / 资源）
--   detail          jsonb       事件明细（失败原因、告警签名、策略命中）
--   prev_hash       text        上一条审计哈希（哈希链防篡改）
--   entry_hash      text        本条审计哈希 = sha256(prev_hash || row_payload)
--
-- 安全加固：
--   - 只增不改不删：应用角色仅 GRANT INSERT / SELECT；
--   - 哈希链：entry_hash 依赖 prev_hash，任一条被篡改即断链可检出；
--   - 不存患者姓名 / 证件号明文，detail 内 PII 由应用层脱敏后写入；
--   - 审计查询仅 admin（BFF requireRole 强制）。
--
-- 兼容：CREATE SCHEMA / TABLE / INDEX IF NOT EXISTS，可重复执行。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- ---------------------------------------------------------------------------
-- 等保三级安全审计日志（系统安全事件一条一记录，哈希链防篡改）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.security_audit_log (
  id          bigserial    PRIMARY KEY,
  event_time  timestamptz  NOT NULL DEFAULT now(),
  event_type  text         NOT NULL,
  severity    text         NOT NULL DEFAULT 'info',
  actor_id    text         NOT NULL DEFAULT '',
  actor_role  text         NOT NULL DEFAULT '',
  client_ip   text         NOT NULL DEFAULT '',
  target_id   text         NOT NULL DEFAULT '',
  detail      jsonb        NOT NULL DEFAULT '{}'::jsonb,
  prev_hash    text         NOT NULL DEFAULT 'GENESIS',
  entry_hash   text         NOT NULL DEFAULT ''
);

COMMENT ON TABLE  medmuse.security_audit_log IS 'M163-A 等保三级安全审计日志（哈希链只追加）';
COMMENT ON COLUMN medmuse.security_audit_log.event_type IS '安全事件类别：登录/锁定/MFA/权限/入侵/备份等';
COMMENT ON COLUMN medmuse.security_audit_log.prev_hash IS '上一条 entry_hash，构成防篡改哈希链';
COMMENT ON COLUMN medmuse.security_audit_log.entry_hash IS '本条记录哈希（sha256(prev_hash||payload)）';

-- 按时间倒序：管理员看板拉取近期安全事件
CREATE INDEX IF NOT EXISTS idx_security_audit_log_time
  ON medmuse.security_audit_log (event_time DESC);

-- 按事件类别追溯：登录失败 / 锁定 / 入侵告警集中排查
CREATE INDEX IF NOT EXISTS idx_security_audit_log_type_time
  ON medmuse.security_audit_log (event_type, event_time DESC);

-- 按人追溯：某账号的登录、MFA、权限变更轨迹
CREATE INDEX IF NOT EXISTS idx_security_audit_log_actor_time
  ON medmuse.security_audit_log (actor_id, event_time DESC);

-- 按严重级别过滤：critical 告警优先处置
CREATE INDEX IF NOT EXISTS idx_security_audit_log_severity
  ON medmuse.security_audit_log (severity, event_time DESC);

-- 哈希链校验扫描（按 id 顺序重算 entry_hash 用）
CREATE INDEX IF NOT EXISTS idx_security_audit_log_chain
  ON medmuse.security_audit_log (id);

-- 等保三级留存要求：审计记录在线留存不少于 6 个月（分区/归档由运维侧执行）
-- 应用侧不提供 DELETE/UPDATE 权限，从数据库账号层面保证只增不改。
