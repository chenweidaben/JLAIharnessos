/**
 * 健澜科技 jlmedaios - 管理驾驶舱（院长驾驶舱 / 全院数据大屏）路由
 *
 * GET /api/v1/admin/dashboard（仅 admin 角色可读）
 *  - 返回全院十大核心指标 + 近 30 天三线趋势，供深色大屏渲染；
 *  - 纯函数 buildHospitalDashboard 归并各业务口径，空数据安全兜底；
 *  - 当前无直连业务库时返回内置演示视图（demo:true），大屏可直接演示。
 *
 * 生产安全：仅 admin 角色（requireRole 内部已处理 401/403），本端点只读、无任何写副作用。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import { listView } from '../aggregators/hospitalDashboardAggregator.js';
import { json, ok, type Ctx, type RouteDef } from '../types';

/**
 * GET /api/v1/admin/dashboard
 * 管理驾驶舱：全院运营数据大屏（仅 admin）。
 */
async function handleDashboard(c: Ctx): Promise<Response> {
  // 仅 admin 角色（requireRole 内部已处理 401 / 403）
  const denied = requireRole(c, 'admin');
  if (denied) return denied;
  return json(ok(listView()));
}

export const adminDashboardRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/dashboard',
    auth: true,
    handle: handleDashboard,
  },
];
