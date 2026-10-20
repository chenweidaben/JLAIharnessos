/**
 * 健澜科技 jlmedaios - M124-A 系统配置中心路由（运维工具，仅 admin）
 *
 *  - GET /api/v1/admin/config?category=xxx
 *      读取 medmuse.system_config 全量；可选按分类收敛；
 *      分类筛选走纯函数 filterByCategory（单测覆盖）。
 *  - PUT /api/v1/admin/config/:key
 *      body: { value: string, description?: string, category?: string }
 *      upsert 单条配置；updated_by 由登录态注入，前端不可伪造；
 *      description / category 缺省时保留原值（不被空串冲掉）。
 *
 * 生产安全加固：
 *  - requireRole(c, 'admin')：未登录 401、非管理员 403，配置中心不对普通角色开放；
 *  - value 统一按字符串落库，不接受对象/数组等结构化值，避免类型混淆；
 *  - 严禁通过此接口下发密钥 / 数据库口令 / 患者数据（在描述中已约束）。
 *
 * 本文件导出 adminConfigRoutes，由 server.ts 统一接线。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';
import { requireRole } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  filterByCategory,
  type SystemConfigEntry,
} from '../aggregators/systemConfigAggregator';

/** DB 行 → 纯函数层 SystemConfigEntry（时间戳归一为 ISO 字符串） */
function toEntry(row: Record<string, unknown>): SystemConfigEntry {
  const updatedAt = row.updated_at;
  return {
    key: typeof row.key === 'string' ? row.key : '',
    value: typeof row.value === 'string' ? row.value : '',
    description: typeof row.description === 'string' ? row.description : '',
    category: typeof row.category === 'string' ? row.category : 'general',
    updatedAt:
      updatedAt instanceof Date ? updatedAt.toISOString() : String(updatedAt ?? ''),
    updatedBy: typeof row.updated_by === 'string' ? row.updated_by : '',
  };
}

/** GET /api/v1/admin/config?category=xxx */
async function handleList(c: Ctx): Promise<Response> {
  // 运维工具：仅 admin 可读配置
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  const category = c.query.get('category') ?? '';

  // DEMO_MODE=1：表未建时短路返回 mock，避免 500
  if (process.env.DEMO_MODE === '1') {
    const demoItems: SystemConfigEntry[] = [
      { key: 'hospital.name', value: '杭州健澜科技示范医院', description: '医院名称', category: 'general', updatedAt: new Date().toISOString(), updatedBy: 'admin' },
      { key: 'system.version', value: 'v5.0.0', description: '系统版本号', category: 'general', updatedAt: new Date().toISOString(), updatedBy: 'admin' },
      { key: 'feature.ai_brain', value: 'true', description: 'AI 大脑开关', category: 'feature', updatedAt: new Date().toISOString(), updatedBy: 'admin' },
      { key: 'feature.digital_twin', value: 'false', description: '数字孪生开关', category: 'feature', updatedAt: new Date().toISOString(), updatedBy: 'admin' },
      { key: 'security.session_timeout', value: '7200', description: '会话超时（秒）', category: 'security', updatedAt: new Date().toISOString(), updatedBy: 'admin' },
    ];
    const items = filterByCategory(category, demoItems);
    return json(ok({ total: items.length, items }));
  }

  try {
    const db = getDb();
    const rows = await db`
      SELECT
        key         AS "key",
        value       AS "value",
        description AS "description",
        category    AS "category",
        updated_at  AS "updated_at",
        updated_by  AS "updated_by"
      FROM medmuse.system_config
      ORDER BY category, key
    `;
    const all = (rows as unknown as Array<Record<string, unknown>>).map(toEntry);
    // 纯函数分类筛选（单测覆盖）；空 category 返回全量
    const items = filterByCategory(category, all);
    return json(ok({ total: items.length, items }));
  } catch (err) {
    return json(
      fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '读取系统配置失败'),
      500,
    );
  }
}

/** PUT /api/v1/admin/config/:key */
async function handleUpsert(c: Ctx): Promise<Response> {
  // 运维工具：仅 admin 可写配置
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  const key = (c.params.key ?? '').trim();
  if (!key) {
    return json(fail(ErrorCode.BAD_REQUEST, '配置键不能为空'), 400);
  }

  let body: { value?: unknown; description?: unknown; category?: unknown };
  try {
    body = (await c.body()) as typeof body;
  } catch {
    return json(fail(ErrorCode.BAD_REQUEST, '请求体不是合法 JSON'), 400);
  }

  // 生产安全加固：value 统一字符串；对象/数组拒绝，避免类型混淆
  if (typeof body.value !== 'string') {
    return json(fail(ErrorCode.BAD_REQUEST, 'value 必须为字符串'), 400);
  }
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  // updated_by 由登录态注入，优先用工号；前端不可伪造
  const updatedBy = c.user?.id ?? c.user?.name ?? 'unknown';

  try {
    const db = getDb();
    // upsert：已存在更新 value/updated_at/updated_by；
    // description / category 用 NULLIF + COALESCE，空串不冲掉原值
    const rows = await db`
      INSERT INTO medmuse.system_config
        (key, value, description, category, updated_at, updated_by)
      VALUES
        (${key}, ${body.value}, ${description},
         CASE WHEN ${category} = '' THEN 'general' ELSE ${category} END,
         now(), ${updatedBy})
      ON CONFLICT (key) DO UPDATE SET
        value       = EXCLUDED.value,
        description = COALESCE(NULLIF(EXCLUDED.description, ''), medmuse.system_config.description),
        category    = COALESCE(NULLIF(EXCLUDED.category, ''),    medmuse.system_config.category),
        updated_at  = now(),
        updated_by  = EXCLUDED.updated_by
      RETURNING
        key         AS "key",
        value       AS "value",
        description AS "description",
        category    AS "category",
        updated_at  AS "updated_at",
        updated_by  AS "updated_by"
    `;
    const row = (rows as unknown as Array<Record<string, unknown>>)[0];
    if (!row) {
      return json(fail(ErrorCode.INTERNAL_ERROR, '配置写入未返回结果'), 500);
    }
    return json(ok(toEntry(row)));
  } catch (err) {
    return json(
      fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '写入系统配置失败'),
      500,
    );
  }
}

export const adminConfigRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/config',
    auth: true,
    handle: handleList,
  },
  {
    method: 'PUT',
    path: '/api/v1/admin/config/:key',
    auth: true,
    handle: handleUpsert,
  },
];
