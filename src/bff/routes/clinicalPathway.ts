/**
 * 健澜科技 jlmedaios — 临床路径智能推荐 BFF 路由（M153-A）
 *
 * GET /api/v1/clinical-pathway/recommend        按诊断/年龄/共病推荐临床路径（CDS）
 * GET /api/v1/clinical-pathway/cost/:pathwayId  路径基准费用概算
 * GET /api/v1/clinical-pathway/deviation        路径偏离分析
 *
 * 【临床决策支持】推荐不是强制，医生可根据实际情况偏离；结果不替代医师判断。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  ClinicalPathwayError,
  deviationAnalysis,
  getPathwayCost,
  recommendPathway,
  recordPathwayDeviation,
} from '../aggregators/clinicalPathwayAggregator';

function mapError(err: unknown): Response {
  if (err instanceof ClinicalPathwayError) {
    return json(fail(ErrorCode.BAD_REQUEST, err.message), err.status);
  }
  if (err instanceof Error) {
    return json(fail(ErrorCode.BAD_REQUEST, err.message), 400);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, '临床路径服务异常'), 500);
}

export const clinicalPathwayRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/clinical-pathway/recommend',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'clinical_pathway:view');
      if (denied) return denied;
      try {
        const disease = c.query.get('disease') ?? '';
        const patientAge = Number(c.query.get('patientAge') ?? '0');
        const comorbiditiesParam = c.query.get('comorbidities') ?? '';
        // 共病支持逗号分隔或 JSON 数组两种传参
        let comorbidities: string[] = [];
        if (comorbiditiesParam.trim().startsWith('[')) {
          try {
            comorbidities = JSON.parse(comorbiditiesParam) as string[];
          } catch {
            comorbidities = [];
          }
        } else {
          comorbidities = comorbiditiesParam
            .split(/[,，;；]/)
            .map((s) => s.trim())
            .filter(Boolean);
        }
        const pathway = recommendPathway(disease, patientAge, comorbidities);
        return json(ok({ pathway }));
      } catch (e) {
        return mapError(e);
      }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/clinical-pathway/cost/:pathwayId',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'clinical_pathway:view');
      if (denied) return denied;
      try {
        const cost = getPathwayCost(c.params.pathwayId || '');
        return json(ok({ cost }));
      } catch (e) {
        return mapError(e);
      }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/clinical-pathway/deviation',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'clinical_pathway:view');
      if (denied) return denied;
      try {
        const visitId = c.query.get('visitId') ?? '';
        const pathwayId = c.query.get('pathwayId') ?? '';
        const deviation = deviationAnalysis(visitId, pathwayId);
        return json(ok({ deviation }));
      } catch (e) {
        return mapError(e);
      }
    },
  },
  {
    // 路由层留痕：医师登记一次实际偏离（纯业务状态，路由不写库，由 DB 层异步持久化）
    method: 'POST',
    path: '/api/v1/clinical-pathway/deviation',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'clinical_pathway:manage');
      if (denied) return denied;
      try {
        const body = (await c.body()) as {
          visitId?: string;
          pathwayId?: string;
          actualAction?: string;
          deviationType?: string;
        };
        recordPathwayDeviation(
          body.visitId ?? '',
          body.pathwayId ?? '',
          body.actualAction ?? '',
          body.deviationType ?? 'clinical_judgement',
        );
        const deviation = deviationAnalysis(body.visitId ?? '', body.pathwayId ?? '');
        return json(ok({ deviation }));
      } catch (e) {
        return mapError(e);
      }
    },
  },
];
