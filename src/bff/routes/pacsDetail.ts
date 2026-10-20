/**
 * 健澜科技 jlmedaios - 影像PACS深度（M438 DEMO_MODE=1 短路）
 *
 * GET /api/v1/pacs/appointments       检查预约
 * GET /api/v1/pacs/reports-detail    影像报告
 * GET /api/v1/pacs/reading-detail    阅片记录
 * GET /api/v1/pacs/films              胶片管理
 * GET /api/v1/pacs/critical-findings 影像危急发现
 * GET /api/v1/pacs/report-review      报告审核
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `pacs-${i + 1}`, ...builder(i + 1) })) };
}

export const pacsDetailRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/pacs/appointments',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ examNo: `PX-${1000 + n}`, patient: `患者-${n}`, bodyPart: `部位-${n}`, device: `设备-${n}`, slot: `时段-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/pacs/reports-detail',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ examNo: `PX-${1000 + n}`, bodyPart: `部位-${n}`, findings: `影像所见-${n}`, diagnosis: `诊断-${n}`, reporter: `报告医生-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/pacs/reading-detail',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ examNo: `PX-${1000 + n}`, reader: `阅片医生-${n}`, time: new Date(Date.now() - n * 3600000).toISOString(), conclusion: `结论-${n}`, status: n % 2 === 0 ? 'done' : 'pending' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/pacs/films',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ applyNo: `FLM-${2000 + n}`, patient: `患者-${n}`, filmCount: n, pickup: n % 2 === 0 ? 'self' : 'mail', status: n % 2 === 0 ? 'ready' : 'processing' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/pacs/critical-findings',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ examNo: `PX-${1000 + n}`, patient: `患者-${n}`, abnormal: `异常-${n}`, notified: n % 2 === 0, time: new Date(Date.now() - n * 3600000).toISOString() })))),
  },
  {
    method: 'GET',
    path: '/api/v1/pacs/report-review',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ reportNo: `RPT-${3000 + n}`, preliminary: `初诊-${n}`, reviewer: `审核医生-${n}`, reviewTime: new Date(Date.now() - n * 3600000).toISOString(), status: n % 2 === 0 ? 'approved' : 'rejected' })))),
  },
];