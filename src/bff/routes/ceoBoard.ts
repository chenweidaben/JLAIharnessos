/**
 * 健澜科技 jlmedaios - 院长驾驶舱BI深化（M451 DEMO_MODE=1 短路）
 * 说明：M434 经营分析已做，本批聚焦实时看板、排名、床位运营、门诊流量、告警、自动日报。
 *
 * GET /api/v1/bi/live-board      实时看板
 * GET /api/v1/bi/dept-rank       科室排名
 * GET /api/v1/bi/bed-ops         床位运营
 * GET /api/v1/bi/outpatient-flow 门诊流量
 * GET /api/v1/bi/alerts          指标告警
 * GET /api/v1/bi/daily-report    自动日报
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `cb-${i + 1}`, ...builder(i + 1) })) };
}

export const ceoBoardM451Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/bi/live-board',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ metric: `指标-${n}`, current: n * 100, yoy: `+${n}%`, mom: `+${n - 2}%`, updatedAt: new Date(Date.now() - n * 60000).toISOString() })))),
  },
  {
    method: 'GET',
    path: '/api/v1/bi/dept-rank',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ department: `科室-${n}`, metric: `指标-${n}`, rank: n, score: 90 - n, trend: n % 2 === 0 ? 'up' : 'down' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/bi/bed-ops',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ department: `科室-${n}`, beds: 30 + n, inHospital: 25 + n, empty: 5, occupancy: (80 + n) / 100 })))),
  },
  {
    method: 'GET',
    path: '/api/v1/bi/outpatient-flow',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ slot: `时段-${n}`, registered: n * 50, visited: n * 40, waiting: n * 8, yoy: `+${n}%` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/bi/alerts',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ alertNo: `ALT-${22000 + n}`, metric: `指标-${n}`, threshold: 100, current: 100 + n * 10, status: n % 2 === 0 ? 'handled' : 'open' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/bi/daily-report',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ date: new Date(Date.now() - n * 86400000).toISOString().slice(0, 10), module: `模块-${n}`, summary: `摘要-${n}`, generatedAt: new Date(Date.now() - n * 86400000).toISOString(), status: 'done' })))),
  },
];