/**
 * 健澜科技 jlmedaios - 医院运营分析 BFF 路由（M163-B，安全与运营）
 *
 * GET /api/v1/admin/operation/analysis?dept=xxx&period=xxx
 *  - 无 dept：返回全院科室运营概览（结余 / 结余率 / 成本效益得分 / 排名）；
 *  - 带 dept：返回该科室四维运营分析（收入 / 成本 / 效率 / 资源利用）、
 *             成本效益、同行对标、问题识别一体化报告；
 *  - auth 守卫：未登录 401 / admin 放行 / 其余需显式权限码 operation:analysis:view，否则 403。
 *
 * 生产安全加固：
 *  - 纯聚合结果，不暴露患者级 PII，仅科室级汇总；
 *  - dept 未命中 → 400 结构化错误信封，不抛 500；
 *  - 仅 GET，无任何状态变更副作用；问题识别仅输出预警建议，不自动处置。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  benchmarkOperation,
  buildOperationAnalysis,
  calculateCostEffectiveness,
  DEMO_OPERATION_DATA,
  identifyOperationIssue,
} from '../aggregators/operationAnalysisAggregator';

export const operationAnalysisRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/operation/analysis',
    handle: async (c: Ctx) => {
      // 业务权限守卫：未登录 401 / admin 放行 / 其余需显式权限码 operation:analysis:view
      const denied = requirePermissionCode(c, 'operation:analysis:view');
      if (denied) return denied;

      try {
        const deptCode = c.query.get('dept');
        const period = c.query.get('period') ?? '2026-10';

        // 带科室编码 → 返回该科室一体化运营报告
        if (deptCode) {
          const report = buildOperationAnalysis(deptCode, period);
          const costEffectiveness = calculateCostEffectiveness(deptCode, period);
          const benchmark = benchmarkOperation(deptCode, DEMO_OPERATION_DATA);
          const issues = identifyOperationIssue(deptCode, report);
          return json(
            ok({
              type: 'dept',
              report,
              costEffectiveness,
              benchmark,
              issues,
            }),
          );
        }

        // 无科室编码 → 全院科室概览（按成本效益得分降序）
        const departments = DEMO_OPERATION_DATA.map((d) => {
          const report = buildOperationAnalysis(d.deptCode, period);
          const ce = calculateCostEffectiveness(d.deptCode, period);
          return {
            deptCode: d.deptCode,
            deptName: d.deptName,
            revenueTotal: report.revenue.total,
            costTotal: report.cost.total,
            netBalance: report.netBalance,
            margin: report.margin,
            costEffectivenessScore: ce.score,
            grade: ce.grade,
          };
        }).sort((a, b) => b.costEffectivenessScore - a.costEffectivenessScore);

        return json(ok({ type: 'overview', period, departments }));
      } catch (err) {
        const message = err instanceof Error ? err.message : '运营分析数据加载失败';
        return json(fail(ErrorCode.BAD_REQUEST, message, c.traceId), 400);
      }
    },
  },
];
