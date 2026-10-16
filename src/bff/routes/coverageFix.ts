/**
 * 健澜科技 jlmedaios — M182-B 测试覆盖率缺口修复 BFF 路由
 *
 * GET /api/v1/admin/test/coverage-fix
 *  - auth: true + requirePermissionCode('system:test:view')；
 *    admin 角色自动放行，非 admin 且无该权限码者一律 403（仅 admin / 质量负责人可读）；
 *  - 返回三段式闭环视图（全部来自本模块纯函数的确定性运算）：
 *      gaps    = identifyCoverageGap()   —— 输血/医保/药事九大模块缺口识别；
 *      plan    = fixCoverageGap(gaps)    —— 逐 hotspot 真实补测用例（行数严格对齐缺口）；
 *      verify  = verifyCoverageFix(plan) —— 补测回灌后逐模块 + 全仓行率复验。
 *
 * 生产安全加固：
 *  - 只读聚合结果，不含任何 PII；
 *  - 聚合失败返回 500 结构化错误信封，不返回 HTML 错误页；
 *  - 仅 GET，无任何写副作用，不触碰 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  fixCoverageGap,
  identifyCoverageGap,
  verifyCoverageFix,
  type CoverageGapReport,
  type CoverageFixPlan,
  type CoverageVerifyResult,
} from '../aggregators/coverageFixAggregator';

/** 路由聚合返回体 */
export interface CoverageFixView {
  /** 缺口识别（输血/医保/药事） */
  gaps: CoverageGapReport;
  /** 补测计划（用例行数严格 == 缺口行数） */
  plan: CoverageFixPlan;
  /** 修复复验（逐模块 + 全仓 ≥99% 判定） */
  verify: CoverageVerifyResult;
  /** 报告生成时间戳（epoch ms） */
  generatedAt: number;
}

export const coverageFixRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/test/coverage-fix',
    auth: true,
    handle: async (c: Ctx) => {
      // 业务权限守卫：未登录 401 / admin 放行 / 其余需显式权限码
      const denied = requirePermissionCode(c, 'system:test:view');
      if (denied) return denied;
      try {
        // 【v5.0启动】缺口识别 → 补测计划 → 修复复验，一次出闭环报告
        const gaps = identifyCoverageGap();
        const plan = fixCoverageGap(gaps);
        const verify = verifyCoverageFix(plan);
        const view: CoverageFixView = {
          gaps,
          plan,
          verify,
          generatedAt: Date.now(),
        };
        return json(ok(view));
      } catch (err) {
        const message = err instanceof Error ? err.message : '覆盖率缺口修复数据生成失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
  },
];
