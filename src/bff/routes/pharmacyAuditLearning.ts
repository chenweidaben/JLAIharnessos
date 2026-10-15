/**
 * 健澜科技 jlmedaios - 药师审方「越审越准」拦截模式 BFF 路由（依据宪法第四章）
 *
 * GET /api/v1/pharmacy/audit-patterns：
 *   返回高频风险药物组合——按「频次 × 平均风险分级」排序后自动高亮预警，
 *   供药师审方时重点复核最常被拦截的药物组合。
 *
 * 医疗安全：本端点只读；高亮预警为辅助决策，最终放行/拦截由药师本人判断执行。
 * 权限：medmuse:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { listHighRiskPatterns } from '../aggregators/pharmacyAuditLearningAggregator';

export const pharmacyAuditLearningRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/pharmacy/audit-patterns',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'medmuse:view');
      if (denied) return denied;

      // 可选 query：?threshold=N 自定义高频预警阈值（最小被拦截次数）
      const rawThreshold = c.query.get('threshold');
      let threshold: number | undefined;
      if (rawThreshold !== null && rawThreshold !== '') {
        threshold = Number(rawThreshold);
        if (!Number.isFinite(threshold) || threshold < 1) {
          return json(fail(ErrorCode.BAD_REQUEST, 'threshold 必须为不小于 1 的整数'), 400);
        }
      }

      try {
        const data = await listHighRiskPatterns(threshold);
        return json(ok(data));
      } catch (e) {
        return json(
          fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : '审方拦截模式加载失败'),
          500,
        );
      }
    },
  },
];
