/**
 * 健澜科技 jlmedaios - M181-B 系统功能全景图 V2 路由（300版本里程碑）
 *
 * GET /api/v1/admin/system-map/v2（仅 admin 角色可读）
 *  - 一次性返回十大领域全量模块全景 V2 + 模块覆盖率统计；
 *  - 纯函数 buildSystemMapV2 / getModuleCoverageV2 归并全部业务模块，
 *    本路由只做鉴权与数据装配；
 *  - 只读、无写副作用、无新表、不写 SQL、不触碰 WebSocket、不新增依赖。
 *
 * 医疗安全：仅 admin 角色（requireRole 内部已处理 401/403），
 *   仅返回功能清单与覆盖率，不含任何患者 PII。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import {
  buildSystemMapV2,
  getModuleCoverageV2,
} from '../aggregators/systemMapV2Aggregator.js';
import { json, ok, type Ctx, type RouteDef } from '../types';

/**
 * GET /api/v1/admin/system-map/v2
 * 系统功能全景 V2：十大领域全量模块 + 覆盖率统计（仅 admin · 300版本里程碑）。
 */
async function handleSystemMapV2(c: Ctx): Promise<Response> {
  // 仅 admin 角色（requireRole 内部已处理 401 / 403）
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  const map = buildSystemMapV2();
  const coverage = getModuleCoverageV2(map);

  return json(
    ok({
      ...map,
      coverage,
    }),
  );
}

export const systemMapV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/system-map/v2',
    auth: true,
    handle: handleSystemMapV2,
  },
];
