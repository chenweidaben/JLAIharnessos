/**
 * 健澜科技 jlmedaios - M180-D 系统性能与稳定性持续优化 V2 BFF 路由
 *
 * 【质量与体验】
 *
 * GET /api/v1/admin/performance/v2
 *  - auth: true + requirePermissionCode('system:performance:view')；
 *    admin 角色自动放行，非 admin 且无该权限码者一律 403（仅 admin 可读）；
 *  - 返回四大优化域 V2 报告 + 基准对比 + 退化检测 + SLO：
 *      · deepPerformanceOptimizationV2()：索引/缓存/前端/服务器；
 *      · benchmarkPerformanceV2(baseline, current)：五维基准对比；
 *      · detectPerformanceRegressionV2(metrics, history)：三维退化检测；
 *      · buildSLOV2(errorRate, latency, availability)：SLO 达成。
 *  - 纯函数聚合，无数据库副作用，不暴露 SQL 文本与 PII。
 *
 * 生产安全加固：
 *  - 只读聚合结果，索引/缓存/服务器参数均为「建议 + 预期收益」，不执行 DDL / 不重启进程；
 *  - 仅 GET，无任何状态变更副作用；
 *  - 异常时返回 500 结构化错误信封，不返回 HTML 错误页。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  buildSLOV2,
  benchmarkPerformanceV2,
  CURRENT_SLO_INPUT_V2,
  detectPerformanceRegressionV2,
  deepPerformanceOptimizationV2,
  OPTIMIZED_BASELINE_V2,
  OPTIMIZED_CURRENT_V2,
  RECENT_PERF_HISTORY_V2,
} from '../aggregators/perfOptV2Aggregator';

/** V2 路由聚合返回体 */
export interface PerfOptV2View {
  /** 四大优化域深度报告（索引 / 缓存 / 前端 / 服务器） */
  optimization: ReturnType<typeof deepPerformanceOptimizationV2>;
  /** 优化前后五维基准对比 */
  benchmark: ReturnType<typeof benchmarkPerformanceV2>;
  /** 近 7 日三维退化检测（优化后现状应为无退化） */
  regression: ReturnType<typeof detectPerformanceRegressionV2>;
  /** SLO 达成情况 */
  slo: ReturnType<typeof buildSLOV2>;
}

export const perfOptV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/performance/v2',
    auth: true,
    handle: async (c: Ctx) => {
      // 业务权限守卫：未登录 401 / admin 放行 / 其余需显式权限码
      const denied = requirePermissionCode(c, 'system:performance:view');
      if (denied) return denied;
      try {
        const view: PerfOptV2View = {
          optimization: deepPerformanceOptimizationV2(),
          benchmark: benchmarkPerformanceV2(OPTIMIZED_BASELINE_V2, OPTIMIZED_CURRENT_V2),
          regression: detectPerformanceRegressionV2(
            {
              p95Ms: OPTIMIZED_CURRENT_V2.p95Ms,
              errorRatePct: OPTIMIZED_CURRENT_V2.errorRatePct,
              throughputRps: OPTIMIZED_CURRENT_V2.throughputRps,
            },
            RECENT_PERF_HISTORY_V2,
          ),
          slo: buildSLOV2(
            CURRENT_SLO_INPUT_V2.errorRatePct,
            CURRENT_SLO_INPUT_V2.p95LatencyMs,
            CURRENT_SLO_INPUT_V2.availabilityPct,
          ),
        };
        return json(ok(view));
      } catch (err) {
        const message = err instanceof Error ? err.message : '性能优化 V2 数据采集失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
  },
];
