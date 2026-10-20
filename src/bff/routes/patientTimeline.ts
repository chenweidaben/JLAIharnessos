/**
 * 健澜科技 jlmedaios - 患者时间线深度接口（M416）
 *
 * GET /api/v1/timeline/patient-events       患者就诊事件时间线
 * GET /api/v1/timeline/patient-lab-results  检验结果时间线
 * GET /api/v1/timeline/patient-imaging      影像检查时间线
 * GET /api/v1/timeline/patient-medications  用药历史时间线
 * GET /api/v1/timeline/patient-surgeries   手术记录时间线
 * GET /api/v1/timeline/patient-alerts      临床预警时间线
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function makeItems(kind: string, n = 5) {
  return Array.from({ length: n }, (_, i) => ({
    id: `${kind}-${i + 1}`,
    kind,
    title: `${kind} #${i + 1}`,
    time: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
    detail: `${kind} 第${i + 1}条记录（DEMO）`,
  }));
}

export const patientTimelineRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/timeline/patient-events',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok({ items: makeItems('event') })),
  },
  {
    method: 'GET',
    path: '/api/v1/timeline/patient-lab-results',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok({ items: makeItems('lab') })),
  },
  {
    method: 'GET',
    path: '/api/v1/timeline/patient-imaging',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok({ items: makeItems('imaging') })),
  },
  {
    method: 'GET',
    path: '/api/v1/timeline/patient-medications',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok({ items: makeItems('medication') })),
  },
  {
    method: 'GET',
    path: '/api/v1/timeline/patient-surgeries',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok({ items: makeItems('surgery') })),
  },
  {
    method: 'GET',
    path: '/api/v1/timeline/patient-alerts',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok({ items: makeItems('alert') })),
  },
];
