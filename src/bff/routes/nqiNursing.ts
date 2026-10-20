/**
 * 健澜科技 jlmedaios - 护理质量NQI深化（M453 DEMO_MODE=1 短路）
 * 说明：护理执行/PDA/院感已做，本批聚焦护理敏感质量、不良事件、人力、排班、质控、培训。
 *
 * GET /api/v1/nqi/sensitive-indicators  护理敏感质量指标
 * GET /api/v1/nursing/adverse-events     护理不良事件
 * GET /api/v1/nursing/staffing          护理人力配置
 * GET /api/v1/nursing/schedule          护理排班
 * GET /api/v1/nursing/quality-checks    护理质控检查
 * GET /api/v1/nursing/training          护理培训
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `nqi-${i + 1}`, ...builder(i + 1) })) };
}

export const nqiM453Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/nqi/sensitive-indicators',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ metricNo: `SI-${24000 + n}`, name: `敏感指标-${n}`, current: 95 - n, target: 95, department: `科室-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/nursing/adverse-events',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ eventNo: `AE-${25000 + n}`, type: `事件类型-${n}`, level: n % 2 === 0 ? '一般' : '严重', course: `经过-${n}`, rectification: `整改-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/nursing/staffing',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ department: `科室-${n}`, beds: 30 + n, nurses: 12 + n, nursePatientRatio: `1:${4 + n}`, shift: n % 2 === 0 ? '白班' : '夜班' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/nursing/schedule',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ department: `科室-${n}`, date: new Date(Date.now() - n * 86400000).toISOString().slice(0, 10), shift: n % 2 === 0 ? '白班' : '夜班', staff: `人员-${n}`, remark: `备注-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/nursing/quality-checks',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ checkNo: `QC-${26000 + n}`, item: `检查项目-${n}`, score: 90 - n, issue: `问题-${n}`, checker: `检查人-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/nursing/training',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ trainingNo: `TR-${27000 + n}`, topic: `培训主题-${n}`, audience: `对象-${n}`, hours: n * 2, result: n % 2 === 0 ? 'pass' : 'excellent' })))),
  },
];