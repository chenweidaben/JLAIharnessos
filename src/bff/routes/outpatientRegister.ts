/**
 * 健澜科技 jlmedaios - 门诊挂号与分诊深度（M439 DEMO_MODE=1 短路）
 * 说明：outpatient/queue 既有200，本文件补建其余5个。
 *
 * GET /api/v1/outpatient/slots          号源管理
 * GET /api/v1/outpatient/registrations  挂号记录
 * GET /api/v1/outpatient/cancellations  退号记录
 * GET /api/v1/outpatient/calling        叫号记录
 * GET /api/v1/outpatient/notes          门诊病历
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `opd-${i + 1}`, ...builder(i + 1) })) };
}

export const outpatientRegisterRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/outpatient/slots',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ dept: `科室-${n}`, doctor: `医生-${n}`, slot: `时段-${n}`, remaining: 10 - n, fee: 15 + n * 5 })))),
  },
  {
    method: 'GET',
    path: '/api/v1/outpatient/registrations',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ regNo: `RG-${1000 + n}`, patient: `患者-${n}`, dept: `科室-${n}`, doctor: `医生-${n}`, status: n % 2 === 0 ? 'registered' : 'called' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/outpatient/cancellations',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ regNo: `RG-${1000 + n}`, patient: `患者-${n}`, reason: `退号原因-${n}`, time: new Date(Date.now() - n * 3600000).toISOString(), approved: n % 2 === 0 })))),
  },
  {
    method: 'GET',
    path: '/api/v1/outpatient/calling',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ room: `诊室-${n}`, calledNo: n, patient: `患者-${n}`, time: new Date(Date.now() - n * 60000).toISOString(), status: n % 2 === 0 ? 'called' : 'skipped' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/outpatient/notes',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ opdNo: `OPD-${2000 + n}`, patient: `患者-${n}`, chiefComplaint: `主诉-${n}`, diagnosis: `诊断-${n}`, doctor: `接诊医生-${n}` })))),
  },
];