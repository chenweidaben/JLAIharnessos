/**
 * 健澜科技 jlmedaios - 日间手术与留观管理（M464 批二 DEMO_MODE=1 短路）
 * 说明：避开 M454 围术期(PACU/器械/安全核查/术后随访)、M9-C 手术麻醉、M439 门诊挂号、M456 行政办公；
 * 独立新文件，不改动任何既有路由。
 *
 * GET /api/v1/day-surgery/schedule      日间手术排程
 * GET /api/v1/observation/beds           留观床位
 * GET /api/v1/day-surgery/assessment     入离室评估
 * GET /api/v1/observation/discharge      留观出院
 * GET /api/v1/day-surgery/fees           日间手术费用
 * GET /api/v1/day-surgery/notice         日间手术须知
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `ds-${i + 1}`, ...builder(i + 1) })) };
}

export const daySurgM464Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/day-surgery/schedule',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ room: `手术间-${n}`, slot: `时段-${n}`, patient: `患者-${n}`, procedure: `术式-${n}`, status: n % 2 === 0 ? 'scheduled' : 'done' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/observation/beds',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ bed: `留观床-${n}`, patient: `患者-${n}`, enterAt: new Date(Date.now() - n * 3600000).toISOString(), level: n % 3 === 0 ? 'I' : n % 3 === 1 ? 'II' : 'III', status: n % 2 === 0 ? 'observing' : 'ready' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/day-surgery/assessment',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ patient: `患者-${n}`, enterAssess: `入室评估-${n}`, dischargeCriteria: `离室标准-${n}`, score: 90 - n * 2, conclusion: n % 2 === 0 ? 'pass' : 'observe' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/observation/discharge',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ patient: `患者-${n}`, leaveAt: new Date(Date.now() - n * 3600000).toISOString(), order: `医嘱-${n}`, followup: `随访安排-${n}`, status: n % 2 === 0 ? 'discharged' : 'pending' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/day-surgery/fees',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ patient: `患者-${n}`, procedure: `术式-${n}`, feeItem: `费用项-${n}`, insurancePay: n * 400, selfPay: n * 100 })))),
  },
  {
    method: 'GET',
    path: '/api/v1/day-surgery/notice',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ preOp: `术前须知-${n}`, postOp: `术后须知-${n}`, diet: `饮食-${n}`, revisit: `复诊-${n}`, notes: `注意事项-${n}` })))),
  },
];