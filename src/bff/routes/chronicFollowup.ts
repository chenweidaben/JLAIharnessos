/**
 * 健澜科技 jlmedaios - 出院随访与慢病管理计划（M468 DEMO_MODE=1 短路）
 * 说明：followup/plans、chronic/targets 已由既有 m451Routes 提供（200，原样保留不重建）；
 * 避开 M444 家医签约、M445 营养膳食、M449 患者360时间线、M444 公卫慢病随访既有口径；
 * 本文件仅补建 4 个缺失端点，独立新文件，不改动任何既有路由。
 *
 * GET /api/v1/chronic/interventions   健康干预
 * GET /api/v1/followup/recall         随访召回
 * GET /api/v1/followup/records        随访记录
 * GET /api/v1/chronic/adherence      用药依从性
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `cf-${i + 1}`, ...builder(i + 1) })) };
}

export const chronicM468Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/chronic/interventions',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ patient: `患者-${n}`, measure: `干预措施-${n}`, education: `教育内容-${n}`, execDate: new Date(Date.now() - n * 86400000).toISOString().slice(0, 10), adherence: n % 2 === 0 ? 'high' : 'mid' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/followup/recall',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ patient: `患者-${n}`, dueDate: new Date(Date.now() - n * 86400000).toISOString().slice(0, 10), missReason: `未召回原因-${n}`, remindCount: n, status: n % 2 === 0 ? 'recalled' : 'pending' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/followup/records',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ patient: `患者-${n}`, method: n % 2 === 0 ? 'face' : 'phone', chiefComplaint: `主诉-${n}`, vitals: `体征-${n}`, medAdjust: `用药调整-${n}`, nextPlan: `下次安排-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/chronic/adherence',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ patient: `患者-${n}`, drug: `药物-${n}`, takeRate: 0.95 - n * 0.03, missCount: n, grade: n % 3 === 0 ? 'poor' : n % 3 === 1 ? 'fair' : 'good' })))),
  },
];