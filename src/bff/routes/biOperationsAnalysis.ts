/**
 * 健澜科技 jlmedaios - 运营经营分析深度（M434 DEMO_MODE=1 短路）
 *
 * GET /api/v1/bi/drg-groups        DRG分组
 * GET /api/v1/bi/dip-items          DIP病种分值
 * GET /api/v1/finance/cost-center   科室成本核算
 * GET /api/v1/finance/performance   科室绩效指标
 * GET /api/v1/bi/revenue-trend      收入趋势
 * GET /api/v1/bi/bed-utilization    床位使用
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `op-${i + 1}`, ...builder(i + 1) })) };
}

export const biOperationsAnalysisRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/bi/drg-groups',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ drgGroup: `DRG-${n}`, weight: (0.8 + n * 0.1).toFixed(2), cases: 20 + n, avgCost: 8000 + n * 500, profit: n % 2 === 0 ? '盈利' : '亏损' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/bi/dip-items',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ dipItem: `DIP-${n}`, score: 100 + n * 10, cases: 15 + n, avgCost: 6000 + n * 400, rank: n })))),
  },
  {
    method: 'GET',
    path: '/api/v1/finance/cost-center',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ dept: `科室-${n}`, directCost: 500000 + n * 10000, indirectAllocated: 120000 + n * 5000, totalCost: 620000 + n * 15000, balance: n % 2 === 0 ? '结余' : '超支' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/finance/performance',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ dept: `科室-${n}`, cmi: (1.0 + n * 0.05).toFixed(2), timeConsume: (0.9 + n * 0.02).toFixed(2), costConsume: (0.95 + n * 0.01).toFixed(2), score: 85 + n })))),
  },
  {
    method: 'GET',
    path: '/api/v1/bi/revenue-trend',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ month: `2026-0${n}`, outpatientRevenue: 3000000 + n * 200000, inpatientRevenue: 5000000 + n * 300000, drugRatio: `${(25 - n)}%`, mom: `${(n - 2)}%` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/bi/bed-utilization',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ dept: `科室-${n}`, openBeds: 40 + n, occupiedBeds: 36 + n, utilization: `${(90 - n)}%`, turnover: (3.5 + n * 0.2).toFixed(1) })))),
  },
];