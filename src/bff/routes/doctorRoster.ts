/**
 * 健澜科技 jlmedaios - 医生出诊排班管理（M467 DEMO_MODE=1 短路）
 * 说明：避开 M439 门诊挂号主域、M466 号源池(quota/appointment)、M16-B 护理排班、M457 分诊排队；
 * 与既有 doctor 静态段（growth-profile/workbench/follow-ups/schedule/list）及动态 muse/:staffId 不重叠；
 * 独立新文件，不改动任何既有路由。
 *
 * GET /api/v1/roster/outpatient   出诊排班
 * GET /api/v1/doctor/grade          医生号别
 * GET /api/v1/roster/cancel         停诊换诊
 * GET /api/v1/roster/slots          门诊时段
 * GET /api/v1/doctor/expert         专家门诊
 * GET /api/v1/roster/stats          排班统计
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `rs-${i + 1}`, ...builder(i + 1) })) };
}

export const rosterM467Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/roster/outpatient',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ doctor: `医生-${n}`, department: `科室-${n}`, date: new Date(Date.now() + n * 86400000).toISOString().slice(0, 10), slot: `时段-${n}`, grade: n % 2 === 0 ? 'expert' : 'general', status: n === 5 ? 'cancelled' : 'on-duty' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/doctor/grade',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ doctor: `医生-${n}`, title: `职称-${n}`, expertFee: 50 + n * 10, generalFee: 10, registerFee: n % 2 === 0 ? 50 + n * 10 : 10 })))),
  },
  {
    method: 'GET',
    path: '/api/v1/roster/cancel',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ doctor: `医生-${n}`, originalSlot: `原时段-${n}`, reason: `停诊原因-${n}`, substitute: `替诊医生-${n}`, notifyStatus: n % 2 === 0 ? 'notified' : 'pending' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/roster/slots',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ slot: `时段-${n}`, timeRange: `08:${15 * n}-09:00`, capacity: 20, remaining: 20 - n * 3, department: `科室-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/doctor/expert',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ expert: `专家-${n}`, specialty: `擅长-${n}`, clinicDay: `出诊日-${n}`, limit: 15 - n, bookMode: n % 2 === 0 ? 'appointment' : 'walk-in' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/roster/stats',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ department: `科室-${n}`, doctorCount: 8 + n, totalQuota: 200, cancelRate: (0.02 + n * 0.005).toFixed(2), fullRate: (0.6 + n * 0.03).toFixed(2) })))),
  },
];