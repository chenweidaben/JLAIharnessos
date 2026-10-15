-- ============================================================================
-- 健澜科技 jlmedaios - M129-D 系统事件 Webhook 外发订阅（系统集成）
--
-- 【系统集成】
--   医院 HIS / EMR / LIS / RIS 与第三方系统（区域卫生平台、医联体数据中台、
--   药企随访、BI 仓库）之间，需要一种"事件发生即推"的轻量通道。
--   本表登记对外订阅方（webhook endpoint），由 BFF 在业务事件发生时按订阅
--   清单签名外发，替代点对点的库表直连，满足医院信息外联的可审计要求。
--
-- 依据宪法第四十五条（国家发展医疗卫生事业，保护人民健康）：
--   医疗信息对外流转必须可登记、可签名、可追溯、可熔断。
--
-- 事件白名单（与 medmuse.webhook_aggregator 对齐）：
--   patient.created        患者建档完成
--   prescription.created   处方开立完成
--   critical_result        危急值产生
--   error.alert            系统错误告警
--
-- 表结构：
--   medmuse.webhooks
--     id           bigserial     主键
--     url          text          外发地址（仅允许 https；localhost 开发例外）
--     events       text[]        订阅事件白名单子集
--     secret       text          HMAC-SHA256 签名密钥（落库仅 admin 可见）
--     status       text          active / disabled（熔断停用）
--     description  text          订阅方说明（医院/厂商/用途）
--     success_count int           累计成功次数（看板展示）
--     failure_count int           累计失败次数（看板展示）
--     next_retry_at timestamptz   熔断后下一次重试时间（指数退避）
--     created_by   text          登记人工号
--     created_at   timestamptz
--     updated_at   timestamptz
--
--   medmuse.webhook_deliveries
--     id           bigserial     主键
--     webhook_id   bigint        外发目标
--     event        text          事件类型
--     payload      jsonb         外发报文快照（脱敏后）
--     signature    text          HMAC-SHA256 签名头（sha256=hex）
--     attempt      int           第几次尝试（从 1 开始）
--     success      boolean       是否成功
--     status_code  int           对端 HTTP 状态码
--     error        text          失败原因
--     delivered_at timestamptz   本次尝试时间
--
-- 医疗安全红线：
--   - 仅 admin 角色可登记 / 停用 webhook；普通角色一律不可见；
--   - url 强制 https（开发环境 localhost 例外），禁止 file:// / gopher:// 等；
--   - secret 仅在创建时一次性返回给管理员，列表接口脱敏展示；
--   - 外发 payload 在 BFF 层做患者敏感字段脱敏，本表不存原文。
--
-- 兼容：CREATE SCHEMA / TABLE IF NOT EXISTS，可重复执行。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- ---------------------------------------------------------------------------
-- 外发订阅登记表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.webhooks (
  id            bigserial PRIMARY KEY,
  url           text        NOT NULL,
  events        text[]      NOT NULL DEFAULT '{}',
  secret        text        NOT NULL,
  status        text        NOT NULL DEFAULT 'active',
  description   text        NOT NULL DEFAULT '',
  success_count int         NOT NULL DEFAULT 0,
  failure_count int         NOT NULL DEFAULT 0,
  next_retry_at timestamptz,
  created_by    text        NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT webhooks_url_scheme_chk
    CHECK (
      url ~* '^https://'
      OR url ~* '^http://(localhost|127\.0\.0\.1)(:\d+)?/'
    ),
  CONSTRAINT webhooks_status_chk
    CHECK (status IN ('active', 'disabled'))
);

-- 按状态收敛看板：仅 active 的 webhook 参与外发
CREATE INDEX IF NOT EXISTS idx_webhooks_status
  ON medmuse.webhooks (status, id);

-- ---------------------------------------------------------------------------
-- 外发投递流水（审计 / 重试追踪）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.webhook_deliveries (
  id          bigserial PRIMARY KEY,
  webhook_id  bigint        NOT NULL REFERENCES medmuse.webhooks(id) ON DELETE CASCADE,
  event       text          NOT NULL,
  payload     jsonb         NOT NULL DEFAULT '{}'::jsonb,
  signature   text          NOT NULL DEFAULT '',
  attempt     int           NOT NULL DEFAULT 1,
  success     boolean       NOT NULL DEFAULT false,
  status_code int,
  error       text          NOT NULL DEFAULT '',
  delivered_at timestamptz  NOT NULL DEFAULT now()
);

-- 按 webhook 收敛最近投递：失败看板 / 重试队列
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook
  ON medmuse.webhook_deliveries (webhook_id, delivered_at DESC);

-- 按事件类型收敛审计：合规抽查
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event
  ON medmuse.webhook_deliveries (event, delivered_at DESC);
