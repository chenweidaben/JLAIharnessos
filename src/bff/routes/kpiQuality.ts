/**
 * 健澜科技 jlmedaios - 运营质量指标看板（M452 DEMO_MODE=1 短路）
 * 说明：M434 经营分析、M451 院长实时BI已做，本批聚焦质量与绩效 KPI。
 *
 * GET /api/v1/kpi/medical-quality      医疗质量指标
 * GET /api/v1/kpi/efficiency          服务效率指标
 * GET /api/v1/kpi/satisfaction-trend  满意度趋势
 * GET /api/v1/kpi/cost-control       成本控制
 * GET /api/v1/kpi/case-mix           病例组合
 * GET /api/v1/kpi/performance         绩效考核
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `kpi-${i + 1}`, ...builder(i + 1) })) };
}

export const kpiM452Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/kpi/medical-quality',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ metricNo: `MQ-${23000 + n}`, name: `医疗质量指标-${n}`, current: 90 - n, target: 90, status: n % 2 === 0 ? 'met' : 'gap' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/kpi/efficiency',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ metric: `效率指标-${n}`, outpatientPerVisit: n * 30, inpatientDays: 7 - n * 0.5, yoy: `+${n}%`, department: `科室-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/kpi/satisfaction-trend',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ month: `2026-0${n}`, outpatient: 90 + n, inpatient: 88 + n, nursing: 92 + n, overall: 90 + n })))),
  },
  {
    method: 'GET',
    path: '/api/v1/kpi/cost-control',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ item: `项目-${n}`, budget: 100000, actual: 100000 + n * 1000, deviationRate: `${n}%`, ownerDept: `责任科室-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/kpi/case-mix',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ month: `2026-0${n}`, cmi: 1.0 + n * 0.05, structure: `结构-${n}`, level4SurgeryRatio: 0.3 + n * 0.02, yoy: `+${n}%` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/kpi/performance',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ department: `科室-${n}`, dimension: `维度-${n}`, score: 85 + n, rank: n, period: '2026-Q3' })))),
  },
];