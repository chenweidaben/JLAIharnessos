/**
 * 健澜科技 jlmedaios - 后勤设备与物资补建（M443 DEMO_MODE=1 短路）
 * 说明：equipment/maintenance 既有200，本文件补建 equipment/ledger 与 logistics 4 项。
 *
 * GET /api/v1/equipment/ledger              设备台账
 * GET /api/v1/logistics/supplies-request   耗材申领
 * GET /api/v1/logistics/linens             被服管理
 * GET /api/v1/logistics/work-orders       后勤工单
 * GET /api/v1/logistics/energy             能耗记录
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `log-${i + 1}`, ...builder(i + 1) })) };
}

export const logisticsEquipmentM443Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/equipment/ledger',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ equipmentNo: `EQ-${3000 + n}`, name: `设备-${n}`, department: `科室-${n}`, purchasedAt: new Date(Date.now() - n * 365 * 86400000).toISOString().slice(0, 10), status: n % 2 === 0 ? 'in-use' : 'idle' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/logistics/supplies-request',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ requestNo: `SP-${4000 + n}`, department: `科室-${n}`, material: `物资-${n}`, quantity: n * 10, approvalStatus: n % 2 === 0 ? 'approved' : 'pending' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/logistics/linens',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ department: `科室-${n}`, category: `被服品类-${n}`, quantity: n * 20, washBatch: `WB-${n}`, status: 'in-service' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/logistics/work-orders',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ orderNo: `WO-${5000 + n}`, type: `工单类型-${n}`, reporter: `报修人-${n}`, handler: `处理人-${n}`, status: n % 2 === 0 ? 'closed' : 'open' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/logistics/energy',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ building: `楼栋-${n}`, usage: n * 100, month: `2026-0${n}`, cost: n * 800, yoy: `+${n}%` })))),
  },
];