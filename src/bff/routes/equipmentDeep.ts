/**
 * 健澜科技 jlmedaios - 医疗设备管理深化 BFF 路由（M177-C）【病案设备耗材】
 *
 *   GET /api/v1/equipment/deep
 *       深度设备管理看板：台账五段 + 维保预警/未结故障 + 强检证书到期 + 折旧净值，
 *       口径与 clinical.medical_equipment 扩展表一致（deploy/postgres/init/358-equipment-deep.sql）。
 *
 * 薄壳路由：业务规则全部在 aggregators/equipmentDeepAggregator.ts 纯函数层。
 * 不写 SQL、不触库、不触碰 WebSocket、不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { json, ok, type Ctx, type RouteDef } from '../types';
import { buildDeepEquipmentMgmt } from '../aggregators/equipmentDeepAggregator';

/** GET /api/v1/equipment/deep：返回深度设备管理总览 */
async function handleDeep(c: Ctx): Promise<Response> {
  return json(ok(buildDeepEquipmentMgmt(new Date()), '设备深度管理看板', c.traceId));
}

export const equipmentDeepRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/equipment/deep', auth: true, handle: handleDeep },
];
