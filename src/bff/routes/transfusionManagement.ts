/**
 * 健澜科技 jlmedaios - 输血管理深度（M438 DEMO_MODE=1 短路）
 *
 * GET /api/v1/transfusion/blood-types      血型台账
 * GET /api/v1/transfusion/crossmatch      交叉配血申请
 * GET /api/v1/transfusion/issue-records   发血记录
 * GET /api/v1/transfusion/reactions       输血反应记录
 * GET /api/v1/transfusion/approvals      用血审批
 * GET /api/v1/transfusion/blood-stock     血液库存
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `tf-${i + 1}`, ...builder(i + 1) })) };
}

export const transfusionManagementRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/transfusion/blood-types',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ patient: `患者-${n}`, abo: ['A', 'B', 'O', 'AB'][n % 4], rh: n % 2 === 0 ? 'Rh+' : 'Rh-', antibodyScreen: n % 2 === 0 ? 'negative' : 'positive', confirmDoctor: `医生-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/transfusion/crossmatch',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ applyNo: `XM-${1000 + n}`, patient: `患者-${n}`, donor: `供血者-${n}`, agglutination: n % 2 === 0 ? 'none' : 'weak', status: n % 2 === 0 ? 'matched' : 'pending' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/transfusion/issue-records',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ bagNo: `BAG-${2000 + n}`, bloodType: ['A', 'B', 'O', 'AB'][n % 4] + (n % 2 === 0 ? '+' : '-'), volume: n * 200, issueTime: new Date(Date.now() - n * 3600000).toISOString(), pickup: `取血人-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/transfusion/reactions',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ patient: `患者-${n}`, bagNo: `BAG-${2000 + n}`, reaction: ['发热', '过敏', '溶血', '无'][n % 4], handling: `处置-${n}`, outcome: n % 2 === 0 ? '缓解' : '持续观察' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/transfusion/approvals',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ applyNo: `APR-${3000 + n}`, indication: `用血指征-${n}`, approver: `审批人-${n}`, limit: `${n * 2}U`, status: n % 2 === 0 ? 'approved' : 'pending' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/transfusion/blood-stock',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ bloodType: ['A', 'B', 'O', 'AB'][n % 4] + (n % 2 === 0 ? '+' : '-'), volume: 5000 + n * 300, expiry: new Date(Date.now() + (30 - n) * 86400000).toISOString(), location: `库位-${n}`, warning: n % 3 === 0 })))),
  },
];