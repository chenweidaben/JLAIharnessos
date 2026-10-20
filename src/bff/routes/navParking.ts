/**
 * 健澜科技 jlmedaios - 院内导航出行与停车（M459 DEMO_MODE=1 短路）
 * 说明：避开 M458 导览屏硬件、M457 诊室指引、M444 无障碍服务；独立新文件，不改动任何既有路由。
 *
 * GET /api/v1/nav/floor-map        院内楼层地图
 * GET /api/v1/nav/route            步行路线规划
 * GET /api/v1/parking/lots         停车场
 * GET /api/v1/parking/spots       实时车位
 * GET /api/v1/nav/barrier-free     无障碍出行路线
 * GET /api/v1/nav/dining-guide    食堂与就医就餐指引
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `nv-${i + 1}`, ...builder(i + 1) })) };
}

export const navM459Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/nav/floor-map',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ building: `楼宇-${n}`, floor: `F${n}`, roomNo: `R${100 + n}`, poiType: `POI-${n}`, coord: `(${n * 10},${n * 20})` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/nav/route',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ origin: `起点-${n}`, destination: `终点-${n}`, via: `途经点-${n}`, etaMin: n * 2, distanceM: n * 150 })))),
  },
  {
    method: 'GET',
    path: '/api/v1/parking/lots',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ lotName: `停车场-${n}`, location: `位置-${n}`, totalSpaces: 200 + n * 20, freeSpaces: 50 + n * 3, feeStandard: `收费标准-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/parking/spots',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ zone: `区域-${n}`, free: 20 + n, occupied: 60 - n, booked: n, updatedAt: new Date(Date.now() - n * 60000).toISOString() })))),
  },
  {
    method: 'GET',
    path: '/api/v1/nav/barrier-free',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ origin: `起点-${n}`, destination: `终点-${n}`, elevator: `电梯-${n}`, ramp: `坡道-${n}`, facility: `无障碍设施-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/nav/dining-guide',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ point: `食堂点位-${n}`, floor: `F${n}`, hours: `营业时间-${n}`, mealType: `餐类-${n}`, locationDesc: `位置描述-${n}` })))),
  },
];