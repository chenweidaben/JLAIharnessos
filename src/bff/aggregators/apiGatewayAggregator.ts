/**
 * 健澜科技 jlmedaios - M164-D API 网关聚合器（系统集成深化 · 数据中台与AI大脑）
 *
 * 【数据中台与AI大脑】
 *  本模块是医院对外统一入口的纯函数层：不直连数据库、不发起网络请求，
 *  所有"路由决策 / 认证鉴权 / 限流熔断 / 日志采样"都收敛为可单测、可复算的纯函数，
 *  由 BFF 路由层注入持久化配置与运行态，多实例水平扩展时共享同一份决策语义。
 *
 *  对外能力：
 *   - buildAPIGateway()：构造一份初始网关状态（空路由 / 空外部系统 / 闭合熔断器 / 零指标）；
 *   - registerExternalSystem(name, endpoint, authConfig)：登记一个第三方对接系统，
 *       校验 endpoint 协议（仅 https，localhost 开发例外）、认证模式白名单、QPS/超时约束；
 *   - routeRequest(path, method, params)：一次请求的完整决策流水线 ——
 *       路由匹配 → 认证鉴权(API Key/JWT/SSO) → QPS 限流 → 熔断器判定 → 输出目标与追踪号；
 *   - buildWebhookConfig(event, callbackUrl, secret)：构造一条网关事件外发配置，
 *       固定签名头 x-jlan-signature（HMAC-SHA256），校验 url 协议与 secret 强度。
 *
 *  生产高可用设计（网关不能成单点）：
 *   - 纯函数无内存态：熔断器计数/恢复时间由调用方从 Postgres 读入、回写，
 *     任一实例宕机，其余实例从共享状态继续服务，不丢路由不丢熔断；
 *   - 时间与随机源均可注入（now / traceIdSeed），保证断言确定性；
 *   - 不 mutate 入参：所有返回值为全新不可变结构；
 *   - 不碰 WebSocket、不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { randomUUID } from 'node:crypto';

/* ----------------------------------------------------------------------------
 * 类型与常量
 * -------------------------------------------------------------------------- */

/** 认证模式：api_key 机器对机器 / jwt 院内用户 / sso 医联体单点登录 */
export type AuthMode = 'api_key' | 'jwt' | 'sso';

/** 支持的 HTTP 方法（与 medmuse.api_routes.method 对齐） */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** 熔断器三态：closed 正常放行 / open 熔断拒绝 / half_open 放行一个探测请求 */
export type CircuitState = 'closed' | 'open' | 'half_open';

/** routeRequest 的最终决策（决定 200 转发还是 4xx/5xx 拒绝） */
export type RouteDecisionKind =
  | 'routed'
  | 'unauthorized'
  | 'not_found'
  | 'rate_limited'
  | 'circuit_open';

/** 认证配置（登记外部系统时使用；secret 仅以引用形式出现） */
export interface ExternalAuthConfig {
  mode: AuthMode;
  /** 凭证引用标识（不落明文，密钥管理系统按此取回） */
  credentialRef?: string;
  /** 每秒请求上限（缺省 50） */
  qpsLimit?: number;
  /** 下游超时毫秒（缺省 5000） */
  timeoutMs?: number;
  /** 系统说明（医院/厂商/用途） */
  description?: string;
}

/** 一个已登记的外部系统（与 medmuse.api_gateway_systems 行对齐） */
export interface ExternalSystem {
  systemName: string;
  endpoint: string;
  authMode: AuthMode;
  credentialRef: string;
  qpsLimit: number;
  timeoutMs: number;
  status: 'active' | 'disabled';
  description: string;
  registeredAt: string;
}

/** 一条路由（与 medmuse.api_routes 行对齐） */
export interface ApiRoute {
  id: string;
  /** 入口路径，如 /lab/results */
  routePath: string;
  method: HttpMethod;
  /** 目标外部系统名 */
  targetSystem: string;
  /** 目标系统内路径，如 /open/lab/v1/results */
  targetEndpoint: string;
  authMode: AuthMode;
  qpsLimit: number;
  timeoutMs: number;
  description: string;
  status: 'active' | 'disabled';
}

/** 熔断器运行态（持久化在 api_routes.circuit_* 列，多实例共享） */
export interface CircuitStateHolder {
  state: CircuitState;
  /** 连续失败计数（达到阈值打开熔断） */
  failureCount: number;
  /** 连续成功计数（half_open 探测成功后闭合） */
  successCount: number;
  /** 熔断打开时刻 ISO（计算 half_open 恢复） */
  openedAt: string | null;
  /** 连续失败阈值（达到即 open，缺省 5） */
  threshold: number;
  /** open 态持续多久后转 half_open（缺省 30000ms） */
  resetMs: number;
}

/** 网关聚合指标（日志监控：请求量 / 错误率 / 平均响应时间） */
export interface GatewayMetrics {
  totalRequests: number;
  totalErrors: number;
  /** 平均响应时间 ms（EMA 平滑） */
  avgResponseMs: number;
}

/** 完整网关状态（buildAPIGateway 的产物；路由层从 DB 装载后逐字段填充） */
export interface APIGateway {
  routes: ApiRoute[];
  systems: Record<string, ExternalSystem>;
  circuits: Record<string, CircuitStateHolder>;
  metrics: GatewayMetrics;
}

/** 调用方携带的认证凭证（routeRequest 入参） */
export interface RequestCredential {
  /** api_key 模式：明文 Key（网关在内存校验后即丢，不落日志） */
  apiKey?: string;
  /** jwt 模式：访问令牌 */
  token?: string;
  /** sso 模式：单点登录签发的主体标识 */
  subject?: string;
}

/** routeRequest 入参（除 path/method 外全部通过 params 注入，便于单测） */
export interface RouteRequestParams {
  /** 网关路由表（通常从 DB 装载） */
  routes?: ApiRoute[];
  /** 外部系统表（systemName -> system） */
  systems?: Record<string, ExternalSystem>;
  /** 各路由熔断器运行态（routePath -> holder） */
  circuits?: Record<string, CircuitStateHolder>;
  /** 本次请求携带的凭证 */
  credential?: RequestCredential;
  /** 最近 1 秒窗口内该路由已发生的请求时间戳（ms，限流观测） */
  recentTimestamps?: number[];
  /** 注入当前时间（单测用） */
  now?: Date;
  /** 注入追踪号生成器（单测用） */
  traceId?: string;
}

/** routeRequest 输出：一次完整路由决策 */
export interface RouteDecision {
  decision: RouteDecisionKind;
  message: string;
  traceId: string;
  /** 命中路由时填充目标转发信息 */
  target?: {
    systemName: string;
    /** 拼合后的完整下游 URL */
    url: string;
    authMode: AuthMode;
    timeoutMs: number;
  };
  /** 认证是否通过（未命中路由时为 false） */
  authOk: boolean;
}

/** buildWebhookConfig 输出：网关事件外发配置 */
export interface GatewayWebhookConfig {
  event: string;
  callbackUrl: string;
  secret: string;
  /** 固定签名请求头 */
  signatureHeader: 'x-jlan-signature';
  contentType: 'application/json';
  enabled: boolean;
}

/** 熔断器连续失败阈值 */
export const CIRCUIT_FAILURE_THRESHOLD = 5;
/** open 态默认恢复窗口（ms） */
export const CIRCUIT_RESET_MS = 30_000;
/** 默认路由 QPS 上限 */
export const DEFAULT_QPS_LIMIT = 50;
/** 默认下游超时 */
export const DEFAULT_TIMEOUT_MS = 5000;

/* ----------------------------------------------------------------------------
 * buildAPIGateway：初始网关状态
 * -------------------------------------------------------------------------- */

/**
 * buildAPIGateway：构造一份干净的网关初始状态。
 * 路由层在启动 / 配置刷新时调用，再用 DB 装载的 routes/systems/circuits 填充。
 * 纯函数：不读 I/O，不依赖时间。
 */
export function buildAPIGateway(): APIGateway {
  return {
    routes: [],
    systems: {},
    circuits: {},
    metrics: { totalRequests: 0, totalErrors: 0, avgResponseMs: 0 },
  };
}

/* ----------------------------------------------------------------------------
 * registerExternalSystem：登记第三方对接系统
 * -------------------------------------------------------------------------- */

/** 校验 endpoint 协议：仅 https 公网；localhost/127.0.0.1 开发例外 */
function assertEndpoint(endpoint: string): void {
  const ep = (endpoint ?? '').trim();
  if (!/^https:\/\/.+/i.test(ep) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(ep)) {
    throw new Error('外部系统 endpoint 仅允许 https（开发环境 http://localhost 例外）');
  }
}

/**
 * registerExternalSystem：登记一个外部系统，返回不可变系统描述。
 *  - systemName 非空且不含空白；
 *  - endpoint 协议白名单校验（防 SSRF）；
 *  - authConfig.mode 必须在 api_key/jwt/sso 内；
 *  - qpsLimit 限制在 1~1000，timeoutMs 限制在 100~60000。
 */
export function registerExternalSystem(
  systemName: string,
  endpoint: string,
  authConfig: ExternalAuthConfig,
): ExternalSystem {
  const name = (systemName ?? '').trim();
  if (!name || /\s/.test(name)) {
    throw new Error('外部系统名称必填且不含空白字符');
  }
  assertEndpoint(endpoint);
  if (!authConfig || !['api_key', 'jwt', 'sso'].includes(authConfig.mode)) {
    throw new Error('认证模式必须为 api_key / jwt / sso');
  }
  const qpsLimit =
    typeof authConfig.qpsLimit === 'number' && authConfig.qpsLimit > 0
      ? Math.min(Math.floor(authConfig.qpsLimit), 1000)
      : DEFAULT_QPS_LIMIT;
  const timeoutMs =
    typeof authConfig.timeoutMs === 'number' && authConfig.timeoutMs > 0
      ? Math.min(Math.floor(authConfig.timeoutMs), 60_000)
      : DEFAULT_TIMEOUT_MS;
  return {
    systemName: name,
    endpoint: endpoint.trim().replace(/\/+$/, ''),
    authMode: authConfig.mode,
    credentialRef: (authConfig.credentialRef ?? '').trim(),
    qpsLimit,
    timeoutMs,
    status: 'active',
    description: (authConfig.description ?? '').trim(),
    registeredAt: new Date().toISOString(),
  };
}

/* ----------------------------------------------------------------------------
 * 认证鉴权（API Key / JWT / SSO）
 * -------------------------------------------------------------------------- */

/**
 * authenticate：按路由要求的认证模式校验凭证。
 *  - api_key：必须携带非空 apiKey；
 *  - jwt：必须携带非空 token；
 *  - sso：必须携带非空 subject。
 * 纯函数，不做线上校验（密钥有效性由密钥管理系统在转发时校验）。
 */
export function authenticate(
  mode: AuthMode,
  credential: RequestCredential | undefined,
): boolean {
  if (!credential) return false;
  switch (mode) {
    case 'api_key':
      return typeof credential.apiKey === 'string' && credential.apiKey.trim().length > 0;
    case 'jwt':
      return typeof credential.token === 'string' && credential.token.trim().length > 0;
    case 'sso':
      return typeof credential.subject === 'string' && credential.subject.trim().length > 0;
    default:
      return false;
  }
}

/* ----------------------------------------------------------------------------
 * 限流（QPS 滑动窗口）与熔断
 * -------------------------------------------------------------------------- */

/**
 * isRateLimited：给定最近 1 秒窗口内已发生的请求时间戳与 QPS 上限，
 * 判断本次是否超限。recentTimestamps 为调用方维护的滑动窗口观测。
 */
export function isRateLimited(
  qpsLimit: number,
  recentTimestamps: number[] | undefined,
  nowMs: number,
): boolean {
  const limit = Math.max(1, Math.floor(qpsLimit));
  const stamps = Array.isArray(recentTimestamps) ? recentTimestamps : [];
  // 只保留 1 秒窗口内的请求
  const window = stamps.filter((t) => typeof t === 'number' && nowMs - t < 1000);
  return window.length >= limit;
}

/**
 * isCircuitOpen：根据熔断器当前状态与当前时间判断是否拒绝本次请求。
 *  - closed：放行；
 *  - open：若距 openedAt 已超过 resetMs，则视为 half_open 放行一个探测；否则拒绝；
 *  - half_open：放行（探测请求）。
 * 返回 { open, halfOpenNow } 供调用方记录转换结果。
 */
export function isCircuitOpen(
  holder: CircuitStateHolder | undefined,
  now: Date,
): { open: boolean; halfOpenNow: boolean } {
  if (!holder) return { open: false, halfOpenNow: false };
  if (holder.state === 'closed') return { open: false, halfOpenNow: false };
  if (holder.state === 'half_open') return { open: false, halfOpenNow: true };
  // open：判断是否已到恢复窗口
  if (!holder.openedAt) return { open: true, halfOpenNow: false };
  const elapsed = now.getTime() - new Date(holder.openedAt).getTime();
  if (elapsed >= holder.resetMs) {
    return { open: false, halfOpenNow: true };
  }
  return { open: true, halfOpenNow: false };
}

/**
 * recordCircuitResult：根据一次下游调用成功/失败推进熔断器状态。
 * 失败累计到阈值 → open；open 超过窗口探测成功 → closed；探测失败 → 重新 open。
 * 返回全新 holder（不 mutate 入参）。
 */
export function recordCircuitResult(
  holder: CircuitStateHolder | undefined,
  success: boolean,
  now: Date,
): CircuitStateHolder {
  const base: CircuitStateHolder = holder ?? {
    state: 'closed',
    failureCount: 0,
    successCount: 0,
    openedAt: null,
    threshold: CIRCUIT_FAILURE_THRESHOLD,
    resetMs: CIRCUIT_RESET_MS,
  };
  if (success) {
    // half_open 探测成功 → 闭合；普通成功清零失败计数
    if (base.state === 'half_open') {
      return { ...base, state: 'closed', failureCount: 0, openedAt: null, successCount: base.successCount + 1 };
    }
    return { ...base, failureCount: 0, successCount: base.successCount + 1 };
  }
  // 失败
  const failureCount = base.failureCount + 1;
  if (failureCount >= base.threshold) {
    return { ...base, failureCount, state: 'open', openedAt: now.toISOString() };
  }
  return { ...base, failureCount, successCount: 0 };
}

/* ----------------------------------------------------------------------------
 * routeRequest：完整路由决策流水线
 * -------------------------------------------------------------------------- */

/**
 * routeRequest：对一次入站请求给出完整决策。
 * 流水线顺序：路由匹配 → 认证鉴权 → QPS 限流 → 熔断器判定 → 输出目标。
 * 全部为纯函数；路由表 / 系统表 / 熔断态通过 params 注入。
 */
export function routeRequest(
  path: string,
  method: HttpMethod | string,
  params: RouteRequestParams,
): RouteDecision {
  const now = params.now ?? new Date();
  const traceId = params.traceId ?? `trc_${randomUUID()}`;
  const m = (method ?? 'GET').toUpperCase();
  const pathKey = (path ?? '').trim().replace(/\/+$/, '') || '/';

  const reject = (decision: RouteDecisionKind, message: string, authOk = false): RouteDecision => ({
    decision,
    message,
    traceId,
    authOk,
  });

  // 1) 路由匹配
  const route = (params.routes ?? []).find(
    (r) => r.routePath === pathKey && r.method.toUpperCase() === m && r.status === 'active',
  );
  if (!route) {
    return reject('not_found', `未注册路由：${m} ${pathKey}`);
  }

  // 2) 认证鉴权
  const authOk = authenticate(route.authMode, params.credential);
  if (!authOk) {
    return reject('unauthorized', `路由 ${m} ${pathKey} 需要 ${route.authMode} 认证`, false);
  }

  // 3) QPS 限流
  if (isRateLimited(route.qpsLimit, params.recentTimestamps, now.getTime())) {
    return reject('rate_limited', `路由 ${pathKey} 超过 QPS 上限 ${route.qpsLimit}`, true);
  }

  // 4) 熔断器判定
  const circuit = params.circuits?.[route.routePath];
  const { open, halfOpenNow } = isCircuitOpen(circuit, now);
  if (open) {
    return reject('circuit_open', `路由 ${pathKey} 熔断中，请稍后重试`, true);
  }

  // 5) 命中目标
  const system = (params.systems ?? {})[route.targetSystem];
  const endpoint = system?.endpoint ?? '';
  const targetUrl = `${endpoint}${route.targetEndpoint}`;
  return {
    decision: 'routed',
    message: halfOpenNow
      ? `路由 ${pathKey} 半开探测放行`
      : `路由 ${pathKey} 已转发至 ${route.targetSystem}`,
    traceId,
    authOk: true,
    target: {
      systemName: route.targetSystem,
      url: targetUrl,
      authMode: route.authMode,
      timeoutMs: route.timeoutMs,
    },
  };
}

/* ----------------------------------------------------------------------------
 * buildWebhookConfig：网关事件外发配置
 * -------------------------------------------------------------------------- */

/**
 * buildWebhookConfig：构造一条网关事件外发 webhook 配置。
 *  - event 非空（如 route.error / circuit.opened）；
 *  - callbackUrl 协议白名单（https，localhost 例外）；
 *  - secret 至少 16 位（HMAC-SHA256 签名强度要求）。
 */
export function buildWebhookConfig(
  event: string,
  callbackUrl: string,
  secret: string,
): GatewayWebhookConfig {
  const ev = (event ?? '').trim();
  if (!ev) throw new Error('webhook 事件类型不能为空');
  assertEndpoint(callbackUrl);
  const sec = (secret ?? '').trim();
  if (sec.length < 16) throw new Error('webhook secret 至少 16 位以保证 HMAC-SHA256 强度');
  return {
    event: ev,
    callbackUrl: callbackUrl.trim(),
    secret: sec,
    signatureHeader: 'x-jlan-signature',
    contentType: 'application/json',
    enabled: true,
  };
}
