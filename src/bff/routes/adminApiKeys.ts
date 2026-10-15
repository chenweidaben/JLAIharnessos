/**
 * 健澜科技 jlmedaios - M129-B 第三方对接 API Key 管理路由（系统集成）
 *
 * 【系统集成】系统管理员对第三方对接凭证的受控签发与台账查看：
 *  - POST /api/v1/admin/api-keys  签发新 Key：明文仅本次响应返回一次，
 *    库内只存 SHA-256 哈希；默认 90 天过期；
 *  - GET  /api/v1/admin/api-keys  台账列表：只回显前缀/名称/权限/状态/有效期，
 *    永不回显 key_hash 与明文。
 *
 * 安全模型：
 *  - requireRole(c, 'admin')：非管理员 403，普通角色不可签发/查看凭证；
 *  - 权限码经 normalizePermissions 收敛到白名单，越权请求的权限被静默剔除；
 *  - 列表查询 SELECT 列白名单显式排除 key_hash，杜绝 SELECT * 误下发；
 *  - 创建人取登录态工号注入，前端不可伪造。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';
import { requireRole } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildThirdPartyApiKey,
  normalizePermissions,
} from '../aggregators/thirdPartyApiAggregator';

/** POST 入参（宽松解析，非法字段在下方逐字段校验） */
interface CreateKeyBody {
  name?: unknown;
  permissions?: unknown;
  ttlDays?: unknown;
  note?: unknown;
}

/**
 * POST /api/v1/admin/api-keys
 * Body：{ name, permissions: string[], ttlDays?: number, note?: string }
 * 响应 data.key 为完整明文——仅此一次展示，前端应弹窗提示对接方妥存。
 */
async function handleCreate(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  let body: CreateKeyBody;
  try {
    body = (await c.body()) as CreateKeyBody;
  } catch {
    return json(fail(ErrorCode.BAD_REQUEST, '请求体不是合法 JSON'), 400);
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return json(fail(ErrorCode.BAD_REQUEST, '对接方名称 name 不能为空'), 400);
  }
  if (name.length > 64) {
    return json(fail(ErrorCode.BAD_REQUEST, '对接方名称 name 最长 64 字符'), 400);
  }
  const permissions = normalizePermissions(
    Array.isArray(body.permissions) ? (body.permissions as unknown[]) : [],
  );
  if (permissions.length === 0) {
    return json(
      fail(ErrorCode.BAD_REQUEST, '至少授权一个数据面权限（patient:read 等）'),
      400,
    );
  }
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 256) : '';
  const createdBy = c.user?.id ?? c.user?.name ?? 'unknown';

  // 纯函数生成：明文/哈希/前缀/过期时刻一次产出；库内只落哈希与元数据
  const built = buildThirdPartyApiKey({
    name,
    permissions,
    ttlDays: typeof body.ttlDays === 'number' ? body.ttlDays : undefined,
  });

  try {
    const db = getDb();
    const rows = await db`
      INSERT INTO medmuse.api_keys
        (key_prefix, key_hash, name, permissions, status, expires_at, created_by, note)
      VALUES
        (${built.keyPrefix}, ${built.keyHash}, ${built.name},
         ${built.permissions}::text[], 'active', ${built.expires_at}::timestamptz,
         ${createdBy}, ${note})
      RETURNING
        id          AS "id",
        key_prefix  AS "key_prefix",
        name        AS "name",
        permissions AS "permissions",
        status      AS "status",
        expires_at  AS "expires_at",
        created_at  AS "created_at"
    `;
    const row = (rows as unknown as Array<Record<string, unknown>>)[0];
    return json(
      ok({
        id: String(row?.id ?? ''),
        // 明文 Key：仅本次返回一次，请对接方立即妥存；后续不再可查
        key: built.key,
        keyPrefix: built.keyPrefix,
        name: built.name,
        permissions: built.permissions,
        status: 'active',
        expires_at: built.expires_at,
        createdAt: row?.created_at ?? built.expires_at,
        warning: '请立即复制并妥善保存此 Key，明文仅展示一次，后续无法再查询。',
      }),
      201,
    );
  } catch (err) {
    return json(
      fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '签发 API Key 失败'),
      500,
    );
  }
}

/**
 * GET /api/v1/admin/api-keys
 * 台账列表：显式列出回显列，绝不含 key_hash；按创建时间倒序。
 */
async function handleList(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  try {
    const db = getDb();
    const rows = await db`
      SELECT
        id            AS "id",
        key_prefix    AS "keyPrefix",
        name          AS "name",
        permissions   AS "permissions",
        status        AS "status",
        expires_at    AS "expiresAt",
        created_by    AS "createdBy",
        created_at    AS "createdAt",
        last_used_at  AS "lastUsedAt",
        revoked_at    AS "revokedAt",
        note          AS "note"
      FROM medmuse.api_keys
      ORDER BY created_at DESC
      LIMIT 500
    `;
    const items = (rows as unknown as Array<Record<string, unknown>>).map((r) => ({
      id: String(r.id ?? ''),
      keyPrefix: typeof r.keyPrefix === 'string' ? r.keyPrefix : '',
      name: typeof r.name === 'string' ? r.name : '',
      permissions: Array.isArray(r.permissions) ? (r.permissions as string[]) : [],
      status: typeof r.status === 'string' ? r.status : 'active',
      expiresAt: r.expiresAt ?? null,
      createdBy: typeof r.createdBy === 'string' ? r.createdBy : '',
      createdAt: r.createdAt ?? null,
      lastUsedAt: r.lastUsedAt ?? null,
      revokedAt: r.revokedAt ?? null,
      note: typeof r.note === 'string' ? r.note : '',
    }));
    return json(ok({ total: items.length, items }));
  } catch (err) {
    return json(
      fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '读取 API Key 台账失败'),
      500,
    );
  }
}

export const adminApiKeysRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/admin/api-keys',
    auth: true,
    handle: handleCreate,
  },
  {
    method: 'GET',
    path: '/api/v1/admin/api-keys',
    auth: true,
    handle: handleList,
  },
];
