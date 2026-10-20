/**
 * 健澜科技 jlmedaios - 多学科会诊MDT与院内协作转诊（M469 DEMO_MODE=1 短路）
 * 说明：避开 M444 家医双向转诊、M455 患者门户、M449 患者360既有口径；
 * 既有 mdt/:id/schedule、mdt/:id/minutes、consult/create、consult/:id/*、referral/create、
 * referral/:id/accept、referral/incoming、referral/knowledge 均为多段动态或不同段，不重叠，原样保留；
 * 独立新文件，不改动任何既有路由。
 *
 * GET /api/v1/mdt/requests      MDT会诊申请
 * GET /api/v1/mdt/teams         会诊团队
 * GET /api/v1/consult/records   会诊记录
 * GET /api/v1/referral/orders   院内转诊单
 * GET /api/v1/consult/remote    远程会诊
 * GET /api/v1/mdt/stats         会诊统计
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `mc-${i + 1}`, ...builder(i + 1) })) };
}

export const mdtM469Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/mdt/requests',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ reqNo: `MDT-${84000 + n}`, patient: `患者-${n}`, diagnosis: `主诊断-${n}`, applyDept: `申请科室-${n}`, purpose: `目的-${n}`, urgency: n % 2 === 0 ? 'routine' : 'urgent' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/mdt/teams',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ caseNo: `病例-${n}`, expert: `参与专家-${n}`, dept: `科室-${n}`, role: `角色-${n}`, convener: `召集人-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/consult/records',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ opinion: `会诊意见-${n}`, conclusion: `专家结论-${n}`, suggestion: `诊疗建议-${n}`, time: new Date(Date.now() - n * 86400000).toISOString() })))),
  },
  {
    method: 'GET',
    path: '/api/v1/referral/orders',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ patient: `患者-${n}`, fromDept: `转出科室-${n}`, toDept: `转入科室-${n}`, reason: `转诊原因-${n}`, handoff: n % 2 === 0 ? 'received' : 'pending' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/consult/remote',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ patient: `患者-${n}`, remoteHospital: `远程医院-${n}`, expert: `专家-${n}`, format: n % 2 === 0 ? 'video' : 'telesound', conclusion: `结论-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/mdt/stats',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ department: `科室-${n}`, requestCount: 10 + n, avgRespMin: 12 - n, completeRate: (0.9 + n * 0.01).toFixed(2), pending: n })))),
  },
];