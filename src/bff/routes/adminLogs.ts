/**
 * 健澜科技 jlmedaios - M132-C 系统日志路由（产品化收尾）
 *
 * 依据宪法第四十五条（发展医疗卫生事业、保护人民健康）：
 * 医疗信息系统的运行事件必须结构化留痕，管理员可按级别 / 模块 / 关键字
 * 检索历史日志，支撑排障、审计与合规复盘。
 *
 *  - GET /api/v1/admin/logs   系统日志查询（仅 admin 角色）
 *      取近期窗口 -> 纯函数 queryLogs 按条件过滤分页 -> 直接返回。
 *
 * 生产安全加固：
 *  - requireRole(c, 'admin')：未登录 401、非管理员 403，日志不对普通角色开放；
 *  - 只查近期窗口（RECENT_LIMIT 条）并倒序返回，避免全表扫描拖垮看板；
 *  - metadata 由 DB jsonb 直接反序列化，路由层不二次加工敏感字段。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';
import { requireRole } from '../middleware/auth';
import {
  queryLogs,
  type LogEntry,
  type LogLevel,
  type SystemLogFilter,
} from '../aggregators/systemLogAggregator';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

/** 近期窗口：默认只取最近 1000 条，纯函数层在此窗口内再做条件过滤分页 */
const RECENT_LIMIT = 1000;

/** 合法级别白名单（query 参数校验用） */
const VALID_LEVELS: ReadonlySet<string> = new Set(['debug', 'info', 'warn', 'error']);

/**
 * GET /api/v1/admin/logs
 * query：level / module / keyword / startTime / endTime / page / pageSize
 */
async function handleList(c: Ctx): Promise<Response> {
  // 生产安全加固：仅 admin 可查系统日志；其余一律 403
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  const levelRaw = (c.query.get('level') ?? '').trim().toLowerCase();
  const filters: SystemLogFilter = {
    level: levelRaw && VALID_LEVELS.has(levelRaw) ? (levelRaw as LogLevel) : undefined,
    module: c.query.get('module') ?? undefined,
    keyword: c.query.get('keyword') ?? undefined,
    startTime: c.query.get('startTime') ?? undefined,
    endTime: c.query.get('endTime') ?? undefined,
  };

  const page = Number(c.query.get('page') ?? '1');
  const pageSize = Number(c.query.get('pageSize') ?? '20');

  try {
    const db = getDb();
    // 配合 idx_system_log_created：近期窗口倒序拉取
    const rows = await db`
      SELECT
        id           AS "id",
        level        AS "level",
        module       AS "module",
        message      AS "message",
        metadata     AS "metadata",
        staff_id     AS "staffId",
        created_at   AS "createdAt"
      FROM medmuse.system_log
      ORDER BY created_at DESC
      LIMIT ${RECENT_LIMIT}
    `;

    const logs = (rows as unknown as Array<{
      id: unknown;
      level: string;
      module: string;
      message: string;
      metadata: unknown;
      staffId: string;
      createdAt: unknown;
    }>).map((r) => ({
      id: Number(r.id),
      level: (VALID_LEVELS.has(r.level) ? r.level : 'info') as LogLevel,
      module: r.module ?? '',
      message: r.message ?? '',
      // pg 返回 jsonb 已反序列化为对象；非对象兜底为空对象
      metadata:
        r.metadata && typeof r.metadata === 'object' && !Array.isArray(r.metadata)
          ? (r.metadata as Record<string, unknown>)
          : {},
      staffId: r.staffId ?? '',
      // pg 返回时间戳为 Date 对象，统一归一为 ISO 字符串，保证纯函数比较一致
      createdAt:
        r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt ?? ''),
    })) as LogEntry[];

    // 纯函数过滤 + 分页（单测覆盖），窗口内再按条件收敛
    const result = queryLogs(logs, filters, page, pageSize);
    return json(ok(result));
  } catch (err) {
    return json(
      fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '系统日志查询失败'),
      500,
    );
  }
}

export const adminLogsRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/logs',
    auth: true,
    handle: handleList,
  },
];
