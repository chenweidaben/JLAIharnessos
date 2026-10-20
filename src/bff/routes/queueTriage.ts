/**
 * 健澜科技 jlmedaios - 门急诊分诊排队叫号（M457 DEMO_MODE=1 短路）
 * 说明：避开 M439 门诊挂号、M454 门户预约、M444 投诉调查；独立新文件，不改动任何既有路由。
 *
 * GET /api/v1/queue/triage      分诊记录
 * GET /api/v1/queue/waiting     候诊排队
 * GET /api/v1/queue/calling     叫号记录
 * GET /api/v1/queue/missed      过号重排
 * GET /api/v1/queue/no-show      预约爽约
 * GET /api/v1/queue/room-guide  诊室指引
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `q-${i + 1}`, ...builder(i + 1) })) };
}

export const queueM457Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/queue/triage',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ triageNo: `TR-${40000 + n}`, patient: `患者-${n}`, waitingDept: `候诊科室-${n}`, level: n % 3 === 0 ? 'I' : n % 3 === 1 ? 'II' : 'III', triager: `分诊人-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/queue/waiting',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ seq: n, patient: `患者-${n}`, department: `科室-${n}`, position: n, waitMinutes: n * 6 })))),
  },
  {
    method: 'GET',
    path: '/api/v1/queue/calling',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ callNo: `A${100 + n}`, room: `诊室-${n}`, patient: `患者-${n}`, calledAt: new Date(Date.now() - n * 60000).toISOString(), status: n % 2 === 0 ? 'answered' : 'waiting' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/queue/missed',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ patient: `患者-${n}`, missedCount: n, requeuePosition: 20 + n, handler: `处理人-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/queue/no-show',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ apptNo: `AP-${41000 + n}`, patient: `患者-${n}`, slot: `时段-${n}`, noShowType: n % 2 === 0 ? 'no-show' : 'late', rebookStatus: n % 2 === 0 ? 'rebooked' : 'cancelled' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/queue/room-guide',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ roomNo: `R${n}`, location: `位置-${n}`, department: `科室-${n}`, currentPatient: `接诊患者-${n}`, routeHint: `路线提示-${n}` })))),
  },
];