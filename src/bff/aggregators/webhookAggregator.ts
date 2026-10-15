/**
 * 健澜科技 jlmedaios - M129-D 系统事件 Webhook 聚合器（系统集成，纯函数层）
 *
 * 【系统集成】
 *  本模块是医院事件（患者建档 / 处方开立 / 危急值 / 系统错误）外发到第三方
 *  系统的"签名 + 重试"纯函数层。不直接读写数据库、不直接发起网络请求——
 *  网络传输由调用方注入（默认全局 fetch），便于在单元测试中替换为假传输。
 *
 *  对外能力：
 *   - registerWebhook(url, events, secret)：登记一个外发订阅；
 *       校验 url 协议（https / localhost 开发例外）、事件白名单、secret 强度；
 *   - signPayload(secret, body)：HMAC-SHA256 签名，输出 `sha256=<hex>`；
 *   - verifySignature(secret, body, signature)：恒时比对，防止伪造请求；
 *   - computeBackoffMs(attempt)：指数退避（1s, 2s, 4s, 8s, 16s，封顶 30s）；
 *   - shouldRetry(attempt, success)：失败且未超过最大次数才重试；
 *   - triggerWebhook(event, payload, options)：按订阅清单 fan-out，
 *       对每个匹配的 active webhook 签名 + 注入传输 + 失败重试。
 *
 * 生产安全加固：
 *   - 事件类型白名单收敛，非法事件直接抛错，避免把内部敏感事件外发到公网；
 *   - secret 不落前端日志；签名用恒时比对，防时序侧信道；
 *   - 退避重试封顶 5 次，避免对端宕机时雪崩；
 *   - 所有函数不 mutate 入参；Webhook 对象为不可变结构。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';

/** 系统事件白名单（与 251-webhooks.sql 注释对齐） */
export const WEBHOOK_EVENTS = [
  'patient.created',
  'prescription.created',
  'critical_result',
  'error.alert',
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

/** Webhook 状态：active 参与外发，disabled 熔断 */
export type WebhookStatus = 'active' | 'disabled';

/** 一条外发订阅（与 medmuse.webhooks 行对齐） */
export interface Webhook {
  /** 订阅 ID（UUID；路由层落库时可被 bigint 主键覆盖） */
  id: string;
  /** 外发地址（https；localhost 开发例外） */
  url: string;
  /** 订阅事件子集 */
  events: WebhookEvent[];
  /** HMAC-SHA256 签名密钥 */
  secret: string;
  /** 状态 */
  status: WebhookStatus;
  /** 订阅方说明 */
  description: string;
  /** 登记人工号 */
  createdBy: string;
  /** 登记时间 ISO */
  createdAt: string;
  /** 更新时间 ISO */
  updatedAt: string;
}

/** 单次投递结果 */
export interface DeliveryResult {
  /** 目标 webhook id */
  webhookId: string;
  /** 目标 url */
  url: string;
  /** 本次事件 */
  event: WebhookEvent;
  /** 是否最终成功（重试耗尽仍失败则为 false） */
  success: boolean;
  /** 实际尝试次数（1..maxRetries） */
  attempts: number;
  /** 本次报文签名 */
  signature: string;
  /** 最后一次错误信息 */
  error?: string;
  /** 若失败且仍可重试，下一次重试时间 ISO */
  nextRetryAt?: string;
}

/** 注入的传输层（测试可替换为假函数） */
export interface WebhookTransport {
  (url: string, body: string, signature: string): Promise<{
    ok: boolean;
    statusCode?: number;
    error?: string;
  }>;
}

/** triggerWebhook 可选项 */
export interface TriggerOptions {
  /** 订阅清单（默认空数组，即不外发） */
  webhooks?: Webhook[];
  /** 传输层（默认走全局 fetch） */
  send?: WebhookTransport;
  /** 最大重试次数（含首次，默认 5） */
  maxRetries?: number;
  /** 当前时间戳注入（测试用），默认 new Date() */
  now?: Date;
}

/** 事件类型守卫：非法事件抛错（注册与触发共用） */
export function assertEvent(event: unknown): asserts event is WebhookEvent {
  if (typeof event !== 'string') {
    throw new Error('webhook 事件类型必须为字符串');
  }
  if (!(WEBHOOK_EVENTS as readonly string[]).includes(event)) {
    throw new Error(
      `非法 webhook 事件：${event}；允许：${WEBHOOK_EVENTS.join(', ')}`,
    );
  }
}

/** url 协议校验：仅 https（或 localhost 开发例外） */
function assertUrl(url: unknown): asserts url is string {
  if (typeof url !== 'string' || !url.trim()) {
    throw new Error('webhook url 不能为空');
  }
  const u = url.trim();
  const httpsOk = /^https:\/\/.+/i.test(u);
  const localhostOk = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(u);
  if (!httpsOk && !localhostOk) {
    throw new Error(
      'webhook url 必须为 https（开发环境仅允许 http://localhost/127.0.0.1）',
    );
  }
}

/** secret 强度校验：至少 16 位，避免弱密钥 */
function assertSecret(secret: unknown): asserts secret is string {
  if (typeof secret !== 'string' || secret.length < 16) {
    throw new Error('webhook secret 至少 16 位，防止弱签名');
  }
}

/**
 * 登记一条外发订阅（纯函数，不 mutate 入参）。
 *  - url / events / secret 任一不合法直接抛错；
 *  - events 自动去重、按白名单过滤；
 *  - 返回全新 Webhook 对象，id / 时间戳在本函数内生成。
 */
export function registerWebhook(
  url: string,
  events: readonly string[],
  secret: string,
  extra?: { description?: string; createdBy?: string },
): Webhook {
  assertUrl(url);
  assertSecret(secret);
  if (!Array.isArray(events) || events.length === 0) {
    throw new Error('webhook 至少订阅一个事件');
  }
  const seen = new Set<WebhookEvent>();
  for (const e of events) {
    assertEvent(e);
    seen.add(e as WebhookEvent);
  }
  const stamp = new Date().toISOString();
  return {
    id: `wh_${randomUUID()}`,
    url: url.trim(),
    events: Array.from(seen),
    secret,
    status: 'active',
    description: typeof extra?.description === 'string' ? extra.description.trim() : '',
    createdBy: typeof extra?.createdBy === 'string' ? extra.createdBy.trim() : 'system',
    createdAt: stamp,
    updatedAt: stamp,
  };
}

/**
 * HMAC-SHA256 签名（纯函数）。
 * 输出形如 `sha256=hex`，对端按头 `x-jlan-signature` 校验。
 */
export function signPayload(secret: string, body: string): string {
  const h = createHmac('sha256', secret).update(body, 'utf8').digest('hex');
  return `sha256=${h}`;
}

/**
 * 恒时签名校验（纯函数）。
 * 防止通过响应时间差暴力猜测签名；签名格式非法直接返回 false。
 */
export function verifySignature(
  secret: string,
  body: string,
  signature: string,
): boolean {
  if (typeof signature !== 'string' || !signature.startsWith('sha256=')) {
    return false;
  }
  const expected = signPayload(secret, body);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * 指数退避（纯函数）：第 n 次尝试等待 2^(n-1) 秒，封顶 30s。
 * attempt 从 1 开始；首次尝试不等待（返回 0）。
 */
export function computeBackoffMs(attempt: number): number {
  const n = Math.max(1, Math.floor(attempt));
  if (n <= 1) return 0;
  const ms = 1000 * Math.pow(2, n - 2);
  return Math.min(ms, 30_000);
}

/** 是否应该重试：失败且未超过最大次数 */
export function shouldRetry(attempt: number, success: boolean, maxRetries = 5): boolean {
  return !success && attempt < maxRetries;
}

/** 默认传输层：POST JSON，带签名头；非 2xx 视为失败 */
const defaultTransport: WebhookTransport = async (url, body, signature) => {
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-jlan-signature': signature,
        'x-jlan-event-time': new Date().toISOString(),
      },
      body,
    });
    return {
      ok: resp.ok,
      statusCode: resp.status,
      error: resp.ok ? undefined : `HTTP ${resp.status}`,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : '网络异常' };
  }
};

/** 睡退避时间（测试可通过注入 now 验证；真实运行用 setTimeout） */
function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 触发一次事件 fan-out（纯函数 + 注入传输）。
 *  - 仅 status=active 且订阅了该事件的 webhook 参与；
 *  - 每个 webhook 独立重试，互不影响；
 *  - 失败时按 computeBackoffMs 退避，直至 maxRetries；
 *  - 返回每个 webhook 的最终投递结果数组。
 */
export async function triggerWebhook(
  event: string,
  payload: unknown,
  options: TriggerOptions = {},
): Promise<DeliveryResult[]> {
  assertEvent(event);
  const ev = event as WebhookEvent;
  const list = Array.isArray(options.webhooks) ? options.webhooks : [];
  const send = options.send ?? defaultTransport;
  const maxRetries = Math.max(1, options.maxRetries ?? 5);
  const now = options.now ?? new Date();

  const targets = list.filter(
    (w) =>
      w &&
      w.status === 'active' &&
      Array.isArray(w.events) &&
      w.events.includes(ev),
  );

  const body = JSON.stringify({
    event: ev,
    timestamp: now.toISOString(),
    data: payload ?? null,
  });

  const results: DeliveryResult[] = [];
  for (const w of targets) {
    const signature = signPayload(w.secret, body);
    let attempts = 0;
    let success = false;
    let lastError: string | undefined;
    let statusCode: number | undefined;

    while (attempts < maxRetries && !success) {
      attempts += 1;
      // 首次之后按退避等待（测试注入 fake send 时不阻塞真实时钟）
      if (attempts > 1) {
        await sleep(computeBackoffMs(attempts));
      }
      const r = await send(w.url, body, signature);
      success = r.ok;
      statusCode = r.statusCode;
      lastError = r.error;
    }

    let nextRetryAt: string | undefined;
    if (!success && shouldRetry(attempts, success, maxRetries) === false && attempts >= maxRetries) {
      // 已耗尽：不再调度（nextRetryAt 留空，由运维人工熔断）
      nextRetryAt = undefined;
    } else if (!success) {
      nextRetryAt = new Date(now.getTime() + computeBackoffMs(attempts + 1)).toISOString();
    }

    results.push({
      webhookId: w.id,
      url: w.url,
      event: ev,
      success,
      attempts,
      signature,
      error: success ? undefined : lastError ?? `HTTP ${statusCode ?? 'unknown'}`,
      nextRetryAt,
    });
  }
  return results;
}
