/**
 * 健澜科技 jlmedaios - 【集团与科研】医学科研智能化 BFF 路由（M156-C）
 *
 *  - GET  /api/v1/research/smart-search  病例智能检索（疾病+时间/年龄性别/检查检验/治疗预后）
 *  - POST /api/v1/research/auto-stats    自动统计分析（描述性统计 / t检验 / 卡方 / KM）
 *
 * 路由层只做参数解析与结果装配，统计计算全部下沉到纯函数聚合器
 * researchAiAggregator，保证可单测、可复算。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  SAMPLE_CASE_POOL,
  autoStatisticalAnalysis,
  smartCaseSearch,
  type AnalysisGroupInput,
  type LabFilter,
  type ResearchSearchCriteria,
} from '../aggregators/researchAiAggregator';

function badRequest(message: string): Response {
  return json(fail(ErrorCode.BAD_REQUEST, message), 400);
}

/** GET 查询串 → 检索条件 */
function parseCriteria(q: URLSearchParams): ResearchSearchCriteria {
  const criteria: ResearchSearchCriteria = {};
  const disease = q.get('disease');
  if (disease) criteria.disease = disease;

  const gender = q.get('gender');
  if (gender === 'M' || gender === 'F' || gender === 'ALL') criteria.gender = gender;

  const ageMin = Number(q.get('ageMin') ?? NaN);
  const ageMax = Number(q.get('ageMax') ?? NaN);
  if (!Number.isNaN(ageMin) || !Number.isNaN(ageMax)) {
    criteria.ageRange = {
      min: Number.isNaN(ageMin) ? null : ageMin,
      max: Number.isNaN(ageMax) ? null : ageMax,
    };
  }

  const start = q.get('startDate');
  const end = q.get('endDate');
  if (start || end) {
    criteria.dateRange = { start: start || null, end: end || null };
  }

  const exams = q.get('exams');
  if (exams) criteria.exams = exams.split(',').map((s) => s.trim()).filter(Boolean);

  const treatment = q.get('treatment');
  if (treatment) criteria.treatment = treatment;

  const prognosis = q.get('prognosis');
  if (prognosis) criteria.prognosis = prognosis;

  const labName = q.get('labName');
  const labOp = q.get('labOp');
  const labValue = Number(q.get('labValue') ?? NaN);
  if (labName && labOp && !Number.isNaN(labValue)) {
    const ops: LabFilter['op'][] = ['>=', '<=', '>', '<', '=='];
    if (ops.includes(labOp as LabFilter['op'])) {
      criteria.labFilters = [{ name: labName, op: labOp as LabFilter['op'], value: labValue }];
    }
  }
  return criteria;
}

export const researchAiRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/research/smart-search',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'research:read');
      if (denied) return denied;
      try {
        const criteria = parseCriteria(c.query);
        const cases = smartCaseSearch(criteria, SAMPLE_CASE_POOL);
        return json(ok({ criteria, total: cases.length, cases }));
      } catch (err) {
        const message = err instanceof Error ? err.message : '病例智能检索失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message), 500);
      }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/research/auto-stats',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'research:read');
      if (denied) return denied;
      try {
        const body = (await c.body()) as {
          groups?: AnalysisGroupInput[];
          outcomeLabel?: string;
        };
        if (!body || !Array.isArray(body.groups) || body.groups.length === 0) {
          return badRequest('请求体须包含 groups 数组（每组含 values/events/nonEvents/survival）');
        }
        const result = autoStatisticalAnalysis({
          groups: body.groups,
          outcomeLabel: body.outcomeLabel,
        });
        return json(ok(result));
      } catch (err) {
        const message = err instanceof Error ? err.message : '自动统计分析失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message), 500);
      }
    },
  },
];
