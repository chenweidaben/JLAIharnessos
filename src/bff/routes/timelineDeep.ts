/**
 * 健澜科技 jlmedaios - 患者360时间线深化（M449 DEMO_MODE=1 短路）
 * 说明：M428 /api/v1/patient-timeline/* 基础已做，本批为独立 /api/v1/timeline/* 深化视图。
 *
 * GET /api/v1/timeline/aggregate    时间线聚合
 * GET /api/v1/timeline/visits        就诊轨迹
 * GET /api/v1/timeline/exam-lab     检查检验时间轴
 * GET /api/v1/timeline/medication     用药时间轴
 * GET /api/v1/timeline/relations     事件关联
 * GET /api/v1/timeline/export        时间线导出
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `tl-${i + 1}`, ...builder(i + 1) })) };
}

export const timelineM449Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/timeline/aggregate',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ patient: `患者-${n}`, eventTotal: n * 20, span: `${n}年`, categoryCount: n, updatedAt: new Date(Date.now() - n * 3600000).toISOString() })))),
  },
  {
    method: 'GET',
    path: '/api/v1/timeline/visits',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ patient: `患者-${n}`, visitNo: `VS-${18000 + n}`, department: `科室-${n}`, period: `2025-0${n} ~ 2025-0${n}`, outcome: `转归-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/timeline/exam-lab',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ patient: `患者-${n}`, item: `项目-${n}`, result: `结果-${n}`, date: new Date(Date.now() - n * 30 * 86400000).toISOString().slice(0, 10), trend: n % 2 === 0 ? 'up' : 'down' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/timeline/medication',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ patient: `患者-${n}`, drug: `药品-${n}`, period: `2025-0${n} ~ 2025-0${n}`, dosage: `${n * 5}mg`, change: `变更-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/timeline/relations',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ eventA: `事件A-${n}`, eventB: `事件B-${n}`, relation: `关联类型-${n}`, evidence: `证据-${n}`, time: new Date(Date.now() - n * 86400000).toISOString() })))),
  },
  {
    method: 'GET',
    path: '/api/v1/timeline/export',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ patient: `患者-${n}`, range: `范围-${n}`, format: n % 2 === 0 ? 'pdf' : 'csv', exporter: `导出人-${n}`, status: n % 2 === 0 ? 'done' : 'pending' })))),
  },
];