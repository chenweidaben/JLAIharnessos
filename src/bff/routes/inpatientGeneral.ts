/**
 * 健澜科技 jlmedaios - 住院通用管理补建（M440 DEMO_MODE=1 短路）
 * 说明：admissions/transfers/discharges 3 个既有200，本文件补建 beds/orders/costs。
 *
 * GET /api/v1/inpatient/beds-detail   床位台账
 * GET /api/v1/inpatient/orders-detail 住院医嘱
 * GET /api/v1/inpatient/costs-detail   在院费用
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `ip-${i + 1}`, ...builder(i + 1) })) };
}

export const inpatientGeneralRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/inpatient/beds-detail',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ dept: `科室-${n}`, bedNo: `${n}01`, status: n % 2 === 0 ? 'occupied' : 'free', patient: n % 2 === 0 ? `患者-${n}` : '-', attending: `主治医生-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/inpatient/orders-detail',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ admissionNo: `ADM-${1000 + n}`, content: `医嘱-${n}`, prescriber: `开嘱医生-${n}`, execStatus: n % 2 === 0 ? 'executed' : 'pending', time: new Date(Date.now() - n * 3600000).toISOString() })))),
  },
  {
    method: 'GET',
    path: '/api/v1/inpatient/costs-detail',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ admissionNo: `ADM-${1000 + n}`, dept: `科室-${n}`, incurred: 2000 + n * 300, prepaid: 5000, balance: 3000 - n * 200 })))),
  },
];