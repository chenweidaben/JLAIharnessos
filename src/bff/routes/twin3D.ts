/**
 * 健澜科技 jlmedaios - M175-C 医院数字孪生 3D 路由
 *
 * GET /api/v1/admin/digital-twin/3d?building=main&floor=5
 *   - 3D 楼层建模：科室/病房/手术室/急诊 三维挤出包围盒；
 *   - 床位状态 3D 映射（四色）：空 available 绿 / 占 occupied 深海蓝 /
 *     隔离 isolation 橙 / 维护 maintenance 灰；
 *   - 患者位置 3D 追踪（脱敏 P-xxxx）；
 *   - 设备位置 3D 标注；
 *   - 等距投影数据（render=true 时直接返回前端可画的屏幕坐标）。
 *
 * 【质量与新场景】3D 真可用：纯函数聚合，不碰 WebSocket，不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { requireRole } from '../middleware/auth';
import { build3DDigitalTwin, render3DBuilding } from '../aggregators/twin3DAggregator.js';
import { json, ok, type Ctx, type RouteDef } from '../types';

/**
 * GET /api/v1/admin/digital-twin/3d
 * @query building  楼宇编号（main / er-building，未知回退 main）
 * @query floor     可选楼层过滤（如 5 / 6 / 1）
 * @query render    =1 时返回等距投影后的屏幕坐标（前端直接画）；默认返回三维世界坐标
 */
async function handle3DTwin(c: Ctx): Promise<Response> {
  // 仅 admin 角色（requireRole 内部已处理 401 / 403）
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  const buildingId = c.query.get('building') || 'main';
  const floor = c.query.get('floor') || null;
  const render = c.query.get('render') === '1';

  if (render) {
    const view = render3DBuilding(buildingId, floor);
    return json(ok(view));
  }

  const view = build3DDigitalTwin(buildingId);
  // 若指定楼层，则只回该楼层（保持 Building3D 结构，便于前端切换）
  if (floor) {
    const fl = view.floors.find((f) => f.floor === floor);
    view.floors = fl ? [fl] : [];
  }
  return json(ok(view));
}

export const twin3DRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/digital-twin/3d',
    auth: true,
    handle: handle3DTwin,
  },
];
