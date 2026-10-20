/**
 * 健澜科技 jlmedaios - 电子病历五级评审深度（M433 DEMO_MODE=1 短路）
 *
 * GET /api/v1/emr/headpages          病历首页
 * GET /api/v1/emr/archive-records    病历归档记录
 * GET /api/v1/emr/copies             病历复印申请
 * GET /api/v1/emr/quality-score       病历质控评分
 * GET /api/v1/emr/complete-rate      病历完成率
 * GET /api/v1/emr/review-checklist   五级评审自查表
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `e5-${i + 1}`, ...builder(i + 1) })) };
}

export const emrLevel5ReviewRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/emr/headpages',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ recordNo: `MR-${1000 + n}`, patient: `张${n}`, dischargeDiagnosis: `诊断-${n}`, surgery: n % 2 === 0 ? `手术-${n}` : '无', outcome: n % 2 === 0 ? '治愈' : '好转' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/emr/archive-records',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ recordNo: `MR-${1000 + n}`, archivist: `档案员-${n}`, archivedAt: new Date(Date.now() - n * 86400000).toISOString(), status: n % 2 === 0 ? 'archived' : 'pending', retention: `${n * 10}年` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/emr/copies',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ applyNo: `CPY-${2000 + n}`, applicant: `申请人-${n}`, purpose: `用途-${n}`, copies: n, status: n % 2 === 0 ? 'approved' : 'pending' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/emr/quality-score',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ dept: `科室-${n}`, gradeARate: `${(90 + n)}%`, gradeB: n, gradeC: 0, totalScore: 90 + n })))),
  },
  {
    method: 'GET',
    path: '/api/v1/emr/complete-rate',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ dept: `科室-${n}`, dueArchive: 50 + n, archived: 48 + n, overtimeRate: `${n}%`, metStandard: n % 2 === 0 })))),
  },
  {
    method: 'GET',
    path: '/api/v1/emr/review-checklist',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ reviewItem: `评审项-${n}`, standard: `标准要求-${n}`, selfScore: 80 + n, gap: n, rectification: `整改-${n}` })))),
  },
];