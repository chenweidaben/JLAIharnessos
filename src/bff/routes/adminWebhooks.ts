/**
 * 健澜科技 jlmedaios - M129-D 系统事件 Webhook 路由（系统集成，仅 admin）
 *
 * 【系统集成】
 *  - GET  /api/v1/admin/webhooks
 *      列出全部外发订阅；secret 脱敏（仅返回前后 4 位）；
 *  - POST /api/v1/admin/webhooks
 *      body: { url, events: string[], secret?, description? }
 *      登记新订阅；secret 缺省时由服务端生成 32 位随机串，**仅在本响应中返回一次**；
 *      url / events / secret 的合法性由纯函数 registerWebhook 统一校验。
 *
 * 生产安全加固：
 *  - requireRole(c, 'admin')：未登录 401、非管理员 403；
 *  - url 强制 https（开发环境 localhost 例外），防 SSRF 内网穿透；
 *  - secret 仅创建时返回明文，列表接口脱敏；
 *  - 事件白名单由聚合器 assertEvent 收敛，非法事件直接 400。
 *
 * 本文件导出 adminWebhooksRoutes，由 server.ts 统一接线。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { randomBytes } from 'node:crypto';

import { getDb } from '../../db/pool.js';
import { requireRole } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  assertEvent,
  registerWebhook,
  WEBHOOK_EVENTS,
  type Webhook,
} from '../aggregators/webhookAggregator';

/** 列表输出：secret 脱敏为 `ab****yz` */
function maskSecret(secret: string): string {
  if (typeof secret !== 'string' || secret.length < 8) return '****';
  return `${secret.slice(0, 4)}****${secret.slice(-4)}`;
}

/** DB 行 → 前端 Webhook 视图（secret 脱敏） */
function toView(row: Record<string, unknown>): Record<string, unknown> {
  const createdAt = row.created_at;
  const updatedAt = row.updated_at;
  const nextRetry = row.next_retry_at;
  return {
    id: Number(row.id),
    url: typeof row.url === 'string' ? row.url : '',
    events: Array.isArray(row.events) ? row.events : [],
    secretMask: maskSecret(typeof row.secret === 'string' ? row.secret : ''),
    status: row.status === 'disabled' ? 'disabled' : 'active',
    description: typeof row.description === 'string' ? row.description : '',
    successCount: Number(row.success_count ?? 0),
    failureCount: Number(row.failure_count ?? 0),
    nextRetryAt:
      nextRetry instanceof Date ? nextRetry.toISOString() : nextRetry ? String(nextRetry) : null,
    createdBy: typeof row.created_by === 'string' ? row.created_by : '',
    createdAt:
      createdAt instanceof Date ? createdAt.toISOString() : String(createdAt ?? ''),
    updatedAt:
      updatedAt instanceof Date ? updatedAt.toISOString() : String(updatedAt ?? ''),
  };
}

/** GET /api/v1/admin/webhooks */
async function handleList(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  if (process.env.DEMO_MODE === '1') {
    const now = new Date().toISOString();
    return json(ok({
      total: 1,
      items: [
        {
          id: 1,
          url: 'https://demo.example.com/hooks/jlmedaios',
          events: ['patient.discharged', 'admission.created'],
          secretMask: 'abcd****wxyz',
          status: 'active',
          description: 'DEMO_MODE 演示订阅，未连接数据库',
          successCount: 12,
          failureCount: 0,
          nextRetryAt: null,
          createdBy: 'demo-admin',
          createdAt: now,
          updatedAt: now,
        },
      ],
      events: WEBHOOK_EVENTS,
    }));
  }

  try {
    const db = getDb();
    const rows = await db`
      SELECT
        id             AS "id",
        url            AS "url",
        events         AS "events",
        secret         AS "secret",
        status         AS "status",
        description    AS "description",
        success_count  AS "success_count",
        failure_count  AS "failure_count",
        next_retry_at  AS "next_retry_at",
        created_by     AS "created_by",
        created_at     AS "created_at",
        updated_at     AS "updated_at"
      FROM medmuse.webhooks
      ORDER BY id DESC
    `;
    const items = (rows as unknown as Array<Record<string, unknown>>).map(toView);
    return json(ok({ total: items.length, items, events: WEBHOOK_EVENTS }));
  } catch (err) {
    return json(
      fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '读取 webhook 列表失败'),
      500,
    );
  }
}

/** POST /api/v1/admin/webhooks */
async function handleCreate(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  let body: {
    url?: unknown;
    events?: unknown;
    secret?: unknown;
    description?: unknown;
  };
  try {
    body = (await c.body()) as typeof body;
  } catch {
    return json(fail(ErrorCode.BAD_REQUEST, '请求体不是合法 JSON'), 400);
  }

  const url = typeof body.url === 'string' ? body.url : '';
  const events = Array.isArray(body.events) ? body.events.map(String) : [];
  // secret 缺省：服务端生成 32 位 hex（16 字节），仅本次响应返回
  const secret =
    typeof body.secret === 'string' && body.secret.length >= 16
      ? body.secret
      : randomBytes(16).toString('hex');
  const description = typeof body.description === 'string' ? body.description : '';
  const createdBy = c.user?.id ?? c.user?.name ?? 'unknown';

  // 纯函数层统一校验（url 协议 / 事件白名单 / secret 强度）
  let draft: Webhook;
  try {
    draft = registerWebhook(url, events, secret, { description, createdBy });
  } catch (err) {
    return json(
      fail(ErrorCode.BAD_REQUEST, err instanceof Error ? err.message : 'webhook 参数非法'),
      400,
    );
  }
  // 再次收敛事件数组为白名单（防聚合器外的旁路）
  try {
    draft.events.forEach((e) => assertEvent(e));
  } catch (err) {
    return json(fail(ErrorCode.BAD_REQUEST, err instanceof Error ? err.message : '事件非法'), 400);
  }

  try {
    const db = getDb();
    const rows = await db`
      INSERT INTO medmuse.webhooks
        (url, events, secret, status, description, created_by)
      VALUES
        (${draft.url}, ${draft.events}, ${draft.secret},
         'active', ${draft.description}, ${draft.createdBy})
      RETURNING
        id             AS "id",
        url            AS "url",
        events         AS "events",
        secret         AS "secret",
        status         AS "status",
        description    AS "description",
        success_count  AS "success_count",
        failure_count  AS "failure_count",
        next_retry_at  AS "next_retry_at",
        created_by     AS "created_by",
        created_at     AS "created_at",
        updated_at     AS "updated_at"
    `;
    const row = (rows as unknown as Array<Record<string, unknown>>)[0];
    if (!row) {
      return json(fail(ErrorCode.INTERNAL_ERROR, 'webhook 写入未返回结果'), 500);
    }
    const view = toView(row);
    // secret 仅创建时明文返回一次
    return json(ok({ ...view, secret }, 'webhook 已登记；secret 仅此一次展示，请妥善保管'));
  } catch (err) {
    return json(
      fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '登记 webhook 失败'),
      500,
    );
  }
}

export const adminWebhooksRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/webhooks',
    auth: true,
    handle: handleList,
  },
  {
    method: 'POST',
    path: '/api/v1/admin/webhooks',
    auth: true,
    handle: handleCreate,
  },
];
