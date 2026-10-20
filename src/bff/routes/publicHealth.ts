/**
 * 健澜科技 jlmedaios - 传染病与公共卫生深度（M441 DEMO_MODE=1 短路）
 *
 * GET /api/v1/public-health/notifications       传染病报告
 * GET /api/v1/public-health/contacts            密接管理
 * GET /api/v1/public-health/vaccinations        疫苗接种
 * GET /api/v1/public-health/chronic-followups    慢病随访
 * GET /api/v1/public-health/education           健康宣教
 * GET /api/v1/public-health/outbreaks           突发公卫事件
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `ph-${i + 1}`, ...builder(i + 1) })) };
}

export const publicHealthM441Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/public-health/notifications',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ reportNo: `NTF-${1000 + n}`, disease: `传染病-${n}`, patient: `患者-${n}`, reporter: `报告人-${n}`, reportedAt: new Date(Date.now() - n * 3600000).toISOString(), status: n % 2 === 0 ? 'reported' : 'pending' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/public-health/contacts',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ contactNo: `CTT-${2000 + n}`, caseRef: `病例-${n}`, contactMode: ['同乘', '同住', '同餐'][n % 3], isolationStatus: n % 2 === 0 ? 'released' : 'isolated', releaseTime: new Date(Date.now() - n * 86400000).toISOString() })))),
  },
  {
    method: 'GET',
    path: '/api/v1/public-health/vaccinations',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ recipient: `受种人-${n}`, vaccine: `疫苗-${n}`, dose: n, site: `接种点-${n}`, time: new Date(Date.now() - n * 86400000).toISOString(), batch: `批-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/public-health/chronic-followups',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ patient: `患者-${n}`, disease: n % 2 === 0 ? '高血压' : '糖尿病', followupItem: `随访项-${n}`, nextVisit: new Date(Date.now() + 30 * 86400000).toISOString(), doctor: `医生-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/public-health/education',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ topic: `宣教主题-${n}`, audience: `受众-${n}`, format: ['讲座', '海报', '短视频'][n % 3], lecturer: `讲师-${n}`, time: new Date(Date.now() - n * 86400000).toISOString(), coverage: 50 + n * 10 })))),
  },
  {
    method: 'GET',
    path: '/api/v1/public-health/outbreaks',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ eventNo: `OBT-${3000 + n}`, type: `事件类型-${n}`, location: `地点-${n}`, cases: n * 2, status: n % 2 === 0 ? 'contained' : 'ongoing' })))),
  },
];