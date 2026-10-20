/**
 * 健澜科技 jlmedaios - 患者满意度评价闭环（M460 DEMO_MODE=1 短路）
 * 说明：避开 M444 care/surveys、care/complaints、M452 运营 KPI、M451 随访慢病；
 * 静态路径须先于既有 /api/v1/satisfaction/:id 动态路由命中，故 spread 注册在其之前。
 * 独立新文件，不改动任何既有路由。
 *
 * GET /api/v1/satisfaction/ratings      服务评价
 * GET /api/v1/satisfaction/negative      差评工单
 * GET /api/v1/satisfaction/rectify       整改跟踪
 * GET /api/v1/satisfaction/callback       回访闭环
 * GET /api/v1/satisfaction/star-staff    服务明星
 * GET /api/v1/satisfaction/board          满意度看板
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `sa-${i + 1}`, ...builder(i + 1) })) };
}

export const satM460Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/satisfaction/ratings',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ ratingNo: `RV-${51000 + n}`, department: `科室-${n}`, score: 4 + (n % 2) / 2, item: `评价项-${n}`, reviewer: `评价人-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/satisfaction/negative',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ ticketNo: `NG-${52000 + n}`, reason: `原因-${n}`, ownerDept: `责任科室-${n}`, status: n % 2 === 0 ? 'closed' : 'open', deadline: new Date(Date.now() + n * 86400000).toISOString().slice(0, 10) })))),
  },
  {
    method: 'GET',
    path: '/api/v1/satisfaction/rectify',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ item: `整改项-${n}`, owner: `责任人-${n}`, measure: `措施-${n}`, completion: 60 + n * 8, reviewer: `复核人-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/satisfaction/callback',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ callbackNo: `CB-${53000 + n}`, method: n % 2 === 0 ? 'phone' : 'sms', result: `结果-${n}`, satisfied: n % 2 === 0, followUp: `跟进记录-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/satisfaction/star-staff',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ staff: `员工-${n}`, department: `科室-${n}`, likes: 50 + n * 10, period: '2026-Q3', rank: n })))),
  },
  {
    method: 'GET',
    path: '/api/v1/satisfaction/board',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ department: `科室-${n}`, totalScore: 90 + n, mom: `+${n}%`, negativeRate: (1 + n * 0.2).toFixed(1) + '%', rank: n })))),
  },
];