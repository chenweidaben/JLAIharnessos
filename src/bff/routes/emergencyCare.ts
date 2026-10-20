/**
 * 健澜科技 jlmedaios - 急诊急救深度（M435 DEMO_MODE=1 短路）
 *
 * GET /api/v1/emergency/triage-records     分诊记录
 * GET /api/v1/emergency/ambulance-trips    救护车出车
 * GET /api/v1/emergency/trauma-cases       创伤病例
 * GET /api/v1/emergency/poisoning-cases    中毒病例
 * GET /api/v1/emergency/disaster-records   灾害救援记录
 * GET /api/v1/emergency/rescue-records     抢救记录
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `em-${i + 1}`, ...builder(i + 1) })) };
}

export const emergencyCareRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/emergency/triage-records',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ triageNo: `TR-${1000 + n}`, patient: `患者-${n}`, level: ['红', '黄', '绿', '蓝'][n % 4], triageNurse: `护士-${n}`, time: new Date(Date.now() - n * 60000).toISOString() })))),
  },
  {
    method: 'GET',
    path: '/api/v1/emergency/ambulance-trips',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ tripNo: `AMB-${2000 + n}`, depart: `出发地-${n}`, arrive: `目的地-${n}`, patient: `患者-${n}`, status: n % 2 === 0 ? 'completed' : 'en-route' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/emergency/trauma-cases',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ caseNo: `TRM-${3000 + n}`, issScore: 8 + n * 2, bodyPart: `部位-${n}`, treatment: `处置-${n}`, outcome: n % 2 === 0 ? '治愈' : '转ICU' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/emergency/poisoning-cases',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ caseNo: `PSN-${4000 + n}`, poison: `毒物-${n}`, route: ['口服', '吸入', '皮肤'][n % 3], gastricLavage: n % 2 === 0, antidote: `解毒剂-${n}`, status: n % 2 === 0 ? 'stable' : 'critical' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/emergency/disaster-records',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ event: `灾害事件-${n}`, casualties: 10 + n * 3, forces: `出动-${n}组`, handling: `处置-${n}`, time: new Date(Date.now() - n * 86400000).toISOString() })))),
  },
  {
    method: 'GET',
    path: '/api/v1/emergency/rescue-records',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ recordNo: `RSC-${5000 + n}`, diagnosis: `诊断-${n}`, measures: `抢救措施-${n}`, doctor: `医生-${n}`, result: n % 2 === 0 ? '成功' : '死亡' })))),
  },
];