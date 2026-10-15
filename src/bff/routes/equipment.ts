/**
 * 健澜科技 jlmedaios - 医疗设备管理 BFF 路由（M139-B）【医院运营管理】
 *
 *   GET   /api/v1/admin/equipment                设备台账 + 维护提前提醒报告
 *   POST  /api/v1/admin/equipment                登记一台新设备
 *   PUT   /api/v1/admin/equipment/:id/maintenance 为设备排定下次预防性维护
 *
 * 仅 admin 角色可访问（requireRole 内部处理 401/403）。
 * 业务内核为 equipmentAggregator 的纯函数，本层只做参数校验与响应封装。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import { json, ok, fail, ErrorCode, type Ctx, type RouteDef } from '../types';
import {
  registerEquipment,
  scheduleMaintenance,
  getEquipmentStatusReport,
  listEquipment,
} from '../aggregators/equipmentAggregator';

/** GET /api/v1/admin/equipment：返回台账列表 + 状态/预警报告 */
async function handleList(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;
  return json(ok({ list: listEquipment(), report: getEquipmentStatusReport() }));
}

/** POST /api/v1/admin/equipment：登记新设备 */
async function handleCreate(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;
  try {
    const body = await c.body<{
      name?: string; model?: string; dept?: string;
      purchaseDate?: string; value?: number;
    }>();
    const eq = registerEquipment(
      body.name ?? '',
      body.model ?? '',
      body.dept ?? '',
      body.purchaseDate ?? '',
      Number(body.value ?? 0),
    );
    return json(ok(eq, '设备已登记'), 201);
  } catch (e) {
    return json(fail(ErrorCode.BAD_REQUEST, e instanceof Error ? e.message : '设备登记失败'), 400);
  }
}

/** PUT /api/v1/admin/equipment/:id/maintenance：排定下次维护日 */
async function handleSchedule(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;
  try {
    const body = await c.body<{ nextDate?: string }>();
    const rec = scheduleMaintenance(c.params.id, body.nextDate ?? '');
    return json(ok(rec, '维护计划已排定，将提前提醒'));
  } catch (e) {
    const msg = e instanceof Error ? e.message : '维护排程失败';
    const status = msg.startsWith('设备不存在') ? 404 : 400;
    return json(fail(status === 404 ? ErrorCode.NOT_FOUND : ErrorCode.BAD_REQUEST, msg), status);
  }
}

export const equipmentRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/admin/equipment', auth: true, handle: handleList },
  { method: 'POST', path: '/api/v1/admin/equipment', auth: true, handle: handleCreate },
  { method: 'PUT', path: '/api/v1/admin/equipment/:id/maintenance', auth: true, handle: handleSchedule },
];
