/**
 * 健澜科技 jlmedaios - M149-D 错误统计 BFF 路由（生产质量门禁）
 *
 *  - GET /api/v1/admin/errors/stats?minutes=60
 *      仅 admin 角色可访问；调用 getErrorStats 纯函数聚合进程内日志缓冲，
 *      返回窗口内总量 / 分级计数 / 高频错误码 / 高频路径 / 近期明细。
 *
 * 权限边界：
 *  - 非 admin 角色 -> 403 FORBIDDEN；未登录 -> 401 UNAUTHORIZED；
 *  - 本端点只读，不触发任何业务写入；明细含 staffId / patientId，仅管理员可见。
 *
 * 生产安全加固：
 *  - minutes 取值范围 [1, 1440]，非法值回落默认 60，拒绝超大窗口拖慢响应；
 *  - 聚合纯函数无 DB 依赖，进程重启后缓冲为空 -> 返回空统计而非假数据；
 *  - 生产环境不下发任何客户端错误堆栈到非 admin 渠道。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { getErrorStats } from '../aggregators/errorLoggingAggregator';

/** 默认统计窗口：近 60 分钟 */
const DEFAULT_MINUTES = 60;
/** 最大统计窗口：24 小时，防止全量扫描 */
const MAX_MINUTES = 1440;

/**
 * 解析 minutes 查询参数：非法 / 越界值回落默认值，保证接口健壮。
 */
function parseMinutes(raw: string | null): number {
  if (!raw) return DEFAULT_MINUTES;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_MINUTES;
  return Math.min(n, MAX_MINUTES);
}

/**
 * GET /api/v1/admin/errors/stats
 * 管理员查看错误统计聚合面板。
 */
async function handleStats(c: Ctx): Promise<Response> {
  // 生产质量门禁：仅 admin 角色（requireRole 内部已处理 401 / 403）
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  try {
    const minutes = parseMinutes(c.query.get('minutes'));
    const stats = getErrorStats({ minutes });
    return json(ok(stats));
  } catch (err) {
    return json(
      fail(
        ErrorCode.INTERNAL_ERROR,
        err instanceof Error ? err.message : '错误统计读取失败',
        c.traceId,
      ),
      500,
    );
  }
}

export const errorStatsRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/errors/stats',
    auth: true,
    handle: handleStats,
  },
];
