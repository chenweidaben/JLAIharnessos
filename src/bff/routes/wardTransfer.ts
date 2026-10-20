/**
 * 健澜科技 jlmedaios - 院内转科与床位调度（M465 DEMO_MODE=1 短路）
 * 说明：避开 M439 门诊挂号、M456 行政办公、M458 自助缴费、M438 护理执行；
 * 独立新文件，不改动任何既有路由。
 *
 * GET /api/v1/transfer/requests    转科申请
 * GET /api/v1/bed/allocation       床位调剂
 * GET /api/v1/bed/status            床位状态
 * GET /api/v1/ward/move-records     入出转记录
 * GET /api/v1/ward/bed-stats        床位统计
 * GET /api/v1/bed/reserved          预留床位
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `wd-${i + 1}`, ...builder(i + 1) })) };
}

export const wardM465Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/transfer/requests',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ inpatientNo: `ZY-${800000 + n}`, fromDept: `原科室-${n}`, toDept: `目标科室-${n}`, reason: `原因-${n}`, approveStatus: n % 2 === 0 ? 'approved' : 'pending' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/bed/allocation',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ bed: `床位-${n}`, department: `科室-${n}`, patient: `患者-${n}`, allocTime: new Date(Date.now() - n * 3600000).toISOString(), operator: `操作人-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/bed/status',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ bed: `床位-${n}`, department: `科室-${n}`, occupied: n % 2 === 0, cleaning: n === 3, repairing: n === 5, empty: n % 2 !== 0 && n !== 5 })))),
  },
  {
    method: 'GET',
    path: '/api/v1/ward/move-records',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ inpatientNo: `ZY-${810000 + n}`, event: n % 3 === 0 ? 'admit' : n % 3 === 1 ? 'transfer' : 'discharge', department: `科室-${n}`, time: new Date(Date.now() - n * 86400000).toISOString(), handler: `经办人-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/ward/bed-stats',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ department: `科室-${n}`, total: 40 + n * 2, occupied: 30 + n, empty: 10 - n, turnover: (0.85 + n * 0.02).toFixed(2) })))),
  },
  {
    method: 'GET',
    path: '/api/v1/bed/reserved',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ bed: `预留床-${n}`, reservedPatient: `预留患者-${n}`, reserveHours: n * 6, department: `科室-${n}`, status: 'reserved' })))),
  },
];