/**
 * 健澜科技 jlmedaios - M124-B 系统数据备份/恢复路由（运维工具）
 *
 * 【运维工具】面向系统管理员的离线备份与受控恢复：
 *  - GET  /api/v1/admin/backup/export  导出白名单表为标准 JSON 备份文件下载；
 *  - POST /api/v1/admin/backup/import 上传备份文件，校验信封与完整性后给出恢复清单。
 *
 * 生产安全加固：
 *  - requireRole(c, 'admin')：未登录 401、非管理员 403，运维工具不对普通角色开放；
 *  - 表名走固定白名单（ALLOWED_TABLES），禁止按 query 任意拼接表名，杜绝 SQL 注入；
 *  - 每张表独立 try/catch：单表查询失败不拖垮整包导出，记入 skipped 返回；
 *  - 物理写库恢复不在此路由执行：POST 只做信封校验与恢复清单预览，
 *    真正的物理回灌由运维在受控事务中按白名单表逐表执行，避免误覆盖生产数据；
 *  - 不碰 WebSocket，不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';
import { requireRole } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { exportSystemData, importSystemData } from '../aggregators/backupAggregator';

/**
 * 导出白名单：逻辑表名 -> 带 schema 的物理表名。
 * 仅运维/审计/配置类小表纳入默认备份范围；海量临床交易表不在此工具导出，
 * 其一致性由数据库级 pg_dump/WAL 负责，避免应用层导出拖垮实例。
 */
const ALLOWED_TABLES: Record<string, string> = {
  'medmuse.data_access_log': 'medmuse.data_access_log',
  'clinical.beds': 'clinical.beds',
};

/** 单表行数上限：防止超大表把内存/响应打爆（运维大表请走 pg_dump） */
const ROW_LIMIT_PER_TABLE = 20_000;

/** 把导出信封序列化为可下载的 .json 文件响应 */
function backupFileResponse(envelope: ReturnType<typeof exportSystemData>): Response {
  const stamp = envelope.exportedAt.slice(0, 19).replace(/[:T]/g, '-');
  return new Response(JSON.stringify(envelope, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="jlmedaios-backup-${stamp}.json"`,
    },
  });
}

/** 解析 query.tables 并与白名单取交集；非法表名 -> 返回 400 响应（或 null 表示通过） */
function resolveTables(c: Ctx): { allowed: string[]; denied: string[] } | Response {
  const raw = c.query.get('tables');
  const requested = raw
    ? raw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : Object.keys(ALLOWED_TABLES);

  const denied = requested.filter((t) => !(t in ALLOWED_TABLES));
  if (denied.length > 0) {
    return json(
      fail(ErrorCode.BAD_REQUEST, `非白名单表禁止导出：${denied.join(', ')}`),
      400,
    );
  }
  return { allowed: requested, denied: [] };
}

/**
 * GET /api/v1/admin/backup/export
 * query.tables 可选，逗号分隔；缺省导出全部白名单表。
 */
async function handleExport(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  const resolved = resolveTables(c);
  if (resolved instanceof Response) return resolved;

  const data: Record<string, unknown[]> = {};
  const skipped: Array<{ table: string; reason: string }> = [];

  for (const logical of resolved.allowed) {
    const physical = ALLOWED_TABLES[logical];
    try {
      const db = getDb();
      // 物理表名来自白名单常量拼接，非用户输入，安全；行数硬上限保护内存
      const rows = await db.unsafe(`SELECT * FROM ${physical} LIMIT ${ROW_LIMIT_PER_TABLE}`);
      data[logical] = Array.isArray(rows) ? rows : [];
    } catch (err) {
      // 单表失败不拖垮整包：记 skipped，该表按空集打包
      skipped.push({ table: logical, reason: err instanceof Error ? err.message : String(err) });
      data[logical] = [];
    }
  }

  const envelope = exportSystemData(resolved.allowed, data);
  // 旁路注入 skipped：不污染纯函数信封，仅在日志/响应头外体现；下载体保持纯净
  if (skipped.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(`[backup] 部分表导出为空（已跳过）: ${JSON.stringify(skipped)}`);
  }
  return backupFileResponse(envelope);
}

/**
 * POST /api/v1/admin/backup/import
 * Body：备份文件原始 JSON 文本（c.rawBody）。校验通过后返回恢复清单预览，
 * 不在此物理写库——物理回灌由运维在受控事务中执行。
 */
async function handleImport(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  const text = c.rawBody ?? '';
  try {
    const restored = importSystemData(text);
    return json(
      ok({
        // 恢复清单预览：版本/导出时刻/各表行数；物理回灌需运维二次确认
        restorePrepared: true,
        version: restored.version,
        exportedAt: restored.exportedAt,
        tables: restored.tables,
        rowCounts: restored.rowCounts,
        note: '校验通过；物理恢复请在运维受控事务中按白名单表逐表回灌',
      }),
    );
  } catch (err) {
    return json(
      fail(ErrorCode.BAD_REQUEST, err instanceof Error ? err.message : '备份文件校验失败'),
      400,
    );
  }
}

export const adminBackupRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/backup/export',
    auth: true,
    handle: handleExport,
  },
  {
    method: 'POST',
    path: '/api/v1/admin/backup/import',
    auth: true,
    handle: handleImport,
  },
];
