/**
 * 健澜科技 jlmedaios - DRG/DIP 智能审核 BFF 路由
 *
 *  - GET  /api/v1/drg/audit/rules  列出内置规则库（规则元数据 + 示例配置）；
 *  - POST /api/v1/drg/audit       批量审核：body { visits: DrgAuditVisit[] }，
 *                                  返回逐例结果 + 命中率统计。
 *
 * 说明：仓库已有 GET /api/v1/drg/rules（DRG 分组规则，DB 持久化、drg:view 权限），
 * 为避免路径冲突且不影响既有分组接口，本审核规则库经 /api/v1/drg/audit/rules 暴露。
 * 纯后端能力，统一错误信封。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  auditBatch,
  DRG_AUDIT_RULES,
  hitRateStats,
  SAMPLE_DRG_CONFIG,
  type DrgAuditVisit,
} from '../aggregators/drgAuditAggregator';

interface AuditBatchBody {
  visits?: DrgAuditVisit[];
}

export const drgAuditRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/drg/audit/rules',
    auth: true,
    handle: async (): Promise<Response> => {
      return json(
        ok({
          rules: DRG_AUDIT_RULES,
          config: SAMPLE_DRG_CONFIG,
          ruleCount: DRG_AUDIT_RULES.length,
        }),
      );
    },
  },
  {
    method: 'POST',
    path: '/api/v1/drg/audit',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      let body: AuditBatchBody;
      try {
        body = await c.body<AuditBatchBody>();
      } catch {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体不是合法 JSON'), 400);
      }
      if (!body || !Array.isArray(body.visits) || body.visits.length === 0) {
        return json(fail(ErrorCode.BAD_REQUEST, 'visits 不能为空数组'), 400);
      }
      const results = auditBatch(body.visits, SAMPLE_DRG_CONFIG);
      return json(ok({ results, stats: hitRateStats(results) }));
    },
  },
];
