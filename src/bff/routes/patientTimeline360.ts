/**
 * 健澜科技 jlmedaios - 患者360时间线深度接口（M428 DEMO_MODE=1 短路）
 *
 * GET /api/v1/patient-timeline/all           全量时间线混合流
 * GET /api/v1/patient-timeline/visits         就诊时间线
 * GET /api/v1/patient-timeline/medications   用药时间线
 * GET /api/v1/patient-timeline/lab-results   检验结果时间线
 * GET /api/v1/patient-timeline/imaging       检查影像时间线
 * GET /api/v1/patient-timeline/notes         病历文书时间线
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function makeItems(builder: (i: number) => Record<string, unknown>, n = 5) {
  return Array.from({ length: n }, (_, i) => ({ id: `pt-${i + 1}`, ...builder(i + 1) }));
}

export const patientTimeline360Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/patient-timeline/all',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok({ items: makeItems((n) => ({ time: new Date(Date.now() - n * 3600000).toISOString(), eventType: `event-${n}`, sourceModule: `module-${n}`, summary: `全量时间线条目 #${n}`, operator: `doctor-${n}` })) })),
  },
  {
    method: 'GET',
    path: '/api/v1/patient-timeline/visits',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok({ items: makeItems((n) => ({ visitNo: `V-${1000 + n}`, dept: `dept-${n}`, doctor: `doctor-${n}`, admissionTime: new Date(Date.now() - n * 86400000).toISOString(), dischargeTime: new Date(Date.now() - n * 86400000 + 3600000).toISOString(), status: n % 2 === 0 ? 'completed' : 'ongoing' })) })),
  },
  {
    method: 'GET',
    path: '/api/v1/patient-timeline/medications',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok({ items: makeItems((n) => ({ drug: `drug-${n}`, dose: `${n * 5}mg`, start: new Date(Date.now() - n * 86400000).toISOString(), end: new Date(Date.now() - (n - 1) * 86400000).toISOString(), prescriber: `doctor-${n}`, status: n % 2 === 0 ? 'executed' : 'pending' })) })),
  },
  {
    method: 'GET',
    path: '/api/v1/patient-timeline/lab-results',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok({ items: makeItems((n) => ({ item: `lab-${n}`, result: `${n * 2.1}`, refRange: '3.5-5.5', critical: n % 3 === 0, reportTime: new Date(Date.now() - n * 3600000).toISOString() })) })),
  },
  {
    method: 'GET',
    path: '/api/v1/patient-timeline/imaging',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok({ items: makeItems((n) => ({ exam: `imaging-${n}`, bodyPart: `part-${n}`, conclusion: `conclusion #${n}`, reporter: `radiologist-${n}`, time: new Date(Date.now() - n * 3600000).toISOString() })) })),
  },
  {
    method: 'GET',
    path: '/api/v1/patient-timeline/notes',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok({ items: makeItems((n) => ({ noteName: `note-${n}`, noteType: `type-${n}`, writer: `doctor-${n}`, completedAt: new Date(Date.now() - n * 3600000).toISOString(), signStatus: n % 2 === 0 ? 'signed' : 'draft' })) })),
  },
];