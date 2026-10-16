-- ============================================================================
-- 健澜科技 jlmedaios - M164-D API 网关与第三方对接（系统集成深化）
--
-- 【数据中台与AI大脑】
--   API 网关是医院内部服务（HIS / EMR / LIS / RIS / 互联网医院）与外部
--   第三方系统（区域卫生平台、医联体、医保商保、BI 仓库、药企随访）之间的
--   唯一统一入口。网关不做单点：路由表、外部系统台账、熔断器状态与请求日志
--   全部持久化到 Postgres，多实例无状态水平扩展后共享同一份配置与状态。
--
--   统一能力：
--     1. 统一入口：所有外联请求收敛到 /api/v1/gateway/*，按 route_path + method 路由；
--     2. 认证鉴权：三种凭证并存 —— API Key（机器对机器）/ JWT（院内用户）/
--        SSO（医联体单点登录）；路由表声明本路由要求的认证模式；
--     3. 限流熔断：每条路由独立 QPS 上限；连续异常触发熔断器（closed/open/half_open）；
--     4. 日志监控：请求流水记录响应时间、状态码、错误率，供看板聚合。
--
-- 生产高可用红线：
--   - 网关自身无状态：实例宕机不丢路由，配置从本表加载，重启即恢复；
--   - 熔断器状态持久化：open 态由 opened_at 计算恢复时间，多实例同时收敛；
--   - 凭证（api_key 明文 / client_secret）不落本表明文，仅存引用标识；
--   - 仅 admin 角色可写路由与外部系统台账。
--
-- 兼容：CREATE SCHEMA / TABLE IF NOT EXISTS，可重复执行。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- ---------------------------------------------------------------------------
-- medmuse.api_routes：路由表（网关统一入口的核心配置）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.api_routes (
  id             bigserial PRIMARY KEY,
  route_path     text        NOT NULL,                 -- 入口路径，如 /lab/results
  method         text        NOT NULL DEFAULT 'GET',  -- HTTP 方法
  target_system  text        NOT NULL,                 -- 目标外部系统（关联 api_gateway_systems.system_name）
  target_endpoint text       NOT NULL,                 -- 目标系统内路径，如 /open/lab/v1/results
  auth_mode      text        NOT NULL DEFAULT 'api_key', -- api_key / jwt / sso
  qps_limit      int         NOT NULL DEFAULT 50,     -- 每秒请求上限（限流）
  timeout_ms     int         NOT NULL DEFAULT 5000,    -- 下游超时
  description    text        NOT NULL DEFAULT '',
  status         text        NOT NULL DEFAULT 'active',-- active / disabled（手工熔断下线）
  -- 熔断器运行态（由网关进程回写；多实例共享）
  circuit_state  text        NOT NULL DEFAULT 'closed', -- closed / open / half_open
  failure_count  int         NOT NULL DEFAULT 0,       -- 连续失败计数
  success_count  int         NOT NULL DEFAULT 0,       -- 连续成功计数（half_open 探测）
  opened_at      timestamptz,                          -- 熔断打开时刻（计算半开恢复）
  -- 监控指标
  total_requests bigint     NOT NULL DEFAULT 0,
  total_errors   bigint      NOT NULL DEFAULT 0,
  avg_response_ms numeric    NOT NULL DEFAULT 0,
  created_by     text        NOT NULL DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT api_routes_method_chk
    CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
  CONSTRAINT api_routes_auth_chk
    CHECK (auth_mode IN ('api_key', 'jwt', 'sso')),
  CONSTRAINT api_routes_status_chk
    CHECK (status IN ('active', 'disabled')),
  CONSTRAINT api_routes_circuit_chk
    CHECK (circuit_state IN ('closed', 'open', 'half_open')),
  -- 同一入口路径 + 方法只能登记一条路由（网关按 (path, method) 唯一定位）
  CONSTRAINT api_routes_path_method_uniq UNIQUE (route_path, method)
);

-- 按入口路径 + 方法收敛路由查找（网关热路径）
CREATE INDEX IF NOT EXISTS idx_api_routes_lookup
  ON medmuse.api_routes (route_path, method);

-- 按状态收敛：仅 active 路由参与转发
CREATE INDEX IF NOT EXISTS idx_api_routes_status
  ON medmuse.api_routes (status, circuit_state);

-- ---------------------------------------------------------------------------
-- medmuse.api_gateway_systems：外部系统台账（第三方对接登记）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.api_gateway_systems (
  id             bigserial PRIMARY KEY,
  system_name    text        NOT NULL,                 -- 系统名（唯一，路由表引用）
  endpoint       text        NOT NULL,                 -- 根地址，如 https://region.hospital.cn/open
  auth_mode      text        NOT NULL DEFAULT 'api_key',
  -- 凭证引用标识（不落明文 secret；由密钥管理系统按此标识取回）
  credential_ref text        NOT NULL DEFAULT '',
  qps_limit      int         NOT NULL DEFAULT 50,
  timeout_ms     int         NOT NULL DEFAULT 5000,
  status         text        NOT NULL DEFAULT 'active',-- active / disabled
  description    text        NOT NULL DEFAULT '',      -- 医院/厂商/用途
  created_by     text        NOT NULL DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT api_gateway_systems_name_uniq UNIQUE (system_name),
  CONSTRAINT api_gateway_systems_auth_chk
    CHECK (auth_mode IN ('api_key', 'jwt', 'sso')),
  CONSTRAINT api_gateway_systems_status_chk
    CHECK (status IN ('active', 'disabled')),
  -- 外部地址仅允许 https（localhost 开发例外），防 SSRF 内网穿透
  CONSTRAINT api_gateway_systems_endpoint_chk
    CHECK (
      endpoint ~* '^https://'
      OR endpoint ~* '^http://(localhost|127\.0\.0\.1)(:\d+)?/'
    )
);

-- ---------------------------------------------------------------------------
-- medmuse.api_gateway_request_logs：请求流水（日志监控 / 错误率看板）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.api_gateway_request_logs (
  id             bigserial PRIMARY KEY,
  route_id       bigint       REFERENCES medmuse.api_routes(id) ON DELETE SET NULL,
  trace_id       text         NOT NULL DEFAULT '',     -- 全链路追踪号
  client_ip      text         NOT NULL DEFAULT '',
  auth_mode      text         NOT NULL DEFAULT '',
  auth_ok        boolean      NOT NULL DEFAULT false,
  decision       text         NOT NULL DEFAULT '',     -- routed / unauthorized / not_found / rate_limited / circuit_open
  status_code    int          NOT NULL DEFAULT 0,
  response_ms    int          NOT NULL DEFAULT 0,      -- 响应时间
  error_message  text         NOT NULL DEFAULT '',
  created_at     timestamptz  NOT NULL DEFAULT now()
);

-- 按路由收敛最近请求：错误率 / 响应时间看板
CREATE INDEX IF NOT EXISTS idx_api_gateway_logs_route_time
  ON medmuse.api_gateway_request_logs (route_id, created_at DESC);

-- 按决策类型收敛：限流 / 熔断 / 未授权告警
CREATE INDEX IF NOT EXISTS idx_api_gateway_logs_decision
  ON medmuse.api_gateway_request_logs (decision, created_at DESC);

-- ---------------------------------------------------------------------------
-- medmuse.api_gateway_webhooks：网关事件外发配置（与 M129-D webhook 体系对齐）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.api_gateway_webhooks (
  id             bigserial PRIMARY KEY,
  event          text         NOT NULL,                -- 触发事件，如 route.error / circuit.opened
  callback_url   text         NOT NULL,
  secret         text         NOT NULL,                -- HMAC-SHA256 签名密钥
  enabled        boolean      NOT NULL DEFAULT true,
  created_by     text         NOT NULL DEFAULT '',
  created_at     timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT api_gateway_webhooks_url_chk
    CHECK (
      callback_url ~* '^https://'
      OR callback_url ~* '^http://(localhost|127\.0\.0\.1)(:\d+)?/'
    )
);
