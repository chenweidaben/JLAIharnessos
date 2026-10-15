/**
 * 健澜科技 jlmedaios - M123-C 系统错误监控 BFF 路由（生产安全加固）
 *
 * 依据宪法第四十五条（发展医疗卫生事业、保护人民健康）：
 * 医疗信息系统的稳定运行是患者安全的底线。错误必须可观测、可聚合、可闭环。
 *
 *  - GET /api/v1/admin/errors
 *      仅 admin 角色可访问；读取近期错误日志 -> aggregateErrors 纯函数聚合
 *      -> 返回 { errors（近期明细）, aggregation（今日数/趋势/高频类型/未闭环） }。
 *
 * 权限边界：
 *  - 非 admin 角色 -> 403 FORBIDDEN；未登录 -> 401 UNAUTHORIZED；
 *  - 本端点只读，不触发任何业务写入；明细仅管理员可见。
 *
 * 生产安全加固：
 *  - 只取近期窗口（LIMIT），避免全表扫描拖垮管理员看板；
 *  - DB 不可达时降级为错误响应，绝不用假数据冒充正常；
 *  - stack_trace 仅随管理员授权后的明细返回，不外抛患者 / 员工隐私字段。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';
import { requireRole } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  aggregateErrors,
  type SystemError,
} from '../aggregators/systemErrorAggregator';

/** 近期明细窗口：只取最近 200 条，配合 idx_system_error_log_created */
const RECENT_LIMIT = 200;

/** 一行 system_error_log（SQL 用 AS 别名转 camelCase） */
interface ErrorRow {
  id: unknown;
  errorType: unknown;
  message: unknown;
  stackTrace: unknown;
  route: unknown;
  staffId: unknown;
  createdAt: unknown;
  resolved: unknown;
}

/** 把数据库行塑形为前端 / 聚合器共用的 SystemError */
function toSystemError(r: ErrorRow): SystemError {
  return {
    id: Number(r.id),
    errorType: String(r.errorType ?? ''),
    message: String(r.message ?? ''),
    stackTrace: String(r.stackTrace ?? ''),
    route: String(r.route ?? ''),
    staffId: String(r.staffId ?? ''),
    createdAt:
      r.createdAt instanceof Date
        ? r.createdAt.toISOString()
        : String(r.createdAt ?? ''),
    resolved: Boolean(r.resolved),
  };
}

/**
 * GET /api/v1/admin/errors
 * 管理员查看系统错误监控面板。
 */
async function handleList(c: Ctx): Promise<Response> {
  // 生产安全加固：仅 admin 角色（requireRole 内部已处理 401 / 403）
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  try {
    const db = getDb();
    // 只取聚合与明细所需列，按创建时间倒序取近期窗口
    const rows = (await db`
      SELECT
        id,
        error_type   AS "errorType",
        message,
        stack_trace  AS "stackTrace",
        route,
        staff_id     AS "staffId",
        created_at   AS "createdAt",
        resolved
      FROM medmuse.system_error_log
      ORDER BY created_at DESC
      LIMIT ${RECENT_LIMIT}
    `) as unknown as ErrorRow[];

    const errors = rows.map(toSystemError);
    const aggregation = aggregateErrors(errors);
    return json(ok({ errors, aggregation }));
  } catch (err) {
    return json(
      fail(
        ErrorCode.INTERNAL_ERROR,
        err instanceof Error ? err.message : '错误日志读取失败',
        c.traceId,
      ),
      500,
    );
  }
}

export const adminErrorsRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/errors',
    auth: true,
    handle: handleList,
  },
];
