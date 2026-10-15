/**
 * 健澜科技 jlmedaios - 跨科室知识联邦路由（M146-C，越用越聪明深化）
 *
 * GET /api/v1/knowledge/federate
 *  - auth: true + requirePermissionCode('knowledge:federation:view')；
 *    admin 角色自动放行；
 *  - 三种查询模式（按 query 参数自动识别）：
 *      1) 图谱节点：?diseaseId=DIS-T2DM
 *           → buildKnowledgeGraphNode：返回疾病中心节点及其全部跨科知识关系边；
 *      2) 症状-疾病关联：?symptom=多饮&disease=2型糖尿病
 *           → findKnowledgeRelations：同一条关系上同时命中症状与疾病才推荐；
 *      3) 科室对联邦：?deptA=心内科&deptB=营养科&condition=糖尿病
 *           → crossDeptKnowledgeFederation：两科室间围绕该场景的可信知识关系。
 *  - 一律不下发 confidence < 0.5 的关系（跨科推荐宁少勿滥）。
 *
 * 医疗安全：本端点只读，推荐仅作医师辅助参考，不构成诊疗决策。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  buildKnowledgeGraphNode,
  CROSS_DEPT_MAP,
  crossDeptKnowledgeFederation,
  DEPARTMENT_NAMES,
  findKnowledgeRelations,
  MIN_CONFIDENCE,
} from '../aggregators/knowledgeFederationAggregator';

export const knowledgeFederationRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/knowledge/federate',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'knowledge:federation:view');
      if (denied) return denied;

      const diseaseId = c.query.get('diseaseId') ?? '';
      const symptom = c.query.get('symptom') ?? '';
      const disease = c.query.get('disease') ?? '';
      const deptA = c.query.get('deptA') ?? '';
      const deptB = c.query.get('deptB') ?? '';
      const condition = c.query.get('condition') ?? '';

      try {
        // 模式一：以疾病为中心构建知识图谱节点
        if (diseaseId.trim()) {
          const node = buildKnowledgeGraphNode(diseaseId);
          return json(ok({
            mode: 'graphNode' as const,
            minConfidence: MIN_CONFIDENCE,
            disclaimer: '跨科知识关系仅供参考，不构成医疗建议；最终诊疗决策由主管医师作出并签名负责。',
            node,
          }));
        }

        // 模式二：症状 + 疾病 → 跨科知识关联（二者缺一不可）
        if (symptom.trim() || disease.trim()) {
          if (!symptom.trim() || !disease.trim()) {
            return json(
              fail(
                ErrorCode.BAD_REQUEST,
                '症状-疾病关联检索须同时提供 symptom 与 disease 两个参数（跨科关联要准确，不靠单侧猜测）',
                c.traceId,
              ),
              400,
            );
          }
          const relations = findKnowledgeRelations(symptom, disease);
          return json(ok({
            mode: 'relations' as const,
            minConfidence: MIN_CONFIDENCE,
            count: relations.length,
            relations,
            disclaimer: '跨科知识关系仅供参考，不构成医疗建议；最终诊疗决策由主管医师作出并签名负责。',
          }));
        }

        // 模式三：科室对联邦（默认）
        if (!deptA.trim() || !deptB.trim()) {
          return json(
            fail(
              ErrorCode.BAD_REQUEST,
              '须提供 diseaseId（图谱）、symptom+disease（关联）或 deptA+deptB（科室联邦）之一',
              c.traceId,
            ),
            400,
          );
        }
        const relations = crossDeptKnowledgeFederation(deptA, deptB, condition || undefined);
        return json(ok({
          mode: 'federation' as const,
          minConfidence: MIN_CONFIDENCE,
          crossDeptMap: CROSS_DEPT_MAP,
          deptNames: DEPARTMENT_NAMES,
          count: relations.length,
          relations,
          disclaimer: '跨科知识关系仅供参考，不构成医疗建议；最终诊疗决策由主管医师作出并签名负责。',
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : '跨科室知识联邦加载失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
  },
];
