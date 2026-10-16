/**
 * 健澜科技 jlmedaios - M160-B 医院数字孪生 2D 路由
 *
 * GET /api/v1/admin/digital-twin/building/:building[?floor=5]
 *   - 2D 楼层平面图：科室/病房/手术室/急诊 + 床位四态（空/占/隔离/维护）+
 *     脱敏患者位置 + 设备位置标注；
 *   - 仅 admin 角色可读（requireRole 内部已处理 401/403）；
 *   - 只读、无写副作用、不触碰 WebSocket；
 *   - 患者位置仅返回 P-xxxx 脱敏标识，不含任何 PII。
 *
 * 【远期路线图】后续扩 POST /state（应用 updateDigitalTwinState 补丁）与
 *   WS 实时推送（本期不做）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { requireRole } from '../middleware/auth';
import { buildDigitalTwinBuilding } from '../aggregators/digitalTwinAggregator.js';
import { json, ok, type Ctx, type RouteDef } from '../types';

/**
 * GET /api/v1/admin/digital-twin/building/:building
 * @param :building 楼宇编号（main / er-building，未知回退 main）
 * @query floor  可选楼层过滤（如 5 / 6 / 1）
 */
async function handleBuilding(c: Ctx): Promise<Response> {
  // 仅 admin 角色（requireRole 内部已处理 401 / 403）
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  const buildingId = c.params.building ?? 'main';
  const floor = c.query.get('floor') || null;

  const view = buildDigitalTwinBuilding(buildingId, floor);
  return json(ok(view));
}

export const digitalTwinRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/digital-twin/building/:building',
    auth: true,
    handle: handleBuilding,
  },
];
