/**
 * 健澜科技 jlmedaios - 健康教育与患者宣教（M455 DEMO_MODE=1 短路）
 * 说明：关怀/随访/护理培训已做，本批聚焦健康教育。独立新文件，不改动任何既有路由。
 *
 * GET /api/v1/health-edu/prescriptions    健康教育处方
 * GET /api/v1/health-edu/materials         宣教材料
 * GET /api/v1/health-edu/classes           患者课堂
 * GET /api/v1/health-edu/consents         知情同意
 * GET /api/v1/health-edu/discharge-guide   出院指导
 * GET /api/v1/health-edu/subscriptions    科普订阅
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `he-${i + 1}`, ...builder(i + 1) })) };
}

export const healthEduM455Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/health-edu/prescriptions',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ rxNo: `EDU-RX-${31000 + n}`, disease: `疾病-${n}`, guidance: `指导内容-${n}`, educator: `宣教人-${n}`, time: new Date(Date.now() - n * 86400000).toISOString() })))),
  },
  {
    method: 'GET',
    path: '/api/v1/health-edu/materials',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ materialNo: `MAT-${32000 + n}`, topic: `主题-${n}`, format: n % 2 === 0 ? 'video' : 'leaflet', audience: `适用人群-${n}`, updatedAt: new Date(Date.now() - n * 86400000).toISOString() })))),
  },
  {
    method: 'GET',
    path: '/api/v1/health-edu/classes',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ classNo: `CLS-${33000 + n}`, topic: `课堂主题-${n}`, time: new Date(Date.now() + n * 86400000).toISOString(), lecturer: `讲师-${n}`, attendees: 20 + n * 3 })))),
  },
  {
    method: 'GET',
    path: '/api/v1/health-edu/consents',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ consentNo: `CS-${34000 + n}`, project: `项目-${n}`, signer: `签署人-${n}`, version: `v1.${n}`, time: new Date(Date.now() - n * 86400000).toISOString() })))),
  },
  {
    method: 'GET',
    path: '/api/v1/health-edu/discharge-guide',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ patient: `患者-${n}`, guideItem: `指导项-${n}`, notes: `注意事项-${n}`, nurse: `宣教护士-${n}`, date: new Date(Date.now() - n * 86400000).toISOString().slice(0, 10) })))),
  },
  {
    method: 'GET',
    path: '/api/v1/health-edu/subscriptions',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ user: `用户-${n}`, topicPref: `主题偏好-${n}`, channel: n % 2 === 0 ? 'wechat' : 'app', status: n % 2 === 0 ? 'active' : 'paused', updatedAt: new Date(Date.now() - n * 86400000).toISOString() })))),
  },
];